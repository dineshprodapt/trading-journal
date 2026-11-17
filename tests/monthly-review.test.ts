import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewKey, validateFindings, reviewErrorMessage } from '../src/app/core/monthly-review';

test('processing conflicts do not claim the daily quota was exhausted', () => {
  const busy = reviewErrorMessage({ code: 'functions/aborted', details: { retryAfterSeconds: 81 } });
  assert.match(busy, /81 seconds/);
  assert.doesNotMatch(busy, /used all 10/);
  assert.match(reviewErrorMessage({ code: 'functions/resource-exhausted', details: { reason: 'daily-limit' } }), /used all 10/);
  assert.doesNotMatch(reviewErrorMessage({ code: 'functions/resource-exhausted' }), /used all 10/);
});

const notes = [
  { date: '2026-11-01', notes: 'Wanted my money back. Entered without a setup.' },
  { date: '2026-11-02', notes: 'Could not accept being red. Took an unnecessary position.' },
];
const finding = { title: 'Loss-driven entries', explanation: 'Both notes describe unplanned recovery entries.',
  action: 'Require a fresh setup after a loss.', certainty: 'supported',
  evidence: notes.map(n => ({ date: n.date, quote: n.notes })) };
test('accepts evidence across differently worded notes, without relying on keywords', () => {
  assert.equal(validateFindings({ findings: [finding] }, notes)[0].evidence.length, 2);
});
test('rejects fabricated quotes, dates and duplicate dates', () => {
  for (const evidence of [
    [{ date: notes[0].date, quote: 'I revenge traded' }],
    [{ date: '2026-10-01', quote: notes[0].notes }],
    [finding.evidence[0], finding.evidence[0]],
    [],
  ]) assert.throws(() => validateFindings({ findings: [{ ...finding, evidence }] }, notes));
});
test('keeps uncertain observations distinct and sorts supported recurrence first', () => {
  const possible = { ...finding, title: 'Possible oversized risk', certainty: 'possible' };
  const single = { ...finding, title: 'Single incident', evidence: [finding.evidence[0]] };
  assert.deepEqual(validateFindings({ findings: [possible, single, finding] }, notes).map(f => f.title),
    [finding.title, single.title, possible.title]);
  assert.deepEqual(validateFindings({ findings: [] }, notes), []);
});
test('source fingerprint ignores ordering but changes for edits and deletions', async () => {
  assert.equal(await reviewKey(notes), await reviewKey([...notes].reverse()));
  assert.notEqual(await reviewKey(notes), await reviewKey(notes.slice(1)));
  assert.notEqual(await reviewKey(notes), await reviewKey([{ ...notes[0], notes: 'Avoided revenge trading.' }, notes[1]]));
});
