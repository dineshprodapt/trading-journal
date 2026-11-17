import { Injectable, inject } from '@angular/core';
import { doc, getDocFromServer } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { AuthService } from './auth.service';
import { MonthlyReview, reviewKey } from './monthly-review';
import { JournalService } from './journal.service';

@Injectable({ providedIn: 'root' })
export class MonthlyReviewService {
  readonly auth = inject(AuthService);
  private readonly journal = inject(JournalService);
  private readonly reports = new Map<string, MonthlyReview | null>();
  private cacheKey(uid: string, month: string): string {
    return `trading-journal-ai-review-v1:${uid}:${month}`;
  }
  private cached(key: string): MonthlyReview | null | undefined {
    if (this.reports.has(key)) return this.reports.get(key);
    try {
      const saved = sessionStorage.getItem(key);
      if (saved !== null) {
        const report = JSON.parse(saved) as MonthlyReview | null;
        if (report === null || (typeof report.sourceKey === 'string' && Array.isArray(report.findings))) {
          this.reports.set(key, report);
          return report;
        }
      }
    } catch { /* Storage is optional. */ }
    return undefined;
  }
  private save(key: string, report: MonthlyReview | null): void {
    this.reports.set(key, report);
    try { sessionStorage.setItem(key, JSON.stringify(report)); } catch { /* Keep the in-memory cache. */ }
  }
  async read(month: string): Promise<MonthlyReview | null> {
    await this.auth.ready;
    if (this.auth.demo || !this.auth.user() || !this.auth.db) return null;
    const uid = this.auth.user()!.uid;
    const key = this.cacheKey(uid, month);
    const cached = this.cached(key);
    if (cached !== undefined) return cached;
    const snapshot = await getDocFromServer(doc(this.auth.db, 'users', uid, 'monthlyReviews', month));
    const report = snapshot.exists() ? snapshot.data() as MonthlyReview : null;
    this.save(key, report);
    return report;
  }
  async analyze(month: string): Promise<MonthlyReview> {
    await this.auth.ready;
    if (this.auth.demo || !this.auth.auth?.currentUser) throw Error('Sign in to use AI review.');
    const key = this.cacheKey(this.auth.auth.currentUser.uid, month);
    const cached = this.cached(key);
    const sourceKey = await reviewKey(this.journal.entries().filter(entry => entry.date.startsWith(`${month}-`)));
    if (cached && cached.sourceKey === sourceKey) return cached;
    const call = httpsCallable<{ month: string }, MonthlyReview>(getFunctions(this.auth.auth.app, 'asia-south1'), 'analyzeMonth', { timeout: 180000 });
    const report = (await call({ month })).data;
    this.save(key, report);
    return report;
  }
}
