/**
 * Ruby Run, the game itself: Ruby gallops along the bike path in the hero while
 * the course scrolls towards her. Physics, collisions and drawing, on the
 * hero's own canvas: the landscape paints the polder (scene/landscape.ts), this paints
 * the obstacles, the bones and Ruby on top. run/play.ts does everything around
 * it: the buttons, the scores and telling the page what happened.
 *
 * Units: native pixels and seconds. "alt" is height above the cobbles.
 */
import { run as content } from '../../content/run';
import type { HatName } from '../../content/types';
import { fill, pick } from '../../lib/rich';
import { PixelBuffer } from '../pixel/buffer';
import { drawGlyph, type GlyphName } from '../pixel/glyphs';
import { drawRuby, HEAD_TOP, SPRITE, type Eyes, type Mode, type Pose } from '../pixel/ruby';
import type { Landscape } from '../scene/landscape';
import { mixHex, PALETTES } from '../scene/env';
import { Course, PX_PER_M, speedAt, type Thing } from './course';
import { sprites, type ObstacleKind, type Sprite } from './sprites';

export type RunState = 'off' | 'ready' | 'running' | 'paused' | 'crashed' | 'over';

export interface RunResult {
  metres: number;
  bones: number;
  /** did the sky turn, day into night or night into day? */
  skyTurned: boolean;
  crash: ObstacleKind;
}

/** little moments the page can react to: shake the street, bump a score, give a hint */
export type RunMoment = 'bone' | 'crash' | 'milestone' | 'duckHint';

export interface RunHooks {
  say(text: string): void;
  over(result: RunResult): void;
  moment(m: RunMoment): void;
}

/**
 * Jump physics: hold the button for a high jump, tap it for a hop, press it again
 * in the air for a second jump (she flaps her ears), ↓ in the air to dive.
 */
const PHYS = { jump: 390, air: 300, gHold: 1300, gCut: 3600, gFall: 1700, gDive: 4200, maxFall: 640, coyote: 0.08, buffer: 0.12 };
/** Ruby's hitbox: columns in her sprite, and heights above her lowest pixel */
const BODY = { x0: 8, x1: 27, bottom: 2, top: 21, duckTop: 14 };
const ZOOM = { time: 4, boost: 1.35, grace: 0.8 };
/** the sky turns along the run, in metres: from the page's own day or night into the other, and back */
const SKY = { length: 1400, turnFrom: 600, turned: 700, backFrom: 1300, boatAfter: 150 };

/** how far the sky has turned at a distance: 0 as it started, 1 fully turned, in steps of 1/8 */
function turnAt(m: number): number {
  const p = m % SKY.length;
  let k = 0;
  if (p >= SKY.turnFrom && p < SKY.turned) k = (p - SKY.turnFrom) / (SKY.turned - SKY.turnFrom);
  else if (p >= SKY.turned && p < SKY.backFrom) k = 1;
  else if (p >= SKY.backFrom) k = 1 - (p - SKY.backFrom) / (SKY.length - SKY.backFrom);
  return Math.round(k * 8) / 8;
}

interface Fx { x: number; y: number; vx: number; vy: number; life: number; g: GlyphName; col: string; scroll: boolean }

export class RunEngine {
  state: RunState = 'off';
  metres = 0;
  bones = 0;
  /** how dark the sky is right now: 0 day, 1 night */
  night = 0;
  /** what she wears: the crown once every hidden bone on the page is found */
  hat: HatName | null = null;

  private readonly land: Landscape;
  private readonly hooks: RunHooks;
  private readonly buf = new PixelBuffer(SPRITE, SPRITE);
  // the stage, read from the landscape every frame
  private W = 0; private ground = 0; private rx = 0; private unit = 1;
  private startNight = false;
  private course = new Course(1, 1, 0);
  private things: Thing[] = [];
  private fx: Fx[] = [];
  private camX = 0;
  private startX = 0;
  private speed = 0;
  private t = 0;
  private stateT = 0;

  // Ruby
  private alt = 0; private vy = 0; private grounded = true;
  private holding = false; private ducking = false; private coyote = 0; private buffered = 0; private airJumps = 1;
  private dustT = 0;
  private sq = 0; private ph = 0; private blink = false; private blinkT = 2;
  private zoom = 0; private grace = 0; private sparkT = 0;
  private crash: { kind: ObstacleKind; dx: number } | null = null;

  // things that happen once per run, once per night, or once per visit
  private skyTurned = false; private saidTurn = false; private hinted = false;
  private nightFrom = -1; private boatSent = false; private greetedBoat = false; private milestone = 0;

