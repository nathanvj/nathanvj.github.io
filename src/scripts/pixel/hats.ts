/** Hats Ruby can wear. The bottom row of each hat sits on the top row of her head. */
import type { HatName } from '../../content/types';
import type { PixelBuffer } from './buffer';
import { C } from './palette';

const KEY: Record<string, number> = {
  c: C.capTop, b: C.capBand, o: C.orange, y: C.yellow, Y: C.yellowLight, d: C.yellowDeep,
  g: C.gold, G: C.goldDeep, r: C.jewel, w: C.white, k: C.cobalt,
};

const HATS: Record<HatName, string[]> = {
  cap: ['ccccccccc.', '.ccccccc.o', '..bbbbb..o', '..bbbbb..o'],
  hardhat: ['..yyyy...', '.yYyyyyy.', '.yyyyyyy.', 'ddddddddd'],
  crown: ['g..g..g', 'gg.g.gg', 'ggggggg', 'gGrGgGg'],
  party: ['..w..', '..o..', '.kkk.', '.ooo.', 'kkkkk', 'ooooo'],
};

export const HAT_NAMES = Object.keys(HATS) as HatName[];

export function wearHat(b: PixelBuffer, name: HatName, cx: number, top: number): void {
  const rows = HATS[name];
  const x0 = Math.round(cx - (rows[0].length - 1) / 2);
  b.stamp(rows, KEY, x0, top - rows.length + 2);
}
