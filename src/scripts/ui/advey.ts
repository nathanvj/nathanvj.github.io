/** The Advey card: plays the little animation while it's on screen, and lights up the step it's on. */
import { on } from '../events';
import { onTick } from '../mascot/loop';
import { AdveyScene, SCENE, stepAt } from '../pixel/advey';
import { isNight, pxSize, reducedMotion } from '../scene/env';

export function mountAdvey(): void {
  const cv = document.querySelector<HTMLCanvasElement>('[data-advey-scene]');
  if (!cv) return;
  const steps = [...document.querySelectorAll<HTMLElement>('[data-advey-step]')];
  const ctx = cv.getContext('2d')!;
  let scene = new AdveyScene(isNight());
  // with reduced motion, it shows the finished report and stands still
  let t = reducedMotion ? 10.8 : 0;
  let step = -1;

  const show = () => {
    scene.draw(ctx, t);
    const s = reducedMotion ? -1 : stepAt(t);
    if (s !== step) { step = s; steps.forEach((el, i) => el.toggleAttribute('data-on', i === s)); }
  };
  const size = () => {
    const S = pxSize();
    cv.style.width = `${SCENE.w * S}px`;
    cv.style.height = `${SCENE.h * S}px`;
  };
  size();
  addEventListener('resize', size);
  on('theme', () => { scene = new AdveyScene(isNight()); show(); });
  show();
  if (reducedMotion) return;

  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(cv);
  onTick((dt) => {
    if (!visible) return;
    t = (t + dt) % SCENE.loop;
    show();
  });
}
