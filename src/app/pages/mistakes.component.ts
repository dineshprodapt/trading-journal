import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JournalLoaderComponent } from '../shared/journal-loader.component';
import { JournalService } from '../core/journal.service';
import { monthLabel, today } from '../core/journal.model';
import { repeatedMistakes } from '../core/mistakes';
import { MonthlyReviewService } from '../core/monthly-review.service';
import { MonthlyReview, reviewKey, reviewErrorMessage } from '../core/monthly-review';

@Component({
  selector: 'app-mistakes',
  imports: [FormsModule, JournalLoaderComponent],
  templateUrl: './mistakes.component.html',
  styleUrl: './mistakes.component.scss',
})
export class MistakesComponent {
  readonly ai = inject(MonthlyReviewService);
  readonly report = signal<MonthlyReview | null>(null);
  readonly reviewLoading = signal(false);
  readonly analyzing = signal(false);
  readonly reviewError = signal('');
  readonly sourceKey = signal('');
  readonly stale = computed(() => !!this.report() && this.report()!.sourceKey !== this.sourceKey());
  readonly groups = computed(() => {
    const findings = this.report()?.findings ?? [];
    return [
      { title: 'Repeated mistakes', items: findings.filter(f => f.certainty === 'supported' && f.evidence.length >= 2) },
      { title: 'Isolated observations', items: findings.filter(f => f.certainty === 'supported' && f.evidence.length < 2) },
      { title: 'Possible patterns — review the evidence', items: findings.filter(f => f.certainty === 'possible') },
    ];
  });
  readonly journal = inject(JournalService);
  readonly repeatedFindings = computed(() => this.groups()[0].items);
  readonly monthlyFocus = computed(() => [...this.repeatedFindings()]
    .sort((a, b) => b.evidence.length - a.evidence.length)[0] ?? null);
  readonly month = signal(today().slice(0, 7));
  readonly monthLabel = monthLabel;
  readonly months = computed(() => [...new Set([today().slice(0, 7), ...this.journal.entries().map(e => e.date.slice(0, 7))])].sort().reverse());
  readonly notes = computed(() => this.journal.entries().filter(e => e.date.slice(0, 7) === this.month() && e.notes.trim()));
  readonly mistakes = computed(() => repeatedMistakes(this.journal.entries(), this.month()));
  constructor() {
    effect(onCleanup => {
      const month = this.month();
      this.ai.auth.user();
      let active = true;
      onCleanup(() => { active = false; });
      this.report.set(null);
      this.reviewError.set('');
      this.reviewLoading.set(true);
      void this.ai.read(month).then(report => { if (active) this.report.set(report); })
        .catch(() => { if (active) this.reviewError.set('Saved AI review could not be loaded. Check your connection and that AI review is deployed.'); })
        .finally(() => { if (active) this.reviewLoading.set(false); });
    });
    effect(onCleanup => {
      const notes = this.notes();
      let active = true;
      onCleanup(() => { active = false; });
      this.sourceKey.set('');
      void reviewKey(notes).then(key => { if (active) this.sourceKey.set(key); });
    });
  }
  async analyze() {
    if (this.analyzing()) return;
    const month = this.month();
    const uid = this.ai.auth.user()?.uid;
    this.analyzing.set(true);
    this.reviewError.set('');
    try {
      const report = await this.ai.analyze(month);
      if (month === this.month() && uid === this.ai.auth.user()?.uid) this.report.set(report);
    } catch (error) {
      if (month === this.month() && uid === this.ai.auth.user()?.uid) {
        this.reviewError.set(reviewErrorMessage(error));
      }
    } finally { this.analyzing.set(false); }
  }
}
