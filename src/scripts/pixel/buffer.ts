/**
 * A tiny paletted pixel buffer with the handful of drawing primitives the
 * sprites need. Draw at native resolution, call outline(), then canvas()
 * to get something you can drawImage() with nearest-neighbour scaling.
 */
import { C, RGB } from './palette';

/** decides the colour per pixel: (x, y, normalised x, normalised y) -> palette index (0 = skip) */
export type Paint = number | ((x: number, y: number, nx: number, ny: number) => number);

export class PixelBuffer {
  readonly w: number;
  readonly h: number;
  private d: Uint8Array;
  private cv?: HTMLCanvasElement;
  private cx?: CanvasRenderingContext2D;
  private img?: ImageData;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.d = new Uint8Array(w * h);
  }

  clear(): void {
    this.d.fill(0);
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[y * this.w + x];
  }

  set(x: number, y: number, c: number): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.d[y * this.w + x] = c;
  }

  /** paint only where something is already drawn */
  over(x: number, y: number, c: number): void {
    if (this.get(Math.floor(x), Math.floor(y))) this.set(x, y, c);
  }

  rect(x: number, y: number, w: number, h: number, c: number): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }

  /** a filled ellipse; `paint` can be a colour or a function for shading */
  ell(cx: number, cy: number, rx: number, ry: number, paint: Paint): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) this.set(x, y, typeof paint === 'function' ? paint(x, y, nx, ny) : paint);
      }
    }
  }

  /** a shaded ellipse: crescent shadow bottom-right, soft highlight top-left */
  blob(cx: number, cy: number, rx: number, ry: number, base: number, deep: number, light: number, sx = 1.1, sy = 1.5): void {
    this.ell(cx, cy, rx, ry, (x, y) => {
      const ux = (x + 0.5 - (cx - sx)) / rx;
      const uy = (y + 0.5 - (cy - sy)) / ry;
      if (ux * ux + uy * uy > 1) return deep;
      const lx = (x + 0.5 - (cx - rx * 0.42)) / (rx * 0.32);
      const ly = (y + 0.5 - (cy - ry * 0.48)) / (ry * 0.26);
      return lx * lx + ly * ly <= 1 ? light : base;
    });
  }

  line(x0: number, y0: number, x1: number, y1: number, c: number, thick = 1): void {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.rect(x0, y0, thick, thick, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** stamp a text template: each character maps to a palette index via `key` ('.' or unknown = skip) */
  stamp(rows: readonly string[], key: Record<string, number>, x0 = 0, y0 = 0): void {
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (key[ch]) this.set(x0 + x, y0 + y, key[ch]); }));
  }

  /** a 1px outline around everything drawn, 4-neighbour: rounded and clean */
  outline(c: number = C.ink): void {
    const { w, h, d } = this;
    const out = new Uint8Array(d);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (d[i]) continue;
        if ((x > 0 && d[i - 1]) || (x < w - 1 && d[i + 1]) || (y > 0 && d[i - w]) || (y < h - 1 && d[i + w])) out[i] = c;
      }
    }
    this.d = out;
  }

  /** the buffer as a canvas (created once, reused every frame) */
  canvas(): HTMLCanvasElement {
    if (!this.cv || !this.cx || !this.img) {
      this.cv = document.createElement('canvas');
      this.cv.width = this.w;
      this.cv.height = this.h;
      this.cx = this.cv.getContext('2d')!;
      this.img = this.cx.createImageData(this.w, this.h);
    }
    const px = this.img.data;
    for (let i = 0; i < this.d.length; i++) {
      const c = this.d[i], k = i * 4;
      if (!c) { px[k + 3] = 0; continue; }
      const rgb = RGB[c];
      px[k] = rgb[0]; px[k + 1] = rgb[1]; px[k + 2] = rgb[2]; px[k + 3] = 255;
    }
    this.cx.putImageData(this.img, 0, 0);
    return this.cv;
  }
}
