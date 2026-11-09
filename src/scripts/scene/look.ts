/**
 * Shared pieces for the hero landscape: sprites that exist in a day and a night
 * version, blending between them as the sky turns, and the view being painted.
 */
import { mixHex, PALETTES, type ScenePalette } from './env';

type Paint = (c: CanvasRenderingContext2D, P: ScenePalette, night: boolean) => void;

/** a sprite painted on first use, in the day palette, the night palette, or both */
export class Look {
  readonly w: number;
  readonly h: number;
  private readonly paint: Paint;
  private readonly cvs: [HTMLCanvasElement?, HTMLCanvasElement?] = [];

  constructor(w: number, h: number, paint: Paint) {
    this.w = w;
    this.h = h;
    this.paint = paint;
  }

  get(night: boolean): HTMLCanvasElement {
    const i = night ? 1 : 0;
    if (!this.cvs[i]) {
      const cv = document.createElement('canvas');
      cv.width = this.w;
      cv.height = this.h;
      this.paint(cv.getContext('2d')!, night ? PALETTES.night : PALETTES.day, night);
      this.cvs[i] = cv;
    }
    return this.cvs[i]!;
  }
}

/** the day look, with the night look over it as dark as `n` is (0 is day, 1 is night) */
export function blend(c: CanvasRenderingContext2D, look: Look, x: number, y: number, n: number): void {
  if (n < 1) c.drawImage(look.get(false), x, y);
  if (n > 0) {
    c.globalAlpha = n;
    c.drawImage(look.get(true), x, y);
    c.globalAlpha = 1;
  }
}

type ColourKey = { [K in keyof ScenePalette]: ScenePalette[K] extends string ? K : never }[keyof ScenePalette];
/** a flat scene colour somewhere between day and night */
export const tone = (key: ColourKey, n: number): string => mixHex(PALETTES.day[key], PALETTES.night[key], n);

/** where the scene is looking: scrolled to camX, as dark as n, the path on row `street`, at time t */
export interface View {
  camX: number;
  t: number;
  n: number;
  W: number;
  H: number;
  street: number;
  /** Ruby Run is on */
  running: boolean;
}
