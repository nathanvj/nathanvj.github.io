/**
 * The smaller interactive bits: the blinking avatar, "Ask me something",
 * the contact form (copying the address, posting the letter), the duck and the boat, the footer heart and
 * party mode.
 */
import { build, contact } from '../../content/home';
import { game as gameConfig } from '../../content/ruby';
import { site } from '../../content/site';
import { fill, pick } from '../../lib/rich';
import { on } from '../events';
import { Bubble } from '../mascot/bubble';
import { onTick } from '../mascot/loop';
import type { PageWorld } from '../mascot/world';
import { PixelBuffer } from '../pixel/buffer';
import { drawPortrait, type PortraitPose } from '../pixel/people';
import type { Landscape } from '../scene/landscape';
import { pxSize, reducedMotion } from '../scene/env';
import { POSTBOX } from '../scene/postbox';
import { currentTheme, setTheme } from './theme';
import { toast } from './toast';

/** the little pixel Nathan in the header (and on the founder card); blinks now and then */
export function mountPortraits(): void {
  const canvases = [...document.querySelectorAll<HTMLCanvasElement>('[data-portrait]')];
  if (!canvases.length) return;
  const b = new PixelBuffer(24, 24);
  const paint = (p: PortraitPose = {}) => {
    drawPortrait(b, p);
    for (const cv of canvases) {
      const c = cv.getContext('2d')!;
      c.clearRect(0, 0, 24, 24);
      c.drawImage(b.canvas(), 0, 0);
    }
  };
  paint();
  let blinkIn = 3, blinkOn = 0;
  onTick((dt) => {
    if (blinkOn > 0 && (blinkOn -= dt) <= 0) paint();
    if ((blinkIn -= dt) <= 0) { blinkIn = 2.5 + Math.random() * 4; blinkOn = 0.14; paint({ blink: true }); }
  });
  document.querySelectorAll('[data-brand]').forEach((el) => {
    el.addEventListener('pointerenter', () => paint({ happy: true }));
    el.addEventListener('pointerleave', () => paint());
  });
}

/** pixel logos: drawn at their native size times the page pixel, so they stay crisp */
export function mountLogos(): void {
  const size = () => {
    const S = pxSize();
    document.querySelectorAll<HTMLImageElement>('[data-pixel-logo]').forEach((img) => {
      img.style.width = `${Number(img.getAttribute('width')) * S}px`;
      img.style.height = `${Number(img.getAttribute('height')) * S}px`;
    });
  };
  size();
  addEventListener('resize', size);
}

/** "Ask me something": pick a question, the answer streams in like a model would type it */
export function mountAsk(): void {
  const out = document.querySelector<HTMLElement>('[data-ask-out]');
  if (!out) return;
  let timer = 0;
  document.querySelectorAll<HTMLButtonElement>('[data-ask]').forEach((chip) => chip.addEventListener('click', () => {
    document.querySelectorAll('[data-ask]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    const text = build.ask.questions.find((q) => q.id === chip.dataset.ask)?.answer ?? '';
    clearInterval(timer);
    if (reducedMotion) { out.textContent = text; return; }
    out.textContent = '';
    out.classList.add('typing');
    let i = 0;
    timer = window.setInterval(() => {
      i = Math.min(text.length, i + 2 + Math.floor(Math.random() * 3));
      out.textContent = text.slice(0, i);
      if (i >= text.length) { clearInterval(timer); out.classList.remove('typing'); }
    }, 28);
  }));
}

/** the contact form: copy the address, or post the letter on the grass into the mailbox */
export function mountContact(world: PageWorld): void {
  document.querySelectorAll('[data-copy-email]').forEach((btn) => btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(site.email);
      toast(fill(contact.copied, { email: site.email }));
      if (!world.hidden) world.ruby.say(contact.rubyOnCopy, 2.4);
    } catch {
      toast(fill(contact.copyFailed, { email: site.email }));
    }
  }));

  const wrap = document.querySelector<HTMLElement>('[data-postbox]');
  if (!wrap) return;
  const letter = wrap.querySelector<HTMLButtonElement>('[data-letter]')!;
  const box = wrap.querySelector<HTMLElement>('[data-mailbox]')!;
  const heart = wrap.querySelector<HTMLElement>('[data-postbox-heart]')!;
  const replay = (el: HTMLElement, cls: string) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  let busy = false;

  /** the letter flies up and into the slot, the mailbox wobbles, a heart pops out */
  const post = (openMail: boolean) => {
    if (busy) return;
    busy = true;
    const done = () => {
      letter.hidden = true;
      replay(box, 'wobble');
      replay(heart, 'pop');
      if (!world.hidden) world.ruby.say(contact.rubyOnPost, 2);
      if (openMail) location.href = `mailto:${site.email}`;
      setTimeout(() => { letter.hidden = false; busy = false; }, 2400);
    };
    if (reducedMotion) { done(); return; }
    const S = pxSize(), { slot, letter: at } = POSTBOX;
    const dx = (slot.x - at.x - at.w / 2) * S, dy = (slot.y - at.y) * S;
    letter.animate([
      { translate: '0 0', rotate: '0deg' },
      { translate: `${dx * 0.45}px ${dy - 18 * S}px`, rotate: '-14deg', offset: 0.45 },
      { translate: `${dx}px ${dy}px`, rotate: '0deg', scale: '0.7', offset: 0.9 },
      { translate: `${dx}px ${dy + 2 * S}px`, scale: '0.5', opacity: 0 },
    ], { duration: 760, easing: 'steps(14)' }).finished.then(done, done);
  };
  letter.addEventListener('click', () => post(true));
  // the address button opens the mail app by itself; the letter goes in at the same time
  document.querySelectorAll('[data-send-letter]').forEach((a) => a.addEventListener('click', () => post(false)));
}

