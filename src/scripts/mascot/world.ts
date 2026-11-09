/**
 * The page as Ruby's world.
 *
 * Any element with [data-platform] is something she can stand on: its top
 * edge becomes a one-way platform (she can jump up through it and land on it).
 * Optional attributes on that element:
 *   data-platform-offset   move the standing line down, in px or em ("0.16em")
 *   data-platform="fixed"  for position: fixed elements, like the terminal
 *   data-say               what she might say when she lands there
 *   data-hat / data-hat-says   a hat she puts on there, and her comment
 *
 * The world also owns her canvas, the speech bubble, the ball and treats,
 * and all input: dragging, throwing, petting and the keyboard.
 */
import { emit, type RubyEvent } from '../events';
import { pxSize } from '../scene/env';
import { Bubble } from './bubble';
import { Item } from './item';
import { activity } from './loop';
import { Ruby, velocity } from './ruby';
import type { Mood, Platform, Pointer, Spot } from './types';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const now = () => performance.now();
const CANVAS_W = 48, CANVAS_H = 46, SPRITE_X = 8, SPRITE_Y = 12;   // the sprite sits inside a bigger canvas, with room for effects

type LandHook = (ruby: Ruby, p: Platform) => boolean;

interface Drag {
  what: 'ball' | 'ruby';
  id: number;
  x0: number; y0: number; t0: number;
  moved: number;
  touch: boolean;
  samples: [number, number, number][];
}

export class PageWorld {
  S = pxSize();
  minX = 0;
  maxX = 0;
  bottom = 0;
  hidden = false;
  pointer: Pointer | null = null;
  pettedOnce = false;
  drivenOnce = false;
  items: Item[] = [];
  readonly ruby: Ruby;
  readonly ball: Item;
  /** where the mood comes from (the game), if anywhere */
  moodSource: (() => Mood) | null = null;
  /** extra reactions when Ruby lands somewhere; return true to skip her usual comment */
  landHooks: LandHook[] = [];

  private els: HTMLElement[] = [];
  private platforms: Platform[] = [];
  private byEl = new Map<HTMLElement, Platform>();
  private readonly el: HTMLDivElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly bubble = new Bubble();
  private lastScroll = 0;
  private lastComment = 0;
  private commented = new Set<HTMLElement>();
  private throwFrom: { x: number; y: number } | null = null;
  private drag: Drag | null = null;
  private swallowClick = false;
  private outT = 0;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'mascot';
    this.el.setAttribute('aria-hidden', 'true');
    const cv = document.createElement('canvas');
    cv.width = CANVAS_W;
    cv.height = CANVAS_H;
    this.el.appendChild(cv);
    this.ctx = cv.getContext('2d')!;
    document.body.appendChild(this.el);