  constructor(land: Landscape, hooks: RunHooks) {
    this.land = land;
    this.hooks = hooks;
  }

  /** where her head is, in native px on the hero canvas, for the speech bubble */
  get head(): { x: number; y: number } {
    return { x: this.rx + HEAD_TOP[0] + Math.round(this.crash?.dx ?? 0), y: this.ground - 31 - Math.round(this.alt) + HEAD_TOP[1] };
  }

  /** the middle of her feet, in native px, to put the page's Ruby back in the same spot */
  get feetX(): number {
    return this.rx + 15 + Math.round(this.crash?.dx ?? 0);
  }

  private syncStage(): void {
    const c = this.land;
    this.W = c.W;
    this.ground = c.street + 4;
    this.rx = Math.max(10, c.textLeft - 5);
  }

  /** take over the hero: a fresh course, Ruby sitting at the start, the sky as the page has it */
  arm(seed: number, night: boolean): void {
    this.syncStage();
    if (this.state === 'off') this.land.startRun();
    // narrow screens run a little slower, so there's as much time to react
    this.unit = Math.max(0.7, Math.min(1, this.W / 300));
    this.startNight = night;
    this.night = night ? 1 : 0;
    // the street carries on from wherever the last run ended
    this.startX = this.camX;
    this.course = new Course(seed, this.unit, this.camX + this.W + speedAt(0, this.unit) * 1.1);
    this.things = []; this.fx = [];
    this.speed = 0; this.metres = 0; this.bones = 0;
    this.alt = 0; this.vy = 0; this.grounded = true; this.holding = false; this.ducking = false;
    this.coyote = 0; this.buffered = 0; this.sq = 0; this.airJumps = 1;
    this.zoom = 0; this.grace = 0; this.crash = null;
    this.skyTurned = false; this.saidTurn = false; this.nightFrom = night ? 0 : -1;
    this.boatSent = false; this.greetedBoat = false; this.milestone = 0;
    this.setState('ready');
    this.render();
  }

  /** hand the hero back to the page */
  stop(): void {
    this.setState('off');
    this.land.stopRun();
  }

  start(): void {
    this.setState('running');
    this.hooks.say(pick(content.says.start));
  }

  pause(): void { if (this.state === 'running') this.setState('paused'); }
  resume(): void { if (this.state === 'paused') { this.holding = false; this.ducking = false; this.setState('running'); } }

  // ---------------------------------------------------------------- input
  /** jump pressed: jumps now, or as soon as she lands */
  press(): void {
    if (this.state !== 'running') return;
    this.holding = true;
    this.buffered = PHYS.buffer;
  }

  release(): void { this.holding = false; }

  /** duck on the ground, dive in the air */
  duck(on: boolean): void {
    this.ducking = on && this.state === 'running';
    if (this.ducking && !this.grounded) this.vy = Math.min(this.vy, -80);
  }

  // ---------------------------------------------------------------- every frame
  tick(dt: number): void {
    if (this.state === 'off') return;
    this.t += dt;
    this.stateT += dt;
    if (this.state === 'paused') return;
    this.syncStage();
    if ((this.blinkT -= dt) <= 0) { this.blink = !this.blink; this.blinkT = this.blink ? 0.12 : 1.6 + Math.random() * 3; }
    this.sq += (0 - this.sq) * Math.min(1, dt * 9);

    if (this.state === 'running') {
      // small fixed steps, so jumps are the same height at any frame rate
      const steps = Math.ceil(dt / (1 / 120));
      for (let i = 0; i < steps && this.state === 'running'; i++) this.step(dt / steps);
      this.events();
    } else if (this.state === 'crashed') {
      // she bounces back off whatever she hit, and sits down where she lands
      this.fall(dt, PHYS.gFall);
      if (!this.grounded && this.crash) this.crash.dx = Math.max(this.crash.dx - 80 * dt, 2 - this.rx);
      if (this.grounded && this.stateT > 0.9) {
        this.setState('over');
        this.hooks.over({ metres: Math.floor(this.metres), bones: this.bones, skyTurned: this.skyTurned, crash: this.crash!.kind });
      }
    }
    this.updateFx(dt);
    this.render();
  }

  private setState(s: RunState): void {
    this.state = s;
    this.stateT = 0;
  }

