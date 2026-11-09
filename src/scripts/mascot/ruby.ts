/**
 * Ruby's brain and body: a small state machine with platformer physics.
 *
 *  - Modes are what she is doing (idle, walk, sniff, run, jump, sit, sleep…),
 *    see Mode in pixel/ruby.ts. The sprite draws whatever mode she is in.
 *  - Tasks are goals that span several modes: fetch the ball, eat a treat,
 *    run zoomies. While she has a task, her idle wandering is paused.
 *  - She lives in a PageWorld, which knows the platforms and the visitor.
 *
 * Units: page coordinates in CSS px. (x, y) is the point between her feet.
 */
import { ruby as content } from '../../content/ruby';
import { pick } from '../../lib/rich';
import type { HatName } from '../../content/types';
import { PixelBuffer } from '../pixel/buffer';
import { drawGlyph, type GlyphName } from '../pixel/glyphs';
import { drawRuby, HEAD_TOP, isAirborne, isMoving, isResting, MOUTH_REACH, SPRITE, type Eyes, type Mode, type Pose } from '../pixel/ruby';
import { isNight, reducedMotion, scenePalette } from '../scene/env';
import type { Item } from './item';
import type { Platform, Spot } from './types';
import type { PageWorld } from './world';

const G = 1900;                                         // gravity, px/s²
const SPEED = { walk: 54, sniff: 30, run: 175, fetch: 215 };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const now = () => performance.now();

type Line = keyof typeof content.lines;
type Task =
  | { type: 'fetch' | 'eat'; item: Item; phase: 'go' | 'return' | 'eating'; t: number; fails: number; navT: number }
  | { type: 'zoom'; laps: number; t: number };

interface Fx { g: GlyphName | 'dot' | 'crumb'; x: number; y: number; vx: number; vy: number; life: number; age: number }

export class Ruby {
  readonly name = content.name;
  x = 200; y = 0; vx = 0; vy = 0;
  facing: 1 | -1 = 1;
  mode: Mode = 'fall';
  modeT = 0;
  platform: Platform | null = null;
  task: Task | null = null;
  carrying: Item | null = null;
  hat: HatName | null = null;
  driving = false;
  /** set when she was clicked: then ↑ ↓ and space steer her too */
  selected = false;
  keys = { left: 0, right: 0 };
  ai: boolean;

  private world: PageWorld;
  private buf = new PixelBuffer(SPRITE, SPRITE);
  private dur = 0;
  private t = Math.random() * 10;
  private ph = 0;
  private sq = 0;
  private blink = false; private blinkT = 1.5;
  private look = { x: 0, y: 0 };
  private eyesOver: Eyes | null = null; private eyesT = 0;
  private talkT = 0;
  private ignore: HTMLElement | null = null; private ignoreT = 0;
  private think = 1;
  private target = 0;
  private hatT = 0;
  private dizzyT = 0;
  private driveT = 0;
  private begAt = 0;
  private fx: Fx[] = [];
  private fxT = { z: 0, note: 0, heart: 0, crumb: 0, sniff: 0 };
  private samples: [number, number, number][] = [];

  constructor(world: PageWorld) {
    this.world = world;
    this.ai = !reducedMotion;
  }

  get S(): number { return this.world.S; }

  // ---------------------------------------------------------------- small helpers
  setMode(m: Mode, dur = 0): void {
    if (this.mode !== m) { this.mode = m; this.modeT = 0; }
    this.dur = dur;
  }

  eyes(e: Eyes | null, seconds: number): void {
    this.eyesOver = e;
    this.eyesT = seconds;
  }

  say(line: Line | string, seconds?: number): void {
    const text = line in content.lines ? pick(content.lines[line as Line]) : line;
    if (!text) return;
    this.talkT = Math.min(1.4, 0.3 + text.length * 0.035);
    this.world.say(text, seconds ?? Math.min(4.5, 1.6 + text.length * 0.05));
  }

  wearHat(hat: HatName | null, seconds = 30): void {
    this.hat = hat;
    this.hatT = seconds;
  }

