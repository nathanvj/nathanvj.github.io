/**
 * The hero: a Dutch polder in pixel art, and the stage for Ruby Run.
 *
 * This paints the sky, the bike path Ruby walks on, and the ditch in front of
 * it with a wobbling reflection; what stands on the land (fields, windmills,
 * cows, willows) comes from polder.ts. Kwak the duck and the boat with the two
 * of us float on a second canvas above Ruby: they are in the water, between
 * her path and you.
 *
 * At rest it is a still landscape, animated at 12 fps in the page's day or
 * night. During Ruby Run the game drives it instead (startRun, drawRun): the
 * land scrolls, further away more slowly, and the sky turns at the game's
 * pace. The polder is generated as it scrolls in, so it never runs out, and
 * it stays wherever Ruby stopped.
 *
 * The path doubles as Ruby's ground: the host element carries
 * data-platform-offset, which tells her where to stand.
 */
import { emit, on } from '../events';
import { PixelBuffer } from '../pixel/buffer';
import { drawOutlinedGlyph } from '../pixel/glyphs';
import { drawBoat } from '../pixel/people';
import { drawDuck } from '../pixel/things';
import { dither, isNight, PALETTES, px, pxSize, rect, reducedMotion, rng, type ScenePalette } from './env';
import { blend, Look, tone, type View } from './look';
import { Polder } from './polder';

const GROUND = 96;          // native rows reserved at the bottom of the hero (matches .hero .ground)
const WATER = 22, QUAY = 3, STREET = 7;
const BOAT_SPEED = 8;       // native px per second
const BOAT_GAP = 160;       // native px of empty water between two passes
/** the clouds hardly move while the land scrolls */
const CLOUD_PARALLAX = 0.06;

type Box = [x: number, y: number, w: number, h: number];
export class Landscape {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  /** size of a pixel in CSS px, the canvas size in native px, and the row the bike path starts on */
  S = 3; W = 0; H = 0; street = 0;
  /** where the hero text starts (native px), so Ruby Run can line Ruby up with it */
  textLeft = 8;

  private readonly host: HTMLElement;
  private readonly city = document.createElement('canvas');
  /** the duck and the boats, layered over Ruby (--z-water) */
  private readonly front = document.createElement('canvas');
  private readonly fctx = this.front.getContext('2d')!;
  /** what stands on the land: fields, windmills, cows, willows */
  private readonly polder = new Polder();
  private sky?: Look;
  private cobbles?: Look;
  private t = 0; private acc = 1; private visible = true;
  /** how far the land has scrolled; it stays there after a run */
  private camX = 0;
  private running = false;
  private runFrom = 0;
  private clouds: { x: number; y: number; look: Look }[] = []; private cloudX = 0;
  private stars: { x: number; y: number; tw: number }[] = [];
  private ripples: { x: number; y: number; w: number; v: number }[] = [];
  /** areas with text in them (native px), kept free of stars and the moon */
  private keepOut: Box[] = [];
  private duckSprite?: HTMLCanvasElement; private duckBox: Box | null = null; private squeak = 0;
  private boatSprite?: HTMLCanvasElement; private boatBox: Box | null = null; private boatOffset = 60;
  private runBoat: { x0: number; t0: number } | null = null;

