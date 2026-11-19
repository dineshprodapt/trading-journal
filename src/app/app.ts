import { Component, computed, effect, inject, signal } from '@angular/core';
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
  private readonly loginHold = signal(false);
  readonly loading = computed(() => this.navigating() || this.journal.loginPresentationPending() || this.loginHold());
  readonly loadingMessage = computed(() =>
    !this.auth.demo && !this.auth.user() ? 'Restoring your session…'
      : 'Opening your workspace…',
  );

  constructor() {
    effect(() => {
      if (!this.journal.loginPresentationPending()) return;
      // Let connection errors and retry controls remain reachable.
      if (this.journal.error() || this.journal.connectionDelayed() || (!this.auth.demo && !this.auth.user())) {
        this.journal.loginPresentationPending.set(false);
      } else if (!this.journal.loading() && !this.journal.cached()) {
        this.journal.loginPresentationPending.set(false);
        this.loginHold.set(true);
      }
    });
    effect(onCleanup => {
      if (!this.loginHold()) return;
      const timer = setTimeout(() => this.loginHold.set(false), 3000);
      onCleanup(() => clearTimeout(timer));
    });
    inject(Router).events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof NavigationStart) this.navigating.set(true);
      if (event instanceof NavigationEnd || event instanceof NavigationCancel ||
          event instanceof NavigationError || event instanceof NavigationSkipped) {
        this.navigating.set(false);
      }
    });
  }
}
