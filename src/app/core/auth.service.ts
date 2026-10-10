import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { isAllowedAccount, unauthorizedMessage } from './access-policy';
import { initializeApp } from 'firebase/app';
import {
  Auth,
  User,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  setPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
} from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);
  private signingIn = false;
  readonly demo = environment.demo;
  readonly user = signal<User | null>(null);
  readonly error = signal('');
  readonly ready: Promise<void>;
  auth?: Auth;
  db?: Firestore;
  constructor() {
    this.ready = this.initialize();
  }
  private async initialize() {
    if (this.demo) return;
    if (
      !environment.firebase.apiKey ||
      !environment.firebase.projectId ||
      !environment.firebase.appId ||
      !environment.firebase.authDomain
    ) {
      this.error.set('Firebase is not configured. Follow README.md, then restart the app.');
      return;
    }
    try {
      const app = initializeApp(environment.firebase);
      this.auth = getAuth(app);
      this.db = getFirestore(app);
      await setPersistence(this.auth, browserSessionPersistence);
      await new Promise<void>((resolve, reject) =>
        onAuthStateChanged(
          this.auth!,
          (user) => {
            if (this.signingIn) return;
            void this.acceptUser(user).then(() => resolve(), reject);
          },
          reject,
        ),
      );
    } catch {
      this.error.set('Could not initialize Firebase. Check configuration and your connection.');
    }
  }
  private async client(): Promise<Auth> {
    await this.ready;
    if (!this.auth || this.error()) throw Error(this.error() || 'Firebase is unavailable.');
    return this.auth;
  }
  private async acceptUser(user: User | null): Promise<boolean> {
    this.user.set(null);
    if (!user) return false;
    const token = await user.getIdTokenResult();
    if (!isAllowedAccount(user.email, user.emailVerified, token.signInProvider)) {
      try {
        await signOut(this.auth!);
      } finally {
        window.alert(unauthorizedMessage);
        await this.router.navigateByUrl('/login', { replaceUrl: true });
      }
      return false;
    }
    // Do not expose an account to the journal until access is validated.
    if (this.auth?.currentUser?.uid !== user.uid) return false;
    this.user.set(user);
    return true;
  }
  async google(): Promise<boolean> {
    const auth = await this.client();
    this.signingIn = true;
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      return await this.acceptUser(result.user);
    } finally {
      this.signingIn = false;
    }
  }
  async logout() {
    await signOut(await this.client());
    this.user.set(null);
  }
}
export function friendlyError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/email-already-in-use': 'This email already has an account. Try signing in.',
    'auth/weak-password': 'Choose a stronger password (at least 8 characters).',
    'auth/popup-closed-by-user': 'Google sign-in was closed. Please try again.',
    'auth/popup-blocked': 'Allow the Google sign-in popup in your browser.',
    'auth/unauthorized-domain':
      'Add this hostname to Firebase Authentication → Authorized domains.',
    'auth/operation-not-allowed': 'Enable this sign-in provider in the Firebase console.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Connection failed. Check your internet connection.',
    'permission-denied': 'Access denied. Check that the supplied Firestore rules are deployed.',
    unavailable: 'Server unavailable. Reconnect before saving.',
    'resource-exhausted': 'Firebase quota reached. Check usage in the Firebase console.',
  };
  return code
    ? messages[code] || 'The request failed. Please try again or check Firebase configuration.'
    : error instanceof Error
      ? error.message
      : 'Something went wrong. Please try again.';
}