    this.ruby = new Ruby(this);
    this.ball = new Item(this, 'ball');
    this.items = [this.ball];
    this.size();
    this.scan();
    this.refresh();
    this.bindInput();
    addEventListener('resize', () => { this.size(); this.scan(); });
  }

  // ---------------------------------------------------------------- platforms
  private size(): void {
    this.S = pxSize();
    this.el.style.width = `${CANVAS_W * this.S}px`;
    this.el.style.height = `${CANVAS_H * this.S}px`;
    this.items.forEach((i) => i.size());
  }

  /** look for [data-platform] elements; call again when the page changes shape */
  scan(): void {
    this.els = [...document.querySelectorAll<HTMLElement>('[data-platform]')];
  }

  private offsetOf(el: HTMLElement): number {
    const off = el.dataset.platformOffset ?? '0';
    return off.endsWith('em') ? parseFloat(off) * parseFloat(getComputedStyle(el).fontSize) : parseFloat(off) || 0;
  }

  /** measure every platform again (cheap: a handful of getBoundingClientRect calls) */
  private refresh(): void {
    const sx = scrollX, sy = scrollY;
    this.platforms = [];
    this.byEl.clear();
    for (const el of this.els) {
      if (!el.getClientRects().length) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 40) continue;
      const p = { el, x1: r.left + sx, x2: r.right + sx, y: r.top + sy + this.offsetOf(el), fixed: el.dataset.platform === 'fixed' };
      this.platforms.push(p);
      this.byEl.set(el, p);
    }
    const W = document.documentElement.clientWidth;
    this.minX = 14 * this.S;
    this.maxX = W - 14 * this.S;
    this.bottom = document.documentElement.scrollHeight;
  }

  find(el: HTMLElement): Platform | undefined {
    return this.byEl.get(el);
  }

  /** the first platform crossed when falling from y0 to y1 at x */
  landing(x: number, y0: number, y1: number, ignore: HTMLElement | null): Platform | null {
    let best: Platform | null = null;
    for (const p of this.platforms) {
      if (p.el === ignore || x < p.x1 + 3 || x > p.x2 - 3) continue;
      if (y0 <= p.y + 1 && y1 >= p.y && (!best || p.y < best.y)) best = p;
    }
    return best;
  }

  /** somewhere visible and within jumping distance, for her idle wandering */
  pickJump(r: Ruby): Spot | null {
    const top = scrollY + 70, bottom = scrollY + innerHeight - 30, options: (Spot & { w: number })[] = [];
    for (const p of this.platforms) {
      if (p === r.platform || p.x2 - p.x1 < 26 * this.S || p.y < top || p.y > bottom) continue;
      const x = clamp(r.x + (Math.random() - 0.5) * 320, p.x1 + 11 * this.S, p.x2 - 11 * this.S);
      const dx = x - r.x, dy = p.y - r.y;
      if (dy < -230 || dy > 520 || Math.abs(dx) > 480 || (Math.abs(dy) < 6 && Math.abs(dx) < 80)) continue;
      options.push({ p, x, w: 1 / (1 + Math.abs(dy) / 180) });
    }
    let roll = Math.random() * options.reduce((s, o) => s + o.w, 0);
    for (const o of options) if ((roll -= o.w) <= 0) return o;
    return options[0] ?? null;
  }

  /** the best next platform on the way to a goal, when fetching */
  stepToward(r: Ruby, goal: Spot): Spot | null {
    const S = this.S;
    let best: Spot | null = null, bestD = Math.hypot(goal.x - r.x, goal.p.y - r.y) - 24;
    for (const p of this.platforms) {
      if (p === r.platform || p.x2 - p.x1 < 20 * S) continue;
      const x = clamp(goal.x, p.x1 + 8 * S, p.x2 - 8 * S);
      const dx = x - r.x, dy = p.y - r.y;
      if (dy < -440 || dy > 640 || Math.abs(dx) > 620) continue;
      const d = p.el === goal.p.el ? 0 : Math.hypot(goal.x - x, goal.p.y - p.y);
      if (d < bestD) { bestD = d; best = { p, x }; }
    }
    return best;
  }

  /** where to bring the ball back to: the platform just below the cursor */
  returnPoint(): Spot | null {
    const ptr = this.pointer && now() - this.pointer.t < 10000 ? this.pointer : this.throwFrom;
    if (!ptr) return null;
    let best: Platform | null = null;
    for (const p of this.platforms) {
      if (p.fixed || ptr.x < p.x1 + 10 || ptr.x > p.x2 - 10 || p.y < ptr.y - 40) continue;
      if (!best || p.y < best.y) best = p;
    }
    best ??= this.platforms.reduce<Platform | null>((m, p) => (!m || Math.abs(p.y - ptr.y) < Math.abs(m.y - ptr.y) ? p : m), null);
    return best && { p: best, x: clamp(ptr.x, best.x1 + 14 * this.S, best.x2 - 14 * this.S) };
  }

  /** she fell off the world: put her back above the lowest platform */
  rescue(r: Ruby): void {
    const floor = this.platforms.reduce<Platform | null>((lo, p) => (!lo || p.y > lo.y ? p : lo), null);
    if (!floor) return;
    r.x = clamp(r.x, floor.x1 + 40, floor.x2 - 40);
    r.y = floor.y - 300;
    r.vx = r.vy = 0;
  }

  /** she wandered off screen: drop her in from the top of the viewport */
  dropIn(): void {
    const r = this.ruby, top = scrollY, bottom = top + innerHeight;
    const visible = this.platforms.filter((p) => !p.fixed && p.y > top + 110 && p.y < bottom - 30 && p.x2 - p.x1 > 30 * this.S);
    if (!visible.length) return;
    const p = visible[Math.floor(Math.random() * visible.length)];
    r.x = clamp(p.x1 + 16 * this.S + Math.random() * (p.x2 - p.x1 - 32 * this.S), this.minX, this.maxX);
    r.y = top - 20;
    r.vy = 120;
    r.vx = 0;
    r.platform = null;
    r.setMode('fall');
    if (!r.carrying && Math.random() < 0.55) setTimeout(() => r.say('back', 1.6), 250);
  }

  // ---------------------------------------------------------------- the ball and treats
  placeBallOn(el: HTMLElement, x: number): void {
    this.refresh();
    const p = this.find(el);
    if (p) this.ball.placeOn(p, clamp(x, this.minX, this.maxX));
  }

  respawnBall(): void {
    this.placeBallOn(document.querySelector<HTMLElement>('[data-ground="street"]')!, innerWidth * 0.36);
  }

  throwBall(vx: number, vy: number): void {
    const b = this.ball, r = this.ruby;
    b.held = false;
    b.platform = null;
    b.vx = vx;
    b.vy = vy;
    this.throwFrom = { x: b.x, y: b.y };
    this.emit('throw');
    if (!this.hidden && !r.driving && r.mode !== 'held' && r.task?.type !== 'eat') setTimeout(() => r.chase(b), 120);
  }

  /** toss the ball from wherever it is (or from the top of the screen if it is out of view) */
  tossBall(): void {
    if (this.hidden) this.setHidden(false);
    const b = this.ball;
    if (b.y < scrollY || b.y > scrollY + innerHeight || b.owner) {
      b.owner = null;
      b.held = false;
      if (this.ruby.carrying) this.ruby.dropBall(false);
      b.x = innerWidth * 0.3;
      b.y = scrollY + 40;
    }
    this.throwBall((Math.random() < 0.5 ? -1 : 1) * (260 + Math.random() * 300), -820);
  }

  /** drop a treat near Ruby (or somewhere visible); false when there is already one */
  dropTreat(): boolean {
    const r = this.ruby, top = scrollY, bottom = top + innerHeight, S = this.S;
    if (this.items.some((i) => i.kind === 'treat')) return false;
    const onScreen = (p: Platform | null) => !!p && !p.fixed && p.y > top + 90 && p.y < bottom - 20 && p.x2 - p.x1 > 40 * S;
    if (!onScreen(r.platform) && r.mode !== 'held') this.dropIn();
    const mid = top + innerHeight * 0.6;
    const p = onScreen(r.platform) ? r.platform! : this.platforms.filter(onScreen).sort((a, b) => Math.abs(a.y - mid) - Math.abs(b.y - mid))[0];
    if (!p) return false;
    const side = r.x - p.x1 > p.x2 - r.x ? -1 : 1;
    const treat = new Item(this, 'treat');
    treat.x = clamp(r.x + side * (70 + Math.random() * 110), p.x1 + 16 * S, p.x2 - 16 * S);
    treat.y = Math.max(top + 20, p.y - 260);
    this.items.push(treat);
    if (r.mode !== 'held' && !r.driving) setTimeout(() => r.chase(treat), 250);
    return true;
  }

  // ---------------------------------------------------------------- talking to the rest of the page
  emit(type: RubyEvent): void {
    emit('ruby', { type });
  }

  mood(): Mood | null {
    return this.moodSource?.() ?? null;
  }

  idleFor(): number {
    return activity.idle();
  }

  say(text: string, seconds: number): void {
    if (!this.hidden) this.bubble.show(text, seconds);
  }

  /** when she lands: give the hooks a go, otherwise maybe comment on where she is */
  onLand(r: Ruby, p: Platform): void {
    for (const hook of this.landHooks) if (hook(r, p)) return;
    const line = p.el.dataset.say;
    if (!line || this.commented.has(p.el) || now() - this.lastComment < 16000 || Math.random() > 0.6) return;
    this.commented.add(p.el);
    this.lastComment = now();
    setTimeout(() => r.say(line), 350);
  }

  /** show her again standing on `el` at page x, instead of dropping in from the sky */
  showOn(el: HTMLElement, x: number): void {
    this.hidden = false;
    this.el.style.display = '';
    this.refresh();
    const p = this.find(el), r = this.ruby;
    if (!p) { this.dropIn(); return; }
    r.x = clamp(x, Math.max(this.minX, p.x1 + 12 * this.S), Math.min(this.maxX, p.x2 - 12 * this.S));
    r.y = p.y;
    r.vx = r.vy = 0;
    r.platform = p;
    r.setMode('sit', 2.5);
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.el.style.display = hidden ? 'none' : '';
    if (hidden) { this.bubble.hide(); this.ruby.calm(); }
    else this.dropIn();
  }

  // ---------------------------------------------------------------- input
  private bindInput(): void {
    const r = this.ruby, ball = this.ball, html = document.documentElement;
    const toPage = (e: PointerEvent) => ({ x: e.clientX + scrollX, y: e.clientY + scrollY });
    const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
    const pet = { dir: 0, flips: [] as number[] };

    // grabbing the ball or Ruby, before anything underneath gets the click
    document.addEventListener('pointerdown', (e) => {
      if (this.hidden || e.button !== 0) return;
      const p = toPage(e);
      const what = ball.hit(p.x, p.y) ? 'ball' : r.hit(p.x, p.y) ? 'ruby' : null;
      if (what) {
        e.preventDefault();
        e.stopPropagation();
        this.drag = { what, id: e.pointerId, x0: p.x, y0: p.y, t0: now(), moved: 0, touch: e.pointerType !== 'mouse', samples: [] };
        this.swallowClick = true;
        html.classList.add('mascot-drag');
      } else if (r.driving) r.stopDriving();
    }, { capture: true });

    document.addEventListener('click', (e) => {
      if (!this.swallowClick) return;
      e.preventDefault();
      e.stopPropagation();
      this.swallowClick = false;
    }, { capture: true });

    addEventListener('pointermove', (e) => {
      const p = toPage(e);
      this.pointer = { ...p, t: now() };
      activity.ping();
      const d = this.drag;
      if (d && e.pointerId === d.id) {
        d.moved = Math.max(d.moved, Math.hypot(p.x - d.x0, p.y - d.y0));
        if (d.what === 'ball') {
          if (d.moved > 4 && !ball.held) { ball.held = true; ball.platform = null; if (!r.task) r.chase(ball); }
          if (ball.held) {
            ball.x = clamp(p.x, this.minX, this.maxX);
            ball.y = p.y + ball.radius;
            d.samples.push([p.x, p.y, now()]);
            while (d.samples.length > 2 && now() - d.samples[0][2] > 90) d.samples.shift();
          }
        } else {
          if (d.moved > 10 && r.mode !== 'held') r.grab();
          if (r.mode === 'held') r.dragTo(p.x, p.y);
        }
      } else if (!this.hidden && e.pointerType === 'mouse') {
        const overRuby = r.hit(p.x, p.y);
        html.classList.toggle('mascot-hover', overRuby || ball.hit(p.x, p.y));
        // petting: wiggle the cursor back and forth over her
        if (overRuby && Math.abs(e.movementX) > 1) {
          const dir = Math.sign(e.movementX);
          if (dir !== pet.dir) { pet.dir = dir; pet.flips.push(now()); }
          pet.flips = pet.flips.filter((t) => now() - t < 900);
          if (pet.flips.length >= 3) r.pet();
        }
      }
    }, { passive: true });

    const up = (e: PointerEvent) => {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      this.drag = null;
      html.classList.remove('mascot-drag');
      setTimeout(() => { this.swallowClick = false; }, 0);
      if (d.what === 'ball') {
        if (ball.held) {
          const [vx, vy] = velocity(d.samples);
          this.throwBall(clamp(vx, -1600, 1600), clamp(vy, -1800, 1400));
        } else {
          this.throwBall((r.x > ball.x ? -1 : 1) * (240 + Math.random() * 260), -760);   // a tap tosses it
        }
        return;
      }
      if (r.mode === 'held') r.release();
      else if (now() - d.t0 < 500) {
        r.poke();
        if (!d.touch) r.startDriving(true);
      }
    };
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
    // on touch screens, don't scroll the page while carrying Ruby or the ball around
    document.addEventListener('touchstart', (e) => { if (this.drag) e.preventDefault(); }, { passive: false });
    document.addEventListener('touchmove', (e) => { if (this.drag) e.preventDefault(); }, { passive: false });

    addEventListener('scroll', () => { this.lastScroll = now(); activity.ping(); }, { passive: true });

    // ← → and A/D always walk her: they don't scroll the page.
    // ↑ ↓ and space only steer her after she has been clicked, so scrolling keeps working.
    document.addEventListener('keydown', (e) => {
      activity.ping();
      if (this.hidden || typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === 'Escape') { if (r.driving) r.stopDriving(); return; }
      const left = k === 'ArrowLeft' || k === 'a', right = k === 'ArrowRight' || k === 'd';
      const jump = k === 'w' || (r.selected && (k === 'ArrowUp' || k === ' '));
      const down = k === 's' || (r.selected && k === 'ArrowDown');
      if (!left && !right && !jump && !down) return;
      r.startDriving();
      if (left) r.keys.left = 1;
      if (right) r.keys.right = 1;
      if (jump && !e.repeat) r.jumpKey();
      if (down) r.dropThrough();
      e.preventDefault();
    });
    document.addEventListener('keyup', (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === 'ArrowLeft' || k === 'a') r.keys.left = 0;
      if (k === 'ArrowRight' || k === 'd') r.keys.right = 0;
    });
  }

  // ---------------------------------------------------------------- every frame
  update(dt: number): void {
    if (this.hidden) return;
    const r = this.ruby;
    this.refresh();
    r.update(dt);
    for (const it of this.items) it.update(dt);

    // wandered off screen? drop her back in once scrolling settles (not while she's off fetching)
    const top = r.y - 31 * this.S, viewTop = scrollY, viewBottom = viewTop + innerHeight;
    const out = r.y < viewTop - 10 || top > viewBottom + 10;
    const busy = r.mode === 'held' || (r.task && 'phase' in r.task && r.task.phase === 'go');
    this.outT = out && !busy ? this.outT + dt : 0;
    if (this.outT > 2.2 && now() - this.lastScroll > 450) { this.outT = 0; this.dropIn(); }

    const S = this.S;
    this.ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    r.render(this.ctx, SPRITE_X, SPRITE_Y);
    this.el.style.transform = `translate3d(${Math.round(r.x - (16 + SPRITE_X) * S)}px, ${Math.round(r.y - (31 + SPRITE_Y) * S)}px, 0)`;
    for (const it of this.items) it.render();
    const [, hy] = r.headPos();
    this.bubble.place(r.x, r.y - (31 - hy) * S - 6 * S);
  }

}
