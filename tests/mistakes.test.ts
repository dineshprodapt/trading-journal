import { test } from 'node:test';
import assert from 'node:assert/strict';
import { repeatedMistakes } from '../src/app/core/mistakes';
import { Entry } from '../src/app/core/journal.model';
const entry = (date: string, notes: string): Entry => ({ date, notes, pnl: 100, startingCapital: null, tradeCount: 3, revision: 1 });
test('groups related wording across dates and isolates months', () => {
 const entries = [entry('2026-11-01', 'Overtraded today.'), entry('2026-11-02', 'Too many trades. FOMO.'), entry('2026-10-01', 'FOMO.')];
 const result = repeatedMistakes(entries, '2026-11');
 assert.deepEqual(result.map(x => x.title), ['Overtrading']);
 assert.equal(result[0].evidence.length, 2);
 assert.deepEqual(repeatedMistakes(entries, '2026-12'), []);
});
test('excludes prevention and negation, deduplicates dates, requires repeated evidence', () => {
 const entries = [entry('2026-11-01', 'Avoided overtrading. No FOMO. Never revenge traded.'), entry('2026-11-02', 'Did not overtrade. Should avoid FOMO.'), entry('2026-11-03', 'Overtraded. Overtraded.'), entry('2026-11-03', 'Overtraded.')];
 assert.deepEqual(repeatedMistakes(entries, '2026-11'), []);
});
test('recognizes failed confirmation and stop discipline without using P&L', () => {
 const entries = [entry('2026-11-01', "Didn't wait for confirmation. No stop loss."), entry('2026-11-02', 'Entered without confirmation. Ignored my SL.')];
 assert.equal(repeatedMistakes(entries, '2026-11').length, 2);
});
