/**
 * The course: what comes Ruby's way, generated just ahead of her from a seed.
 *
 * Things are placed by distance, never by time, so a slow frame can't change
 * what comes next. It starts with lone bollards and slowly mixes in bikes,
 * pigeons, tulips and combinations as the metres add up.
 */
import { rng } from '../scene/env';
import { sprites, type ObstacleKind } from './sprites';

/** native px per metre on a wide screen; narrow screens scale it down with the speed */
export const PX_PER_M = 8;

export type ThingKind = ObstacleKind | 'bone' | 'waffle';

export interface Thing {
  kind: ThingKind;
  /** world x of its left edge, native px */
  x: number;
  /** how high its bottom is above the ground */
  alt: number;
  /** pigeons fly the same way as Ruby (slower, so she catches up); cyclists ride at her */
  vx: number;
  /** things that move: where Ruby should meet it; it sets off once it can enter from the right */
  meet?: number;
  /** seconds since a moving thing set off (the cyclist rings the bell first) */
  age?: number;
  active: boolean;
  /** eaten, or knocked off the street */
  gone: boolean;
  /** knocked flying during zoomies: offset, speed and spin */
  knock?: { dx: number; dy: number; vx: number; vy: number; spin: number };
  /** to keep bones and wings out of step with each other */
  phase: number;
}

/** a low pigeon is ducked under; a high one is only dangerous if you jump */
export const PIGEON_ALT = { low: 17, high: 38 } as const;
const PIGEON_SPEED = 22, CYCLIST_SPEED = -50;

/** how fast the street scrolls at a distance, native px per second */
export const speedAt = (m: number, unit: number): number => (150 + Math.min(m, 1500) * 0.12) * unit;

export class Course {
  private readonly r: () => number;
  private readonly unit: number;
  private cursor: number;
  private nextWaffle: number;

  /** `unit` scales the course on smaller stages; `startAt` is the world x of the first obstacle */
  constructor(seed: number, unit: number, startAt: number) {
    this.r = rng(seed);
    this.unit = unit;
    this.cursor = startAt;
    this.nextWaffle = 380 + this.r() * 200;
  }

  metres(x: number): number {
    return x / (PX_PER_M * this.unit);
  }

  /** generate everything up to world x `until` */
  fill(until: number, out: Thing[]): void {
    while (this.cursor < until) this.next(out);
  }

  private next(out: Thing[]): void {
    const r = this.r, m = this.metres(this.cursor), sp = speedAt(m, this.unit);
    const d = Math.min(1, m / 1500);
    const S = sprites();
    const widthOf = (k: ThingKind) => (k === 'bone' ? 12 : k === 'waffle' ? 13 : k === 'pigeon' ? S.pigeon[0].w : k === 'cyclist' ? S.cyclist[0][0].w : S[k].w);
    const add = (kind: ThingKind, x: number, alt = 0, extra: Partial<Thing> = {}): number => {
      out.push({ kind, x, alt, vx: 0, active: true, gone: false, phase: r() * 6, ...extra });
      return x + widthOf(kind);
    };
    const row = (kind: ObstacleKind, x: number, n: number, spacing: number): number => {
      let end = x;
      for (let i = 0; i < n; i++) end = add(kind, x + i * spacing);
      return end;
    };
    const pigeon = (x: number, alt: number): number => add('pigeon', x, alt, { meet: x, vx: PIGEON_SPEED * this.unit, active: false });
    const cyclist = (x: number): number => add('cyclist', x, 0, { meet: x, vx: CYCLIST_SPEED * this.unit, active: false });
    const flock = (x: number, n: number): number => {
      let end = x;
      for (let i = 0; i < n; i++) end = pigeon(x + i * 18, PIGEON_ALT.low + (i % 2));
      return end;
    };

    /** from: metres before it shows up; ground: something on the cobbles you jump over */
    const all: { from: number; weight: number; ground: boolean; make: (x: number) => number }[] = [
      { from: 0, weight: 3, ground: true, make: (x) => add('bollard', x) },
      { from: 40, weight: 2, ground: true, make: (x) => add('bike', x) },
      { from: 100, weight: 1.7, ground: false, make: (x) => pigeon(x, PIGEON_ALT.low) },
      { from: 150, weight: 1.4, ground: true, make: (x) => row('bollard', x, 2, 11) },
      { from: 200, weight: 1.3, ground: true, make: (x) => cyclist(x) },
      { from: 230, weight: 1.2, ground: true, make: (x) => add('planter', x) },
      { from: 300, weight: 1, ground: true, make: (x) => row('bike', x, 2, 12) },
      { from: 350, weight: 1, ground: false, make: (x) => flock(x, r() < d ? 3 : 2) },
      { from: 450, weight: 0.9, ground: true, make: (x) => row('bollard', x, 3, 11) },
      { from: 500, weight: 0.8, ground: false, make: (x) => pigeon(x, PIGEON_ALT.high) },
      // combinations: jump, then stay down; jump, then duck; two cyclists in a row
      { from: 650, weight: 0.8, ground: true, make: (x) => pigeon(add('bollard', x) + sp * 0.62, PIGEON_ALT.high) },
      { from: 750, weight: 0.8, ground: true, make: (x) => pigeon(add(r() < 0.5 ? 'bollard' : 'bike', x) + sp * 0.85, PIGEON_ALT.low) },
      { from: 850, weight: 0.7, ground: true, make: (x) => cyclist(cyclist(x) + sp * 0.75) },
    ];
    const patterns = all.filter((p) => m >= p.from);

    let roll = r() * patterns.reduce((s, p) => s + p.weight, 0);
    const pattern = patterns.find((p) => (roll -= p.weight) <= 0) ?? patterns[0];
    const start = this.cursor;
    const end = pattern.make(start);
    let gap = sp * (1.05 - 0.35 * d + r() * (0.8 - 0.3 * d));

    // a bone arc over a ground obstacle where a full jump goes, or higher up, for a double jump
    const arc = r();
    if (pattern.ground && arc < 0.32) {
      const mid = (start + end) / 2 - 6, high = m > 250 && arc < 0.1;
      (high ? [44, 70, 82, 70, 44] : [20, 38, 46, 38, 20]).forEach((alt, k) => add('bone', mid + (k - 2) * sp * (high ? 0.12 : 0.1), alt));
    }
    // a stroopwafel now and then, floating in a wide gap
    if (m >= this.nextWaffle) {
      this.nextWaffle = m + 450 + r() * 250;
      gap = Math.max(gap, sp * 1.4);
      add('waffle', end + gap * 0.5 - 6, 24);
    } else if (r() < 0.45) {
      // or a trail of bones on the ground, if there's room before the next one
      const n = Math.min(5, Math.floor((gap - sp * 0.9) / 14));
      for (let k = 0; k < n; k++) add('bone', end + sp * 0.45 + k * 14, 2);
    }
    this.cursor = end + gap;
  }
}
