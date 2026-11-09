/** Little messages at the bottom of the screen, one at a time. */
const queue: string[] = [];
let busy = false;

function next(el: HTMLElement): void {
  const msg = queue.shift();
  if (!msg) { busy = false; return; }
  busy = true;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => next(el), 260);
  }, 2200);
}

export function toast(msg: string): void {
  const el = document.querySelector<HTMLElement>('[data-toast]');
  if (!el) return;
  queue.push(msg);
  if (!busy) next(el);
}
