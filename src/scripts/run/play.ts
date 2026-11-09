/**
 * Ruby Run on the page. The hero is the stage: any [data-run-play] button (in
 * the hero, the header, Ruby's panel) or `play` in the terminal scrolls up,
 * hands the landscape to the game, and turns the buttons under the intro into the
 * scoreboard (RubyRun.astro). Scroll away and it pauses; stop, and Ruby steps
 * back onto the page right where she ran to.
 *
 * Also here: keyboard, mouse and touch, the best score, sharing, the hero
 * following the game's sky, and telling the page a run ended ('run:over'),
 * which is how Ruby's game hands out achievements.
 */
import { run as content } from '../../content/run';
import { site } from '../../content/site';
import type { HatName } from '../../content/types';
import { fill } from '../../lib/rich';
import { emit } from '../events';
import { Bubble } from '../mascot/bubble';
import { onTick } from '../mascot/loop';
import type { Landscape } from '../scene/landscape';
import { isNight, reducedMotion } from '../scene/env';
import { RunEngine, type RunResult } from './engine';
import { loadScores, saveScores } from './scores';

interface Deps {
  land: Landscape;
  /** what Ruby wears on the page, so she wears it while running too */
  hat: () => HatName | null;
  /** the page's Ruby steps aside while she runs in the game… */
  onStart: () => void;
  /** …and comes back at this page x when it stops */
  onStop: (pageX: number) => void;
}

type Card = 'ready' | 'paused' | 'over';

const JUMP = new Set([' ', 'ArrowUp', 'w', 'W']);
const DUCK = new Set(['ArrowDown', 's', 'S']);
const fmt = (m: number) => Math.floor(m).toLocaleString('en');
const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

