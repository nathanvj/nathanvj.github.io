/**
 * Ruby's panel (bottom left): moods, level, treats, the ball, bones and
 * achievements. The markup comes from PetPanel.astro; this only updates it.
 */
import { game as config } from '../../content/ruby';
import { fill } from '../../lib/rich';
import { PixelBuffer } from '../pixel/buffer';
import { drawRuby } from '../pixel/ruby';
import type { Game } from './game';

export interface Panel {
  render(): void;
  tick(dt: number): void;
}

export function mountPanel(game: Game): Panel {
  const root = document.querySelector<HTMLElement>('[data-pet]')!;
  const toggle = root.querySelector<HTMLButtonElement>('[data-pet-toggle]')!;
  const panel = root.querySelector<HTMLElement>('[data-pet-panel]')!;
  const q = <T extends Element>(sel: string) => root.querySelectorAll<T>(sel);
  const shown: Record<string, number> = {};
  let acc = 0;

  // her face on the toggle: the same rig, cropped to the head
  const face = root.querySelector<HTMLCanvasElement>('[data-pet-face]')!;
  const b = new PixelBuffer(32, 32);
  drawRuby(b, { mode: 'idle', t: 0, ph: 0, sq: 0, eyes: 'open', blink: false, look: { x: 0, y: 0 }, talk: false, wag: 0, pant: false, ball: false, hat: null });
  face.getContext('2d')!.drawImage(b.canvas(), 15, 4, 16, 16, 0, 0, 16, 16);

  function render(): void {
    const s = game.state, level = game.level;
    q('[data-level]').forEach((e) => { e.textContent = String(level); });
    q('[data-next]').forEach((e) => { e.textContent = fill(config.panel.nextLevel, { xp: config.xpPerLevel - (s.xp % config.xpPerLevel), next: level + 1 }); });
    for (const k of ['happy', 'full', 'energy'] as const) {
      const v = Math.round(s.mood[k]);
      if (shown[k] === v) continue;
      shown[k] = v;
      q<HTMLElement>(`[data-mood="${k}"]`).forEach((e) => {
        e.style.setProperty('--v', String(v / 100));
        if (e.getAttribute('role') === 'meter') e.setAttribute('aria-valuenow', String(v));
      });
    }
    // bones: how many, never where
    q('[data-bone-slot]').forEach((e, i) => e.classList.toggle('got', i < s.bones.length));
    q('[data-bone-count]').forEach((e) => { e.textContent = `${s.bones.length} of ${config.bones.length}`; });
    q('[data-bone-note]').forEach((e) => { e.textContent = s.bones.length === config.bones.length ? config.bonesDone : config.bonesNote; });
    // achievements
    let got = 0;
    q<HTMLElement>('[data-ach]').forEach((li) => {
      const has = !!s.achievements[li.dataset.ach!];
      got += has ? 1 : 0;
      li.classList.toggle('got', has);
      if (has && li.dataset.name) {
        li.querySelector('b')!.textContent = li.dataset.name;
        li.querySelector('small')!.textContent = li.dataset.how ?? '';
      }
    });
    q('[data-ach-count]').forEach((e) => { e.textContent = `${got} of ${config.achievements.length}`; });
  }

  let openedAt = 0;
  function setOpen(open: boolean): void {
    panel.hidden = !open;
    openedAt = scrollY;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) { for (const k in shown) delete shown[k]; render(); }
  }

  toggle.addEventListener('click', () => setOpen(panel.hidden));
  root.querySelector('[data-pet-close]')!.addEventListener('click', () => { setOpen(false); toggle.focus(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); } });
  // close when clicking elsewhere, or once you scroll on, so it never covers the page for long
  document.addEventListener('pointerdown', (e) => { if (!panel.hidden && !root.contains(e.target as Node)) setOpen(false); });
  addEventListener('scroll', () => {
    if (!panel.hidden && !panel.matches(':hover') && Math.abs(scrollY - openedAt) > 160) setOpen(false);
  }, { passive: true });
  root.querySelector('[data-pet-treat]')!.addEventListener('click', () => game.feed());
  root.querySelector('[data-pet-ball]')!.addEventListener('click', () => game.world.tossBall());

  render();
  return {
    render,
    tick(dt) {
      if (!panel.hidden || (acc += dt) > 1) { acc = 0; render(); }
    },
  };
}