  private step(h: number): void {
    const target = speedAt(this.metres, this.unit) * (this.zoom > 0 ? ZOOM.boost : 1);
    this.speed += (target - this.speed) * Math.min(1, h * 3);
    this.camX += this.speed * h;
    this.metres = (this.camX - this.startX) / (PX_PER_M * this.unit);
    this.ph += h * Math.min(28, 12 + this.speed * 0.06);
    if (this.zoom > 0 && (this.zoom -= h) <= 0) this.grace = ZOOM.grace;
    if (this.grace > 0) this.grace -= h;

    // ---- Ruby
    this.buffered -= h;
    this.coyote = this.grounded ? PHYS.coyote : this.coyote - h;
    if (this.buffered > 0 && (this.grounded || this.coyote > 0)) {
      this.vy = PHYS.jump;
      this.grounded = false;
      this.coyote = 0;
      this.buffered = 0;
      this.sq = -0.6;
      this.puff();
    } else if (this.buffered > 0 && this.airJumps > 0 && this.alt > 10) {
      // a second jump in the air; close to the ground the press waits for the landing instead
      this.vy = PHYS.air;
      this.airJumps--;
      this.buffered = 0;
      this.sq = -0.4;
      const col = mixHex(PALETTES.day.dust, PALETTES.night.dust, this.night), y = this.ground - Math.round(this.alt) - 1;
      for (const vx of [-30, -10, 10]) this.addFx(this.rx + 12 + vx / 4, y, vx, 12, 0.3, 'puff', col);
    }
    if (!this.grounded) {
      const g = this.ducking ? PHYS.gDive : this.vy > 0 ? (this.holding ? PHYS.gHold : PHYS.gCut) : PHYS.gFall;
      this.fall(h, g);
    }

    // ---- the course: pigeons and cyclists set off as they come in, things behind her go
    for (const th of this.things) {
      if (th.meet === undefined) continue;
      if (!th.active) {
        const tMeet = (th.meet - (this.camX + this.rx + BODY.x1)) / Math.max(1, this.speed);
        const x = th.meet - th.vx * tMeet;
        if (x - this.camX <= this.W + 4) this.setOff(th, x);
      } else {
        th.x += th.vx * h;
        th.age = (th.age ?? 0) + h;
      }
    }
    for (const th of this.things) {
      if (!th.knock) continue;
      const k = th.knock;
      k.vy -= 900 * h; k.dx += k.vx * h; k.dy += k.vy * h; k.spin += h * 9;
    }
    this.things = this.things.filter((th) => !th.active || (th.x + 60 > this.camX && (!th.knock || th.knock.dy > -80)));
    this.course.fill(this.camX + this.W + 60, this.things);
    this.collide();
  }

  /** a pigeon or cyclist comes into view */
  private setOff(th: Thing, x: number): void {
    th.active = true;
    th.x = x;
    th.age = 0;
    // the first low pigeon of the visit: a hint how to get under it
    if (th.kind === 'pigeon' && th.alt < 30 && !this.hinted) { this.hinted = true; this.hooks.moment('duckHint'); }
  }

  /** gravity and landing */
  private fall(h: number, g: number): void {
    if (this.grounded) return;
    this.vy = Math.max(-PHYS.maxFall, this.vy - g * h);
    this.alt += this.vy * h;
    if (this.alt <= 0) {
      this.sq = Math.min(1, 0.4 - this.vy / 900);
      this.alt = 0;
      this.vy = 0;
      this.grounded = true;
      this.airJumps = 1;
      this.puff();
    }
  }

  private collide(): void {
    const S = sprites();
    const x0 = this.camX + this.rx + BODY.x0, x1 = this.camX + this.rx + BODY.x1;
    const bottom = this.alt + BODY.bottom, top = this.alt + (this.ducking && this.grounded ? BODY.duckTop : BODY.top);
    for (const th of this.things) {
      if (!th.active || th.gone || th.knock) continue;
      if (th.kind === 'bone' || th.kind === 'waffle') {
        const size = th.kind === 'bone' ? 8 : 12, pad = 3;
        if (th.x + 1 - pad < x1 && th.x + size + pad > x0 && th.alt - pad < top && th.alt + size + pad > bottom) this.eat(th);
        continue;
      }
      const sp: Sprite = th.kind === 'pigeon' ? S.pigeon[0] : th.kind === 'cyclist' ? S.cyclist[0][0] : S[th.kind];
      const b = sp.box;
      if (th.x + b.x0 < x1 && th.x + b.x1 > x0 && th.alt + b.bottom < top && th.alt + b.top > bottom) {
        if (this.zoom > 0) this.knock(th);
        else if (this.grace <= 0) { this.bonk(th.kind as ObstacleKind, th.x + b.x0 - this.camX); return; }
      }
    }
  }

