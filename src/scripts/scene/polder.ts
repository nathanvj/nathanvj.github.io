/**
 * The polder: the Dutch countryside behind the red bike path in the hero
 * (landscape.ts paints the sky, the path and the ditch in front).
 *
 * Back to front, each layer scrolling faster than the one behind it:
 *   a hazy line of trees far away
 *   the horizon: windmills with turning sails, farms, a church tower, poplars
 *   a far meadow crossed by long ditches, with geese flying over now and then
 *   bulb fields in coloured strips, meadows with cows that wander and graze,
 *     ploughed land with the odd heron, little ditches in between
 *   the grass verge with daisies and pollard willows, as fast as the path
 * And along the ditch in front, reeds and cattails swaying (waterside()).
 *
 * Everything is placed from fixed seeds as it scrolls in, so it's the same
 * polder on every visit, and it never runs out.
 */
import { mixHex, PALETTES, px, rect, rng, type ScenePalette } from './env';
import { blend, Look, tone, type View } from './look';

const PARALLAX = { haze: 0.15, horizon: 0.3, meadow: 0.45, fields: 0.6 } as const;
/** rows above the path: the horizon, where the fields start, where the verge starts */
const ROWS = { horizon: 24, fields: 15, verge: 5 } as const;

// ---------------------------------------------------------------- on the horizon
/** a smock mill: thatched, tapering body, white stage, a cap; the sails turn live */
const MILL = { w: 24, h: 42, hubX: 12, hubY: 10 };
const mill = new Look(MILL.w, MILL.h, (c, P, night) => {
  const foot = MILL.h - 1;
  for (let y = 14; y <= foot; y++) {
    const hw = 3 + ((y - 14) / (foot - 14)) * 3.5, x0 = Math.round(12 - hw), x1 = Math.round(12 + hw) - 1;
    rect(c, x0, y, x1 - x0 + 1, 1, P.mill);
    px(c, x0 + 1, y, P.millLight);
    px(c, x0, y, P.line); px(c, x1, y, P.line);
  }
  rect(c, 4, 28, 16, 1, P.sail); rect(c, 4, 29, 16, 1, P.line);
  px(c, 4, 30, P.line); px(c, 19, 30, P.line);
  rect(c, 11, 36, 3, 6, P.stock);
  rect(c, 11, 20, 2, 3, night ? P.lit[0] : P.glass);
  [2, 3, 4, 5, 5, 5, 5].forEach((hw, i) => {
    rect(c, 12 - hw, 8 + i, hw * 2, 1, P.roof);
    px(c, 12 - hw - 1, 8 + i, P.line); px(c, 12 + hw, 8 + i, P.line);
  });
  rect(c, 10, 7, 4, 1, P.line);
});

/** four lattice sails around the hub, at an angle */
function sails(c: CanvasRenderingContext2D, hx: number, hy: number, angle: number, sail: string, stock: string): void {
  for (let k = 0; k < 4; k++) {
    const a = angle + (k * Math.PI) / 2, ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
    for (let r = 1; r <= 15; r++) {
      px(c, Math.round(hx + ux * r), Math.round(hy + uy * r), stock);
      if (r >= 4) for (let d = 1; d <= 3; d++) if (r % 2 === 0 || d === 3) px(c, Math.round(hx + ux * r + vx * d), Math.round(hy + uy * r + vy * d), sail);
    }
  }
  px(c, hx, hy, stock);
}

/** a farmhouse with a big thatched roof, and the barn behind it */
const farm = (seed: number) => new Look(30, 18, (c, P, night) => {
  const r = rng(seed), wall = P.walls[r() < 0.5 ? 1 : 0];
  rect(c, 15, 9, 14, 9, P.door);
  for (let y = 4; y < 9; y++) rect(c, 15 + (8 - y), y, 14 - (8 - y) * 2 + 8, 1, P.roof);
  rect(c, 19, 12, 5, 6, P.line);
  rect(c, 2, 10, 14, 8, wall);
  for (let y = 1; y < 10; y++) { const hw = Math.round((y / 9) * 9); rect(c, 9 - hw, y, hw * 2, 1, P.roof); px(c, 9 - hw - 1, y, P.line); px(c, 9 + hw, y, P.line); }
  rect(c, 4, 12, 3, 3, night ? P.lit[1] : P.glass); rect(c, 10, 12, 3, 3, night && r() < 0.6 ? P.lit[0] : P.glass);
  rect(c, 1, 10, 1, 8, P.line); rect(c, 16, 10, 1, 8, P.line);
});