export function mountRun(deps: Deps): { play: () => void } {
  const html = document.documentElement;
  const hero = document.querySelector<HTMLElement>('[data-run-stage]')!;
  const street = hero.querySelector<HTMLElement>('[data-ground="street"]')!;
  const field = hero.querySelector<HTMLElement>('[data-run-field]')!;
  const ui = hero.querySelector<HTMLElement>('[data-run]')!;
  const el = <T extends HTMLElement = HTMLElement>(name: string) => ui.querySelector<T>(`[data-run-${name}]`)!;
  const card = el('card'), go = el<HTMLButtonElement>('go'), share = el<HTMLButtonElement>('share');
  const skyParts = [...document.querySelectorAll<HTMLElement>('[data-run-sky]')];
  const bubble = new Bubble();
  const coarse = matchMedia('(pointer: coarse)').matches;
  const scores = loadScores();
  let last: RunResult | null = null;
  let overAt = 0, ratio = 1, seen = false, sky = '';
  let shown = { m: -1, bones: -1, best: -1 };

  const say = (text: string) => bubble.show(text, Math.min(3.2, 1.4 + text.length * 0.05));
  const bump = (chip: HTMLElement) => { chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump'); };
  const engine = new RunEngine(deps.land, {
    say,
    moment(m) {
      if (m === 'bone') bump(el('bones').parentElement!);
      if (m === 'milestone') bump(el('metres').parentElement!);
      if (m === 'duckHint') say(coarse ? content.duckHint.touch : content.duckHint.keys);
      if (m === 'crash') {
        if (!reducedMotion) { street.classList.remove('shake'); void street.offsetWidth; street.classList.add('shake'); }
        navigator.vibrate?.(70);
      }
    },
    over(result) {
      last = result;
      const isBest = result.metres > scores.best;
      scores.runs++;
      scores.best = Math.max(scores.best, result.metres);
      saveScores(scores);
      overAt = performance.now();
      showCard('over', isBest);
      emit('run:over', { metres: result.metres, bones: result.bones, skyTurned: result.skyTurned });
    },
  });
  el('controls').textContent = coarse ? content.controls.touch : content.controls.keys;
  // during development the engine is window.__run, to poke at from the console
  if (import.meta.env.DEV) Object.assign(window, { __run: engine });

  // ---------------------------------------------------------------- starting and stopping
  function play(): void {
    // bring the street into view: the top of the page, or a bit further on a short screen (a phone on its side)
    const top = Math.max(0, scrollY + field.getBoundingClientRect().bottom - innerHeight + 8);
    scrollTo({ top: Math.min(top, scrollY + hero.getBoundingClientRect().top + hero.offsetHeight), behavior: reducedMotion ? 'auto' : 'smooth' });
    if (engine.state !== 'off') return;
    deps.onStart();
    ui.hidden = false;
    seen = ratio >= 0.5;
    newRun();
    showCard('ready');
  }

  function newRun(): void {
    el('best-badge').hidden = true;
    engine.hat = deps.hat();
    engine.arm(Math.floor(Math.random() * 2 ** 31), isNight());
    shown = { m: -1, bones: -1, best: -1 };
    bubble.hide();
  }

  function stop(): void {
    if (engine.state === 'off') return;
    const r = deps.land.canvas.getBoundingClientRect();
    const x = r.left + scrollX + engine.feetX * deps.land.S;
    engine.stop();
    bubble.hide();
    ui.hidden = true;
    delete html.dataset.run;
    sky = '';
    skyParts.forEach((p) => delete p.dataset.sky);
    deps.onStop(x);
  }

  function pause(): void {
    if (engine.state !== 'running') return;
    engine.pause();
    showCard('paused');
  }

  /** the big button: start, keep running, or run again */
  function primary(): void {
    if (engine.state === 'paused') { engine.resume(); showCard(null); return; }
    if (engine.state === 'over') newRun();
    if (engine.state === 'ready') { engine.start(); showCard(null); }
  }

  // ---------------------------------------------------------------- the card
  function showCard(which: Card | null, isBest = false): void {
    card.hidden = !which;
    if (!which) { street.focus({ preventScroll: true }); return; }
    const heading = which === 'paused' ? content.paused : which === 'over' && last ? engine.crashLine(last.crash) : content.title;
    el('heading').textContent = heading;
    el('text').hidden = which !== 'ready';
    el('best-badge').hidden = !isBest;
    go.textContent = which === 'ready' ? content.start : which === 'paused' ? content.resume : content.again;
    share.hidden = which !== 'over';
    share.textContent = content.share;
    el('controls').hidden = which !== 'ready';
    el('live').textContent = which === 'over' ? `${heading} ${engine.resultLine()}` : '';
    // after a crash, keep focus off the buttons so a held jump key doesn't restart straight away
    if (which === 'over') street.focus({ preventScroll: true });
    else go.focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------- every frame
  onTick((dt) => {
    if (engine.state === 'off') return;
    engine.tick(dt);
    if (html.dataset.run !== engine.state) html.dataset.run = engine.state;
    // the header and the hero follow the game's sky, so the words stay readable
    const s = engine.night >= 0.5 ? 'night' : 'day';
    if (s !== sky) { sky = s; skyParts.forEach((p) => { p.dataset.sky = s; }); }
    const m = Math.floor(engine.metres);
    if (m !== shown.m) { shown.m = m; el('metres').textContent = `${fmt(m)} m`; }
    if (engine.bones !== shown.bones) { shown.bones = engine.bones; el('bones').textContent = String(engine.bones); }
    if (scores.best !== shown.best) { shown.best = scores.best; el('best').textContent = scores.best ? fill(content.best, { m: fmt(scores.best) }) : ''; }
    const r = deps.land.canvas.getBoundingClientRect(), S = deps.land.S, { x, y } = engine.head;
    bubble.place(r.left + scrollX + x * S, r.top + scrollY + y * S - 4);
  });

  // ---------------------------------------------------------------- keyboard
  addEventListener('keydown', (e) => {
    if (engine.state === 'off' || ratio < 0.5 || typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    const take = () => { e.preventDefault(); e.stopPropagation(); };
    if (engine.state === 'running') {
      if (JUMP.has(k)) { take(); if (!e.repeat) engine.press(); }
      else if (DUCK.has(k)) { take(); engine.duck(true); }
      else if (k === 'p' || k === 'P' || k === 'Escape') { take(); pause(); }
      return;
    }
    if (engine.state === 'crashed') { if (JUMP.has(k) || DUCK.has(k)) take(); return; }
    if (k === 'Escape') { take(); stop(); return; }
    if (k !== ' ' && k !== 'Enter' && k !== 'ArrowUp') return;
    if ((e.target as HTMLElement).closest('a, button')) return;   // a focused button does its own thing
    take();
    if (engine.state === 'over' && performance.now() - overAt < 600) return;
    if (!e.repeat) primary();
  }, { capture: true });

  addEventListener('keyup', (e) => {
    if (engine.state === 'off') return;
    if (JUMP.has(e.key)) engine.release();
    if (DUCK.has(e.key)) engine.duck(false);
  }, { capture: true });

  // ---------------------------------------------------------------- mouse and touch
  // while running: press anywhere in the hero to jump (hold for higher), swipe down to duck
  let touch: { id: number; y: number } | null = null;
  hero.addEventListener('pointerdown', (e) => {
    if (engine.state !== 'running' || (e.target as HTMLElement).closest('a, button, [data-run-card]')) return;
    e.preventDefault();
    touch = { id: e.pointerId, y: e.clientY };
    engine.press();
  });
  hero.addEventListener('pointermove', (e) => {
    if (!touch || e.pointerId !== touch.id || e.clientY - touch.y < 18) return;
    engine.release();
    engine.duck(true);
  });
  const lift = (e: PointerEvent) => {
    if (!touch || e.pointerId !== touch.id) return;
    touch = null;
    engine.release();
    engine.duck(false);
  };
  addEventListener('pointerup', lift);
  addEventListener('pointercancel', lift);
  // before a run and after one, a click on the street starts running
  street.addEventListener('click', () => {
    if (engine.state === 'ready' || (engine.state === 'over' && performance.now() - overAt > 600)) primary();
  });

  // ---------------------------------------------------------------- buttons
  go.addEventListener('click', primary);
  el('pause').addEventListener('click', pause);
  el('stop').addEventListener('click', stop);
  share.addEventListener('click', (e) => {
    void shareScore();
    if (e.detail) street.focus({ preventScroll: true });   // after a mouse click, space runs again
  });
  document.querySelectorAll('[data-run-play]').forEach((b) => b.addEventListener('click', play));

  // pause when the hero scrolls out of view, the tab goes away or the window changes size;
  // once it's gone completely, the game is over and Ruby is back on the page
  new IntersectionObserver(([e]) => {
    ratio = e.intersectionRatio;
    if (ratio >= 0.5) seen = true;
    if (ratio < 0.5) pause();
    if (ratio === 0 && seen && engine.state !== 'running' && engine.state !== 'crashed') stop();
  }, { threshold: [0, 0.5, 1] }).observe(field);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  addEventListener('blur', pause);
  let width = innerWidth;   // only the width: phones resize the height as their toolbars come and go
  addEventListener('resize', () => { if (innerWidth !== width) { width = innerWidth; pause(); } });

  async function shareScore(): Promise<void> {
    if (!last) return;
    const text = fill(content.shareText, { m: fmt(last.metres), bones: last.bones, url: site.url.replace(/^https?:\/\//, '') });
    if (coarse && navigator.share) {
      try { await navigator.share({ text }); } catch { /* cancelled */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      share.textContent = content.copied;
      setTimeout(() => { share.textContent = content.share; }, 1600);
    } catch {
      /* no clipboard: nothing to do */
    }
  }

  return { play };
}
