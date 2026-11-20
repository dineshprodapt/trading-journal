import { Component, input } from '@angular/core';

@Component({
  selector: 'app-journal-loader',
  template: `
    <div class="journal-loading-overlay">
      <section class="journal-loading-card" role="status" aria-live="polite" aria-atomic="true">
        <div class="journal-loading-art" aria-hidden="true">
          <div class="journal-loading-orbit"></div>
          <div class="journal-loading-bars"><i></i><i></i><i></i><i></i><i></i></div>
        </div>
        <p class="journal-loading-eyebrow">YOUR TRADING JOURNAL</p>
        <h1>Bringing your days into focus</h1>
        <p class="journal-loading-caption">{{ message() }}</p>
        <div class="journal-loading-track" aria-hidden="true"><span></span></div>
      </section>
    </div>
  `,
  styleUrl: './journal-loader.component.scss',
})
export class JournalLoaderComponent {
  readonly message = input('Preparing your journal…');
}
