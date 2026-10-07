import { Injectable, signal } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  Auth,
  User,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  setPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
} from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
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
            this.user.set(user);
            resolve();
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
  async email(email: string, password: string, register: boolean) {
    const auth = await this.client();
    const result = await (register
      ? createUserWithEmailAndPassword(auth, email, password)
      : signInWithEmailAndPassword(auth, email, password));
    this.user.set(result.user);
  }
  async google() {
    const auth = await this.client();
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    this.user.set(result.user);
  }
  async reset(email: string) {
    await sendPasswordResetEmail(await this.client(), email);
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
