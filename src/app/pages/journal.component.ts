import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, friendlyError } from '../core/auth.service';
import { JournalService } from '../core/journal.service';
import {
  DailyRow,
  Entry,
  dailyRows,
  summary,
  monthlyRows,
  money,
  monthLabel,
  today,
  toPaise,
} from '../core/journal.model';
import { ExportService } from '../core/export.service';
import { TrendChartComponent } from '../shared/trend-chart.component';
@Component({
  selector: 'app-journal',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TrendChartComponent],
  templateUrl: './journal.component.html',
})
export class JournalComponent {
  auth = inject(AuthService);
  displayName = computed(() => {
    const user = this.auth.user();
    return (
      user?.providerData
        .find((provider) => provider.providerId === 'google.com')
        ?.displayName?.trim() ||
      user?.displayName?.trim() ||
      (this.auth.demo ? 'Demo Trader' : 'Trader')
    );
  });
  quotesPaused = signal(false);
  readonly quotes = [
    'Trust your process',
    'Patience builds progress',
    'Discipline over impulse',
    'Reflect. Refine. Repeat.',
    'Small steps matter',
    'Stay curious',
  ];
  journal = inject(JournalService);
  exporter = inject(ExportService);
  router = inject(Router);
  fb = inject(FormBuilder);
  money = money;
  monthLabel = monthLabel;
  month = signal('');
  search = signal('');
  status = signal('');
  page = signal(1);
  pageSize = signal(10);
  sort = signal<keyof DailyRow>('date');
  descending = signal(true);
  busy = signal(false);
  notice = signal('');
  error = signal('');
  showForm = signal(false);
  editing = signal<Entry | null>(null);
  deleting = signal<Entry | null>(null);
  form = this.fb.group({
    date: [today(), [Validators.required]],
    startingCapital: this.fb.control<number | null>(null, [
      Validators.min(0),
      Validators.max(1e10),
    ]),
    pnl: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(-1e10),
      Validators.max(1e10),
    ]),
    notes: ['', [Validators.maxLength(2000)]],
    tradeCount: this.fb.control<number | null>(null, [
      Validators.min(0),
      Validators.max(100000),
      Validators.pattern(/^\d+$/),
    ]),
  });
  all = computed(() => dailyRows(this.journal.entries()));
  months = computed(() =>
    [
      ...new Set([
        ...Array.from({ length: 13 }, (_, i) => {
          const d = new Date(2026, 9 + i, 1);
          return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        }),
        ...this.all().map((e) => e.month),
      ]),
    ].sort(),
  );
  period = computed(() => this.all().filter((e) => !this.month() || e.month === this.month()));
  metrics = computed(() => summary(this.period()));
  monthly = computed(() =>
    monthlyRows(this.period(), this.month() ? [this.month()] : this.months()),
  );
  activeMonths = computed(() => this.monthly().filter((m) => m.days > 0));
  bestMonth = computed(() => [...this.activeMonths()].sort((a, b) => b.pnl - a.pnl)[0]);
  worstMonth = computed(() => [...this.activeMonths()].sort((a, b) => a.pnl - b.pnl)[0]);
  bestDay = computed(() =>
    this.period().length ? Math.max(...this.period().map((e) => e.pnl)) : null,
  );
  worstDay = computed(() =>
    this.period().length ? Math.min(...this.period().map((e) => e.pnl)) : null,
  );
  filtered = computed(() =>
    this.period().filter(
      (e) =>
        (!this.status() || e.status === this.status()) &&
        (!this.search() ||
          [e.date, e.day, e.month, e.notes, e.status]
            .join(' ')
            .toLowerCase()
            .includes(this.search().toLowerCase())),
    ),
  );
  sorted = computed(() =>
    [...this.filtered()].sort((a, b) => {
      const x = a[this.sort()],
        y = b[this.sort()];
      if (x === null) return y === null ? 0 : 1;
      if (y === null) return -1;
      const result =
        typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return (this.descending() ? -1 : 1) * result;
    }),
  );
  pages = computed(() => Math.max(1, Math.ceil(this.sorted().length / this.pageSize())));
  currentPage = computed(() => Math.min(this.page(), this.pages()));
  visible = computed(() =>
    this.sorted().slice(
      (this.currentPage() - 1) * this.pageSize(),
      this.currentPage() * this.pageSize(),
    ),
  );
  chartMonths = computed(() => this.monthly().map((m) => monthLabel(m.month)));
  chartMonthlyValues = computed(() => this.monthly().map((m) => m.pnl));
  chartDates = computed(() => this.period().map((e) => e.date));
  chartCumulative = computed(() => this.period().map((e) => e.cumulative));
  constructor() {
    effect(() => {
      if (!this.auth.demo && !this.auth.user()) void this.router.navigateByUrl('/login');
    });
  }
  changeMonth(value: string) {
    this.month.set(value);
    this.page.set(1);
  }
  order(key: keyof DailyRow) {
    if (this.sort() === key) this.descending.update((v) => !v);
    else {
      this.sort.set(key);
      this.descending.set(key === 'date');
    }
    this.page.set(1);
  }
  sortLabel(key: keyof DailyRow) {
    return this.sort() === key ? (this.descending() ? ' ↓' : ' ↑') : '';
  }
  add() {
    this.editing.set(null);
    this.form.reset({
      date: today(),
      startingCapital: null,
      pnl: null,
      notes: '',
      tradeCount: null,
    });
    this.openForm();
  }
  edit(e: Entry) {
    this.editing.set({ ...e });
    this.form.reset({
      date: e.date,
      startingCapital: e.startingCapital === null ? null : e.startingCapital / 100,
      pnl: e.pnl / 100,
      notes: e.notes,
      tradeCount: e.tradeCount,
    });
    this.openForm();
  }
  openForm() {
    this.error.set('');
    this.notice.set('');
    this.showForm.set(true);
    setTimeout(() => document.getElementById('entry-date')?.focus());
  }
  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const v = this.form.getRawValue(),
        previous = this.editing();
      const pnl = toPaise(v.pnl);
      if (pnl === null) throw Error('Enter P&L, including 0 for a flat day.');
      await this.journal.save(
        {
          date: v.date!,
          startingCapital: toPaise(v.startingCapital),
          pnl,
          notes: v.notes || '',
          tradeCount: v.tradeCount,
          revision: (previous?.revision ?? 0) + 1,
        },
        previous?.revision ?? null,
      );
      this.showForm.set(false);
      this.notice.set(
        this.auth.demo ? 'Saved on this browser in demo mode.' : 'Entry saved to Firestore.',
      );
    } catch (e) {
      this.error.set(friendlyError(e));
    } finally {
      this.busy.set(false);
    }
  }
  async confirmDelete() {
    const e = this.deleting();
    if (!e) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.journal.remove(e);
      this.deleting.set(null);
      this.notice.set('Entry deleted.');
    } catch (e) {
      this.error.set(friendlyError(e));
    } finally {
      this.busy.set(false);
    }
  }
  async logout() {
    try {
      await this.auth.logout();
      await this.router.navigateByUrl('/login');
    } catch (e) {
      this.error.set(friendlyError(e));
    }
  }
  samples() {
    try {
      this.journal.loadSamples();
    } catch {
      this.error.set('Browser storage is unavailable.');
    }
  }
  clearDemo() {
    if (confirm('Clear all local demo entries?')) {
      try {
        this.journal.clearDemo();
      } catch {
        this.error.set('Browser storage is unavailable.');
      }
    }
  }
  async exportExcel() {
    this.busy.set(true);
    try {
      await this.exporter.excel(this.all());
    } catch {
      this.error.set('Excel export failed. Try again or use CSV.');
    } finally {
      this.busy.set(false);
    }
  }
  export(all = false) {
    this.exporter.csv(all ? this.all() : this.sorted());
  }
}