/** a village church tower with a copper spire */
const church = new Look(12, 34, (c, P) => {
  rect(c, 3, 12, 6, 22, P.walls[0]);
  rect(c, 3, 12, 1, 22, P.line); rect(c, 8, 12, 1, 22, P.line);
  rect(c, 5, 16, 2, 3, P.line); px(c, 5, 22, P.glass); px(c, 6, 22, P.glass);
  for (let y = 0; y < 12; y++) { const hw = Math.max(1, Math.round((y / 11) * 4)); rect(c, 6 - hw, y, hw * 2, 1, P.walls[4]); }
  rect(c, 2, 11, 8, 1, P.line);
});

/** a clump of trees, flat and far away */
const trees = (w: number, seed: number) => new Look(w, 18, (c, P) => {
  const r = rng(seed);
  for (let i = 0; i < Math.max(2, Math.round(w / 6)); i++) {
    const cx = 3 + r() * (w - 6), cy = 10 + r() * 3, rr = 3 + r() * 4;
    for (let y = Math.floor(cy - rr); y <= 17; y++) for (let x = Math.floor(cx - rr); x <= cx + rr; x++) {
      const d = (x - cx) ** 2 + ((y - cy) * 1.2) ** 2;
      if (d <= rr * rr && x >= 0 && x < w) px(c, x, y, d < rr * rr * 0.35 && y < cy ? P.tree : P.treeDeep);
    }
  }
  rect(c, 0, 17, w, 1, P.treeDeep);
});

/** a row of poplars along a far road */
const poplars = (w: number, seed: number) => new Look(w, 24, (c, P) => {
  const r = rng(seed);
  for (let cx = 2; cx < w - 1; cx += 4) {
    const top = 3 + Math.floor(r() * 5);
    for (let y = top; y < 23; y++) {
      const t = (y - top) / (23 - top), hw = Math.sin(Math.min(1, t * 1.3) * Math.PI) * 2 + 0.4;
      for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) px(c, x, y, x < cx ? P.tree : P.treeDeep);
    }
  }
});

// ---------------------------------------------------------------- on the land
/** the far meadow, as a tile that repeats: grass, two long ditches catching the light */
const MEADOW_TILE = 128;
const meadowTile = new Look(MEADOW_TILE, ROWS.horizon - ROWS.fields, (c, P) => {
  rect(c, 0, 0, MEADOW_TILE, ROWS.horizon - ROWS.fields, P.meadowFar);
  for (let x = 0; x < MEADOW_TILE; x++) {
    if ((x * 7) % 11 < 3) px(c, x, 6 + ((x >> 3) & 1), P.meadow);
    if (x % 37 > 4) px(c, x, 3, mixHex(P.meadowFar, P.water, 0.6));
    if (x % 53 > 30) px(c, x, 7, mixHex(P.meadow, P.water, 0.5));
  }
});

/** the verge along the path, as a repeating tile: grass with daisies and buttercups */
const VERGE_TILE = 96;
const vergeTile = new Look(VERGE_TILE, ROWS.verge, (c, P) => {
  rect(c, 0, 0, VERGE_TILE, ROWS.verge, P.grass);
  const r = rng(77);
  for (let x = 0; x < VERGE_TILE; x++) {
    if (x % 7 === 0) px(c, x, 0, P.grassDeep);
    if ((x * 5) % 9 === 0) px(c, x, 2 + (x % 3), P.grassDeep);
    const k = r();
    if (k < 0.07) px(c, x, 1 + Math.floor(r() * 3), P.cowWhite);
    else if (k < 0.11) px(c, x, 1 + Math.floor(r() * 3), P.heads[4]);
  }
});

