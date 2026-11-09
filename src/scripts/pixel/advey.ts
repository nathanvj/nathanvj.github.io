/**
 * Advey at work, 148×56, one loop every 12 seconds, three seconds per step:
 *   Record       an advisor and a client talk; the phone on the table records
 *   Summary      their words fly into Advey and the report writes itself
 *   Client file  documents drop in, and fields fill in with their source
 *   Report       the report gets its letterhead, a chart and a green check
 * Then the finished report slides out and a blank one slides in.
 */
import { PixelBuffer } from './buffer';
import { drawGlyph } from './glyphs';
import { C, RGB } from './palette';

export const SCENE = { w: 148, h: 56, loop: 12 } as const;

/** which step is on at time t: 0 Record, 1 Summary, 2 Client file, 3 Report */
export const stepAt = (t: number): number => Math.min(3, Math.floor(t / 3));

const HEX = RGB.map(([r, g, b]) => `rgb(${r},${g},${b})`);
const fill = (c: CanvasRenderingContext2D, col: number, x: number, y: number, w = 1, h = 1): void => {
  c.fillStyle = HEX[col];
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), h);
};
const clamp01 = (u: number): number => Math.max(0, Math.min(1, u));
const ease = (u: number): number => { u = clamp01(u); return u * u * (3 - 2 * u); };
/** how far along t is between a and b, 0 to 1 */
const along = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a));

/** Advey's logo, 14×13 */
const LOGO = [
  '.....oooo.....', '....oooooo....', '....oooooo....', '...oooooooo...', '...oooooooo...',
  '..oooooooooo..', '.....ooooooo..', '..oo..ooooooo.', '.oooo..ooooooo', 'ooooo..ooooooo',
  'oooooo..oooooo', 'ooooo....ooooo', '.ooo......ooo.',
];

// ------------------------------------------------------------------ the timeline
/** who talks when; each speech bubble stays up 0.8s and sends three words to Advey */
const SPEECH: Array<{ who: 0 | 1; at: number }> = [
  { who: 0, at: 0.2 }, { who: 1, at: 1.1 }, { who: 0, at: 2.0 }, { who: 1, at: 2.9 },
];
const WORD_FLIGHT = 1.0;
const WORDS = SPEECH.flatMap((s, i) => [0.15, 0.4, 0.65].map((d, j) => ({
  who: s.who, at: s.at + d, w: [4, 3, 5][j], col: [C.cobalt, C.adveyOrange, C.steelDeep][(i + j) % 3],
})));
/** two documents (a payslip, a pension statement) drop in */
const DOCS = [{ x: 87, at: 6.0 }, { x: 94, at: 6.4 }];
const DROP = 0.55;
/** the moments something lands in Advey: it hops and sparks */
const ARRIVALS = [...WORDS.map((w) => w.at + WORD_FLIGHT), ...DOCS.map((d) => d.at + DROP)];
const WRITING: Array<[number, number]> = [[3.3, 5.4], [7.0, 8.5], [9.0, 10.1]];
const STAMP = 10.3;
const DONE = 11.4;

// ------------------------------------------------------------------ sprites
interface Pose { talk: [boolean, boolean]; blink: [boolean, boolean]; happy: boolean }

