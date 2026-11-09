/** A pixel speech bubble that follows something around the page. */
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export class Bubble {
  private readonly el: HTMLDivElement;
  private until = 0;
  private w = 0;
  private h = 0;

  constructor(parent: HTMLElement = document.body) {
    this.el = document.createElement('div');
    this.el.className = 'bubble';
    this.el.setAttribute('role', 'status');
    parent.appendChild(this.el);
  }

  show(text: string, seconds: number): void {
    this.el.textContent = text;
    this.el.classList.add('show');
    this.w = this.el.offsetWidth;
    this.h = this.el.offsetHeight;
    this.until = performance.now() + seconds * 1000;
  }

  hide(): void {
    this.el.classList.remove('show');
    this.until = 0;
  }

  /** put the bubble's tail at (cx, bottom), page coordinates, kept inside [minX, maxX] */
  place(cx: number, bottom: number, minX = scrollX, maxX = scrollX + document.documentElement.clientWidth): void {
    if (!this.until) return;
    if (performance.now() > this.until) { this.hide(); return; }
    const left = clamp(cx - this.w / 2, minX + 8, Math.max(minX + 8, maxX - this.w - 8));
    this.el.style.transform = `translate(${Math.round(left)}px, ${Math.round(bottom - this.h)}px)`;
    this.el.style.setProperty('--tail', `${clamp(cx - left, 14, this.w - 14)}px`);
  }
}
