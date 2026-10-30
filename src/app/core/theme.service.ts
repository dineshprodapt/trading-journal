import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly current = signal<'light' | 'dark'>('light');
  readonly theme = this.current.asReadonly();

  constructor() {
    this.apply('light');
  }

  toggle() {
    const next = this.current() === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  setTheme(theme: 'light' | 'dark') {
    this.apply(theme);
  }

  private apply(theme: 'light' | 'dark') {
    this.current.set(theme);
    this.document.documentElement.setAttribute('data-bs-theme', theme);
    this.document.documentElement.style.colorScheme = theme;
  }
}
