/**
 * Nathan (the header avatar), the two of us in the boat, and Mum on her bench.
 * Cartoon proportions on purpose: round faces, dot eyes, rosy cheeks.
 */
import type { PixelBuffer } from './buffer';
import { C } from './palette';

export interface PortraitPose {
  blink?: boolean;
  happy?: boolean;
}

/** Nathan, head and shoulders, 24×24: a cloud of curls, a friendly face, the brown tee. */
export function drawPortrait(b: PixelBuffer, p: PortraitPose = {}): void {
  b.clear();
  // shoulders
  b.ell(12, 22.8, 7.6, 5.2, (_x, _y, nx) => (nx > 0.5 ? C.teeDeep : C.tee));
  b.rect(11, 16, 2, 1, C.skinDeep);
  b.set(10, 17, C.teeDeep); b.set(13, 17, C.teeDeep); b.rect(11, 17, 2, 1, C.skinDeep);
  // a compact cloud of curls behind the head
  b.ell(12, 7, 7, 4.8, C.hair);
  for (const [x, y, r] of [[6.4, 6.4, 1.8], [7.4, 3.6, 1.8], [10, 2.4, 1.9], [12.9, 2.2, 1.9], [15.6, 3.2, 1.8], [17.4, 5.8, 1.8], [5.8, 9.2, 1.4], [18.2, 9, 1.4]]) b.ell(x, y, r, r, C.hair);
  // round face and ears
  b.ell(12, 10.6, 5.4, 5.2, (_x, _y, nx, ny) => (nx > 0.72 || ny > 0.86 ? C.skinDeep : C.skin));
  b.set(6, 10, C.skin); b.set(6, 11, C.skinDeep); b.set(17, 10, C.skin); b.set(17, 11, C.skinDeep);
  // curly fringe, little scallops over the forehead
  b.rect(7, 5, 10, 2, C.hair);
  for (const x of [7, 8, 10, 11, 13, 15, 16]) b.set(x, 7, C.hair);
  for (const [x, y] of [[8, 3], [11, 2], [14, 2], [16, 4], [6, 6], [9, 5], [13, 5], [17, 7]]) {
    b.over(x, y, C.hairLight); b.over(x + 1, y, C.hairLight); b.over(x + 1, y + 1, C.hairDeep);
  }
  // raised, friendly brows; dot eyes; rosy cheeks; a smile
  b.rect(9, 8, 2, 1, C.hairDeep); b.rect(14, 8, 2, 1, C.hairDeep);
  if (p.blink) { b.rect(9, 10, 2, 1, C.hairDeep); b.rect(14, 10, 2, 1, C.hairDeep); }
  else if (p.happy) { for (const [x, y] of [[9, 10], [10, 9], [11, 10], [13, 10], [14, 9], [15, 10]]) b.set(x, y, C.hairDeep); }
  else { b.rect(10, 9, 1, 2, C.ink); b.rect(14, 9, 1, 2, C.ink); }
  b.rect(7, 12, 2, 1, C.blush); b.rect(16, 12, 2, 1, C.blush);
  b.set(12, 11, C.skinDeep);
  b.set(10, 12, C.lip); b.set(14, 12, C.lip); b.rect(11, 13, 3, 1, C.lip);
  b.outline();
}

/**
 * The two of us in a little boat, 38×22: Nathan with curls and the brown tee,
 * Daniëlle with blonde hair, a navy tee and a gold heart necklace, heads leaning in.
 */
