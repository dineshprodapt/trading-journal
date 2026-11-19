import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import { isAllowedAccount } from '../../src/app/core/access-policy';
import { reviewKey, reviewRules, validateFindings, ReviewNote, MonthlyReview } from '../../src/app/core/monthly-review';
import { instructions, schema, responseText } from './review';

initializeApp();
const apiKey = defineSecret('OPENAI_API_KEY');
const model = defineString('REVIEW_MODEL', { default: 'gpt-4.1' });
export const analyzeMonth = onCall({ region: 'asia-south1', invoker: 'public', secrets: [apiKey], timeoutSeconds: 180, maxInstances: 2 }, async request => {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in to analyze your notes.');
  if (!isAllowedAccount(auth.token.email ?? null, auth.token.email_verified === true, auth.token.firebase?.sign_in_provider ?? null))
    throw new HttpsError('permission-denied', 'This account cannot analyze notes.');
  const month = request.data?.month;
  if (typeof month !== 'string' || !/^(19|20)\d{2}-(0[1-9]|1[0-2])$/.test(month))
    throw new HttpsError('invalid-argument', 'Choose a valid month.');
  const db = getFirestore();
  const user = db.collection('users').doc(auth.uid);
  const snapshot = await user.collection('entries').where('date', '>=', month + '-01').where('date', '<=', month + '-31').get();
  const notes: ReviewNote[] = snapshot.docs.map(d => ({ date: d.id, notes: d.data().notes })).filter(n => typeof n.notes === 'string' && n.notes.trim());
  if (!notes.length) throw new HttpsError('failed-precondition', 'No notes in this month.');
  if (notes.length > 31 || notes.some(n => n.notes.length > 2000)) throw new HttpsError('failed-precondition', 'Notes exceed review limits.');
  const sourceKey = await reviewKey(notes);
  const ref = user.collection('monthlyReviews').doc(month);
  const lock = user.collection('reviewRequests').doc('usage');
  const requestId = globalThis.crypto.randomUUID();
  const cached = await db.runTransaction(async tx => {
    const [report, usage] = await Promise.all([tx.get(ref), tx.get(lock)]);
    if (report.data()?.sourceKey === sourceKey && report.data()?.model === model.value()) return report.data() as MonthlyReview;
    const now = Date.now();
    const state = usage.data();
    const day = new Date(now).toISOString().slice(0, 10);
    const count = state?.day === day ? state.count : 0;
    if (state && state.until > now) throw new HttpsError('aborted', 'An earlier review is still processing. Please wait before retrying.',
      { reason: 'review-in-progress', retryAfterSeconds: Math.ceil((state.until - now) / 1000) });
    if (count >= 10) throw new HttpsError('resource-exhausted', 'You have used all 10 analysis attempts for today. Try again after midnight UTC.',
      { reason: 'daily-limit' });
    tx.set(lock, { until: now + 180000, requestId, day, count: count + 1 });
    return null;
  });
  if (cached) return cached;
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', signal: AbortSignal.timeout(140000),
      headers: { Authorization: `Bearer ${apiKey.value()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model.value(), store: false, instructions,
        input: JSON.stringify({ month, rules: reviewRules, notes }), max_output_tokens: 12000,
        text: { format: { type: 'json_schema', name: 'monthly_review', strict: true, schema } } })
    });
    if (!response.ok) throw Error('Provider unavailable');
    const findings = validateFindings(JSON.parse(responseText(await response.json())), notes);
    const report: MonthlyReview = { month, sourceKey, model: model.value(), generatedAt: new Date().toISOString(), findings };
    // One document per user/month: replace only after the new review is validated.
    await ref.set(report);
    return report;
  } catch {
    // Do not log private notes, credentials or provider response bodies.
    throw new HttpsError('unavailable', 'AI review could not complete. Your previous report is preserved. Try again in a few minutes.');
  } finally {
    // Only release our own lease: an expired request must not unlock a newer one.
    await db.runTransaction(async tx => {
      const usage = await tx.get(lock);
      if (usage.data()?.requestId === requestId) tx.update(lock, { until: 0 });
    }).catch(() => { /* The lease expires automatically if cleanup is unavailable. */ });
  }
});
