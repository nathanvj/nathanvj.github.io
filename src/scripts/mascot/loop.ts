/** One requestAnimationFrame loop for everything that moves. */

type Tick = (dt: number) => void;
const ticks: Tick[] = [];
let last = performance.now();
let running = false;

function frame(t: number): void {
  const dt = Math.min(0.05, (t - last) / 1000);   // never jump more than 50ms, e.g. after a background tab
  last = t;
  for (const f of ticks) f(dt);
  requestAnimationFrame(frame);
}

/** run `f(dt)` every frame, dt in seconds */
export function onTick(f: Tick): void {
  ticks.push(f);
  if (!running) {
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
}

/** a shared sense of "is someone here?": any pointer move, scroll or key press */
export const activity = {
  last: performance.now(),
  ping(): void { this.last = performance.now(); },
  /** seconds since the visitor last did anything */
  idle(): number { return (performance.now() - this.last) / 1000; },
};
