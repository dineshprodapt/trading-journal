import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, friendlyError } from '../core/auth.service';
@Component({
  selector: 'app-login',
  imports: [RouterLink],
  styleUrl: './login.component.scss',
  template: ` <main class="login-wrap">
    <section class="login-story">
      <div class="login-avatar-frame rounded-circle">
        <!-- Previous photo backup: <img class="login-avatar" src="assets/images/dinesh.JPEG?v=2" alt="Dinesh" /> -->
        <img class="login-avatar" src="assets/images/dinesh2.jpg?v=1" alt="Dinesh" />
      </div>
      <p class="eyebrow mt-4">DINESH TRADING JOURNAL</p>
      <h1>A clearer view<br />of every trading day.</h1>
      <p>Record the decisions. Understand the results.<br />Build a journal you can learn from.</p>
      <div class="story-line"></div>
      <small>Your daily tracker, brought to life.</small>
    </section>
    <section class="login-panel card">
      <p class="eyebrow">MY PRIVATE WORKSPACE</p>
      <div class="welcome-emblem" aria-hidden="true">✦</div>
      <h2>Your next chapter starts here.</h2>
      <p class="text-secondary">A fresh perspective. A little more clarity. Your journal awaits.</p>
      @if (auth.error()) {
        <div class="alert alert-warning" role="alert">{{ auth.error() }}</div>
      }
      @if (message()) {
        <div class="alert alert-warning" role="alert">{{ message() }}</div>
      }
      <div class="google-entry" [class.is-busy]="busy()">
        <span class="sparkle sparkle-one" aria-hidden="true">✦</span>
        <span class="sparkle sparkle-two" aria-hidden="true">✧</span>
        <span class="sparkle sparkle-three" aria-hidden="true">✦</span>
        <button
          type="button"
          class="google-button"
          [disabled]="busy() || !!auth.error()"
          [attr.aria-busy]="busy()"
          (click)="google()"
        >
          <svg class="google-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z"
            />
            <path
              fill="#34A853"
              d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
            />
            <path
              fill="#FBBC05"
              d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z"
            />
            <path
              fill="#EA4335"
              d="M12 5.96c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z"
            />
          </svg>
          <span>{{ busy() ? 'Connecting to Google…' : 'Continue with Google' }}</span>
          @if (busy()) {
            <span class="button-spinner" aria-hidden="true"></span>
          } @else {
            <span class="button-arrow" aria-hidden="true">→</span>
          }
        </button>
        <p class="entry-caption">One step closer to a clearer trading day.</p>
      </div>
      <span class="visually-hidden" role="status">{{
        busy() ? 'Opening Google sign-in. Please wait.' : ''
      }}</span>
      @if (auth.demo) {
        <a routerLink="/journal" class="btn btn-warning mt-4">Open local demo</a>
      }
      <small class="text-secondary mt-4"
        >Sign-in lasts for this browser session. Cloud records remain in your Firebase
        account.</small
      >
    </section>
  </main>`,
})
export class LoginComponent {
  auth = inject(AuthService);
  router = inject(Router);
  busy = signal(false);
  message = signal('');
  async google() {
    if (this.busy() || this.auth.error()) return;
    this.busy.set(true);
    this.message.set('');
    try {
      if (await this.auth.google()) {
        await this.router.navigateByUrl('/journal');
      }
    } catch (e) {
      this.message.set(friendlyError(e));
    } finally {
      this.busy.set(false);
    }
  }
}
