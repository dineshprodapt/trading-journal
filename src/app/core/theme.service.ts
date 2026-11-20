import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly current = signal<'light' | 'dark'>('light');
  readonly theme = this.current.asReadonly();
  private hasPreference = false;

  constructor() {
    let theme: 'light' | 'dark' = this.document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light';
    try {
      const saved = this.document.defaultView?.localStorage.getItem('trading-journal-theme');
      if (saved === 'light' || saved === 'dark') {
        theme = saved;
        this.hasPreference = true;
      }
    } catch {}
    this.apply(theme);
  }

  toggle() {
    const next = this.current() === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  setTheme(theme: 'light' | 'dark') {
    this.hasPreference = true;
    this.apply(theme);
    try {
      this.document.defaultView?.localStorage.setItem('trading-journal-theme', theme);
    } catch {}
  }

  setDefaultTheme(theme: 'light' | 'dark') {
    if (!this.hasPreference) this.setTheme(theme);
  }

  private apply(theme: 'light' | 'dark') {
    this.current.set(theme);
    this.document.documentElement.setAttribute('data-bs-theme', theme);
    this.document.documentElement.style.colorScheme = theme;
  }
}