export function drawBoat(b: PixelBuffer): void {
  b.clear();
  const E = (cx: number, cy: number, rx: number, ry: number, col: number | ((x: number, y: number, nx: number) => number)) =>
    b.ell(cx + 1, cy + 1, rx, ry, typeof col === 'number' ? col : (x, y, nx) => col(x, y, nx));
  const R = (x: number, y: number, w: number, h: number, col: number) => b.rect(x + 1, y + 1, w, h, col);
  const P = (x: number, y: number, col: number) => b.set(x + 1, y + 1, col);

  // her hair behind, both bodies
  E(20, 8.8, 4.7, 4.3, C.blonde);
  R(15, 9, 2, 5, C.blonde); R(23, 9, 2, 5, C.blondeDeep);
  E(11, 15.6, 4.9, 3.4, (_x, _y, nx) => (nx > 0.5 ? C.teeDeep : C.tee));
  E(20, 15.6, 4.7, 3.4, C.navy);
  P(20, 13, C.gold);
  // his curls behind
  E(11, 6.6, 4.6, 2.9, C.hair);
  for (const [x, y, r] of [[7, 7.6, 1.4], [7.8, 4.8, 1.5], [10.4, 3.7, 1.5], [13.2, 4, 1.5], [15, 6.6, 1.3]]) E(x, y, r, r, C.hair);
  // heads, leaning in
  E(11.2, 9.8, 3.8, 3.8, (_x, _y, nx) => (nx > 0.75 ? C.skinDeep : C.skin));
  E(19.6, 10.2, 3.6, 3.6, (_x, _y, nx) => (nx > 0.75 ? C.skinDeep : C.skin));
  // fringes: his curly, hers parted in the middle
  R(8, 6, 7, 1, C.hair); P(8, 7, C.hair); P(10, 7, C.hair); P(12, 7, C.hair); P(14, 7, C.hair);
  for (const [x, y] of [[8, 4], [11, 3], [13, 5]]) { P(x, y, C.hairLight); P(x + 1, y, C.hairLight); }
  R(16, 6, 3, 2, C.blonde); R(20, 6, 3, 2, C.blonde); P(16, 8, C.blonde); P(23, 8, C.blonde);
  // faces: dot eyes, blush, smiles
  for (const [ex, ey] of [[10, 9], [13, 9], [18, 10], [21, 10]]) R(ex, ey, 1, 2, C.ink);
  for (const [bx, by] of [[8, 11], [14, 11], [17, 12], [22, 12]]) P(bx, by, C.blush);
  P(10, 11, C.lip); R(11, 12, 2, 1, C.lip); P(13, 11, C.lip);
  P(18, 12, C.lip); R(19, 13, 2, 1, C.lip); P(21, 12, C.lip);
  // the boat, with a little heart painted on the side
  R(0, 16, 36, 1, C.woodLight);
  R(1, 17, 34, 2, C.wood);
  R(3, 19, 30, 1, C.woodDeep);
  P(35, 15, C.woodLight); P(0, 15, C.woodLight);
  for (const [x, y] of [[5, 17], [7, 17], [5, 18], [6, 18], [7, 18], [6, 19]]) P(x, y, C.heart);
  // a lantern on a pole at the back
  R(31, 7, 1, 9, C.ink);
  R(30, 4, 3, 3, C.ink); P(31, 5, C.spark);
  b.outline();
}

export interface MumPose {
  /** the hook hand: down (0) or pulling a loop through (1) */
  hook?: 0 | 1;
  /** eyes closed: a blink, or smiling at you */
  closed?: boolean;
}

/** the size of Mum's sprite, bench included */
export const MUM = { w: 30, h: 26 };

/**
 * Mum on a park bench, 30×26, crocheting: dark brown hair in a ponytail, the denim
 * jacket and a cream scarf over a grey dress, white
 * trainers, a granny square in her hands and a ball of pink yarn beside her on the bench.
 */
