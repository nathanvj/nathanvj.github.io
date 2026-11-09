/**
 * Ruby Run's obstacles and pickups, painted once into small canvases.
 *
 * Obstacles come in two versions: a day one with the usual ink outline, and a
 * night one with a light rim, so they still read on dark cobbles. Each sprite
 * stands on its bottom row and knows its hitbox, measured from its bottom-left.
 */
import { PixelBuffer } from '../pixel/buffer';
import { C } from '../pixel/palette';

export type ObstacleKind = 'bollard' | 'bike' | 'planter' | 'pigeon' | 'cyclist';

export interface Sprite {
  day: HTMLCanvasElement;
  night: HTMLCanvasElement;
  w: number;
  h: number;
  /** hitbox: from x0 to x1 across, and up to `top` above its bottom (forgiving: a bit smaller than the drawing) */
  box: { x0: number; x1: number; bottom: number; top: number };
}

function sprite(w: number, h: number, box: Sprite['box'], draw: (b: PixelBuffer) => void): Sprite {
  const paint = (rim: number) => {
    const b = new PixelBuffer(w, h);
    draw(b);
    b.outline(rim);
    return b.canvas();
  };
  return { day: paint(C.ink), night: paint(C.rim), w, h, box };
}

/** a red and white post, the kind that guards every Dutch bike path */
const bollard = () => sprite(7, 17, { x0: 1, x1: 6, bottom: 0, top: 13 }, (b) => {
  b.stamp([
    '.ooo.', 'ooooo', 'hwwww', 'hwwww', 'hoooo', 'hoooo', 'hwwww', 'hwwww',
    'hoooo', 'hoooo', 'hwwww', 'hwwww', 'hwwww', 'hwwww', 'hwwww',
  ], { o: C.heart, h: C.coatShade, w: C.white }, 1, 1);
  b.set(3, 3, C.orange);
});

/** a parked Dutch bike: step-through frame, a crate on the front, a kickstand */
const bike = () => sprite(26, 17, { x0: 2, x1: 23, bottom: 0, top: 11 }, (b) => {
  const wheel = (cx: number) => {
    for (let y = 6; y <= 16; y++) for (let x = cx - 6; x <= cx + 6; x++) {
      const d = Math.hypot(x + 0.5 - (cx + 0.5), y + 0.5 - 11.5);
      if (d >= 3.6 && d <= 4.7) b.set(x, y, C.collar);
    }
    b.set(cx, 11, C.steelDeep);
  };
  wheel(6); wheel(19);
  const frame = (x0: number, y0: number, x1: number, y1: number) => b.line(x0, y0, x1, y1, C.cobalt);
  frame(6, 11, 11, 11); frame(6, 11, 9, 5); frame(11, 11, 9, 5);   // rear triangle
  frame(11, 11, 16, 6); frame(11, 10, 16, 5);                       // the low step-through tubes
  frame(16, 5, 19, 11);                                             // fork
  b.rect(7, 4, 4, 1, C.collar);                                     // saddle
  b.rect(14, 3, 4, 1, C.collar); b.set(16, 4, C.cobalt);            // handlebar
  b.rect(18, 4, 7, 4, C.wood); b.rect(18, 4, 7, 1, C.woodLight);    // the crate
  b.set(20, 6, C.woodDeep); b.set(23, 6, C.woodDeep);
  b.line(10, 12, 12, 15, C.steelDeep);                              // kickstand
});

/** a wooden planter full of tulips */
const planter = () => sprite(28, 17, { x0: 2, x1: 26, bottom: 0, top: 10 }, (b) => {
  const heads = [C.orange, C.heart, C.yellow, C.orange, C.white, C.heart];
  heads.forEach((col, i) => {
    const x = 3 + i * 4, top = 2 + ((i * 7) % 3 === 1 ? 1 : 0);
    b.rect(x + 1, top + 3, 1, 9 - top - 2, C.leaf);
    b.set(x + (i % 2 ? 0 : 2), 7, C.leafDeep);
    b.rect(x, top + 1, 3, 2, col);
    b.set(x, top, col); b.set(x + 2, top, col);
  });
  b.rect(1, 9, 26, 7, C.wood);
  b.rect(1, 9, 26, 1, C.woodLight);
  b.rect(1, 12, 26, 1, C.woodDeep);
  b.rect(1, 9, 1, 7, C.woodDeep); b.rect(26, 9, 1, 7, C.woodDeep);
});

