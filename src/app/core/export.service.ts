import { Injectable } from '@angular/core';
import { DailyRow, monthlyRows } from './journal.model';
export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (typeof value === 'string' && /^[\s]*[=+\-@\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function csvContent(rows: DailyRow[]): string {
  const headers = [
    'Date',
    'Day',
    'Month',
    'Starting Capital (₹)',
    'Profit / Loss (₹)',
    'Trades / Notes',
    'Ending Capital (₹)',
    'Daily Return %',
    'P&L Status',
    'Cumulative P&L (₹)',
    'Trade Count',
  ];
  const rupees = (v: number | null) => (v === null ? '' : v / 100);
  return (
    '\ufeff' +
    [
      headers,
      ...rows.map((e) => [
        e.date,
        e.day,
        e.month,
        rupees(e.startingCapital),
        rupees(e.pnl),
        e.notes,
        rupees(e.endingCapital),
        e.dailyReturn ?? '',
        e.status,
        rupees(e.cumulative),
        e.tradeCount ?? '',
      ]),
    ]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n')
  );
}
@Injectable({ providedIn: 'root' })
export class ExportService {
  csv(rows: DailyRow[]) {
    this.download(csvContent(rows), 'trading-journal.csv', 'text/csv;charset=utf-8');
  }
  async excel(rows: DailyRow[]) {
    const ExcelJS = await import('exceljs');
    const book = new ExcelJS.default.Workbook();
    book.creator = 'Trading Journal';
    const daily = book.addWorksheet('Daily Tracker');
    daily.addRow([
      'Date',
      'Day',
      'Month',
      'Starting Capital (₹)',
      'Profit / Loss (₹)',
      'Trades / Notes',
      'Ending Capital (₹)',
      'Daily Return %',
      'P&L Status',
      'Cumulative P&L (₹)',
      'Trade Count',
    ]);
    for (const e of rows)
      daily.addRow([
        e.date,
        e.day,
        e.month,
        e.startingCapital === null ? null : e.startingCapital / 100,
        e.pnl / 100,
        e.notes,
        e.endingCapital === null ? null : e.endingCapital / 100,
        e.dailyReturn === null ? null : e.dailyReturn / 100,
        e.status,
        e.cumulative / 100,
        e.tradeCount,
      ]);
    for (const n of [4, 5, 7, 10]) daily.getColumn(n).numFmt = '#,##0.00;[Red]-#,##0.00';
    daily.getColumn(8).numFmt = '0.00%';
    daily.getColumn(6).width = 45;
    const monthly = book.addWorksheet('Monthly Summary');
    monthly.addRow([
      'Month',
      'Trading Days',
      'Profitable Days',
      'Loss Days',
      'Total P&L (₹)',
      'Avg Daily P&L (₹)',
      'Win Rate %',
      'Export Cumulative P&L (₹)',
    ]);
    for (const m of monthlyRows(rows))
      monthly.addRow([
        m.month,
        m.days,
        m.wins,
        m.losses,
        m.pnl / 100,
        m.average === null ? null : m.average / 100,
        m.winRate === null ? null : m.winRate / 100,
        m.cumulative / 100,
      ]);
    for (const n of [5, 6, 8]) monthly.getColumn(n).numFmt = '#,##0.00;[Red]-#,##0.00';
    monthly.getColumn(7).numFmt = '0.00%';
    const readme = book.addWorksheet('Read Me');
    readme.addRow([
      'Exported values are a snapshot, not formulas. Edit the application and export again to recalculate.',
    ]);
    readme.addRow([
      'Daily cumulative P&L is all-time; monthly cumulative includes only exported rows.',
    ]);
    readme.addRow([
      'Win rate and win/loss are day-based. Flat days count in averages but not win rate.',
    ]);
    readme.getColumn(1).width = 110;
    for (const sheet of [daily, monthly]) {
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
      sheet.autoFilter = { from: 'A1', to: { row: 1, column: sheet.columnCount } };
      sheet.columns.forEach((col) => {
        if (!col.width) col.width = 22;
      });
      sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF146B59' } };
      });
      sheet.getRow(1).height = 28;
    }
    const bytes = await book.xlsx.writeBuffer();
    const url = URL.createObjectURL(
      new Blob([new Uint8Array(bytes)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trading-journal.xlsx';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  private download(content: string, name: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
