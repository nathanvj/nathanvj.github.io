/**
 * Ruby, a tricolour beagle, as a 32×32 rig.
 *
 * There is no sprite sheet: drawRuby() paints her for any pose, so squash and
 * stretch, eye tracking, wagging and hats are just numbers. She is drawn facing
 * right; the renderer mirrors her when she faces left. Her feet stand on row 30.
 */
import type { HatName } from '../../content/types';
import type { PixelBuffer } from './buffer';
import { wearHat } from './hats';
import { C } from './palette';

export type Mode =
  | 'idle' | 'walk' | 'sniff' | 'run' | 'jump' | 'fall' | 'tumble' | 'held'
  | 'sit' | 'wait' | 'beg' | 'sleep' | 'pet' | 'howl' | 'eat' | 'wave' | 'dance';

export type Eyes = 'open' | 'closed' | 'happy' | 'dizzy' | 'wide';

export interface Pose {
  mode: Mode;
  /** seconds, drives idle motion */
  t: number;
  /** gait phase in radians, advances with distance travelled */
  ph: number;
  /** squash (+) and stretch (−) */
  sq: number;
  eyes: Eyes;
  blink: boolean;
  /** where she looks, -1..1 relative to the way she faces */
  look: { x: number; y: number };
  talk: boolean;
  /** 0 = still tail, 1 = happiest wag */
  wag: number;
  pant: boolean;
  ball: boolean;
  hat: HatName | null;
}

export const SPRITE = 32;
/** a point just above her head, for hearts and z's (facing right) */
export const HEAD_TOP: readonly [number, number] = [23, 5];
/** how far in front of her centre her mouth is, for fetching */
export const MOUTH_REACH = 13;

export const isAirborne = (m: Mode) => m === 'jump' || m === 'fall' || m === 'tumble';
export const isResting = (m: Mode) => m === 'sleep' || m === 'sit' || m === 'wait';
export const isMoving = (m: Mode) => m === 'walk' || m === 'run' || m === 'sniff';

const step = (v: number, a = 0.5) => (v > a ? 1 : v < -a ? -1 : 0);
/** idle breathing: a 1px dip a third of the time */
const breath = (t: number, rate: number) => (Math.sin(t * rate * Math.PI) > 0.45 ? 1 : 0);

function eye(b: PixelBuffer, x: number, y: number, e: Eyes): void {
  if (e === 'closed') { b.rect(x, y + 1, 2, 1, C.ink); return; }
  if (e === 'happy') { b.set(x, y + 1, C.ink); b.set(x + 1, y, C.ink); b.set(x + 2, y + 1, C.ink); return; }
  if (e === 'dizzy') { for (const [dx, dy] of [[0, -1], [2, -1], [1, 0], [0, 1], [2, 1]]) b.set(x + dx, y + dy, C.ink); return; }
  if (e === 'wide') { b.rect(x, y - 1, 2, 3, C.ink); b.set(x, y - 1, C.white); return; }
  b.rect(x, y, 2, 2, C.ink);
  b.set(x, y, C.white);
}