/** a pigeon, flying right (Ruby is chasing it), wings up or down */
const pigeon = (up: boolean) => sprite(16, 11, { x0: 2, x1: 14, bottom: 1, top: 9 }, (b) => {
  b.rect(1, 5, 3, 2, C.pigeonDeep);                                                     // tail
  b.ell(7, 6.5, 4.4, 2.6, (_x, _y, _nx, ny) => (ny > 0.4 ? C.pigeonDeep : C.pigeon));   // body
  b.ell(11.6, 4.2, 2.1, 2.1, C.pigeon);                                                 // head
  b.set(10, 6, C.pigeonNeck); b.set(11, 6, C.pigeonNeck); b.set(12, 6, C.pigeonNeck);
  b.set(14, 4, C.ink);                                                                  // beak
  b.set(12, 3, C.orange);                                                               // eye
  if (up) { b.ell(6.5, 2.6, 3.4, 1.8, C.pigeonDeep); b.rect(4, 1, 2, 1, C.pigeon); }
  else { b.ell(6.5, 8.6, 3.4, 1.6, C.pigeonDeep); b.rect(5, 9, 2, 1, C.pigeon); }
});

/**
 * A Dutch cyclist riding straight at Ruby (facing left), ringing the bell.
 * Three riders, each with two pedalling frames.
 */
const RIDERS = [
  { shirt: C.orange, frame: C.cobaltDeep, hair: C.hair },
  { shirt: C.cobalt, frame: C.heart, hair: C.blonde },
  { shirt: C.leaf, frame: C.ink, hair: C.hairDeep },
];
const cyclist = (rider: (typeof RIDERS)[number], pedal: 0 | 1) => sprite(26, 30, { x0: 2, x1: 22, bottom: 0, top: 20 }, (b) => {
  for (const cx of [6, 19]) {
    for (let y = 17; y <= 29; y++) for (let x = cx - 6; x <= cx + 6; x++) {
      const d = Math.hypot(x - cx, y - 23);
      if (d >= 3.6 && d <= 4.7) b.set(x, y, C.collar);
    }
    b.set(cx, 23, C.steelDeep);
  }
  const F = (x0: number, y0: number, x1: number, y1: number) => b.line(x0, y0, x1, y1, rider.frame);
  F(19, 23, 13, 23); F(13, 23, 15, 16); F(19, 23, 15, 16);   // rear triangle
  F(13, 23, 8, 16); F(8, 16, 6, 23);                          // down tube and fork
  F(8, 16, 8, 14); b.rect(6, 13, 4, 1, C.collar);             // stem and handlebar
  b.set(6, 12, C.gold);                                       // the bell
  b.rect(14, 15, 4, 1, C.collar);                             // saddle
  // legs on the pedals, the far one first
  const [far, near] = pedal ? [[12, 21], [14, 26]] : [[15, 22], [11, 25]];
  b.line(15, 14, 13, 18, C.navy, 2); b.line(13, 18, far[0], far[1], C.navy, 2);
  b.line(15, 14, 12, 18, C.navy, 2); b.line(12, 18, near[0], near[1], C.navy, 2);
  b.set(near[0] - 1, near[1] + 1, C.ink);
  // body leaning into the wind, arm on the handlebar
  b.line(15, 13, 12, 8, rider.shirt, 3);
  b.line(12, 9, 9, 13, rider.shirt, 2);
  b.set(8, 13, C.skin);
  b.ell(11.5, 5, 2.7, 2.7, (_x, _y, nx) => (nx > 0.6 ? C.skinDeep : C.skin));
  b.ell(12.6, 3.6, 2.6, 1.9, rider.hair);
  b.rect(13, 4, 2, 3, rider.hair);
  b.set(10, 5, C.ink);
});

/** a stroopwafel: biscuit with the waffle grid, caramel peeking out at the edge */
function stroopwafel(): HTMLCanvasElement {
  const b = new PixelBuffer(13, 13);
  b.ell(6.5, 6.5, 5.5, 5.5, C.caramel);
  b.ell(6.5, 6.5, 4.6, 4.6, (x, y) => ((x + y) % 3 === 0 || (x - y + 30) % 3 === 0 ? C.biscuitDeep : C.biscuit));
  b.outline();
  return b.canvas();
}

/** the bones to grab are golden, so they stand out on white houses and on dark nights */
function bone(): HTMLCanvasElement {
  const b = new PixelBuffer(12, 9);
  b.stamp(['.o......o.', 'oooooooooo', '.oooooooo.', 'dddddddddd', '.d......d.'], { o: C.gold, d: C.goldDeep }, 1, 2);
  b.set(2, 3, C.white);
  b.set(3, 3, C.yellowLight);
  b.outline();
  return b.canvas();
}

export interface Sprites {
  bollard: Sprite;
  bike: Sprite;
  planter: Sprite;
  pigeon: [Sprite, Sprite];
  /** per rider, two pedalling frames */
  cyclist: [Sprite, Sprite][];
  bone: HTMLCanvasElement;
  waffle: HTMLCanvasElement;
}

let cache: Sprites | null = null;

/** all sprites, painted on first use */
export function sprites(): Sprites {
  cache ??= {
    bollard: bollard(), bike: bike(), planter: planter(), pigeon: [pigeon(true), pigeon(false)],
    cyclist: RIDERS.map((r) => [cyclist(r, 0), cyclist(r, 1)] as [Sprite, Sprite]),
    bone: bone(), waffle: stroopwafel(),
  };
  return cache;
}