/** show/hide Ruby from the footer */
export function mountHideToggle(world: PageWorld): void {
  const KEY = 'nathanvj:ruby-hidden';
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-hide-ruby]');
  const sync = () => buttons.forEach((b) => { b.textContent = world.hidden ? site.footer.showRuby : site.footer.hideRuby; });
  buttons.forEach((b) => b.addEventListener('click', () => {
    world.setHidden(!world.hidden);
    try { localStorage.setItem(KEY, world.hidden ? '1' : ''); } catch { /* ignore */ }
    sync();
  }));
  try { if (localStorage.getItem(KEY)) world.setHidden(true); } catch { /* ignore */ }
  sync();
}

/** Kwak the duck, the boat with the two of us, Ruby greeting it, and the footer heart */
export function mountWaterLife(world: PageWorld, land: Landscape): void {
  const ruby = world.ruby;
  const bubble = new Bubble();
  let at: { x: number; y: number } | null = null;
  const onStreet = () => !world.hidden && ruby.platform?.el.dataset.ground === 'street' && !ruby.task;

  on('water:duck', (p) => {
    at = p;
    bubble.show('Squeak!', 1.3);
    if (onStreet()) {
      ruby.facing = p.x > ruby.x ? 1 : -1;
      setTimeout(() => ruby.say('duck', 1.6), 450);
    }
  });
  on('water:boat', (p) => {
    at = p;
    bubble.show(site.footer.heart.bubble, 2);
    if (onStreet()) setTimeout(() => ruby.say('boatClicked', 2), 500);
  });

  // when the boat drifts by, Ruby runs along the quay to say hi, once per pass
  let greeted = -1;
  onTick(() => {
    if (at) bubble.place(at.x, at.y - 4);
    const boat = land.boatOnPage();
    if (!boat || land.boatPass === greeted || !onStreet() || ruby.driving || ruby.mode === 'held') return;
    if (boat.x < scrollX + 60 || boat.x > scrollX + innerWidth - 60) return;
    greeted = land.boatPass;
    if (ruby.mode === 'sleep') ruby.wake();
    ruby.walkTo(boat.x + 40, 'run');
    setTimeout(() => { ruby.eyes('happy', 2); ruby.say('boatPasses', 2.2); }, 900);
  });

  // the beating heart in the footer starts date night
  document.querySelectorAll('[data-date-night]').forEach((btn) => btn.addEventListener('click', () => {
    if (currentTheme() !== 'night') setTheme('night');
    scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    land.sendBoat();
    toast(site.footer.heart.bubble);
  }));
}

/** party mode: the Konami code, or `party` in the terminal */
export function makeParty(world: PageWorld): () => void {
  const party = () => {
    world.ruby.party(8);
    toast(gameConfig.toasts.party);
    if (reducedMotion) return;
    const cv = document.createElement('canvas');
    cv.className = 'confetti';
    const S = pxSize() * 2, W = Math.ceil(innerWidth / S), H = Math.ceil(innerHeight / S);
    cv.width = W;
    cv.height = H;
    cv.style.width = `${W * S}px`;
    cv.style.height = `${H * S}px`;
    document.body.appendChild(cv);
    const c = cv.getContext('2d')!;
    const colors = ['#ff7a1a', '#ffd23f', '#1f74c8', '#57b0c9', '#ff4f6d', '#5fae5a', '#ffffff'];
    const bits = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: -Math.random() * H * 0.8, vy: 10 + Math.random() * 25, ph: Math.random() * 6, c: pick(colors) }));
    let t = 0;
    onTick((dt) => {
      if (!cv.isConnected) return;
      t += dt;
      c.clearRect(0, 0, W, H);
      for (const b of bits) {
        b.y += b.vy * dt;
        b.x += Math.sin(t * 3 + b.ph) * 0.4;
        c.fillStyle = b.c;
        c.fillRect(Math.round(b.x), Math.round(b.y), 1, Math.sin(t * 8 + b.ph) > 0 ? 2 : 1);
      }
      if (t > 4.5) cv.remove();
    });
  };
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let k = 0;
  document.addEventListener('keydown', (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    k = key === KONAMI[k] ? k + 1 : key === KONAMI[0] ? 1 : 0;
    if (k === KONAMI.length) { k = 0; party(); }
  });
  return party;
}

/** her first landing says hello */
export function greetOnce(world: PageWorld): void {
  let done = false;
  world.landHooks.unshift((r) => {
    if (done) return false;
    done = true;
    setTimeout(() => r.say('intro'), 250);
    return true;
  });
}
