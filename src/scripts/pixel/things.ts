/** Small things: the ball, treats, hidden bones, Kwak the duck, the mailbox and a letter for it. */
import type { PixelBuffer } from './buffer';
import { C } from './palette';

export type ItemKind = 'ball' | 'treat' | 'bone';

const BONE = ['.o......o.', 'oooooooooo', '.oooooooo.', 'oooooooooo', '.o......o.'];
const SEAM = [[-1, -2], [-2, -1], [-2, 0], [-1, 1], [1, -1], [2, 0], [2, 1], [1, 2]];

/** an item in a 12×9 buffer, resting on its bottom row; `spin` rotates the ball's seam */
export function drawItem(b: PixelBuffer, kind: ItemKind, spin = 0): void {
  b.clear();
  if (kind === 'ball') {
    b.ell(6, 4.6, 3.6, 3.6, (_x, _y, nx, ny) => ((nx + 0.3) ** 2 + (ny + 0.3) ** 2 > 1.05 ? C.ballDeep : C.ball));
    const f = ((Math.floor(spin / (Math.PI / 2)) % 4) + 4) % 4;
    for (const [sx, sy] of SEAM) {
      let x = sx, y = sy;
      for (let i = 0; i < f; i++) [x, y] = [-y, x];
      b.over(5 + x, 4 + y, C.ballSeam);
    }
  } else {
    const [base, deep] = kind === 'treat' ? [C.biscuit, C.biscuitDeep] : [C.white, C.boneShade];
    BONE.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'o') b.set(1 + i, 3 + j, j >= 3 ? deep : base); }));
    if (kind === 'treat') { b.set(4, 4, C.biscuitDeep); b.set(7, 4, C.biscuitDeep); }
  }
  b.outline();
}

/** Kwak, the rubber duck that was almost the mascot, 12×9 */
export function drawDuck(b: PixelBuffer): void {
  b.clear();
  b.ell(5, 6, 4.2, 2.3, (_x, _y, _nx, ny) => (ny > 0.3 ? C.yellowDeep : C.yellow));
  b.set(1, 4, C.yellow); b.set(1, 3, C.yellow);
  b.ell(8, 3, 2.2, 2.2, C.yellow);
  b.rect(10, 3, 2, 1, C.orange);
  b.set(8, 2, C.ink);
  b.outline();
}

/** a Dutch street mailbox on a pole, 64×72; its lid is at row 8 */
export function drawMailbox(b: PixelBuffer): void {
  b.clear();
  b.rect(30, 42, 4, 23, C.cobaltDeep);
  b.rect(30, 42, 1, 23, C.cobalt);
  b.rect(17, 12, 30, 31, C.orange);
  b.rect(43, 12, 4, 31, C.orangeDeep);
  b.rect(17, 41, 30, 2, C.orangeDeep);
  b.rect(15, 8, 34, 4, C.orangeDeep);
  b.rect(15, 8, 34, 1, C.orangeLight);
  for (const sy of [18, 26]) {
    b.rect(21, sy - 1, 20, 1, C.orangeLight);
    b.rect(21, sy, 20, 2, C.ink);
  }
  b.rect(21, 32, 9, 6, C.white);
  b.rect(22, 34, 6, 1, C.steelDeep);
  b.rect(22, 36, 4, 1, C.steelDeep);
  b.rect(36, 33, 4, 4, C.orangeLight);
  b.outline();
}

/** a letter for the mailbox: a white envelope with a heart for a seal, 14×10 */
export function drawLetter(b: PixelBuffer): void {
  b.clear();
  b.rect(1, 1, 12, 8, C.white);
  for (let i = 0; i < 6; i++) { b.set(1 + i, 1 + Math.floor(i * 0.7), C.coatShade); b.set(12 - i, 1 + Math.floor(i * 0.7), C.coatShade); }
  b.rect(1, 8, 12, 1, C.coatShade);
  b.stamp(['o.o', 'ooo', '.o.'], { o: C.heart }, 6, 4);
  b.outline();
}