/** the advisor (left, navy suit, orange tie) and the client (right, blonde bob, green top), facing each other */
function drawPeople(b: PixelBuffer, p: Pose, edge: number): void {
  b.clear();
  const face = (cx: number, dir: 1 | -1, who: 0 | 1) => {
    b.ell(cx, 33, 5, 4.8, (_x, _y, nx, ny) => (nx > 0.7 || ny > 0.85 ? C.skinDeep : C.skin));
    const eyes = [cx + dir, cx + dir * 4];
    for (const ex of eyes) {
      if (p.happy) { b.set(ex - 1, 33, C.hairDeep); b.set(ex, 32, C.hairDeep); b.set(ex + 1, 33, C.hairDeep); }
      else if (p.blink[who]) b.set(ex, 33, C.hairDeep);
      else b.rect(ex, 32, 1, 2, C.ink);
    }
    b.set(cx, 35, C.blush); b.set(cx + dir * 5, 35, C.blush);
    const mx = dir === 1 ? cx + 2 : cx - 3;
    if (p.talk[who]) b.rect(mx, 36, 2, 2, C.mouth);
    else b.rect(mx, 36, 2, 1, C.lip);
  };

  // the advisor
  b.ell(13, 50, 8.6, 8, (_x, _y, nx) => (nx > 0.55 ? C.capBand : C.navy));
  b.rect(12, 38, 3, 4, C.skinDeep);
  b.rect(12, 42, 3, 2, C.white);
  b.rect(13, 43, 1, 3, C.adveyOrange);
  b.ell(13, 30.6, 6, 4.6, C.hairDeep);
  face(13, 1, 0);
  b.rect(8, 28, 10, 2, C.hairDeep);
  for (const x of [10, 11, 14]) b.set(x, 27, C.hair);
  b.set(8, 33, C.skin); b.set(8, 34, C.skinDeep);

  // the client
  b.ell(44, 32, 6.6, 6.2, (_x, _y, nx) => (nx > 0.55 ? C.blondeDeep : C.blonde));
  b.rect(38, 35, 2, 4, C.blonde); b.rect(49, 35, 2, 4, C.blondeDeep);
  b.ell(44, 50, 8.6, 8, (_x, _y, nx) => (nx > 0.55 ? C.leafDeep : C.leaf));
  b.rect(43, 38, 3, 4, C.skinDeep);
  b.set(44, 42, C.gold);
  face(44, -1, 1);
  b.rect(39, 28, 11, 2, C.blonde);
  b.set(46, 28, C.blondeDeep);
  b.set(39, 30, C.blonde); b.set(49, 30, C.blondeDeep);
  b.outline(edge);
}

/** the table, two cups (a cappuccino and a water) and the phone that records */
function drawTable(b: PixelBuffer, edge: number): void {
  b.rect(1, 46, 56, 2, C.woodLight);
  b.rect(1, 48, 56, 2, C.wood);
  b.rect(4, 50, 2, 6, C.woodDeep); b.rect(52, 50, 2, 6, C.woodDeep);
  b.rect(19, 43, 3, 3, C.white); b.set(22, 44, C.white); b.rect(19, 43, 3, 1, C.biscuit);
  b.rect(36, 42, 3, 4, C.coatShade); b.rect(36, 44, 3, 2, C.pigeon);
  b.rect(26, 36, 7, 10, C.advey);
  b.rect(27, 37, 5, 7, C.cobaltDeep);
  b.outline(edge);
}

/** a speech bubble with two lines of talk; the tail points down to whoever is talking */
function drawBubble(b: PixelBuffer, edge: number, tail: 0 | 1, small: boolean): void {
  if (small) b.rect(4, 3, 7, 4, C.white);
  else {
    b.rect(2, 1, 11, 1, C.white); b.rect(1, 2, 13, 5, C.white); b.rect(2, 7, 11, 1, C.white);
    b.rect(3, 3, 9, 1, C.steelDeep); b.rect(3, 5, 6, 1, C.steelDeep);
  }
  const t = tail === 0 ? [[4, 8], [3, 8], [2, 9]] : [[10, 8], [11, 8], [12, 9]];
  for (const [x, y] of t) b.set(x, y - (small ? 1 : 0), C.white);
  b.outline(edge);
}

/** Advey: its logo on a little white tile, like the tiles on this page */
function drawChip(b: PixelBuffer, edge: number): void {
  b.rect(2, 1, 18, 1, C.white); b.rect(1, 2, 20, 15, C.white); b.rect(2, 17, 18, 1, C.white);
  b.rect(1, 18, 20, 1, edge);
  b.rect(1, 19, 20, 1, C.gold);
  b.stamp(LOGO, { o: C.advey }, 4, 3);
  b.outline(edge);
}

/** a PDF: a sheet with a dog-ear and a red band */
function drawPdf(b: PixelBuffer, edge: number): void {
  for (let y = 1; y <= 9; y++) for (let x = 1; x <= 7; x++) if (!(x >= 6 && y <= 2 && x - 5 > y - 1)) b.set(x, y, C.white);
  b.set(6, 2, C.coatShade);
  b.rect(2, 4, 4, 1, C.steelDeep);
  b.rect(2, 6, 5, 2, C.heart);
  b.outline(edge);
}