  private eat(th: Thing): void {
    th.gone = true;
    const x = th.x - this.camX + 4, y = this.ground - th.alt - 8;
    if (th.kind === 'bone') {
      this.bones++;
      this.addFx(x, y, 0, -26, 0.5, 'spark', '#ffc21a');
      this.hooks.moment('bone');
    } else {
      this.zoom = ZOOM.time;
      this.hooks.say(content.says.waffle);
      for (let i = 0; i < 5; i++) this.addFx(x + 2, y, (i - 2) * 14, -30 - i * 4, 0.8, 'heart', '#ff4f6d');
    }
  }

  /** zoomies: whatever she runs into goes flying */
  private knock(th: Thing): void {
    th.knock = { dx: 0, dy: 0, vx: 90 + Math.random() * 60, vy: 220 + Math.random() * 80, spin: 0 };
    this.addFx(th.x - this.camX, this.ground - th.alt - 12, 0, -18, 0.5, 'bang', '#ff7a1a');
  }

  private bonk(kind: ObstacleKind, sx: number): void {
    this.crash = { kind, dx: 0 };
    this.setState('crashed');
    this.speed = 0;
    this.holding = false;
    this.ducking = false;
    this.vy = Math.max(this.vy, 0) + 150;
    this.grounded = false;
    this.hooks.moment('crash');
    this.addFx(Math.max(this.rx + 18, sx - 2), this.ground - this.alt - 22, 0, -20, 0.7, 'bang', '#ff7a1a');
  }

  /** milestones, the sky turning, and the boat at night */
  private events(): void {
    const m = this.metres;
    const next = content.milestones[this.milestone];
    if (next && m >= next[0]) { this.milestone++; this.hooks.say(next[1]); this.hooks.moment('milestone'); }
    const k = turnAt(m);
    this.night = this.startNight ? 1 - k : k;
    if (k === 1) {
      this.skyTurned = true;
      if (!this.saidTurn) { this.saidTurn = true; this.hooks.say(this.startNight ? content.says.morning : content.says.night); }
    }
    // a while into every night, the two of us sail by
    if (this.night === 1 && this.nightFrom < 0) this.nightFrom = m;
    if (this.night < 1) { this.nightFrom = -1; this.boatSent = false; }
    if (this.nightFrom >= 0 && !this.boatSent && m - this.nightFrom >= SKY.boatAfter) {
      this.boatSent = true;
      this.greetedBoat = false;
      this.land.sendRunBoat();
    }
    const bx = this.land.runBoatX();
    if (!this.greetedBoat && bx !== null && bx < this.rx + 30) {
      this.greetedBoat = true;
      this.hooks.say(pick(content.says.boat));
    }
  }

  // ---------------------------------------------------------------- effects
  private addFx(x: number, y: number, vx: number, vy: number, life: number, g: GlyphName, col: string, scroll = false): void {
    this.fx.push({ x, y, vx, vy, life, g, col, scroll });
  }

  /** a little dust where her feet hit the cobbles */
  private puff(): void {
    const col = mixHex(PALETTES.day.dust, PALETTES.night.dust, this.night);
    this.addFx(this.rx + 6, this.ground - 3, -10, -6, 0.3, 'puff', col, true);
    this.addFx(this.rx + 20, this.ground - 3, 8, -6, 0.3, 'puff', col, true);
  }

  private updateFx(dt: number): void {
    // a little dust behind her paws while she runs
    if (this.state === 'running' && this.grounded && (this.dustT -= dt) <= 0) {
      this.dustT = 0.09;
      this.addFx(this.rx + 4 + Math.random() * 6, this.ground - 1, -20, -8 - Math.random() * 14, 0.28, 'dot', mixHex(PALETTES.day.dust, PALETTES.night.dust, this.night), true);
    }
    // zoomies: a trail of sparks streaming off her back
    if (this.zoom > 0 && (this.sparkT -= dt) <= 0) {
      this.sparkT = 0.035;
      const cols = ['#ffc21a', '#ff7a1a', '#ff4f6d', '#ffffff'];
      this.addFx(this.rx + 2 + Math.random() * 8, this.ground - this.alt - 8 - Math.random() * 14, -70, (Math.random() - 0.5) * 24, 0.35, 'spark', cols[Math.floor(Math.random() * 4)]);
    }
    for (const f of this.fx) {
      f.x += (f.vx - (f.scroll ? this.speed : 0)) * dt;
      f.y += f.vy * dt;
      f.life -= dt;
    }
    this.fx = this.fx.filter((f) => f.life > 0);
  }

