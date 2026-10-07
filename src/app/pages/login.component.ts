import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, friendlyError } from '../core/auth.service';
@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  styles: [
    `.login-avatar-frame { width: 160px; height: 160px; overflow: hidden; flex: 0 0 160px; }
    .login-avatar { width: 100%; height: 100%; object-fit: cover; object-position: 64% center; }`,
  ],
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
      <h2>{{ register ? 'Create your account' : 'Welcome back' }}</h2>
      <p class="text-secondary">Sign in to access your journal across devices.</p>
      @if (auth.error()) {
        <div class="alert alert-warning" role="alert">{{ auth.error() }}</div>
      }
      @if (message()) {
        <div class="alert alert-info" role="status">{{ message() }}</div>
      }
      <form #form="ngForm" (ngSubmit)="submit()">
        <label class="form-label" for="email">Email</label
        ><input
          id="email"
          class="form-control mb-3"
          type="email"
          name="email"
          [(ngModel)]="email"
          required
          email
          autocomplete="email"
        />
        <label class="form-label" for="password">Password</label
        ><input
          id="password"
          class="form-control mb-3"
          type="password"
          name="password"
          [(ngModel)]="password"
          required
          minlength="8"
          [autocomplete]="register ? 'new-password' : 'current-password'"
        />
        <button class="btn btn-primary w-100" [disabled]="form.invalid || busy() || !!auth.error()">
          {{ busy() ? 'Please wait…' : register ? 'Create account' : 'Sign in' }}
        </button>
      </form>
      <button
        class="btn btn-outline-secondary mt-3"
        [disabled]="busy() || !!auth.error()"
        (click)="google()"
      >
        Continue with Google
      </button>
      <div class="d-flex flex-wrap justify-content-between gap-2 mt-4">
        <button
          class="btn btn-link p-0"
          [disabled]="busy()"
          (click)="register = !register; message.set('')"
        >
          {{ register ? 'Already have an account?' : 'Create an account' }}</button
        ><button
          class="btn btn-link p-0"
          [disabled]="busy() || !email || !!auth.error()"
          (click)="reset()"
        >
          Reset password
        </button>
      </div>
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
  email = '';
  password = '';
  register = false;
  busy = signal(false);
  message = signal('');
  async action(fn: () => Promise<unknown>, navigate = true) {
    this.busy.set(true);
    this.message.set('');
    try {
      await fn();
      if (navigate) await this.router.navigateByUrl('/journal');
    } catch (e) {
      this.message.set(friendlyError(e));
    } finally {
      this.busy.set(false);
    }
  }
  submit() {
    void this.action(() => this.auth.email(this.email.trim(), this.password, this.register));
  }
  google() {
    void this.action(() => this.auth.google());
  }
  reset() {
    void this.action(async () => {
      await this.auth.reset(this.email.trim());
      this.message.set('If an account exists, a reset email will arrive shortly.');
    }, false);
  }
}