/** the report: a sheet of paper with a folded corner, 35×47 */
function drawPaper(b: PixelBuffer, edge: number): void {
  for (let y = 1; y <= 45; y++) {
    for (let x = 1; x <= 33; x++) {
      const inCorner = x >= 29 && y <= 5;
      if (inCorner && x - 29 > y - 1) continue;
      b.set(x, y, inCorner ? (x - 29 === y - 1 ? C.steelDeep : C.coatShade) : C.white);
    }
  }
  b.outline(edge);
}

/** the green check that says the report is done */
function drawCheck(b: PixelBuffer, edge: number): void {
  b.ell(6.5, 6.5, 5.5, 5.5, (_x, _y, nx, ny) => (nx + ny > 1 ? C.leafDeep : C.ok));
  for (const [x, y] of [[3, 6], [4, 7], [5, 8], [6, 7], [7, 6], [8, 5], [9, 4]]) { b.set(x, y, C.white); b.set(x, y + 1, C.white); }
  b.outline(edge);
}

const sprite = (w: number, h: number, draw: (b: PixelBuffer) => void): HTMLCanvasElement => {
  const b = new PixelBuffer(w, h);
  draw(b);
  return b.canvas();
};

// ------------------------------------------------------------------ the scene
export class AdveyScene {
  /** the outline: ink by day, a lighter rim at night so it reads on the dark page */
  private readonly edge: number;
  private readonly people = new PixelBuffer(58, 56);
  private pose = '';
  private readonly table: HTMLCanvasElement;
  private readonly bubbles: HTMLCanvasElement[][];
  private readonly chip: HTMLCanvasElement;
  private readonly pdf: HTMLCanvasElement;
  private readonly paper: HTMLCanvasElement;
  private readonly check: HTMLCanvasElement;

  constructor(night: boolean) {
    const edge = (this.edge = night ? C.rim : C.ink);
    this.table = sprite(58, 56, (b) => drawTable(b, edge));
    this.bubbles = ([0, 1] as const).map((w) => [sprite(15, 11, (b) => drawBubble(b, edge, w, false)), sprite(15, 11, (b) => drawBubble(b, edge, w, true))]);
    this.chip = sprite(22, 21, (b) => drawChip(b, edge));
    this.pdf = sprite(9, 11, (b) => drawPdf(b, edge));
    this.paper = sprite(35, 47, (b) => drawPaper(b, edge));
    this.check = sprite(13, 13, (b) => drawCheck(b, edge));
  }

  /** draw the scene as it is t seconds into the loop */
  draw(c: CanvasRenderingContext2D, t: number): void {
    c.clearRect(0, 0, SCENE.w, SCENE.h);
    const speaking = SPEECH.map((s) => ({ ...s, age: t - s.at })).filter((s) => s.age >= 0 && s.age < 0.8);
    const talking = (who: 0 | 1) => speaking.some((s) => s.who === who && Math.floor(s.age * 7) % 2 === 0);

    // the meeting
    c.fillStyle = 'rgba(16, 26, 82, 0.12)';
    c.fillRect(2, 55, 54, 1);
    const pose: Pose = {
      talk: [talking(0), talking(1)],
      blink: [t % 3.7 < 0.12, (t + 1.6) % 4.1 < 0.12],
      happy: t >= STAMP && t < DONE,
    };
    const key = JSON.stringify(pose);
    if (key !== this.pose) { this.pose = key; drawPeople(this.people, pose, this.edge); }
    c.drawImage(this.people.canvas(), 0, 0);
    c.drawImage(this.table, 0, 0);
    // the phone: a blinking red dot while it records, and a level meter
    if (t < 4.4 && (t * 2) % 1 < 0.6) fill(c, C.heart, 28, 38, 2, 2);
    for (let i = 0; i < 5; i++) {
      const h = speaking.length ? 1 + Math.floor(Math.abs(Math.sin(t * 19 + i * 1.7)) * 3) : 1;
      fill(c, C.white, 27 + i, 44 - h, 1, h);
    }
    for (const s of speaking) c.drawImage(this.bubbles[s.who][s.age < 0.1 ? 1 : 0], s.who === 0 ? 14 : 31, 9);

    // words fly over to Advey, on a little arc
    for (const w of WORDS) {
      const u = (t - w.at) / WORD_FLIGHT;
      if (u < 0 || u >= 1) continue;
      const [x0, y0] = w.who === 0 ? [26, 12] : [43, 12];
      const x = x0 + (93 - x0) * u, y = y0 + (25 - y0) * u - Math.sin(Math.PI * u) * 8;
      fill(c, w.col, x, y, w.w, 2);
    }
    // documents drop in from above
    for (const d of DOCS) {
      const u = (t - d.at) / DROP;
      if (u >= 0 && u < 1) c.drawImage(this.pdf, d.x, Math.round(-12 + 34 * u * u));
    }

    // Advey hops when something lands, with a few sparks
    const landed = ARRIVALS.map((a) => t - a).filter((age) => age >= 0 && age < 0.3);
    c.drawImage(this.chip, 83, 16 - (landed.some((age) => age < 0.1) ? 1 : 0));
    for (const age of landed) {
      const o = Math.floor(age * 12);
      drawGlyph(c, 'spark', 80 - o, 13 - o, HEX[C.spark]);
      drawGlyph(c, 'spark', 104 + o, 13 - o, HEX[C.adveyOrange]);
    }
    // and passes what it made on to the report
    if (WRITING.some(([a, b]) => t >= a && t < b)) {
      for (let i = 0; i < 6; i++) if ((i - Math.floor(t * 12)) % 3 === 0) fill(c, C.adveyOrange, 106 + i, 26);
    }

    // the report: in from below, out to the right when it's done
    const dx = 113 + Math.round(ease((t - DONE) / 0.6) * 40);
    const dy = 5 + Math.round((1 - ease(t / 0.5)) * 52);
    c.drawImage(this.paper, dx, dy);
    this.writeReport(c, t, dx, dy);
  }

