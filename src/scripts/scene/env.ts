/** Shared environment helpers for everything painted on a canvas. */

/** the size of one pixel in CSS px: 3 on desktop, 2 on phones (matches --px in tokens.css) */
export const pxSize = (): number => (innerWidth <= 640 ? 2 : 3);

export const isNight = (): boolean => document.documentElement.dataset.theme === 'night';

export const reducedMotion: boolean = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** a tiny seeded random generator, so the polder looks the same on every visit */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** ordered dithering: true for roughly fraction `f` of the pixels, in a regular pattern */
export const dither = (x: number, y: number, f: number): boolean => f * 16 > BAYER[(y & 3) * 4 + (x & 3)];

export function rect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string): void {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
}

export function px(c: CanvasRenderingContext2D, x: number, y: number, col: string): void {
  c.fillStyle = col;
  c.fillRect(x, y, 1, 1);
}

/**
 * Scene colours per theme; the page itself uses CSS tokens, the painted world uses these.
 * A colourful Dutch polder: green meadows, bulb fields, brick farms, a red bike path, a teal ditch.
 */
const DAY = {
  sky: '#bfe4fb', skyLow: '#e6f6ff', cloud: '#ffffff', cloudShade: '#e1f0fa', cloudLine: '#9fcbe8',
  walls: ['#f2e6cf', '#c4553f', '#e3a23f', '#4d7fb5', '#3f7d5a'], line: '#2b2233', soft: '#ffffff',
  glass: '#2f4e6b', glassHi: '#9cc6e6', door: '#245b48', lit: ['#ffd56b', '#ffbe55', '#ffe7a3'],
  /** the bike path Ruby walks on (with a speckle), and the grassy bank down to the ditch */
  street: '#c0574a', cobble: '#a9493e', quay: '#3f7d3a', quayFace: '#5a9a48',
  water: '#57b0c9', ripple: '#d4f1f8', reflect: 0.35,
  tree: '#5fae5a', treeDeep: '#3a7f45', treeHi: '#9ad36f', trunk: '#5b3a2e',
  star: '#e8e6ff', moon: '#fff1c2', glow: '#ffd26b',
  stem: '#4f9a52', heads: ['#ff5a5f', '#ffb000', '#ff7a1a', '#e83f6f', '#ffd23f'],
  stemBack: '#8cc77a', headsBack: ['#ff9aa0', '#ffd27a', '#ffb070', '#f59ab8'],
  pave: '#e6dfd5', paveLine: '#c9bfb1',
  /** under Ruby and the obstacles in Ruby Run, and the dust she kicks up */
  shadow: '#b3a898', dust: '#cfc5b8',
  // meadows, bulb fields, windmills, cows, pollard willows
  meadow: '#7cc061', meadowDeep: '#5ea54d', meadowFar: '#a9d98a', grass: '#6db552', grassDeep: '#4f9a3f',
  soil: '#a0704c', soilDeep: '#82573a', mill: '#5c5149', millLight: '#7a6d62', sail: '#f3ead8', stock: '#4a3a2e',
  roof: '#4d3b35', cow: '#2b2233', cowWhite: '#ffffff', willow: '#8cbf5a', willowDeep: '#5f9a42', willowHi: '#b8dd7e', bark: '#6b5240',
};
export type ScenePalette = typeof DAY;
const NIGHT: ScenePalette = {
  sky: '#14183a', skyLow: '#262c5f', cloud: '#2a2f63', cloudShade: '#232857', cloudLine: '#3a4180',
  walls: ['#4f4a5e', '#5e2f2b', '#6b5326', '#2c4566', '#24483a'], line: '#0b0b18', soft: '#3d3a52',
  glass: '#151a33', glassHi: '#2b3460', door: '#0b0b18', lit: ['#ffd56b', '#ffbe55', '#ffe7a3'],
  street: '#4a2a32', cobble: '#3d2229', quay: '#132416', quayFace: '#1c3420',
  water: '#16324a', ripple: '#4f7fa3', reflect: 0.5,
  tree: '#244a36', treeDeep: '#173326', treeHi: '#356b4a', trunk: '#0b0b18',
  star: '#e8e6ff', moon: '#fff1c2', glow: '#ffd26b',
  stem: '#2f5a3a', heads: ['#c94b55', '#d49a2a', '#d96a1e', '#b8405f', '#d9b23a'],
  stemBack: '#24402e', headsBack: ['#7a3a40', '#806024', '#84461c', '#733048'],
  pave: '#2e2c40', paveLine: '#3d3a52',
  shadow: '#121124', dust: '#45435c',
  meadow: '#22402a', meadowDeep: '#1a3322', meadowFar: '#2b4a35', grass: '#1f3b27', grassDeep: '#152b1c',
  soil: '#3a2a26', soilDeep: '#2c201d', mill: '#25212a', millLight: '#34303a', sail: '#8d8aa6', stock: '#14121c',
  roof: '#1b1620', cow: '#0b0b18', cowWhite: '#8d8aa6', willow: '#2c4a2f', willowDeep: '#1d3522', willowHi: '#3d6040', bark: '#1d1820',
};
/** both palettes, for scenes that run from day into night on their own (Ruby Run) */
export const PALETTES: { day: ScenePalette; night: ScenePalette } = { day: DAY, night: NIGHT };
export const scenePalette = (): ScenePalette => (isNight() ? PALETTES.night : PALETTES.day);

/** a colour between two hex colours, t from 0 to 1 */
export function mixHex(a: string, b: string, t: number): string {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const n = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(n(a, i) + (n(b, i) - n(a, i)) * t).toString(16).padStart(2, '0')).join('')}`;
}