  // ---------------------------------------------------------------- every frame
  update(dt: number): void {
    this.t += dt;
    this.modeT += dt;
    if ((this.blinkT -= dt) <= 0) { this.blink = !this.blink; this.blinkT = this.blink ? 0.12 : 1.8 + Math.random() * 3.2; }
    if (this.talkT > 0) this.talkT -= dt;
    if (this.eyesT > 0 && (this.eyesT -= dt) <= 0) this.eyesOver = null;
    if (this.ignoreT > 0 && (this.ignoreT -= dt) <= 0) this.ignore = null;
    if (this.hatT > 0 && (this.hatT -= dt) <= 0) this.hat = null;
    if (this.dizzyT > 0) this.dizzyT -= dt;
    if (this.driving && (this.driveT += dt) > 14) this.stopDriving();
    this.sq += (0 - this.sq) * Math.min(1, dt * 10);

    if (this.mode !== 'held') {
      if (this.platform) {
        const p = this.world.find(this.platform.el);
        if (p) { this.platform = p; this.y = p.y; } else this.leaveGround();
      }
      if (this.platform) this.groundStep(dt); else this.airStep(dt);
    }
    this.updateLook(dt);
    this.updateFx(dt);
  }

  private groundStep(dt: number): void {
    const w = this.world, p = this.platform!;
    const dir = this.keys.right - this.keys.left;
    if (this.driving && dir) {
      if (isResting(this.mode) || this.mode === 'pet') this.setMode('idle');
      this.setMode('run');
      this.facing = dir > 0 ? 1 : -1;
      this.x += dir * SPEED.run * dt;
      this.ph += dt * 24;
    } else if (this.driving && this.mode === 'run' && !this.task) {
      this.setMode('idle');
    } else if (isMoving(this.mode)) {
      const sp = this.mode === 'sniff' ? SPEED.sniff : this.mode === 'run' ? (this.task ? SPEED.fetch : SPEED.run) : SPEED.walk;
      const dx = this.target - this.x;
      if (Math.abs(dx) < 2) { this.setMode('idle'); this.think = 0.8 + Math.random() * 2; }
      else {
        this.facing = dx > 0 ? 1 : -1;
        this.x += Math.sign(dx) * Math.min(Math.abs(dx), sp * dt);
        // the gait phase follows the distance covered, so the feet never slide
        this.ph += dt * Math.min(24, (sp / this.S) * 0.8);
      }
    }
    this.x = clamp(this.x, w.minX, w.maxX);
    if (this.x < p.x1 - 3 || this.x > p.x2 + 3) {
      // walked off the edge: keep the momentum
      const sp = this.mode === 'run' ? (this.task ? SPEED.fetch : SPEED.run) : this.mode === 'walk' ? SPEED.walk * 1.4 : 0;
      this.vx = sp * this.facing;
      this.ignore = p.el;
      this.ignoreT = 0.15;
      this.leaveGround();
      return;
    }
    const timed: Mode[] = ['sit', 'wave', 'dance', 'pet', 'howl', 'wait', 'beg', 'eat'];
    if (timed.includes(this.mode) && this.dur && this.modeT > this.dur) {
      this.setMode('idle');
      this.think = 0.6 + Math.random();
    }
    if ((this.ai || this.task) && !this.driving) this.brain(dt);
  }

