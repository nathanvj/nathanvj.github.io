/** Shared shapes for the mascot engine. */

/** the top edge of a page element Ruby can stand on, in page coordinates (CSS px) */
export interface Platform {
  el: HTMLElement;
  x1: number;
  x2: number;
  y: number;
  /** position: fixed elements (the terminal) move with the viewport */
  fixed: boolean;
}

/** a place to jump to: a platform and an x on it */
export interface Spot {
  p: Platform;
  x: number;
}

export interface Pointer {
  x: number;
  y: number;
  /** performance.now() of the last move */
  t: number;
}

export interface Mood {
  happy: number;
  full: number;
  energy: number;
}
