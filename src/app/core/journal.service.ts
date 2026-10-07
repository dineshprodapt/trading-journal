import { Injectable, effect, inject, signal } from '@angular/core';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  Unsubscribe,
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
  private stop?: Unsubscribe;
  private readonly demoKey = 'trading-journal-demo-v1';
  constructor() {
    effect(() => {
      const user = this.auth.user();
      this.stop?.();
      this.entries.set([]);
      this.error.set('');
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
      this.stop = onSnapshot(
        query(collection(this.auth.db, 'users', user.uid, 'entries'), orderBy('date')),
        { includeMetadataChanges: true },
        (snapshot) => {
          try {
            const entries = snapshot.docs.map((d) => d.data() as Entry);
            entries.forEach(validateEntry);
            this.entries.set(entries);
            this.cached.set(snapshot.metadata.fromCache);
            this.error.set('');
          } catch {
            this.error.set('A stored record has invalid data. Check your Firebase console.');
          }
          this.loading.set(false);
        },
        (error) => {
          this.entries.set([]);
          this.error.set(friendlyError(error));
          this.loading.set(false);
        },
      );
    });
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