  private writeReport(c: CanvasRenderingContext2D, t: number, x: number, y: number): void {
    const cursorOn = Math.floor(t * 6) % 2 === 0;
    /** a line that writes itself from a to b, with a cursor at its end */
    const line = (col: number, lx: number, ly: number, w: number, h: number, a: number, b: number) => {
      const u = along(t, a, b);
      if (u <= 0) return;
      fill(c, col, x + lx, y + ly, w * u, h);
      if (u < 1 && cursorOn) fill(c, C.adveyOrange, x + lx + Math.round(w * u), y + ly - 1, 1, h + 1);
    };
    // Report: the letterhead
    if (t >= 9.0) {
      fill(c, C.adveyOrange, x + 2, y + 2, 26 * ease(along(t, 9.0, 9.4)), 4);
      if (t >= 9.4) fill(c, C.white, x + 4, y + 3, 8, 1);
    }
    // Summary: a title and three lines
    line(C.ink, 3, 9, 15, 2, 3.3, 3.7);
    line(C.steelDeep, 3, 13, 27, 1, 3.8, 4.4);
    line(C.steelDeep, 3, 15, 25, 1, 4.4, 5.0);
    line(C.steelDeep, 3, 17, 16, 1, 5.0, 5.4);
    // Client file: three fields, each with its source
    [12, 9, 13].forEach((w, i) => {
      const a = 7.0 + i * 0.5, ry = 21 + i * 3;
      if (t < a) return;
      fill(c, C.steelDeep, x + 3, y + ry, 6, 1);
      line(C.cobalt, 11, ry, w, 1, a, a + 0.35);
      if (t >= a + 0.4) fill(c, C.adveyOrange, x + 28, y + ry, 2, 2);
    });
    // Report: a little chart
    if (t >= 9.5) {
      fill(c, C.steelDeep, x + 3, y + 40, 16, 1);
      [4, 6, 5, 8].forEach((h, i) => {
        const g = Math.round(h * ease(along(t, 9.5 + i * 0.1, 9.8 + i * 0.1)));
        if (g > 0) fill(c, i === 3 ? C.adveyOrange : C.cobalt, x + 4 + i * 4, y + 40 - g, 3, g);
      });
    }
    // and the check, dropping on with a couple of sparks
    if (t >= STAMP) {
      const age = t - STAMP;
      c.drawImage(this.check, x + 20, y + 31 - (age < 0.12 ? 3 - Math.floor(age * 25) : 0));
      if (age < 0.35) {
        const o = Math.floor(age * 12);
        drawGlyph(c, 'spark', x + 17 - o, y + 29 - o, HEX[C.spark]);
        drawGlyph(c, 'spark', x + 31 + o, y + 29 - o, HEX[C.spark]);
      }
    }
  }
}
