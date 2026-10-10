import { readFileSync } from 'node:fs';
import { test, before, after } from 'node:test';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, deleteDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
let env: RulesTestEnvironment;
const entry = {
  date: '2026-10-01',
  startingCapital: 20000000,
  pnl: 50000,
  notes: 'Test',
  tradeCount: 2,
  revision: 1,
};
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-trading-journal',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
after(async () => {
  await env?.cleanup();
});
test('only owner can CRUD; invalid schema and stale revisions are rejected', async () => {
  const alice = env
      .authenticatedContext('alice', {
        email: 'dineshmick@gmail.com',
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore(),
    bob = env.authenticatedContext('bob').firestore(),
    anon = env.unauthenticatedContext().firestore();
  const path = 'users/alice/entries/2026-10-01';
  await assertSucceeds(setDoc(doc(alice, path), entry));
  await assertSucceeds(getDoc(doc(alice, path)));
  await assertFails(getDoc(doc(bob, path)));
  await assertFails(getDoc(doc(anon, path)));
  await assertFails(getDocs(collection(bob, 'users/alice/entries')));
  await assertFails(setDoc(doc(bob, path), { ...entry, revision: 2 }));
  await assertFails(deleteDoc(doc(bob, path)));
  await assertFails(updateDoc(doc(alice, path), { pnl: 70000 }));
  await assertFails(updateDoc(doc(alice, path), { revision: 2, extra: 'invalid' }));
  await assertFails(updateDoc(doc(alice, path), { revision: 2, tradeCount: -1 }));
  await assertFails(updateDoc(doc(alice, path), { revision: 2, pnl: 1.5 }));
  await assertSucceeds(updateDoc(doc(alice, path), { revision: 2, pnl: 70000 }));
  await assertSucceeds(deleteDoc(doc(alice, path)));
});

test('restricted access denies other accounts even for their own documents', async () => {
  for (const [uid, claims] of [
    [
      'other',
      {
        email: 'other@gmail.com',
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      },
    ],
    [
      'unverified',
      {
        email: 'dineshmick@gmail.com',
        email_verified: false,
        firebase: { sign_in_provider: 'google.com' },
      },
    ],
    [
      'password',
      {
        email: 'dineshmick@gmail.com',
        email_verified: true,
        firebase: { sign_in_provider: 'password' },
      },
    ],
    ['missing', {}],
  ] as const) {
    const db = env.authenticatedContext(uid, claims).firestore();
    const path = `users/${uid}/entries/2026-10-01`;
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), path), entry);
    });
    await assertFails(getDoc(doc(db, path)));
    await assertFails(getDocs(collection(db, `users/${uid}/entries`)));
    await assertFails(updateDoc(doc(db, path), { revision: 2, pnl: 100 }));
    await assertFails(deleteDoc(doc(db, path)));
    await assertFails(
      setDoc(doc(db, `users/${uid}/entries/2026-10-02`), { ...entry, date: '2026-10-02' }),
    );
  }
});
