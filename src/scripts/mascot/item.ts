/**
 * Things with physics that are not Ruby: the ball and treats.
 * They fall, bounce on the same platforms Ruby uses, and the ball rolls.
 */
import { PixelBuffer } from '../pixel/buffer';
import { drawItem, type ItemKind } from '../pixel/things';
import type { Platform } from './types';
import type { PageWorld } from './world';

const G = 1900;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export class Item {
  readonly kind: ItemKind;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  platform: Platform | null = null;
  /** whoever carries it in their mouth */
  owner: object | null = null;
  /** held by the visitor's cursor, or being eaten */
  held = false;
  gone = false;
  private spin = 0;
  private readonly world: PageWorld;
  private readonly el: HTMLDivElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly buf = new PixelBuffer(12, 9);

  constructor(world: PageWorld, kind: ItemKind) {
    this.world = world;
    this.kind = kind;
    this.el = document.createElement('div');
    this.el.className = 'item';
    this.el.setAttribute('aria-hidden', 'true');
    const cv = document.createElement('canvas');
    cv.width = 12;
    cv.height = 9;
    this.el.appendChild(cv);
    this.ctx = cv.getContext('2d')!;
    document.body.appendChild(this.el);
    this.size();
  }

  size(): void {
    const S = this.world.S;
    this.el.style.width = `${12 * S}px`;
    this.el.style.height = `${9 * S}px`;
  }

  get radius(): number { return 3.6 * this.world.S; }

  placeOn(p: Platform, x: number): void {
    Object.assign(this, { platform: p, x, y: p.y, vx: 0, vy: 0, owner: null, held: false });
  }

  grab(owner: object): void {
    Object.assign(this, { owner, platform: null, held: false, vx: 0, vy: 0 });
  }

  release(x: number, y: number, vx: number, p: Platform | null): void {
    this.owner = null;
    this.x = clamp(x, this.world.minX, this.world.maxX);
    this.y = y;
    this.vx = vx;
    this.vy = 0;
    this.platform = p && this.x >= p.x1 && this.x <= p.x2 ? p : null;
  }

  kick(vx: number, vy: number): void {
    this.platform = null;
    this.vx = vx;
    this.vy = vy;
    this.y -= 2;
  }

  remove(): void {
    this.gone = true;
    this.el.remove();
    this.world.items = this.world.items.filter((i) => i !== this);
  }

  /** is the point (page coordinates) on or near the item? */
  hit(x: number, y: number): boolean {
    const S = this.world.S;
    return !this.owner && !this.gone && Math.hypot(x - this.x, y - (this.y - 4 * S)) < 4 * S + 10;
  }

  update(dt: number): void {
    const w = this.world, rolls = this.kind === 'ball';
    if (this.owner || this.held) return;
    if (this.platform) {
      const p = w.find(this.platform.el);
      if (!p) this.platform = null;
      else {
        this.platform = p;
        this.y = p.y;
        this.x += this.vx * dt;
        this.vx *= Math.pow(rolls ? 0.3 : 0.001, dt);
        if (Math.abs(this.vx) < 6) this.vx = 0;
        if (this.x < p.x1 || this.x > p.x2) { this.platform = null; this.vy = 0; }
        if (this.x < w.minX || this.x > w.maxX) { this.x = clamp(this.x, w.minX, w.maxX); this.vx = -this.vx * 0.5; }
      }
    }
    if (!this.platform) {
      this.vy = Math.min(this.vy + G * dt, 2600);
      const y0 = this.y;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.x < w.minX) { this.x = w.minX; this.vx = Math.abs(this.vx) * 0.6; }
      if (this.x > w.maxX) { this.x = w.maxX; this.vx = -Math.abs(this.vx) * 0.6; }
      if (this.vy > 0) {
        const p = w.landing(this.x, y0, this.y, null);
        if (p) {
          this.y = p.y;
          if (this.vy > (rolls ? 280 : 500)) { this.vy = -this.vy * (rolls ? 0.5 : 0.3); this.vx *= 0.85; }
          else { this.vy = 0; this.platform = p; }
        }
      }
      if (this.y > w.bottom + 300) { if (rolls) w.respawnBall(); else this.remove(); }
    }
    if (rolls) this.spin += (this.vx * dt) / this.radius;
  }

  render(): void {
    if (this.owner || this.world.hidden) { this.el.style.display = 'none'; return; }
    this.el.style.display = '';
    drawItem(this.buf, this.kind, this.spin);
    this.ctx.clearRect(0, 0, 12, 9);
    this.ctx.drawImage(this.buf.canvas(), 0, 0);
    const S = this.world.S;
    this.el.style.transform = `translate3d(${Math.round(this.x - 6 * S)}px, ${Math.round(this.y - 8 * S)}px, 0)`;
  }
}
