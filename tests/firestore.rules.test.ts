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
  const alice = env.authenticatedContext('alice').firestore(),
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
