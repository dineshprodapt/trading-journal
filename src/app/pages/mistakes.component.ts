import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JournalService } from '../core/journal.service';
import { monthLabel, today } from '../core/journal.model';
import { repeatedMistakes } from '../core/mistakes';

@Component({
  selector: 'app-mistakes',
  imports: [FormsModule],
  templateUrl: './mistakes.component.html',
  styleUrl: './mistakes.component.scss',
})
export class MistakesComponent {
  readonly journal = inject(JournalService);
  readonly month = signal(today().slice(0, 7));
  readonly monthLabel = monthLabel;
  readonly months = computed(() => [...new Set([today().slice(0, 7), ...this.journal.entries().map(e => e.date.slice(0, 7))])].sort().reverse());
  readonly notes = computed(() => this.journal.entries().filter(e => e.date.slice(0, 7) === this.month() && e.notes.trim()));
  readonly mistakes = computed(() => repeatedMistakes(this.journal.entries(), this.month()));
}
