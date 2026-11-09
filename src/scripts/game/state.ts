/**
 * Ruby's game state, saved in localStorage so it survives a reload.
 * Per visitor, private, and safe to lose: storage blocked just means no saving.
 */
import type { Mood } from '../mascot/types';

const KEY = 'nathanvj:ruby';

export interface GameState {
  xp: number;
  /** achievement id -> when it was earned */
  achievements: Record<string, number>;
  bones: string[];
  mood: Mood;
  /** last time the state was saved, to let time pass while you were away */
  savedAt: number;
}

const fresh = (): GameState => ({ xp: 0, achievements: {}, bones: [], mood: { happy: 70, full: 55, energy: 85 }, savedAt: Date.now() });

export const clamp100 = (v: number) => Math.max(0, Math.min(100, v));

export function loadState(): { state: GameState; minutesAway: number } {
  let state = fresh();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<GameState> | null;
    if (saved?.mood) state = { ...state, ...saved };
  } catch {
    /* no storage: play without saving */
  }
  // time passes while you're away: hungrier, a bit lonelier, well rested
  const minutesAway = Math.min(600, (Date.now() - state.savedAt) / 60000);
  const m = state.mood;
  m.full = clamp100(m.full - minutesAway * 2.2);
  m.happy = clamp100(Math.max(Math.min(m.happy, 35), m.happy - minutesAway * 1.5));
  m.energy = clamp100(m.energy + minutesAway * 4);
  return { state, minutesAway };
}

export function saveState(state: GameState): void {
  state.savedAt = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}
