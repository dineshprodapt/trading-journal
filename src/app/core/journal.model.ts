export interface Entry {
  date: string;
  startingCapital: number | null; // integer paise, never binary floating-point money
  pnl: number; // integer paise; zero is a recorded flat day
  notes: string;
  tradeCount: number | null;
  revision: number;
}
export interface DailyRow extends Entry {
  day: string;
  month: string;
  endingCapital: number | null;
  dailyReturn: number | null;
  status: 'Profit' | 'Loss' | 'Flat';
  cumulative: number;
}
export interface MonthRow {
  month: string;
  days: number;
  wins: number;
  losses: number;
  flat: number;
  pnl: number;
  average: number | null;
  winRate: number | null;
  cumulative: number;
}
export const money = (paise: number | null): string =>
  paise === null
    ? '—'
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      }).format(paise / 100);
export const monthLabel = (month: string): string =>
  new Date(month + '-01T12:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
export function today(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  return ['year', 'month', 'day'].map((t) => parts.find((p) => p.type === t)!.value).join('-');
}
export function validateEntry(e: Entry): void {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(e.date) ||
    e.date < '1900-01-01' ||
    e.date > '2099-12-31' ||
    !Number.isFinite(Date.parse(e.date)) ||
    new Date(e.date).toISOString().slice(0, 10) !== e.date
  )
    throw Error('Enter a valid date between 1900 and 2099.');
  if (!Number.isSafeInteger(e.pnl) || Math.abs(e.pnl) > 1e12)
    throw Error('P&L must be within ±₹10 billion, with at most two decimal places.');
  if (
    e.startingCapital !== null &&
    (!Number.isSafeInteger(e.startingCapital) || e.startingCapital < 0 || e.startingCapital > 1e12)
  )
    throw Error('Starting capital must be non-negative and within ₹10 billion.');
  if (typeof e.notes !== 'string' || e.notes.length > 2000)
    throw Error('Notes must be 2,000 characters or fewer.');
  if (
    e.tradeCount !== null &&
    (!Number.isInteger(e.tradeCount) || e.tradeCount < 0 || e.tradeCount > 100000)
  )
    throw Error('Trade count must be a whole number between 0 and 100,000.');
  if (!Number.isInteger(e.revision) || e.revision < 1) throw Error('Invalid record version.');
}
export function toPaise(value: number | string | null): number | null {
  if (value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n * 100 - Math.round(n * 100)) > 0.0001)
    throw Error('Use amounts with at most two decimal places.');
  return Math.round(n * 100);
}
export function dailyRows(entries: Entry[]): DailyRow[] {
  let cumulative = 0;
  return [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => {
      cumulative += e.pnl;
      return {
        ...e,
        day: new Date(e.date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short' }),
        month: e.date.slice(0, 7),
        endingCapital: e.startingCapital === null ? null : e.startingCapital + e.pnl,
        dailyReturn: e.startingCapital ? (e.pnl / e.startingCapital) * 100 : null,
        status: e.pnl > 0 ? 'Profit' : e.pnl < 0 ? 'Loss' : 'Flat',
        cumulative,
      };
    });
}
export function summary(entries: Entry[]) {
  const wins = entries.filter((e) => e.pnl > 0).length,
    losses = entries.filter((e) => e.pnl < 0).length;
  const pnl = entries.reduce((s, e) => s + e.pnl, 0);
  return {
    days: entries.length,
    wins,
    losses,
    flat: entries.length - wins - losses,
    pnl,
    winRate: wins + losses ? (wins / (wins + losses)) * 100 : null,
    ratio: losses ? (wins / losses).toFixed(2) + ' : 1' : wins ? 'No loss days' : '—',
    trades: entries.reduce((s, e) => s + (e.tradeCount ?? 0), 0),
    missingCounts: entries.filter((e) => e.tradeCount === null).length,
    average: entries.length ? pnl / entries.length : null,
  };
}
export function monthlyRows(entries: Entry[], months?: string[]): MonthRow[] {
  const keys = months ?? [...new Set(entries.map((e) => e.date.slice(0, 7)))].sort();
  let cumulative = 0;
  return keys.map((month) => {
    const s = summary(entries.filter((e) => e.date.startsWith(month)));
    cumulative += s.pnl;
    return {
      month,
      days: s.days,
      wins: s.wins,
      losses: s.losses,
      flat: s.flat,
      pnl: s.pnl,
      average: s.average,
      winRate: s.winRate,
      cumulative,
    };
  });
}
