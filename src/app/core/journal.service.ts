import { Injectable, effect, inject, signal } from '@angular/core';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  QuerySnapshot,
  DocumentData,
  FirestoreError,
} from 'firebase/firestore';
import { AuthService, friendlyError } from './auth.service';
import { Entry, validateEntry } from './journal.model';

@Injectable({ providedIn: 'root' })
export class JournalService {
  private auth = inject(AuthService);
  readonly entries = signal<Entry[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly cached = signal(false);
  readonly connectionDelayed = signal(false);
  private readonly connectionAttempt = signal(0);
  private readonly demoKey = 'trading-journal-demo-v1';
  private cacheKey: string | undefined;
  private subscriptionCount = 0;
  private trace(event: string, detail: Record<string, unknown> = {}) {
    // Bounded, data-free timings available in browser DevTools, including production.
    const name = `journal:${event}`;
    performance.clearMarks(name);
    performance.mark(name, { detail: { subscription: this.subscriptionCount, ...detail } });
  }
  private listen(uid: string, next: (snapshot: QuerySnapshot<DocumentData>) => void,
    error: (error: FirestoreError) => void) {
    return onSnapshot(
      query(collection(this.auth.db!, 'users', uid, 'entries'), orderBy('date')),
      { includeMetadataChanges: true }, next, error,
    );
  }
  constructor() {
    effect((onCleanup) => {
      this.connectionAttempt();
      const user = this.auth.user();
      const cacheKey = user ? `trading-journal-session-v1:${user.uid}` : undefined;
      if (this.cacheKey && this.cacheKey !== cacheKey) {
        this.clearCache(this.cacheKey);
      }
      this.cacheKey = cacheKey;
      this.entries.set([]);
      this.error.set('');
      this.cached.set(false);
      this.connectionDelayed.set(false);
      this.loading.set(true);
      if (this.auth.demo) {
        try {
          const saved: Entry[] = JSON.parse(localStorage.getItem(this.demoKey) || '[]');
          if (!Array.isArray(saved)) throw Error('Invalid demo data');
          saved.forEach(validateEntry);
          this.entries.set(saved);
        } catch {
          this.error.set('Demo storage could not be read. Use Clear demo data to reset it.');
        }
        this.loading.set(false);
        return;
      }
      if (!user || !this.auth.db) {
        this.loading.set(false);
        return;
      }
      let receivedEntries = false;
      this.subscriptionCount++;
      this.trace('subscribe');
      // A listener may keep reconnecting without invoking its error callback.
      // Surface that state without presenting an unconfirmed empty journal.
      const connectionTimer = setTimeout(() => this.connectionDelayed.set(true), 10000);
      // Keep refreshes independent of network latency, within this signed-in tab only.
      try {
        const saved = sessionStorage.getItem(cacheKey!);
        if (saved !== null) {
          const entries: Entry[] = JSON.parse(saved);
          if (!Array.isArray(entries)) throw Error('Invalid cache');
          entries.forEach(validateEntry);
          this.entries.set(entries);
          this.cached.set(true);
          this.loading.set(false);
        }
      } catch {
        this.clearCache(cacheKey!);
      }
      const stop = this.listen(
        user.uid,
        (snapshot) => {
          this.trace(snapshot.metadata.fromCache ? 'cache-snapshot' : 'server-snapshot', { count: snapshot.size });
          if (!snapshot.metadata.fromCache) {
            clearTimeout(connectionTimer);
            this.connectionDelayed.set(false);
          }
          // An empty SDK memory cache is not confirmation that cloud records are empty.
          if (snapshot.metadata.fromCache && snapshot.empty) return;
          try {
            // Metadata-only server confirmations must not rebuild every row and chart.
            if (!receivedEntries || snapshot.docChanges().length > 0) {
              const entries = snapshot.docs.map((d) => d.data() as Entry);
              entries.forEach(validateEntry);
              this.entries.set(entries);
              try {
                sessionStorage.setItem(cacheKey!, JSON.stringify(entries));
              } catch { /* Storage may be unavailable; the live listener still works. */ }
              receivedEntries = true;
            }
            this.cached.set(snapshot.metadata.fromCache);
            this.error.set('');
          } catch {
            this.clearCache(cacheKey!);
            this.entries.set([]);
            this.cached.set(false);
            receivedEntries = false;
            this.error.set('A stored record has invalid data. Check your Firebase console.');
          }
          this.loading.set(false);
          this.trace('published');
        },
        (error) => {
          this.trace('error', { code: error.code });
          clearTimeout(connectionTimer);
          this.connectionDelayed.set(false);
          this.clearCache(cacheKey!);
          this.entries.set([]);
          this.cached.set(false);
          this.error.set(friendlyError(error));
          this.loading.set(false);
        },
      );
      onCleanup(() => {
        this.trace('unsubscribe');
        clearTimeout(connectionTimer);
        stop();
      });
    });
  }
  retryConnection() {
    this.connectionAttempt.update(attempt => attempt + 1);
  }
  private clearCache(key: string) {
    try { sessionStorage.removeItem(key); } catch { /* Storage is optional. */ }
  }
  async save(entry: Entry, expectedRevision: number | null) {
    validateEntry(entry);
    if (this.auth.demo) {
      const current = this.entries().find((e) => e.date === entry.date);
      this.check(current, expectedRevision);
      this.persistDemo([...this.entries().filter((e) => e.date !== entry.date), entry]);
      return;
    }
    const user = this.auth.user();
    if (!user || !this.auth.db) throw Error('Please sign in again.');
    const ref = doc(this.auth.db, 'users', user.uid, 'entries', entry.date);
    await runTransaction(this.auth.db, async (transaction) => {
      const old = await transaction.get(ref);
      this.check(old.exists() ? (old.data() as Entry) : undefined, expectedRevision);
      transaction.set(ref, entry);
    });
    // Publish the acknowledged write before returning success to the form.
    // The live listener continues to reconcile changes from other sessions.
    if (this.auth.user()?.uid === user.uid) {
      const current = this.entries().find(e => e.date === entry.date);
      if (!current || current.revision <= entry.revision) {
        this.entries.update(entries => [...entries.filter(e => e.date !== entry.date), entry]);
        try {
          sessionStorage.setItem(`trading-journal-session-v1:${user.uid}`, JSON.stringify(this.entries()));
        } catch { /* Storage is optional. */ }
      }
    }
  }
  async remove(entry: Entry) {
    if (this.auth.demo) {
      this.persistDemo(this.entries().filter((e) => e.date !== entry.date));
      return;
    }
    const user = this.auth.user();
    if (!user || !this.auth.db) throw Error('Please sign in again.');
    const ref = doc(this.auth.db, 'users', user.uid, 'entries', entry.date);
    await runTransaction(this.auth.db, async (transaction) => {
      const old = await transaction.get(ref);
      this.check(old.exists() ? (old.data() as Entry) : undefined, entry.revision);
      transaction.delete(ref);
    });
  }
  private check(old: Entry | undefined, expected: number | null) {
    if (expected === null && old)
      throw Error('This date already has an entry. Edit the existing entry.');
    if (expected !== null && (!old || old.revision !== expected))
      throw Error('This entry changed in another session. Cancel and reopen it before saving.');
  }
  private persistDemo(entries: Entry[]) {
    localStorage.setItem(this.demoKey, JSON.stringify(entries));
    this.entries.set(entries);
    this.error.set('');
  }
  clearDemo() {
    if (this.auth.demo) this.persistDemo([]);
  }
  loadSamples() {
    if (!this.auth.demo || this.entries().length) return;
    this.persistDemo([
      {
        date: '2026-10-01',
        startingCapital: 20000000,
        pnl: 540000,
        notes: 'NIFTY breakout. Waited for confirmation.',
        tradeCount: 3,
        revision: 1,
      },
      {
        date: '2026-10-02',
        startingCapital: 20540000,
        pnl: -180000,
        notes: 'Stopped at planned daily risk.',
        tradeCount: 2,
        revision: 1,
      },
      {
        date: '2026-10-05',
        startingCapital: 20360000,
        pnl: 0,
        notes: 'Flat after charges.',
        tradeCount: 2,
        revision: 1,
      },
      {
        date: '2026-10-06',
        startingCapital: 20360000,
        pnl: 320000,
        notes: 'Patient entry, clean exit.',
        tradeCount: 1,
        revision: 1,
      },
      {
        date: '2026-11-02',
        startingCapital: null,
        pnl: -90000,
        notes: 'Example with no opening capital recorded.',
        tradeCount: null,
        revision: 1,
      },
    ]);
  }
}