type FieldKind = 'bulbs' | 'meadow' | 'soil';

/**
 * One field: bulbs in strips of colour (rows of flowers between rows of leaves),
 * a meadow, or ploughed land. A little ditch runs along its left edge.
 */
const field = (w: number, kind: FieldKind, colours: number[]) => new Look(w, ROWS.fields - ROWS.verge, (c, P) => {
  const H = ROWS.fields - ROWS.verge;
  for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) {
    let col: string;
    if (kind === 'bulbs') {
      const head = P.heads[colours[Math.min(colours.length - 1, Math.floor((x / w) * colours.length))]];
      col = y % 2 === 0
        ? (x + y) % 3 === 0 ? mixHex(head, P.line, 0.22) : (x * 2 + y) % 5 === 0 ? mixHex(head, '#ffffff', 0.35) : head
        : x % 4 === 0 ? P.meadowDeep : P.stem;
    } else if (kind === 'soil') {
      col = y % 2 ? P.soilDeep : (x * 3 + y) % 7 === 0 ? P.soilDeep : P.soil;
    } else {
      col = (x * 7 + y * 3) % 5 === 0 ? P.meadowDeep : (x * 3 + y * 5) % 11 === 0 ? P.grass : P.meadow;
    }
    if (y < 3) col = mixHex(col, P.meadowFar, 0.45 - y * 0.15);   // a little haze in the distance
    px(c, x, y, col);
  }
  rect(c, 0, 0, 1, H, mixHex(P.meadowDeep, P.water, 0.55));
});

/** a Frisian cow: standing, mid-step, or grazing with her head down; facing right */
const cowLook = (pose: 'stand' | 'step' | 'graze') => new Look(12, 8, (c, P) => {
  for (let y = 1; y <= 4; y++) for (let x = 1; x <= 8; x++) px(c, x, y, (x + y * 3) % 7 < 3 || (x < 4 && y < 3) ? P.cow : P.cowWhite);
  const legs = pose === 'step' ? [[2, 6], [4, 5], [6, 6], [8, 5]] : [[2, 5], [3, 5], [7, 5], [8, 5]];
  for (const [x, y] of legs) { px(c, x, 5, P.cow); px(c, x, y + 1, P.cow); px(c, x, 6, P.cow); }
  px(c, 0, 2, P.cow); px(c, 0, 3, P.cow);                         // tail
  if (pose === 'graze') { rect(c, 9, 4, 2, 2, P.cow); px(c, 10, 6, P.walls[1]); px(c, 11, 6, P.meadowDeep); }
  else { rect(c, 9, 1, 2, 2, P.cow); px(c, 11, 2, P.walls[1]); px(c, 9, 0, P.cowWhite); }
});
const COW = { stand: cowLook('stand'), step: cowLook('step'), graze: cowLook('graze') };

/** a grey heron, standing very still in the field */
const heron = new Look(8, 14, (c, P) => {
  const grey = mixHex(P.cowWhite, P.mill, 0.45), dark = P.mill;
  rect(c, 2, 6, 4, 3, grey); px(c, 1, 7, dark); rect(c, 5, 6, 1, 2, dark);
  px(c, 5, 5, grey); px(c, 4, 4, grey); px(c, 4, 3, grey); px(c, 5, 2, grey); rect(c, 5, 1, 2, 1, grey);
  px(c, 6, 1, P.line); px(c, 7, 2, P.heads[4]);
  px(c, 3, 9, dark); px(c, 3, 10, dark); px(c, 3, 11, dark); px(c, 4, 12, dark); px(c, 3, 13, dark);
});

