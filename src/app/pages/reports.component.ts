import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JournalService } from '../core/journal.service';
import { Entry, money, today } from '../core/journal.model';

@Component({
  selector: 'app-reports',
  imports: [FormsModule, DatePipe],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent {
  readonly journal = inject(JournalService);
  readonly money = money;
  readonly firstDate = '2026-10-01';
  readonly start = signal(this.firstDate);
  readonly end = signal(today() < this.firstDate ? this.firstDate : today());
  readonly preset = signal('All');
  readonly presets = ['Week', '15 Days', 'Month', '3 Months', 'Year', 'All'];
  readonly rangeEnd = computed(() => this.preset() === 'All'
    ? this.journal.entries().reduce((end, entry) => entry.date > end ? entry.date : end, this.end()) : this.end());
  readonly invalid = computed(() => !this.start() || !this.end() || this.start() < this.firstDate || this.end() > '2099-12-31' || this.start() > this.end());
  readonly entries = computed(() => this.invalid() ? [] : this.journal.entries().filter(e => e.date >= this.start() && e.date <= this.rangeEnd()));
  readonly total = computed(() => this.entries().reduce((sum, e) => sum + e.pnl, 0));
  readonly highestProfit = computed(() => this.entries().reduce<Entry | null>(
    (best, entry) => entry.pnl > 0 && (!best || entry.pnl > best.pnl || (entry.pnl === best.pnl && entry.date < best.date)) ? entry : best, null));
  readonly highestLoss = computed(() => this.entries().reduce<Entry | null>(
    (worst, entry) => entry.pnl < 0 && (!worst || entry.pnl < worst.pnl || (entry.pnl === worst.pnl && entry.date < worst.date)) ? entry : worst, null));
  readonly months = computed(() => {
    if (this.invalid()) return [];
    const entries = new Map(this.entries().map(e => [e.date, e.pnl]));
    const result = [];
    const cursor = new Date(this.start().slice(0, 7) + '-01T12:00:00');
    while (this.key(cursor).slice(0, 7) <= this.rangeEnd().slice(0, 7)) {
      const key = this.key(cursor).slice(0, 7);
      const count = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
      const days = Array.from({ length: count }, (_, i) => {
        const date = key + '-' + String(i + 1).padStart(2, '0');
        const pnl = entries.get(date);
        return { date, pnl, outside: date < this.start() || date > this.rangeEnd(),
          label: date + ': ' + (pnl === undefined ? 'No entry' : (pnl > 0 ? 'Profit ' : pnl < 0 ? 'Loss ' : 'Flat ') + money(pnl)) };
      });
      result.push({ key, date: key + '-01T12:00:00', offset: (cursor.getDay() + 6) % 7, days,
        total: days.reduce((sum, d) => sum + (d.pnl ?? 0), 0) });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return result;
  });
  selectPreset(value: string) {
    this.preset.set(value);
    const end = today() < this.firstDate ? this.firstDate : today();
    const date = new Date(end + 'T12:00:00');
    const days: Record<string, number> = { Week: 7, '15 Days': 15, Month: 30, '3 Months': 90, Year: 365 };
    date.setDate(date.getDate() - (days[value] ?? 1) + 1);
    this.start.set(value === 'All' ? this.firstDate : [this.firstDate, this.key(date)].sort()[1]);
    this.end.set(end);
  }
  private key(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