export function drawRuby(b: PixelBuffer, p: Pose): void {
  b.clear();
  const m = p.mode;
  const sit = m === 'sit' || m === 'wait' || m === 'beg';
  const lie = m === 'sleep', sniff = m === 'sniff', howl = m === 'howl', eat = m === 'eat';
  const trot = m === 'walk' || sniff, gallop = m === 'run';
  const s = Math.sin(p.ph), c = Math.cos(p.ph);

  // body height: a trot bobs up as the legs pass, a gallop rises when the legs gather
  let by = 22;
  if (m === 'held') by -= 3;
  if (trot && Math.abs(s) < 0.75) by -= 1;
  if (gallop && s < -0.3) by -= 1;
  if (m === 'dance' && Math.sin(p.t * 9) > 0) by -= 1;

  const wagSpeed = 6 + 18 * p.wag;
  const wv = lie ? 0 : Math.sin(p.t * wagSpeed) * (0.6 + 1.6 * p.wag);
  const lx = step(p.look.x, 0.4), ly = step(p.look.y, 0.5);

  // ---- where the head goes for each pose
  let hx = 22, hy = by - 9;
  if (sniff) { hx = 23; hy = by - 3 + (Math.sin(p.t * 16) > 0.5 ? 1 : 0); }
  if (eat) { hx = 23; hy = by - 1 + (Math.sin(p.t * 14) > 0 ? 1 : 0); }
  if (howl) { hx = 21; hy = by - 10; }
  if (sit) { hx = 21; hy = by - 11; }
  if (lie) { hx = 23; hy = 22 + (Math.sin(p.t * 1.6) > 0.6 ? 1 : 0); }
  if (gallop) hx += 1;
  if (m === 'idle') hy += breath(p.t, 1.2);
  hy += Math.round(p.sq * 0.5);

  // ---- ears fly when she does. Walking, the ear just rides along with her head:
  // a floppy ear that changes shape every step reads as flicker at this size.
  let earUp = 0;
  if (m === 'held' || m === 'tumble') earUp = 0.7 + Math.sin(p.t * 20) * 0.3;
  else if (m === 'jump') earUp = 0.9;
  else if (m === 'fall') earUp = 0.55 + Math.sin(p.t * 18) * 0.2;
  else if (gallop) earUp = 0.35 + (s > 0 ? 0.25 : 0);
  else if (m === 'dance') earUp = Math.sin(p.t * 9) > 0 ? 0.6 : 0.1;
  earUp = Math.round(earUp * 8) / 8;   // a few fixed ear shapes, never one in between

  // ---- colouring helpers
  /** tricolour coat for an ellipse: white belly and chest, a dark saddle fading into tan */
  const coat = (cx: number, cy: number, rx: number, ry: number) => (x: number, y: number, nx: number, ny: number) => {
    const ux = (x + 0.5 - (cx - 1)) / rx, uy = (y + 0.5 - (cy - 1.4)) / ry;
    const shade = ux * ux + uy * uy > 1;
    if (ny > 0.5 || (nx > 0.62 && ny > -0.35)) return shade ? C.coatShade : C.white;
    if (ny < 0.22 && nx < 0.56 && nx > -0.9) {
      const core = ny < 0.02 && nx < 0.38 && nx > -0.74;
      if (!core) return (x + y) % 2 ? C.tanDeep : C.saddle;
      if ((x * 73 + y * 151) % 11 === 0) return C.tanDeep;
      return nx < -0.3 && ny < -0.55 ? C.saddleHi : C.saddle;
    }
    return shade ? C.tanDeep : C.tan;
  };
  /** a leg: tan at the top, a white sock below */
  const leg = (x: number, top: number, len: number, col: number) => {
    if (len <= 0) return;
    b.rect(x, top, 2, len, col);
    b.rect(x, top, 2, Math.min(len - 1, 3), col === C.white ? C.tan : C.tanDeep);
  };
  /** her tail along a polyline: tan, with the white flag at the tip */
  const tail = (pts: [number, number][]) => {
    const seg: [number, number][] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let k = 0; k < n; k++) seg.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
    }
    seg.push(pts[pts.length - 1]);
    seg.forEach(([x, y], i) => b.rect(Math.round(x), Math.round(y), 2, 2, i >= seg.length * 0.55 ? C.white : C.tan));
  };

  if (sit) {
    // ---- sitting: a slanted body from haunch to shoulder, front legs straight
    tail([[6, 28], [3, 29], [Math.round(1 + wv * 0.8), 28]]);
    leg(19, 22, 9, C.coatShade);
    const A = [9.5, 25], B = [17, 18.5], R = 5;
    const ax = B[0] - A[0], ay = B[1] - A[1], len2 = ax * ax + ay * ay, nl = Math.sqrt(len2);
    for (let y = 12; y < 30; y++) for (let x = 3; x < 24; x++) {
      const px0 = x + 0.5 - A[0], py0 = y + 0.5 - A[1];
      const t = Math.max(0, Math.min(1, (px0 * ax + py0 * ay) / len2));
      const dx = px0 - ax * t, dy = py0 - ay * t;
      if (dx * dx + dy * dy > R * R) continue;
      const side = (px0 * -ay + py0 * ax) / nl;   // > 0 towards the belly
      b.set(x, y, side < -1.6 ? (side < -3.6 && t < 0.5 ? C.saddleHi : C.saddle) : side > 2.2 ? C.white : C.tan);
    }
    b.ell(9.5, 25.8, 4.2, 3.6, (_x, _y, nx, ny) => (nx > 0.35 && ny > -0.2 ? C.tanDeep : C.tan));
    b.rect(11, 29, 5, 2, C.white);
    b.rect(15, 29, 1, 1, C.coatShade);
    b.ell(18.6, 20.5, 2.8, 4, C.white);
    if (m === 'beg') b.line(18, 23, 21, 21 - (Math.sin(p.t * 8) > 0 ? 1 : 0), C.white, 2);
    else leg(17, 22, 9, C.white);
  } else if (lie) {
    // ---- lying down, chin on her paws
    tail([[6, 28], [3, 29], [1, 28]]);
    b.ell(13, 27, 9, 3.6, coat(13, 27, 9, 3.6));
    b.rect(19, 29, 9, 2, C.white);
    b.rect(19, 29, 9, 1, C.coatShade);
  } else {
    // ---- standing, walking, running, flying
    if (m === 'held' || m === 'tumble') tail([[6, by - 2], [4, by + 1], [4 + Math.round(wv), by + 4]]);
    else if (gallop) tail([[6, by - 2], [3, by - 4], [1 + Math.round(wv * 0.5), by - 6]]);
    else tail([[6, by - 2], [4, by - 5], [3 + Math.round(wv * 0.6), by - 8], [3 + Math.round(wv * 1.4), by - 11]]);

    // a gallop stretches the body as the legs reach, and bunches it as they gather
    const reach = gallop ? s * 0.8 : 0;
    const rx = 9 + p.sq * 1.1 + reach, ry = 5.3 - p.sq * 0.7 - reach * 0.3;
    const bcy = by + 0.5 + (4.8 - ry), top = Math.round(by + 5.3) - 3;
    const ground = 31;

    if (m === 'held' || m === 'tumble') {
      const k = Math.round(Math.sin(p.t * 14));
      leg(9, top, 4 + k, C.coatShade); leg(19, top, 4 - k, C.coatShade);
      leg(7, top, 4 - k, C.white); leg(17, top, 4 + k, C.white);
    } else if (isAirborne(m)) {
      const st = m === 'jump' ? 1 : 0;
      leg(9 - st, top - 1, 4, C.coatShade); leg(20 + st, top - 1, 4, C.coatShade);
      leg(6 - st, top - 1, 4, C.white); leg(18 + st * 2, top - 1, 4, C.white);
    } else if (gallop) {
      // bound: both front legs together, both hind legs together, half a stride apart.
      // A leg lifts while it swings forward and plants while it pushes back.
      const f = Math.round(s * 2.4), h = -f;
      const fLift = c > 0 ? 2 : 0, hLift = c < 0 ? 2 : 0;
      const L = (x: number, col: number, lift: number) => leg(x, top, ground - top - lift, col);
      L(9 + h + 1, C.coatShade, hLift); L(7 + h, C.white, hLift);
      L(19 + f + 1, C.coatShade, fLift); L(17 + f, C.white, fLift);
    } else if (trot) {
      // trot: diagonal pairs move together (far hind + near front, near hind + far front).
      // A leg lifts while it swings forward, so she clearly walks the way she faces.
      const d = Math.round(s * 2);
      const aLift = c > 0.3 ? 1 : 0, bLift = c < -0.3 ? 1 : 0;
      const L = (x: number, col: number, lift: number) => leg(x, top, ground - top - lift, col);
      L(9 + d, C.coatShade, aLift); L(19 - d, C.coatShade, bLift);
      L(7 - d, C.white, bLift); L(17 + d, C.white, aLift);
    } else {
      const dz = m === 'dance' ? step(Math.sin(p.t * 9), 0.2) : 0;
      const L = (x: number, col: number, lift: number) => leg(x, top, ground - top - lift, col);
      L(9, C.coatShade, 0); L(19, C.coatShade, 0);
      L(7, C.white, dz < 0 ? 1 : 0); if (m !== 'wave') L(17, C.white, dz > 0 ? 1 : 0);
    }
    b.ell(14, bcy, rx, ry, coat(14, bcy, rx, ry));
    b.ell(hx - 2.5, hy + 6.5, 3.2, 3.4, (_x, _y, nx) => (nx > -0.55 ? C.white : C.tan));   // chest and neck
    if (m === 'wave') b.line(18, top - 1, 20 + Math.round(Math.sin(p.t * 12)), top - 4, C.white, 2);
  }

  // ---- head: tan with the white blaze, white muzzle, black nose
  b.blob(hx + 0.5, hy + 0.5, 5.8, 5.3, C.tan, C.tanDeep, C.tanLight, 0.9, 1.1);
  for (const [dx, dy] of [[3, -5], [4, -5], [4, -4], [5, -3], [5, -2], [5, -1]]) b.over(hx + dx, hy + dy, C.white);
  const talking = p.talk && Math.sin(p.t * 18) > -0.2;
  const panting = (p.eyes === 'happy' || m === 'pet' || p.pant) && !eat;
  if (howl) {
    b.ell(hx + 4.6, hy - 2.6, 2.5, 3.4, C.white);
    b.rect(hx + 5, hy - 6, 2, 1, C.ink); b.set(hx + 6, hy - 5, C.ink);
    b.rect(hx + 6, hy - 2, 1, 2, C.mouth);
  } else {
    b.ell(hx + 5.5, hy + 3, 3.3, 2.5, (_x, _y, nx, ny) => (ny > 0.45 && nx < 0.4 ? C.coatShade : C.white));
    b.rect(hx + 8, hy + 1, 1, 2, C.ink); b.set(hx + 7, hy + 1, C.ink);
    if (eat) {
      if (Math.sin(p.t * 14) > 0) b.rect(hx + 5, hy + 4, 3, 1, C.mouth);
      b.set(hx + 8, hy + 5, C.biscuit);
    } else if (talking || panting) {
      b.rect(hx + 5, hy + 4, 3, 1, C.mouth);
      if (panting) b.rect(hx + 6, hy + 5, 1, 2, C.tongue);
    } else {
      b.set(hx + 6, hy + 4, C.saddleHi); b.set(hx + 7, hy + 4, C.saddleHi);
    }
  }
  const e: Eyes = howl || lie ? 'closed' : p.blink && p.eyes === 'open' ? 'closed' : p.eyes;
  eye(b, hx + 2 + lx, hy - 2 + ly, e);
  if (p.eyes !== 'dizzy') b.set(hx + 1, hy + 1, C.blush);

  // ---- the floppy ear, drawn over the head along a curve that lifts with earUp
  const R = [hx - 2, hy - 3];
  const Q = [hx - 4 - earUp * 1.5, hy + 1 - earUp * 6];
  const T = [hx - 3 - earUp * 5, hy + 7 - earUp * 11];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20, a = (1 - t) ** 2, q = 2 * (1 - t) * t, z = t * t;
    const x = a * R[0] + q * Q[0] + z * T[0], y = a * R[1] + q * Q[1] + z * T[1], r = 2 - t * 0.35;
    b.ell(x + 0.5, y + 0.5, r, r, (_px, _py, _nx, ny) => (t > 0.65 && ny > 0.2 ? C.earDeep : C.tanDeep));
  }

  // ---- her collar, with RUBY on it (well, two light pixels of it)
  if (!lie) {
    b.rect(hx - 4, hy + 5, 4, 2, C.collar);
    b.rect(hx - 3, hy + 6, 2, 1, C.collarText);
  }

  // ---- the ball, when she is bringing it back
  if (p.ball && !howl) {
    const x0 = hx + 6, y0 = hy + 4;
    b.rect(x0 + 1, y0, 2, 1, C.ball); b.rect(x0, y0 + 1, 4, 2, C.ball); b.rect(x0 + 1, y0 + 3, 2, 1, C.ballDeep);
    b.set(x0 + 1, y0 + 1, C.ballSeam); b.set(x0 + 2, y0 + 2, C.ballSeam); b.set(x0 + 3, y0 + 2, C.ballDeep);
  }

  if (p.hat) wearHat(b, p.hat, hx + 1, hy - 5);
  b.outline();
}
