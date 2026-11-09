/**
 * The page's event bus. Engines (Ruby, the landscape) only announce what happened;
 * the game and the UI listen. That keeps the layers independent.
 */

export type RubyEvent = 'hello' | 'pet' | 'fetch' | 'play' | 'treat' | 'fly' | 'throw';

export interface Events {
  /** something happened to Ruby */
  ruby: { type: RubyEvent };
  /** someone clicked Kwak in the ditch (page coordinates) */
  'water:duck': { x: number; y: number };
  /** someone clicked the boat with the two of us (page coordinates) */
  'water:boat': { x: number; y: number };
  /** day or night changed */
  theme: { theme: 'day' | 'night' };
  'terminal:open': Record<string, never>;
  /** a game of Ruby Run ended: how far, how many bones, and whether the sky turned on the way */
  'run:over': { metres: number; bones: number; skyTurned: boolean };
}

export function emit<K extends keyof Events>(name: K, detail: Events[K]): void {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

export function on<K extends keyof Events>(name: K, fn: (detail: Events[K]) => void): void {
  document.addEventListener(name, (e) => fn((e as CustomEvent<Events[K]>).detail));
}