export function drawMum(b: PixelBuffer, p: MumPose = {}): void {
  b.clear();
  const E = (cx: number, cy: number, rx: number, ry: number, col: number | ((x: number, y: number, nx: number) => number)) =>
    b.ell(cx + 1, cy + 1, rx, ry, typeof col === 'number' ? col : (x, y, nx) => col(x, y, nx));
  const R = (x: number, y: number, w: number, h: number, col: number) => b.rect(x + 1, y + 1, w, h, col);
  const P = (x: number, y: number, col: number) => b.set(x + 1, y + 1, col);

  // the bench: two slats on the back, the seat, iron legs
  R(1, 9, 1, 8, C.woodDeep); R(26, 9, 1, 8, C.woodDeep);
  R(0, 10, 28, 1, C.woodLight); R(0, 11, 28, 1, C.wood);
  R(0, 13, 28, 1, C.woodLight); R(0, 14, 28, 1, C.wood);
  R(0, 16, 28, 1, C.woodLight); R(0, 17, 28, 1, C.woodDeep);
  for (const x of [2, 25]) { R(x, 18, 1, 5, C.collar); R(x - 1, 23, 3, 1, C.collar); }

  // her ponytail and hair behind, the jacket, the scarf
  E(14.5, 8.6, 1.4, 2.7, C.mumHairDeep); P(14, 11, C.mumHairDeep);
  E(10, 5.2, 4.2, 3.9, C.mumHair);
  E(10, 13.4, 4.8, 3.7, (_x, _y, nx) => (nx > 0.45 ? C.denimDeep : C.denim));
  P(7, 10, C.denimLight); P(13, 10, C.denimLight);
  R(8, 10, 5, 1, C.scarf); R(8, 11, 2, 3, C.scarf); P(8, 13, C.scarfDeep); P(9, 14, C.scarfDeep);

  // her face
  E(10, 6, 3.6, 3.6, (_x, _y, nx) => (nx > 0.75 ? C.skinDeep : C.skin));
  // dark hair swept to one side, a loose strand by her cheek
  R(7, 2, 7, 1, C.mumHair); R(7, 3, 3, 1, C.mumHair); R(12, 3, 2, 1, C.mumHairDeep);
  P(6, 4, C.mumHair); P(6, 5, C.mumHair); P(6, 6, C.mumHairLight); P(14, 4, C.mumHairDeep); P(14, 5, C.mumHairDeep);
  P(8, 2, C.mumHairLight); P(9, 3, C.mumHairLight); P(12, 2, C.mumHairLight);
  if (p.closed) { P(8, 6, C.ink); P(11, 6, C.ink); }
  else { R(8, 5, 1, 2, C.ink); R(11, 5, 1, 2, C.ink); }
  P(7, 7, C.blush); P(12, 7, C.blush);
  P(8, 7, C.lip); R(9, 8, 2, 1, C.lip); P(11, 7, C.lip);

  // her dress over her knees, knees and feet together, white trainers
  R(5, 16, 11, 2, C.dress); R(12, 16, 4, 2, C.dressDeep);
  R(6, 18, 9, 1, C.dress); R(12, 18, 3, 1, C.dressDeep);
  R(7, 19, 7, 1, C.dressDeep);
  R(8, 20, 2, 2, C.skin); P(9, 21, C.skinDeep); R(11, 20, 2, 2, C.skin); P(12, 21, C.skinDeep);
  R(7, 22, 3, 1, C.white); R(11, 22, 3, 1, C.white);

  // a granny square in progress in her hands, the hook going in and out
  const up = p.hook === 1 ? 1 : 0;
  R(8, 14, 4, 2, C.yarn); R(9, 14, 2, 2, C.yellow); P(9, 15, C.ok);
  P(8, 16, C.yarn); P(9, 16, C.scarf); P(10, 16, C.yarn); P(11, 16, C.scarf);
  P(7, 15, C.skin);
  P(12, 15 - up, C.skin);
  P(13, 14 - up, C.steelDeep); P(14, 13 - up, C.steelDeep);

  // the ball of yarn on the bench, its thread running to her hands
  E(20, 13.6, 2.3, 2.3, (_x, _y, nx) => (nx > 0.3 ? C.yarnDeep : C.yarn));
  P(19, 13, C.yarnDeep); P(21, 12, C.yarn); P(20, 15, C.yarn);
  P(17, 14, C.yarnDeep); P(16, 15, C.yarnDeep); P(15, 15, C.yarnDeep); P(14, 15, C.yarnDeep);

  b.outline();
}
