import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly current = signal<'light' | 'dark'>('light');
  readonly theme = this.current.asReadonly();

  constructor() {
    let initial: 'light' | 'dark' = 'light';
    try {
      if (this.document.defaultView?.localStorage.getItem('trading-journal-theme') === 'dark') initial = 'dark';
    } catch { /* Storage may be disabled; the toggle still works for this session. */ }
    this.apply(initial);
  }

  toggle() {
    const next = this.current() === 'light' ? 'dark' : 'light';
    this.apply(next);
    try {
      this.document.defaultView?.localStorage.setItem('trading-journal-theme', next);
    } catch { /* Keep the in-memory preference when storage is unavailable. */ }
  }

  private apply(theme: 'light' | 'dark') {
    this.current.set(theme);
    this.document.documentElement.setAttribute('data-bs-theme', theme);
    this.document.documentElement.style.colorScheme = theme;
  }
}
