import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ThemeService } from './core/theme.service';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationSkipped, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { JournalService } from './core/journal.service';
import { JournalLoaderComponent } from './shared/journal-loader.component';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, JournalLoaderComponent],
  template: `
    <div [attr.inert]="loading() ? '' : null" [attr.aria-busy]="loading()">
      <router-outlet />
    </div>
    @if (loading()) {
      <app-journal-loader [message]="loadingMessage()" />
    }
  `,
})
export class App {
  readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);
  // Subscribe as soon as the account is validated, alongside the lazy route download.
  private readonly journal = inject(JournalService);
  private readonly navigating = signal(true);
  readonly loading = computed(() => this.navigating());
  readonly loadingMessage = computed(() =>
    !this.auth.demo && !this.auth.user() ? 'Restoring your session…'
      : 'Opening your workspace…',
  );

  constructor() {
    inject(Router).events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof NavigationStart) this.navigating.set(true);
      if (event instanceof NavigationEnd || event instanceof NavigationCancel ||
          event instanceof NavigationError || event instanceof NavigationSkipped) {
        this.navigating.set(false);
      }
    });
  }
}