  constructor(host: HTMLElement) {
    this.host = host;
    this.canvas = host.querySelector('canvas')!;
    this.ctx = this.canvas.getContext('2d')!;
    this.front.setAttribute('aria-hidden', 'true');
    Object.assign(this.front.style, { position: 'absolute', left: '0', bottom: '0', zIndex: 'var(--z-water)', pointerEvents: 'none' });
    host.appendChild(this.front);
    this.resize();
    new ResizeObserver(() => this.resize()).observe(host);
    new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }).observe(host);
    on('theme', () => { if (!this.running) this.frame(); });
    host.addEventListener('click', (e) => this.onClick(e));
  }

  // ---------------------------------------------------------------- size and layout
  private resize(): void {
    const S = pxSize();
    const W = Math.ceil(this.host.clientWidth / S), H = Math.ceil(this.host.clientHeight / S);
    if (W === this.W && H === this.H && S === this.S) return;
    Object.assign(this, { S, W, H });
    for (const c of [this.canvas, this.city, this.front]) { c.width = W; c.height = H; }
    for (const c of [this.canvas, this.front]) { c.style.width = `${W * S}px`; c.style.height = `${H * S}px`; }
    this.street = H - WATER - QUAY - STREET;
    this.measureText();
    // Ruby's feet go on the cobbles: CSS px from the top of the host
    this.host.dataset.platformOffset = String(this.host.clientHeight - (H - (this.street + 4)) * S);
    this.layout();
    if (!this.running) this.frame();
  }

  /** find the hero copy and the header, so clouds, stars and the moon stay clear of words */
  private measureText(): void {
    const hr = this.host.getBoundingClientRect(), S = this.S;
    const copy = [...document.querySelectorAll<HTMLElement>('[data-hero-text]')];
    const header = [...document.querySelectorAll<HTMLElement>('[data-header-text]')];
    let right = 0, left = Infinity;
    this.keepOut = [];
    for (const el of [...copy, ...header]) {
      const r = el.getBoundingClientRect();
      if (copy.includes(el)) { right = Math.max(right, r.right); left = Math.min(left, r.left); }
      this.keepOut.push([(r.left - hr.left) / S - 4, (r.top - hr.top) / S - 3, (r.right - r.left) / S + 8, (r.bottom - r.top) / S + 6]);
    }
    this.cloudX = Math.ceil((right - hr.left) / S) + 12;
    if (Number.isFinite(left)) this.textLeft = Math.round((left - hr.left) / S);
  }

  private isFree(x: number, y: number, pad = 0): boolean {
    const dy = this.H - this.host.clientHeight / this.S;   // the canvas is bottom-aligned
    return !this.keepOut.some(([bx, by, bw, bh]) => x + pad >= bx && x - pad <= bx + bw && y - dy + pad >= by && y - dy - pad <= by + bh);
  }

  private layout(): void {
    const { W, H, street } = this;
    const cr = rng(5), room = W - this.cloudX;
    this.clouds = room < 70 ? [] : Array.from({ length: Math.max(1, Math.round(room / 70)) }, (_, i) => {
      const w = 18 + Math.floor(cr() * 14), seed = i * 97 + 3;
      return { x: cr() * room, y: 30 + Math.floor(cr() * Math.max(8, street - 132)), look: new Look(w + 4, Math.round(w * 0.42) + 8, (c, P) => c.drawImage(cloudSprite(w, seed, P), 0, 0)) };
    });
    const sr = rng(23);
    this.stars = Array.from({ length: Math.round((W * (H - GROUND)) / 260) }, () => ({ x: Math.floor(sr() * W), y: Math.floor(sr() * (H - GROUND + 20)), tw: sr() }))
      .filter((s) => this.isFree(s.x, s.y));
    this.ripples = Array.from({ length: Math.round(W / 18) }, () => ({ x: sr() * W, y: Math.floor(sr() * (WATER - 3)) + 2, w: 2 + Math.floor(sr() * 4), v: 0.6 + sr() * 1.4 }));
    this.sky = new Look(W, H, (c, P, night) => this.paintSky(c, P, night));
    this.cobbles = new Look(W + 4, STREET, (c, P) => {
      for (let y = street + 1; y < street + STREET; y += 2) for (let x = (y >> 1) & 1 ? 0 : 2; x < W + 4; x += 4) px(c, x, y - street, P.cobble);
    });
  }

  // ---------------------------------------------------------------- painted layers
  private paintSky(c: CanvasRenderingContext2D, P: ScenePalette, night: boolean): void {
    const { W, H } = this;
    rect(c, 0, 0, W, H, P.sky);
    const from = this.street - 66, to = this.street;
    for (let y = Math.max(0, from); y < to; y++) {
      const f = (y - from) / (to - from);
      for (let x = 0; x < W; x++) if (dither(x, y, f * f * 0.9)) px(c, x, y, P.skyLow);
    }
    if (!night) return;
    // a crescent moon, somewhere without words behind it
    const spots: [number, number][] = [[W - 34, Math.max(8, H - GROUND - 70)], [W - 18, (this.keepOut[0]?.[1] ?? 32) + (H - this.host.clientHeight / this.S) - 12], [W - 14, this.street - 74]];
    const [mx, my] = spots.find(([x, y]) => this.isFree(x, y, 8)) ?? spots[2];
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) {
      if (x * x + y * y <= 36 && (x - 3) ** 2 + (y + 2) ** 2 > 26) px(c, mx + x, my + y, P.moon);
    }
  }

  /** the land and the bike path, into the layer the water reflects */
  private composeCity(camX: number, n: number): void {
    const c = this.city.getContext('2d')!, { W, H, street } = this, X = Math.round(camX);
    const view: View = { camX, t: this.t, n, W, H, street, running: this.running };
    c.clearRect(0, 0, W, H);
    this.polder.back(c, view);
    rect(c, 0, street, W, STREET, tone('street', n));
    if (this.cobbles) blend(c, this.cobbles, -(((X % 4) + 4) % 4), street, n);
    rect(c, 0, street + STREET, W, 1, tone('quay', n));
    rect(c, 0, street + STREET + 1, W, QUAY - 1, tone('quayFace', n));
    const quay = tone('quay', n);
    for (let x = 3 - (((X % 6) + 6) % 6); x < W; x += 6) px(c, x, street + STREET + 1, quay);
  }

  // ---------------------------------------------------------------- animation
  tick(dt: number): void {
    if (!this.visible) return;
    if (this.running) { this.t += dt; return; }   // the game draws
    if (reducedMotion) return;
    this.t += dt;
    this.acc += dt;
    if (this.acc < 1 / 12) return;
    this.acc = 0;
    this.frame();
  }

  /** at rest: the page's own day or night (the land is redrawn every frame: the cows and sails move) */
  private frame(): void {
    const n = isNight() ? 1 : 0;
    this.composeCity(this.camX, n);
    this.draw(n);
  }

  private draw(n: number): void {
    const c = this.ctx, { W, H, street, t } = this;
    if (this.sky) blend(c, this.sky, 0, 0, n);
    if (n > 0) {
      c.globalAlpha = n;
      for (const s of this.stars) if (Math.sin(t * 1.3 + s.tw * 40) > -0.6) px(c, s.x, s.y, s.tw > 0.85 ? PALETTES.night.moon : PALETTES.night.star);
      c.globalAlpha = 1;
    }
    if (this.clouds.length) {
      c.save();
      c.beginPath();
      c.rect(this.cloudX, 0, W - this.cloudX, H);
      c.clip();
      const drift = this.camX * CLOUD_PARALLAX;
      for (const cl of this.clouds) {
        const span = W - this.cloudX + cl.look.w;
        blend(c, cl.look, Math.round(this.cloudX + ((((cl.x + t * 1.2 - drift) % span) + span) % span) - cl.look.w), cl.y, n);
      }
      c.restore();
    }
    c.drawImage(this.city, 0, 0);
    // water: the reflection on every other row, wobbling a little more further down
    const wy = street + STREET + QUAY;
    rect(c, 0, wy, W, H - wy, tone('water', n));
    c.globalAlpha = PALETTES.day.reflect + (PALETTES.night.reflect - PALETTES.day.reflect) * n;
    for (let i = 0; i < H - wy; i += 2) {
      c.drawImage(this.city, 0, wy - 1 - i, W, 1, Math.round(Math.sin(t * 1.7 + i * 0.85) * (0.6 + i * 0.07)), wy + i, W, 1);
    }
    c.globalAlpha = 1;
    const rip = tone('ripple', n);
    for (const r of this.ripples) rect(c, Math.round(((((r.x + t * r.v * 3 - this.camX) % (W + 8)) + W + 8) % (W + 8)) - 4), wy + r.y, r.w, 1, rip);
    this.polder.waterside(c, { camX: this.camX, t, n, W, H, street, running: this.running }, wy);
    // in the game, the duck and the boat stay where they were and scroll away
    const away = this.running ? Math.round(this.camX - this.runFrom) : 0;
    const f = this.fctx;
    f.clearRect(0, 0, W, H);
    this.drawDuck(f, wy, away, n);
    this.drawBoat(f, wy, away, n);
    if (this.running) this.drawRunBoat(f, wy, n);
  }

  // ---------------------------------------------------------------- Ruby Run
  /** hand the landscape over to the game */
  startRun(): void {
    this.running = true;
    this.runFrom = this.camX;
    this.runBoat = null;
    this.measureText();
  }

  /** the game is over: back to the page's own day or night, right where Ruby stopped */
  stopRun(): void {
    this.running = false;
    this.runBoat = null;
    this.frame();
  }

  /** one frame of the game's backdrop: scrolled to `camX`, as dark as `n` */
  drawRun(camX: number, n: number): void {
    this.camX = camX;
    this.composeCity(camX, n);
    this.draw(n);
  }

  /** the two of us sail in from the right, slower than Ruby runs, so she passes us */
  sendRunBoat(): void {
    this.runBoat = { x0: this.camX + this.W + 4, t0: this.t };
  }

  /** where that boat is on screen (native px), or null */
  runBoatX(): number | null {
    if (!this.runBoat) return null;
    const x = this.runBoat.x0 + (this.t - this.runBoat.t0) * BOAT_SPEED * 2 - this.camX;
    if (x < -40) { this.runBoat = null; return null; }
    return x;
  }

  private drawRunBoat(c: CanvasRenderingContext2D, wy: number, n: number): void {
    const bx = this.runBoatX();
    if (bx === null) return;
    // lower in the water than at rest, so it never covers the path she runs on
    this.paintBoat(c, Math.round(bx), wy - 1 + (Math.sin(this.t * 1.8) > 0 ? 0 : 1), n);
  }

  // ---------------------------------------------------------------- Kwak, the duck
  private drawDuck(c: CanvasRenderingContext2D, wy: number, away: number, n: number): void {
    if (!this.duckSprite) { const b = new PixelBuffer(12, 9); drawDuck(b); this.duckSprite = b.canvas(); }
    const t = this.t, span = Math.max(60, this.W * 0.22);
    const x = Math.round(this.W * 0.1 + (Math.sin(t * 0.06 + 1.2) * 0.5 + 0.5) * span) - away;
    if (x < -14) { this.duckBox = null; return; }
    const facing = Math.cos(t * 0.06 + 1.2) >= 0 ? 1 : -1;
    const bob = Math.sin(t * 2.2) > 0.2 ? 0 : 1;
    const y = wy + 1 + bob - (this.squeak > 0 ? 3 : 0);
    c.save();
    if (facing < 0) { c.translate(x * 2 + 12, 0); c.scale(-1, 1); }
    c.drawImage(this.duckSprite, x, y - 6);
    c.restore();
    if (this.squeak <= 0) rect(c, x, wy + 2 + bob, 12, 1, tone('water', n));
    else this.squeak -= 1 / 12;
    this.duckBox = [x, y - 6, 12, 9];
  }

  // ---------------------------------------------------------------- the two of us, in a boat
  private boatX(): number {
    const span = this.W + BOAT_GAP;
    return ((((this.t * BOAT_SPEED + this.boatOffset) % span) + span) % span) - 40;
  }

  /** start a pass now: the boat enters from the left */
  sendBoat(): void {
    const span = this.W + BOAT_GAP;
    this.boatOffset = (((2 - this.t * BOAT_SPEED) % span) + span) % span;
  }

  /** which pass of the boat this is, so Ruby greets it once per pass */
  get boatPass(): number {
    return Math.floor((this.t * BOAT_SPEED + this.boatOffset) / (this.W + BOAT_GAP));
  }

  private drawBoat(c: CanvasRenderingContext2D, wy: number, away: number, n: number): void {
    const x = Math.round(this.boatX()) - away;
    if (x < -38 || x > this.W + 2) { this.boatBox = null; return; }
    const y = wy - 17 + (Math.sin(this.t * 1.8) > 0 ? 0 : 1);
    this.paintBoat(c, x, y, n);
    this.boatBox = [x, y, 38, 22];
  }

  /** the boat with its top-left at (x, y): the water laps over the hull, the lantern glows at night */
  private paintBoat(c: CanvasRenderingContext2D, x: number, y: number, n: number): void {
    if (!this.boatSprite) { const b = new PixelBuffer(38, 22); drawBoat(b); this.boatSprite = b.canvas(); }
    const line = y + 20;
    if (n > 0) {
      c.globalAlpha = n;
      for (let dx = -6; dx <= 6; dx++) for (let dy = -2; dy <= 3; dy++) {
        if (dither(x + 32 + dx, line + dy, 0.5 - Math.hypot(dx, dy * 2) / 14)) px(c, x + 32 + dx, line + dy, PALETTES.night.glow);
      }
      c.globalAlpha = 1;
    }
    c.drawImage(this.boatSprite, x, y);
    rect(c, x + 2, line, 34, 1, tone('water', n));
    const k = (this.t % 3) / 3;   // a heart floats up between the two of us
    if (k < 0.75) drawOutlinedGlyph(c, 'bigHeart', x + 14, Math.round(y - 4 - k * 14), '#ff4f6d');
  }

  /** where the boat is, in page coordinates, or null when it is not on screen */
  boatOnPage(): { x: number; y: number } | null {
    if (!this.boatBox || this.running) return null;
    const r = this.canvas.getBoundingClientRect(), [x, y] = this.boatBox;
    return { x: r.left + scrollX + (x + 16) * this.S, y: r.top + scrollY + y * this.S };
  }

  // ---------------------------------------------------------------- clicks on the water
  private onClick(e: MouseEvent): void {
    if (this.running) return;
    const r = this.canvas.getBoundingClientRect(), S = this.S;
    const nx = (e.clientX - r.left) / S, ny = (e.clientY - r.top) / S;
    const near = (box: Box | null, pad: number, above: number) =>
      box && nx >= box[0] - pad && nx <= box[0] + box[2] + pad && ny >= box[1] - above && ny <= box[1] + box[3] + pad;
    if (near(this.boatBox, 4, 16)) {
      const [x, y] = this.boatBox!;
      emit('water:boat', { x: r.left + scrollX + (x + 17) * S, y: r.top + scrollY + (y - 2) * S });
    } else if (near(this.duckBox, 3, 3)) {
      const [x, y] = this.duckBox!;
      this.squeak = 0.5;
      this.frame();
      emit('water:duck', { x: r.left + scrollX + (x + 6) * S, y: r.top + scrollY + (y - 2) * S });
    }
  }
}

/** a puffy pixel cloud, w wide */
function cloudSprite(w: number, seed: number, P: ScenePalette): HTMLCanvasElement {
  const r = rng(seed), h = Math.round(w * 0.42) + 4;
  const cv = document.createElement('canvas');
  cv.width = w + 4;
  cv.height = h + 4;
  const c = cv.getContext('2d')!;
  const lobes = [[0.3, 0.62, 0.26], [0.55, 0.42, 0.34], [0.78, 0.62, 0.22]].map(([a, b, rr]) => [a * w + 2 + (r() - 0.5) * 2, b * h + 2, rr * w]);
  const inside = (x: number, y: number) => y < h + 1 && lobes.some(([lx, ly, lr]) => (x - lx) ** 2 + ((y - ly) * 1.5) ** 2 <= lr * lr);
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
    if (inside(x + 0.5, y + 0.5)) px(c, x, y, inside(x + 0.5, y - 1.5) && y > h - 2 ? P.cloudShade : P.cloud);
    else if (inside(x + 1.5, y + 0.5) || inside(x - 0.5, y + 0.5) || inside(x + 0.5, y + 1.5) || inside(x + 0.5, y - 0.5)) px(c, x, y, P.cloudLine);
  }
  return cv;
}