/** a pollard willow on the verge: a stubby trunk with a round crown of thin branches */
const willow = (seed: number) => new Look(20, 26, (c, P) => {
  const r = rng(seed), foot = 25, cx = 10, cy = 9;
  rect(c, 8, 14, 4, foot - 13, P.bark); rect(c, 7, 13, 6, 2, P.bark);
  rect(c, 7, 14, 1, foot - 13, P.line); rect(c, 12, 14, 1, foot - 13, P.line);
  const inside = new Set<string>();
  for (let y = 0; y < 16; y++) for (let x = 0; x < 20; x++) {
    const d = ((x - cx) / 8.5) ** 2 + ((y - cy) / 7) ** 2;
    if (d <= 1 + (r() - 0.5) * 0.25) inside.add(`${x},${y}`);
  }
  for (const k of inside) {
    const [x, y] = k.split(',').map(Number);
    const hi = (x - cx + 3) ** 2 + (y - cy + 3) ** 2 < 12, deep = x + y > cx + cy + 6;
    px(c, x, y, hi ? P.willowHi : deep || (x * 7 + y * 3) % 5 === 0 ? P.willowDeep : P.willow);
  }
  for (const k of inside) {
    const [x, y] = k.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!inside.has(`${x + dx},${y + dy}`) && !(y + dy >= 13 && x + dx >= 7 && x + dx <= 12)) px(c, x + dx, y + dy, P.line);
  }
});

// ---------------------------------------------------------------- the polder
interface Item { x: number; look: Look; mill?: number }
/** a cow in a meadow: where she is along the field and how far back (foot), which way she faces, what she's doing and for how long */
interface Cow { x: number; foot: number; dir: 1 | -1; mode: 'walk' | 'graze'; left: number }
interface Field { x: number; w: number; look: Look; cows: Cow[]; heron?: number }
interface Reeds { x: number; stalks: { dx: number; h: number; cattail: boolean }[] }
interface Geese { x: number; y: number; dir: 1 | -1; n: number; t0: number }

export class Polder {
  private horizon: Item[] = [];
  private fields: Field[] = [];
  private willows: Item[] = [];
  private reeds: Reeds[] = [];
  private geese: Geese | null = null;
  private nextGeese = 6;
  private lastT = 0;
  private readonly haze: number[];
  private readonly r = { horizon: rng(41), fields: rng(42), willows: rng(43), reeds: rng(45), life: rng(46) };
  private readonly next = { horizon: -12, fields: -20, willows: 34, reeds: 20, count: 0 };
  private readonly willowLooks = [willow(3), willow(8), willow(15)];

  constructor() {
    // the far tree line: a long, smooth, repeating silhouette
    const r = rng(44);
    this.haze = Array.from({ length: 512 }, (_, i) => Math.round(2 + 2.5 * (1 + Math.sin(i * 0.05 + 1)) * (0.6 + 0.4 * Math.sin(i * 0.21)) + (r() < 0.15 ? 1 : 0)));
  }

