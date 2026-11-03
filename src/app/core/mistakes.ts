import { Entry } from './journal.model';

// Conservative, local phrase matching: evidence is required on separate journal dates.
const patterns = [
  { title: 'Overtrading', match: /\b(overtrad\w*|too many trades|traded too much|excessive trad\w*)\b/, action: 'Set a trade limit before the session and stop when you reach it.' },
  { title: 'Revenge trading', match: /\b(revenge trad\w*|traded (?:to|trying to) (?:recover|make back)|chased (?:my )?losses)\b/, action: 'Take a break after a loss and require a fresh setup before re-entering.' },
  { title: 'Chasing entries / FOMO', match: /\b(fomo|chased (?:the )?(?:price|move|entry|rally)|chasing (?:the )?(?:price|move|entry)|fear of missing out)\b/, action: 'Define the entry zone in advance; let missed moves go.' },
  { title: 'Entering without confirmation', match: /\b(entered (?:too )?early|premature entr\w*|(?:entered|entry|traded) without (?:a )?confirmation|(?:did not|didn't|failed to) wait for confirmation)\b/, action: 'Wait for your setup confirmation before placing the order.' },
  { title: 'Ignoring the stop-loss', match: /\b(no (?:sl|stop[ -]?loss)|without (?:a )?(?:sl|stop[ -]?loss)|(?:ignored|removed|widened|didn't follow|did not follow) (?:my |the )?(?:sl|stop[ -]?loss)|held (?:the )?loser\w* too long)\b/, action: 'Set the stop before entry and never widen it to keep a losing trade open.' },
  { title: 'Oversized positions', match: /\b(oversiz\w*|too (?:much|many) (?:size|lots|quantity)|position (?:was )?too (?:big|large)|risked too much|excessive leverage)\b/, action: 'Size the position from your planned stop and fixed risk budget.' },
  { title: 'Taking profits too early', match: /\b((?:exited|exit|sold|booked profits?|took profits?) too (?:early|soon)|cut (?:my |the )?winners? short|panic sell\w*|panic sold)\b/, action: 'Use a planned exit rule instead of reacting to every price fluctuation.' },
  { title: 'Trading without a plan', match: /\b(impulsive trad\w*|impulse trad\w*|random entr\w*|random trad\w*|(?:traded|entered|trading) without (?:a )?(?:plan|setup)|broke (?:my |the )?(?:rules|plan))\b/, action: 'Check your setup, risk and exit criteria before every entry.' },
  { title: 'Averaging down', match: /\b(averag(?:ed|ing) down|added to (?:a |my |the )?los(?:ing|er)\w*(?: position| trade)?)\b/, action: 'Keep your original risk limit; do not add merely to improve the entry price.' },
];

export function repeatedMistakes(entries: readonly Entry[], month: string) {
  const notes = entries.filter(e => e.date.slice(0, 7) === month && e.notes.trim());
  return patterns.map(pattern => {
    const evidence = new Map<string, string>();
    for (const entry of notes) {
      const clauses = entry.notes.toLowerCase().replaceAll('’', "'").split(/[.!?;\n]+|\bbut\b/);
      if (clauses.some(clause => {
        const match = pattern.match.exec(clause);
        if (!match) return false;
        const before = clause.slice(0, match.index);
        // Do not turn prevention, future intentions or negated actions into mistakes.
        return !/\b(?:avoid\w*|prevent\w*|stop\w*|no|not|never|without|didn't|don't|did not|do not|should|must|will|need to|try to|remember to)\b/.test(before);
      })) evidence.set(entry.date, entry.notes);
    }
    return { title: pattern.title, action: pattern.action, evidence: [...evidence].sort(([a], [b]) => a.localeCompare(b)).map(([date, notes]) => ({ date, notes })) };
  }).filter(mistake => mistake.evidence.length >= 2)
    .sort((a, b) => b.evidence.length - a.evidence.length || a.title.localeCompare(b.title));
}