  // ---------------------------------------------------------------- drawing
  private render(): void {
    const camX = Math.round(this.camX), n = this.night, S = sprites(), ground = this.ground;
    this.land.drawRun(camX, n);
    const c = this.land.ctx;
    const shadow = mixHex(PALETTES.day.shadow, PALETTES.night.shadow, n);

    // obstacles and pickups
    for (const th of this.things) {
      if (!th.active || th.gone) continue;
      let cv: HTMLCanvasElement;
      let bob = 0;
      if (th.kind === 'bone' || th.kind === 'waffle') {
        cv = th.kind === 'bone' ? S.bone : S.waffle;
        bob = Math.sin(this.t * 4 + th.phase) > 0 ? 1 : 0;
      } else {
        const frame = Math.floor(this.t * 8 + th.phase) % 2;
        const sp = th.kind === 'pigeon' ? S.pigeon[frame] : th.kind === 'cyclist' ? S.cyclist[Math.floor(th.phase) % S.cyclist.length][frame] : S[th.kind];
        cv = n >= 0.5 ? sp.night : sp.day;
        if (th.kind === 'pigeon') bob = Math.sin(this.t * 5 + th.phase) > 0 ? 1 : 0;
      }
      const w = cv.width, h = cv.height;
      const x = Math.round(th.x) - camX, y = ground - Math.round(th.alt) - (h - 1) - bob;
      if (x > this.W + 2 || x + w < -40) continue;
      if (th.knock) {
        c.save();
        c.translate(Math.round(x + th.knock.dx + w / 2), Math.round(y - th.knock.dy + h / 2));
        c.rotate(Math.round(th.knock.spin * 4) / 4);
        c.drawImage(cv, -Math.round(w / 2), -Math.round(h / 2));
        c.restore();
        continue;
      }
      if (th.alt === 0) { c.fillStyle = shadow; c.fillRect(x + 1, ground + 1, w - 2, 1); }
      c.drawImage(cv, x, y);
      // tring tring: the bell rings as a cyclist comes into view
      if (th.kind === 'cyclist' && (th.age ?? 9) < 1.2 && Math.floor(this.t * 8) % 2) drawGlyph(c, 'note', x + 3, y - 7, '#ffc21a');
    }

    // Ruby, her shadow shrinking as she jumps
    const rx = this.rx + Math.round(this.crash?.dx ?? 0), alt = Math.round(this.alt);
    const sw = Math.max(6, 20 - Math.round(alt / 4));
    c.fillStyle = shadow;
    c.fillRect(rx + 15 - (sw >> 1), ground + 1, sw, 1);
    drawRuby(this.buf, this.pose());
    if (this.grace > 0 && Math.floor(this.t * 16) % 2) c.globalAlpha = 0.45;
    c.drawImage(this.buf.canvas(), rx, ground - 31 - alt);
    c.globalAlpha = 1;

    // dizzy stars after a bonk
    if (this.crash && (this.state === 'crashed' || this.stateT < 1.6)) {
      const { x, y } = this.head;
      for (let i = 0; i < 3; i++) {
        const a = this.t * 6 + (i * Math.PI * 2) / 3;
        drawGlyph(c, 'spark', Math.round(x - 2 + Math.cos(a) * 7), Math.round(y + 2 + Math.sin(a) * 2), '#ffc21a');
      }
    }
    for (const f of this.fx) drawGlyph(c, f.g, Math.round(f.x), Math.round(f.y), f.col);
  }

  private pose(): Pose {
    const s = this.state, crashed = !!this.crash;
    let mode: Mode = 'run';
    if (s === 'ready') mode = 'sit';
    else if (crashed) mode = this.grounded ? 'sit' : 'tumble';
    else if (!this.grounded) mode = this.vy > 0 ? 'jump' : 'fall';
    else if (this.ducking) mode = 'sniff';
    const eyes: Eyes = crashed && (s === 'crashed' || this.stateT < 1.6) ? 'dizzy' : this.zoom > 0 ? 'happy' : 'open';
    return {
      mode, t: this.t, ph: this.ph, sq: this.sq, eyes, blink: this.blink,
      look: { x: s === 'ready' ? 0.2 : 0.6, y: this.ducking ? 0.5 : 0 },
      talk: false, wag: s === 'over' ? 0.3 : 1, pant: s === 'running' && !this.ducking, ball: false, hat: this.hat,
    };
  }

  /** the line for the game over card */
  crashLine(kind: ObstacleKind): string {
    return pick(content.crash[kind]);
  }

  resultLine(): string {
    return fill(content.result, { m: Math.floor(this.metres).toLocaleString('en'), bones: this.bones });
  }
}