  private fill(v: View): void {
    const { r, next } = this, W = v.W;
    const Lh = v.camX * PARALLAX.horizon, Lf = v.camX * PARALLAX.fields, X = v.camX;
    while (next.horizon < Lh + W + 40) {
      // something on the horizon every few steps, with a windmill among the first things you see
      const k = r.horizon(), n = next.count++;
      let item: Item;
      if (n === 2 || n === 9 || (n > 9 && k < 0.2)) item = { x: next.horizon, look: mill, mill: r.horizon() * 6 };
      else if (k < 0.34) item = { x: next.horizon, look: farm(Math.floor(r.horizon() * 1e6)) };
      else if (k < 0.42) item = { x: next.horizon, look: church };
      else if (k < 0.75) item = { x: next.horizon, look: trees(14 + Math.floor(r.horizon() * 22), Math.floor(r.horizon() * 1e6)) };
      else item = { x: next.horizon, look: poplars(10 + Math.floor(r.horizon() * 16), Math.floor(r.horizon() * 1e6)) };
      this.horizon.push(item);
      next.horizon += item.look.w + 2 + Math.floor(r.horizon() * 16);
    }
    while (next.fields < Lf + W + 40) {
      const k = r.fields(), w = 40 + Math.floor(r.fields() * 50);
      const kind: FieldKind = k < 0.55 ? 'bulbs' : k < 0.85 ? 'meadow' : 'soil';
      const colours = Array.from({ length: 1 + Math.floor(r.fields() * 3) }, () => Math.floor(r.fields() * 5));
      const f: Field = { x: next.fields, w, look: field(w, kind, colours), cows: [] };
      if (kind === 'meadow') {
        for (let i = 0, n = 1 + Math.floor(r.fields() * 3); i < n; i++) {
          f.cows.push({ x: 3 + r.fields() * (w - 16), foot: 2 + Math.floor(r.fields() * 4), dir: r.fields() < 0.5 ? 1 : -1, mode: 'graze', left: 1 + r.fields() * 6 });
        }
      }
      if (kind === 'soil' && r.fields() < 0.7) f.heron = 6 + Math.floor(r.fields() * (w - 14));
      this.fields.push(f);
      next.fields += w;
    }
    while (next.willows < X + W + 40) {
      this.willows.push({ x: next.willows, look: this.willowLooks[Math.floor(r.willows() * 3)] });
      next.willows += 90 + Math.floor(r.willows() * 90);
    }
    while (next.reeds < X + W + 40) {
      const stalks = Array.from({ length: 4 + Math.floor(r.reeds() * 6) }, (_, i) => ({ dx: i * 2 + Math.floor(r.reeds() * 2), h: 3 + Math.floor(r.reeds() * 4), cattail: r.reeds() < 0.3 }));
      this.reeds.push({ x: next.reeds, stalks });
      next.reeds += 40 + Math.floor(r.reeds() * 90);
    }
    this.horizon = this.horizon.filter((h) => h.x + h.look.w > Lh - 40);
    this.fields = this.fields.filter((f) => f.x + f.w > Lf - 40);
    this.willows = this.willows.filter((w) => w.x + w.look.w > X - 40);
    this.reeds = this.reeds.filter((rd) => rd.x + 24 > X - 40);
  }

  /** cows wander and graze, geese fly over now and then */
  private live(t: number, W: number, hz: number): void {
    const dt = Math.min(0.2, Math.max(0, t - this.lastT));
    this.lastT = t;
    const r = this.r.life;
    for (const f of this.fields) for (const cw of f.cows) {
      if ((cw.left -= dt) <= 0) {
        cw.mode = cw.mode === 'graze' && r() < 0.6 ? 'walk' : 'graze';
        cw.left = cw.mode === 'walk' ? 1.5 + r() * 3 : 2 + r() * 6;
        if (r() < 0.4) cw.dir = cw.dir === 1 ? -1 : 1;
      }
      if (cw.mode === 'walk') {
        cw.x += cw.dir * 3 * dt;
        if (cw.x < 2 || cw.x > f.w - 14) { cw.dir = cw.x < 2 ? 1 : -1; cw.x = Math.max(2, Math.min(f.w - 14, cw.x)); }
      }
    }
    if (!this.geese && t > this.nextGeese) {
      const dir = r() < 0.5 ? 1 : -1;
      this.geese = { x: dir > 0 ? -30 : W + 30, y: hz - 44 + Math.floor(r() * 16), dir, n: 3 + Math.floor(r() * 4), t0: t };
    }
    if (this.geese) {
      this.geese.x += this.geese.dir * 14 * dt;
      if (this.geese.x < -60 || this.geese.x > W + 60) { this.geese = null; this.nextGeese = t + 14 + r() * 22; }
    }
  }