  private airStep(dt: number): void {
    const w = this.world;
    if (this.driving) {
      const dir = this.keys.right - this.keys.left;
      if (dir) { this.vx = dir * SPEED.run; this.facing = dir > 0 ? 1 : -1; }
    }
    this.vy = Math.min(this.vy + G * dt, 2600);
    const y0 = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < w.minX) { this.x = w.minX; this.vx = Math.abs(this.vx) * 0.45; }
    if (this.x > w.maxX) { this.x = w.maxX; this.vx = -Math.abs(this.vx) * 0.45; }
    if (this.vy > 0) {
      const p = w.landing(this.x, y0, this.y, this.ignore);
      if (p) { this.land(p); return; }
    }
    if (this.mode !== 'tumble') this.setMode(this.vy < 0 ? 'jump' : 'fall');
    if (this.vy < -250) this.sq = -0.7;
    if (this.y > w.bottom + 400) w.rescue(this);
  }

  private land(p: Platform): void {
    const impact = this.vy, hard = this.mode === 'tumble' && impact > 950;
    this.platform = p;
    this.y = p.y;
    this.vy = 0;
    this.vx = 0;
    this.ignore = null;
    this.sq = Math.min(1.4, 0.3 + impact / 1100);
    this.puff();
    this.setMode('idle');
    if (hard) {
      this.world.emit('fly');
      this.dizzyT = 1.7;
      this.eyes('dizzy', 1.7);
      if (Math.random() < 0.6) this.say('dizzy');
    }
    this.think = hard ? 2 : this.task ? 0.05 : 0.4 + Math.random() * 1.2;
    const hat = p.el.dataset.hat as HatName | undefined;
    if (hat && hat !== this.hat && !this.driving) {
      this.wearHat(hat);
      const says = p.el.dataset.hatSays;
      if (says) setTimeout(() => this.say(says, 2), 300);
    } else if (this.ai && !this.driving && !this.task) this.world.onLand(this, p);
  }

  private leaveGround(): void {
    this.platform = null;
    if (!isAirborne(this.mode)) this.setMode('fall');
  }

  // ---------------------------------------------------------------- her own ideas
  private brain(dt: number): void {
    if (this.task) { this.doTask(dt); return; }
    const m = this.mode, w = this.world;
    if (isMoving(m) || m === 'wave' || m === 'dance' || m === 'pet' || m === 'howl' || m === 'eat') return;
    if (m === 'sleep') { this.maybeWake(); return; }
    if (this.dizzyT > 0 || (this.think -= dt) > 0) return;
    if ((m === 'sit' || m === 'wait' || m === 'beg') && this.modeT < this.dur) return;

    if (w.idleFor() > 40 && Math.random() < 0.6) { this.sleep(); return; }
    // moods: tired means a nap, hungry means begging, very happy means zoomies
    const mood = w.mood();
    if (mood) {
      if (mood.energy < 20 && Math.random() < 0.5) { this.say('sleepy', 1.6); this.sleep(); return; }
      if (mood.full < 30 && now() - this.begAt > 40000) {
        this.begAt = now();
        if (w.pointer) this.facing = w.pointer.x > this.x ? 1 : -1;
        this.setMode('beg', 3.5);
        this.say('hungry', 2.4);
        return;
      }
      if (mood.happy > 75 && mood.energy > 55 && this.platform!.x2 - this.platform!.x1 > 300 && Math.random() < 0.08) {
        this.task = { type: 'zoom', laps: 4, t: 0 };
        this.say('zoom', 1.4);
        return;
      }
    }
    const r = Math.random(), p = this.platform!;
    if (r < 0.48) this.walkTo(p.x1 + Math.random() * (p.x2 - p.x1), Math.random() < 0.45 ? 'sniff' : 'walk');
    else if (r < 0.74) { if (!this.jumpSomewhere()) this.walkTo(p.x1 + Math.random() * (p.x2 - p.x1)); }
    else if (r < 0.86) this.setMode('sit', 3 + Math.random() * 4);
    else if (r < 0.94) { this.facing = this.facing > 0 ? -1 : 1; this.think = 1 + Math.random() * 1.5; }
    else { this.setMode('howl', 1.3); this.say('howl', 1.3); }
    if (this.mode === 'idle' && this.think <= 0) this.think = 1 + Math.random() * 2;
  }

  walkTo(x: number, how: 'walk' | 'sniff' | 'run' = 'walk'): void {
    const p = this.platform;
    if (!p) return;
    const m = 10 * this.S;
    this.target = clamp(x, Math.max(p.x1 + m, this.world.minX), Math.min(p.x2 - m, this.world.maxX));
    if (Math.abs(this.target - this.x) < 12) { this.think = 0.8; return; }
    this.setMode(how);
  }

  private jumpSomewhere(): boolean {
    const spot = this.world.pickJump(this);
    if (!spot) return false;
    this.jumpTo(spot);
    return true;
  }

  /** a ballistic jump that lands on spot.p at spot.x */
  jumpTo({ p, x }: Spot): void {
    const dx = x - this.x, dy = p.y - this.y;
    const vy0 = dy < -8 ? -Math.sqrt(2 * G * (-dy + 30 + Math.random() * 24)) : -300 - Math.random() * 140;
    const flight = (-vy0 + Math.sqrt(Math.max(0, vy0 * vy0 + 2 * G * dy))) / G;
    this.vx = clamp(dx / Math.max(0.25, flight), -760, 760);
    this.vy = vy0;
    if (dx) this.facing = dx > 0 ? 1 : -1;
    if (this.platform) { this.ignore = this.platform.el; this.ignoreT = dy > 0 ? 1.4 : 0.2; }
    this.platform = null;
    this.sq = -0.8;
    this.setMode('jump');
  }

  hop(v = 430): void {
    if (!this.platform) return;
    this.vy = -(reducedMotion ? 260 : v);
    this.vx = 0;
    this.platform = null;
    this.sq = -0.6;
    this.setMode('jump');
  }

  sleep(): void {
    this.setMode('sleep');
    this.fxT.z = 0.4;
  }

  wake(): void {
    this.setMode('idle');
    this.eyes('wide', 0.7);
    this.emitHead('bang', { vy: -10, life: 0.7 });
    this.think = 1.2;
  }

  private maybeWake(): void {
    const p = this.world.pointer;
    if (!p || now() - p.t > 300 || this.modeT < 3) return;
    if (Math.hypot(p.x - this.x, p.y - (this.y - 14 * this.S)) < 110) this.wake();
  }

  // ---------------------------------------------------------------- tasks
  /** go after the ball (fetch) or a treat (eat) */
  chase(item: Item): void {
    if (this.carrying) this.dropBall(false);
    if (isResting(this.mode)) this.wake();
    this.task = { type: item.kind === 'treat' ? 'eat' : 'fetch', item, phase: 'go', t: 0, fails: 0, navT: 0 };
    this.eyes('wide', 0.6);
    this.emitHead('bang', { vy: -10, life: 0.6 });
  }

  private endTask(): void {
    this.task = null;
    this.think = 0.8 + Math.random();
  }

  private doTask(dt: number): void {
    const T = this.task!;
    T.t += dt;
    if (T.type === 'zoom') { this.zoom(T); return; }
    const item = T.item;
    if (item.gone || T.t > 30) { if (this.carrying) this.dropBall(false); this.endTask(); return; }

    if (T.phase === 'eating') {
      if (this.mode === 'eat') return;
      item.remove();
      this.world.emit('treat');
      this.eyes('happy', 1.5);
      this.emitHead('heart', { vy: -16, life: 1 });
      this.say('eat', 1.4);
      this.endTask();
      return;
    }
    if (isResting(this.mode) || this.mode === 'beg') this.setMode('idle');

    if (T.phase === 'go') {
      if (item.owner && item.owner !== this) { this.endTask(); return; }
      if (!item.platform || item.held) {
        // still flying: watch it, tail going
        this.facing = item.x > this.x ? 1 : -1;
        if (this.mode !== 'idle') this.setMode('idle');
        return;
      }
      const reach = MOUTH_REACH * this.S;
      if (item.platform.el === this.platform!.el) {
        const dir = item.x > this.x ? 1 : -1;
        const gap = Math.abs(item.x - this.x);
        if (gap < reach + 2 * this.S && gap > reach - 5 * this.S) { this.facing = dir; this.reachItem(item); return; }
        this.target = clamp(item.x - dir * reach, this.platform!.x1, this.platform!.x2);
        this.setMode('run');
        return;
      }
      this.navigate(dt, { p: item.platform, x: item.x });
    } else {
      const goal = this.world.returnPoint();
      if (!goal) { this.dropBall(true); return; }
      if (goal.p.el === this.platform!.el) {
        if (Math.abs(goal.x - this.x) < 24) {
          const px = this.world.pointer?.x ?? this.x;
          if (px !== this.x) this.facing = px > this.x ? 1 : -1;
          this.dropBall(true);
          return;
        }
        this.target = goal.x;
        this.setMode('run');
        return;
      }
      this.navigate(dt, goal);
    }
  }

  private zoom(T: Extract<Task, { type: 'zoom' }>): void {
    const p = this.platform!;
    if (this.mode === 'run') return;
    if (T.laps-- <= 0) { this.endTask(); this.setMode('sit', 3); this.eyes('happy', 2); return; }
    this.target = this.x - p.x1 > p.x2 - this.x ? p.x1 + 12 * this.S : p.x2 - 12 * this.S;
    this.setMode('run');
  }

  /** jump platform to platform towards a goal; give up after a few dead ends */
  private navigate(dt: number, goal: Spot): void {
    const T = this.task as Extract<Task, { type: 'fetch' | 'eat' }>;
    if ((T.navT -= dt) > 0) return;
    const hop = this.world.stepToward(this, goal);
    if (hop) { this.jumpTo(hop); T.navT = 0.25; return; }
    const p = this.platform!;
    if (++T.fails > 3) {
      this.say('far');
      if (this.carrying) this.dropBall(true); else this.endTask();
      return;
    }
    // nothing closer within reach: run off the nearest edge and try again from below
    this.target = goal.x < this.x ? p.x1 - 6 : p.x2 + 6;
    this.setMode('run');
    T.navT = 1;
  }

  private reachItem(item: Item): void {
    const T = this.task as Extract<Task, { type: 'fetch' | 'eat' }>;
    if (T.type === 'eat') {
      T.phase = 'eating';
      item.held = true;
      this.setMode('eat', 1.5);
    } else {
      item.grab(this);
      this.carrying = item;
      T.phase = 'return';
      T.fails = 0;
      this.eyes('happy', 1);
      if (Math.random() < 0.5) this.say('got', 1.2);
      this.hop(260);
    }
  }

  /** put the ball down in front of her; with `proud`, sit and wait for the next throw */
  dropBall(proud: boolean): void {
    const ball = this.carrying;
    this.carrying = null;
    if (ball) ball.release(this.x + this.facing * MOUTH_REACH * this.S, this.y, this.facing * 50, this.platform);
    if (proud && this.platform) {
      this.setMode('wait', 6);
      this.eyes('happy', 2);
      this.say('again', 1.8);
      this.world.emit('fetch');
    }
    this.endTask();
  }

  // ---------------------------------------------------------------- the visitor
  poke(): void {
    if (this.mode === 'sleep') { this.wake(); this.say('hi'); return; }
    if (isResting(this.mode)) this.setMode('idle');
    this.eyes('happy', 0.9);
    this.emitHead('heart', { vy: -16, vx: (Math.random() - 0.5) * 8, life: 1.1 });
    this.world.emit('hello');
    if (this.platform && Math.random() < 0.25) {
      this.setMode('howl', 1.2);
      this.say('howl', 1.2);
    } else {
      this.say('hi');
      this.hop();
    }
    this.think = 2.5;
  }

  pet(): void {
    if (!this.platform || this.task) return;
    if (this.mode !== 'pet') {
      this.setMode('pet', 1.1);
      if (!this.world.pettedOnce) { this.world.pettedOnce = true; this.say('pet', 1.6); }
      this.world.emit('pet');
    } else this.dur = this.modeT + 1.1;
    this.eyes('happy', 1.2);
  }

  grab(): void {
    if (this.carrying) this.dropBall(false);
    this.task = null;
    this.setMode('held');
    this.platform = null;
    this.vx = this.vy = 0;
    this.eyes('wide', 999);
    this.samples = [];
  }

  dragTo(x: number, y: number): void {
    this.x = clamp(x, this.world.minX, this.world.maxX);
    this.y = y + 19 * this.S;
    const t = now();
    this.samples.push([x, y, t]);
    while (this.samples.length > 2 && t - this.samples[0][2] > 90) this.samples.shift();
  }

  release(): void {
    const [vx, vy] = velocity(this.samples);
    this.vx = clamp(vx, -1500, 1500);
    this.vy = clamp(vy, -1700, 1500);
    this.eyesOver = null;
    const fast = Math.hypot(this.vx, this.vy) > 650;
    this.setMode(fast ? 'tumble' : 'fall');
    if (fast && Math.random() < 0.5) this.say('thrown', 1.2);
  }

  jumpKey(): void {
    if (!this.platform) return;
    if (isResting(this.mode)) this.setMode('idle');
    this.vy = -800;
    this.vx = (this.keys.right - this.keys.left) * SPEED.run;
    this.ignore = null;
    this.platform = null;
    this.sq = -0.8;
    this.setMode('jump');
  }

  dropThrough(): void {
    if (!this.platform) return;
    this.ignore = this.platform.el;
    this.ignoreT = 0.3;
    this.platform = null;
    this.vy = 80;
    this.setMode('fall');
  }

  startDriving(selected = false): void {
    if (selected) this.selected = true;
    if (this.task) { if (this.carrying) this.dropBall(false); this.task = null; }
    this.driveT = 0;
    if (this.driving) return;
    this.driving = true;
    if (!this.world.drivenOnce) {
      this.world.drivenOnce = true;
      setTimeout(() => this.say('drive', 3.2), selected ? 1300 : 0);
    }
  }

  stopDriving(): void {
    this.driving = false;
    this.selected = false;
    this.keys.left = this.keys.right = 0;
    if (this.mode === 'run') this.setMode('idle');
  }

  party(seconds = 8): void {
    if (this.platform) this.setMode('dance', seconds);
    this.eyes('happy', seconds);
    this.wearHat('party', seconds + 2);
  }

  /** stop whatever she's doing and sit down, e.g. while she is hidden */
  calm(): void {
    if (this.carrying) this.dropBall(false);
    this.task = null;
    this.stopDriving();
  }

  // ---------------------------------------------------------------- looking around, effects
  private updateLook(dt: number): void {
    const p = this.world.pointer, ball = this.world.ball;
    let lx = 0, ly = 0;
    // she watches the ball over anything else
    const tgt = this.task && !ball.owner ? { x: ball.x, y: ball.y - 10, t: now() } : p;
    if (tgt && now() - tgt.t < 4000 && !isResting(this.mode)) {
      const dx = tgt.x - this.x, dy = tgt.y - (this.y - 16 * this.S), d = Math.hypot(dx, dy);
      if (d < 420 && d > 8) {
        lx = (dx / d) * this.facing;
        ly = dy / d;
        if (this.mode === 'idle' && this.ai && !this.driving && Math.abs(dx) > 40 && d < 260) this.facing = dx > 0 ? 1 : -1;
      }
    }
    const k = Math.min(1, dt * 8);
    this.look.x += (lx - this.look.x) * k;
    this.look.y += (ly - this.look.y) * k;
  }

  /** a point just above her head, in sprite pixels, for effects and the speech bubble */
  headPos(): [number, number] {
    const [hx, hy] = HEAD_TOP;
    const low = this.mode === 'sniff' ? 6 : isResting(this.mode) ? 3 : 0;
    return [this.facing > 0 ? hx : SPRITE - 1 - hx, hy + low];
  }

  emitHead(g: GlyphName, o: Partial<Fx>): void {
    const [hx, hy] = this.headPos();
    this.fx.push({ g, x: hx - 2, y: hy - 4, vx: 0, vy: 0, life: 1, age: 0, ...o });
  }

  private puff(): void {
    this.fx.push({ g: 'puff', x: 6, y: 28, vx: -14, vy: -2, life: 0.32, age: 0 });
    this.fx.push({ g: 'puff', x: 22, y: 28, vx: 14, vy: -2, life: 0.32, age: 0 });
  }

  private updateFx(dt: number): void {
    const m = this.mode, T = this.fxT;
    if (m === 'sleep' && (T.z -= dt) <= 0) {
      T.z = 1.2;
      this.emitHead('z', { x: this.headPos()[0] + (this.facing > 0 ? 1 : -4), vx: 4 * this.facing, vy: -7, life: 2.4 });
    }
    if (m === 'dance' && (T.note -= dt) <= 0) {
      T.note = 0.5;
      this.emitHead('note', { x: 4 + Math.random() * 22, vy: -14, vx: (Math.random() - 0.5) * 10, life: 1.2 });
    }
    if (m === 'pet' && (T.heart -= dt) <= 0) {
      T.heart = 0.35;
      this.emitHead('heart', { x: this.headPos()[0] - 4 + Math.random() * 6, vy: -18, vx: (Math.random() - 0.5) * 10, life: 0.9 });
    }
    if (m === 'eat' && (T.crumb -= dt) <= 0) {
      T.crumb = 0.18;
      this.fx.push({ g: 'crumb', x: this.facing > 0 ? 29 + Math.random() * 3 : Math.random() * 3, y: 27, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 10, life: 0.35, age: 0 });
    }
    if (m === 'sniff' && (T.sniff -= dt) <= 0) {
      T.sniff = 0.7;
      this.fx.push({ g: 'dot', x: this.facing > 0 ? 31 : 0, y: 25, vx: 10 * this.facing, vy: -6, life: 0.4, age: 0 });
    }
    for (const f of this.fx) { f.age += dt; f.x += f.vx * dt; f.y += f.vy * dt; }
    if (this.fx.length) this.fx = this.fx.filter((f) => f.age < f.life);
  }

  private pose(): Pose {
    const m = this.mode;
    const excited = m === 'pet' || m === 'dance' || m === 'wait' || m === 'eat' || m === 'beg' || !!this.task || this.eyesOver === 'happy';
    return {
      mode: m,
      t: this.t,
      ph: this.ph,
      sq: this.sq,
      eyes: this.eyesOver ?? (m === 'sleep' ? 'closed' : this.dizzyT > 0 ? 'dizzy' : 'open'),
      blink: this.blink,
      look: this.look,
      talk: this.talkT > 0,
      wag: m === 'sleep' ? 0 : excited ? 1 : m === 'run' ? 0.6 : isMoving(m) ? 0.45 : 0.25,
      pant: !!this.task && m === 'run',
      ball: !!this.carrying,
      hat: this.hat,
    };
  }

  // ---------------------------------------------------------------- drawing
  /** draw her (and her effects) with the sprite's top-left at (ox, oy) in native pixels */
  render(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
    drawRuby(this.buf, this.pose());
    const cv = this.buf.canvas();
    if (this.facing < 0) {
      ctx.save();
      ctx.translate(ox + SPRITE, oy);
      ctx.scale(-1, 1);
      ctx.drawImage(cv, 0, 0);
      ctx.restore();
    } else ctx.drawImage(cv, ox, oy);

    const night = isNight(), dust = scenePalette().dust;
    for (const f of this.fx) {
      const x = Math.round(ox + f.x), y = Math.round(oy + f.y);
      if (f.g === 'dot' || f.g === 'crumb') {
        ctx.fillStyle = f.g === 'crumb' ? '#c88a3e' : dust;
        ctx.fillRect(x, y, 1, 1);
        continue;
      }
      const col = f.g === 'heart' ? '#ff4f6d' : f.g === 'spark' ? '#ffc21a' : f.g === 'puff' ? dust : f.g === 'bang' ? '#ff7a1a' : night ? '#8cc4ff' : '#1f74c8';
      drawGlyph(ctx, f.g, x, y, col);
    }
    const [hx, hy] = this.headPos();
    if (this.dizzyT > 0) {
      for (let i = 0; i < 3; i++) {
        const a = this.t * 6 + (i * Math.PI * 2) / 3;
        drawGlyph(ctx, 'spark', Math.round(ox + hx - 1 + Math.cos(a) * 7), Math.round(oy + hy + 1 + Math.sin(a) * 2), '#ffc21a');
      }
    }
    if (this.driving) {
      // a little orange arrow: you're steering
      const bob = Math.sin(this.t * 6) > 0 ? 1 : 0;
      ctx.fillStyle = '#ff7a1a';
      ctx.fillRect(ox + hx - 2, oy + hy - 8 + bob, 5, 1);
      ctx.fillRect(ox + hx - 1, oy + hy - 7 + bob, 3, 1);
      ctx.fillRect(ox + hx, oy + hy - 6 + bob, 1, 1);
    }
  }

  /** is the page point on (or right next to) one of her pixels in the last frame? */
  hit(px: number, py: number): boolean {
    const S = this.S;
    const sx = Math.floor((px - (this.x - 16 * S)) / S), sy = Math.floor((py - (this.y - 31 * S)) / S);
    const ux = this.facing < 0 ? SPRITE - 1 - sx : sx;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (this.buf.get(ux + dx, sy + dy)) return true;
    return false;
  }
}

/** average velocity (px/s) over the last few pointer samples */
export function velocity(s: [number, number, number][]): [number, number] {
  const a = s[0], b = s[s.length - 1];
  if (!a || !b || b[2] - a[2] < 8) return [0, 0];
  return [((b[0] - a[0]) / (b[2] - a[2])) * 1000, ((b[1] - a[1]) / (b[2] - a[2])) * 1000];
}
