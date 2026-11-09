/**
 * Ruby Run's best score, kept in this browser only (localStorage). Losing it
 * is fine: blocked storage just means every run is a first run.
 */
const KEY = 'nathanvj:run';

export interface Scores {
  best: number;
  runs: number;
}

export function loadScores(): Scores {
  const fresh: Scores = { best: 0, runs: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Scores> | null;
    return { best: saved?.best ?? 0, runs: saved?.runs ?? 0 };
  } catch {
    return fresh;
  }
}

export function saveScores(s: Scores): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
