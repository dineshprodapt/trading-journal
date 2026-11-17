import { tradingRulesConfig } from './trading-rules.config';

export const reviewVersion = 1;
export const reviewRules = JSON.stringify(tradingRulesConfig).replace(/<[^>]*>/g, '').replace(/&amp;/g, '&');
export interface ReviewNote { date: string; notes: string }
export function reviewErrorMessage(error: unknown): string {
  const value = error as { code?: string; details?: { reason?: string; retryAfterSeconds?: number } };
  if (value?.code === 'functions/aborted') {
    const seconds = value.details?.retryAfterSeconds;
    return typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0
      ? `An earlier review is still processing. Try again in about ${Math.ceil(seconds)} seconds. This is not the daily limit.`
      : 'An earlier review is still processing. Please wait before retrying. This is not the daily limit.';
  }
  if (value?.code === 'functions/resource-exhausted') return value.details?.reason === 'daily-limit'
    ? 'You have used all 10 analysis attempts for today. The limit resets at 5:30 AM India time (midnight UTC).'
    : 'Analysis is temporarily rate-limited. Please wait and retry.';
  return 'AI review could not complete. Check your connection and AI setup, then retry. Any saved report is preserved.';
}
export interface Finding {
  title: string;
  explanation: string;
  action: string;
  certainty: 'supported' | 'possible';
  evidence: { date: string; quote: string }[];
}
export interface MonthlyReview {
  month: string;
  generatedAt: string;
  model: string;
  sourceKey: string;
  findings: Finding[];
}
export function reviewSource(notes: readonly ReviewNote[]): string {
  return JSON.stringify({ version: reviewVersion, rules: reviewRules,
    notes: notes.filter(n => n.notes.trim()).map(n => ({ date: n.date, notes: n.notes })).sort((a, b) => a.date.localeCompare(b.date)) });
}
export async function reviewKey(notes: readonly ReviewNote[]): Promise<string> {
  const bytes = new TextEncoder().encode(reviewSource(notes));
  return Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
}
// Validate citations against server-read notes, never model-supplied counts.
export function validateFindings(value: unknown, notes: readonly ReviewNote[]): Finding[] {
  const findings = (value as { findings?: unknown })?.findings;
  if (!Array.isArray(findings) || findings.length > 20) throw Error('Invalid review');
  const titles = new Set<string>();
  return findings.map((f: Finding) => {
    if (!f || ![f.title, f.explanation, f.action].every(s => typeof s === 'string' && s.trim().length > 0 && s.length <= 2000)
      || !['supported', 'possible'].includes(f.certainty) || !Array.isArray(f.evidence) || !f.evidence.length || f.evidence.length > 31
      || titles.has(f.title.toLowerCase())) throw Error('Invalid finding');
    titles.add(f.title.toLowerCase());
    const dates = new Set<string>();
    for (const e of f.evidence) {
      if (!e || typeof e.quote !== 'string' || !e.quote.trim() || dates.has(e.date)
        || !notes.some(n => n.date === e.date && n.notes.includes(e.quote))) throw Error('Unsupported evidence');
      dates.add(e.date);
    }
    return { title: f.title, explanation: f.explanation, action: f.action, certainty: f.certainty,
      evidence: f.evidence.map(e => ({ date: e.date, quote: e.quote })).sort((a, b) => a.date.localeCompare(b.date)) };
  }).sort((a, b) => Number(b.certainty === 'supported') - Number(a.certainty === 'supported') || b.evidence.length - a.evidence.length);
}