  /** the whole polder behind the path, into the layer the water reflects */
  back(c: CanvasRenderingContext2D, v: View): void {
    this.fill(v);
    this.live(v.t, v.W, v.street - ROWS.horizon);
    const { n, W, street: S, t } = v, hz = S - ROWS.horizon;
    const D = PALETTES.day, N = PALETTES.night;
    const mix = (pick: (P: ScenePalette) => string) => mixHex(pick(D), pick(N), n);
    const at = (k: keyof typeof PARALLAX) => Math.round(v.camX * PARALLAX[k]);
    const Lz = at('haze'), Lh = at('horizon'), Lm = at('meadow'), Lf = at('fields'), X = Math.round(v.camX);

    // far away: a hazy tree line, the horizon, the geese
    const haze = mixHex(mix((P) => P.skyLow), tone('meadowFar', n), 0.5);
    for (let x = 0; x < W; x++) { const h = this.haze[(((x + Lz) % 512) + 512) % 512]; rect(c, x, hz - h, 1, h, haze); }
    for (const h of this.horizon) {
      blend(c, h.look, h.x - Lh, hz - h.look.h, n);
      if (h.mill !== undefined) sails(c, h.x - Lh + MILL.hubX, hz - MILL.h + MILL.hubY, t * 0.7 + h.mill, tone('sail', n), tone('stock', n));
    }
    if (this.geese && n < 0.5) {
      const g = this.geese, flap = Math.floor(t * 4) % 2, ink = tone('cow', n);
      for (let i = 0; i < g.n; i++) {
        // a V: the leader in front, the others trailing behind on either side
        const k = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
        const gx = Math.round(g.x - g.dir * k * 5), gy = g.y + side * k * 2;
        const rows = flap ? ['o...o', '.ooo.'] : ['.ooo.', 'o...o'];
        rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'o') px(c, gx + x, gy + y, ink); }));
      }
    }

    // the far meadow, then the fields with their cows and herons
    for (let x = -(((Lm % MEADOW_TILE) + MEADOW_TILE) % MEADOW_TILE); x < W; x += MEADOW_TILE) blend(c, meadowTile, x, hz, n);
    const top = S - ROWS.fields;
    for (const f of this.fields) {
      const x0 = f.x - Lf;
      if (x0 > W || x0 + f.w < 0) continue;
      blend(c, f.look, x0, top, n);
      if (f.heron !== undefined) blend(c, heron, x0 + f.heron, S - ROWS.verge - 2 - 13, n);
      for (const cw of [...f.cows].sort((a, b) => a.foot - b.foot)) {
        const look = cw.mode === 'graze' ? COW.graze : Math.floor(t * 4 + cw.x) % 2 ? COW.step : COW.stand;
        const x = Math.round(x0 + cw.x), y = top + 3 + cw.foot - 6;
        if (cw.dir > 0) blend(c, look, x, y, n);
        else { c.save(); c.translate(x * 2 + 12, 0); c.scale(-1, 1); blend(c, look, x, y, n); c.restore(); }
      }
    }

    // the verge along the path, with tufts and pollard willows
    for (let x = -(((X % VERGE_TILE) + VERGE_TILE) % VERGE_TILE); x < W; x += VERGE_TILE) blend(c, vergeTile, x, S - ROWS.verge, n);
    const edge = tone('grassDeep', n);
    for (let x = -(((X % 7) + 7) % 7); x < W; x += 7) px(c, x + 1, S - ROWS.verge - 1, edge);
    for (const w of this.willows) blend(c, w.look, w.x - X - 10, S - 1 - (w.look.h - 1), n);
  }

  /** reeds and cattails at the water's edge, swaying a little; drawn over the ditch */
  waterside(c: CanvasRenderingContext2D, v: View, waterTop: number): void {
    const X = Math.round(v.camX), stalk = tone('willowDeep', v.n), light = tone('willow', v.n), tail = tone('bark', v.n);
    for (const rd of this.reeds) {
      const x0 = rd.x - X;
      if (x0 > v.W || x0 + 24 < 0) continue;
      for (const s of rd.stalks) {
        const x = x0 + s.dx, sway = Math.sin(v.t * 1.4 + x * 0.3) > 0.55 ? 1 : 0;
        for (let i = 0; i < s.h; i++) px(c, x + (i >= s.h - 2 ? sway : 0), waterTop + 2 - i, i % 3 ? stalk : light);
        if (s.cattail) { px(c, x + sway, waterTop + 2 - s.h, tail); px(c, x + sway, waterTop + 1 - s.h, tail); }
      }
    }
  }
}
