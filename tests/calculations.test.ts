import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dailyRows,
  monthlyRows,
  worstLoss,
  summary,
  toPaise,
  validateEntry,
  Entry,
} from '../src/app/core/journal.model';
import { csvCell, csvContent } from '../src/app/core/export.service';
const e = (date: string, pnl: number, capital: number | null = 100000): Entry => ({
  date,
  pnl,
  startingCapital: capital,
  notes: '',
  tradeCount: null,
  revision: 1,
});
test('blank vs zero capital and flat days preserve workbook semantics', () => {
  const entries = [e('2026-10-01', 50000, null), e('2026-10-02', -25000, 0), e('2026-10-03', 0)];
  const rows = dailyRows(entries),
    s = summary(entries);
  assert.deepEqual(
    rows.map((r) => r.dailyReturn),
    [null, null, 0],
  );
  assert.equal(rows[0].endingCapital, null);
  assert.equal(s.days, 3);
  assert.equal(s.winRate, 50);
  assert.equal(s.average, 25000 / 3);
  assert.equal(s.flat, 1);
});
test('chronological cumulative totals recalculate after an earlier edit and deletion', () => {
  const entries = [e('2026-11-01', -200), e('2026-10-02', 500), e('2026-10-01', 1000)];
  assert.deepEqual(
    dailyRows(entries).map((r) => r.cumulative),
    [1000, 1500, 1300],
  );
  entries[2].pnl = 2000;
  assert.deepEqual(
    dailyRows(entries).map((r) => r.cumulative),
    [2000, 2500, 2300],
  );
  assert.equal(dailyRows(entries.slice(0, 2))[1].cumulative, 300);
});
test('monthly summary includes empty months without inventing win rates', () => {
  const months = monthlyRows(
    [e('2026-10-01', 500), e('2026-12-01', -200)],
    ['2026-10', '2026-11', '2026-12'],
  );
  assert.equal(months[1].days, 0);
  assert.equal(months[1].average, null);
  assert.equal(months[1].winRate, null);
  assert.deepEqual(
    months.map((m) => m.cumulative),
    [500, 500, 300],
  );
});
test('trade count totals do not infer counts from notes', () => {
  const entries = [{ ...e('2026-10-01', 500), tradeCount: 4 }, e('2026-10-02', 0)];
  assert.equal(summary(entries).trades, 4);
  assert.equal(summary(entries).missingCounts, 1);
  assert.equal(summary([]).winRate, null);
  assert.equal(summary([e('2026-10-01', 0)]).winRate, null);
});
test('money converts to paise and invalid amounts/dates/counts are rejected', () => {
  assert.equal(toPaise('0.29'), 29);
  assert.equal(toPaise(null), null);
  assert.equal(toPaise(0), 0);
  assert.throws(() => toPaise('1.234'));
  assert.throws(() => toPaise('NaN'));
  assert.throws(() => validateEntry(e('2026-02-30', 0)));
  assert.throws(() => validateEntry({ ...e('2026-01-01', 0), tradeCount: 1.5 }));
  assert.doesNotThrow(() => validateEntry(e('2028-02-29', 0)));
});
test('CSV escapes user formulas and preserves numeric loss values and multiline notes', () => {
  assert.equal(csvCell('=SUM(A1)'), `"'=SUM(A1)"`);
  assert.equal(csvCell('  @evil'), `"'  @evil"`);
  assert.equal(csvCell(-250), '"-250"');
  const data = csvContent(
    dailyRows([{ ...e('2026-10-01', -25000), notes: 'hello, "world"\nnext' }]),
  );
  assert.ok(data.startsWith('\ufeff'));
  assert.ok(data.includes('"-250"'));
  assert.ok(data.includes('"hello, ""world""\nnext"'));
});
test('Excel export produces readable sheets with numeric money and text notes', async () => {
  const { ExportService } = await import('../src/app/core/export.service');
  const ExcelJS = await import('exceljs');
  const oldCreate = URL.createObjectURL;
  const oldDocument = globalThis.document;
  let captured: Blob | undefined;
  URL.createObjectURL = (blob: Blob) => {
    captured = blob;
    return 'blob:test';
  };
  Object.assign(globalThis, {
    document: { createElement: () => ({ href: '', download: '', click() {} }) },
  });
  try {
    await new ExportService().excel(
      dailyRows([{ ...e('2026-10-01', -25000), notes: '=NOT_A_FORMULA' }]),
    );
    assert.ok(captured);
    const workbook = new ExcelJS.default.Workbook();
    await workbook.xlsx.load(Buffer.from(await captured.arrayBuffer()));
    assert.equal(workbook.worksheets.length, 3);
    assert.equal(workbook.getWorksheet('Daily Tracker')!.getCell('E2').value, -250);
    assert.equal(workbook.getWorksheet('Daily Tracker')!.getCell('F2').value, '=NOT_A_FORMULA');
    assert.equal(workbook.getWorksheet('Monthly Summary')!.getCell('E2').value, -250);
  } finally {
    URL.createObjectURL = oldCreate;
    Object.assign(globalThis, { document: oldDocument });
  }
});

test('worst loss excludes profits and flat results, and chooses the largest loss', () => {
  assert.equal(worstLoss([]), null);
  assert.equal(worstLoss([e('2026-10-01', 100), e('2026-10-02', 0)]), null);
  const entries = [
    e('2026-10-01', 500),
    e('2026-10-02', -100),
    e('2026-11-01', -300),
    e('2026-12-01', -200),
  ];
  assert.equal(worstLoss(entries)?.pnl, -300);
  const months = monthlyRows(entries, ['2026-10', '2026-11', '2026-12', '2027-01']);
  assert.equal(worstLoss(months)?.month, '2026-11');
  assert.equal(worstLoss(months.filter((m) => m.month === '2026-10')), null);
  assert.equal(worstLoss(entries.filter((e) => e.date.startsWith('2026-10')))?.pnl, -100);
});
