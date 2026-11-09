/** Smaller painted pieces: the tulip bed in the footer and the corner of a field by the contact form. */
import { on } from '../events';
import { PixelBuffer } from '../pixel/buffer';
import { drawLetter, drawMailbox } from '../pixel/things';
import { mixHex, px, pxSize, rect, rng, scenePalette } from './env';
import { POSTBOX } from './postbox';

/** two rows of tulips in every colour */
export function paintTulips(cv: HTMLCanvasElement): void {
  const S = pxSize(), W = Math.ceil(cv.clientWidth / S), H = 16;
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d')!, P = scenePalette(), r = rng(3);
  c.clearRect(0, 0, W, H);
  const tulip = (x: number, top: number, head: string, stem: string, leaf: boolean) => {
    rect(c, x + 1, top + 3, 1, H - top - 3, stem);
    if (leaf) for (const [dx, y] of [[0, H - 3], [-1, H - 4], [2, H - 2], [3, H - 3]]) px(c, x + dx, y, stem);
    px(c, x, top, head); px(c, x + 2, top, head);
    rect(c, x, top + 1, 3, 2, head);
  };
  for (let x = 1; x < W - 2; x += 3 + Math.floor(r() * 2)) tulip(x, 1 + Math.floor(r() * 3), P.headsBack[Math.floor(r() * P.headsBack.length)], P.stemBack, false);
  for (let x = 0; x < W - 2; x += 4 + Math.floor(r() * 2)) tulip(x, 5 + Math.floor(r() * 4), P.heads[Math.floor(r() * P.heads.length)], P.stem, r() < 0.5);
}

/** the corner of a field by the contact form: grass, a fence, tulips, the mailbox and a letter */
export function paintPostbox(wrap: HTMLElement): void {
  const S = pxSize(), { w: W, h: H, ground } = POSTBOX, P = scenePalette();
  const [field, box, letter] = wrap.querySelectorAll('canvas');
  // the field: grass, a fence, tulips
  field.width = W;
  field.height = H;
  const c = field.getContext('2d')!, r = rng(12);
  c.clearRect(0, 0, W, H);
  // a gentle mound of grass, flat in the middle and sloping away at the ends
  const top = (x: number) => ground + Math.round(((x - W / 2) / (W / 2)) ** 6 * 7);
  for (let x = 0; x < W; x++) {
    rect(c, x, top(x), 1, H - top(x), P.grass);
    px(c, x, top(x), x % 5 === 0 ? P.grassDeep : P.grass);
    if (x % 5 === 2) px(c, x, top(x) - 1, P.grassDeep);
  }
  for (let i = 0; i < 18; i++) { const x = 6 + Math.floor(r() * (W - 12)); px(c, x, top(x) + 2 + Math.floor(r() * (H - top(x) - 3)), r() < 0.6 ? P.cowWhite : P.heads[4]); }
  const rail = mixHex(P.bark, '#ffffff', 0.25);
  for (const y of [48, 54]) { rect(c, 12, y, 33, 1, rail); rect(c, 12, y + 1, 33, 1, P.line); }
  for (const x of [13, 27, 41]) { rect(c, x, 44, 2, ground - 44 + 2, P.bark); rect(c, x - 1, 44, 1, ground - 42, P.line); rect(c, x + 2, 44, 1, ground - 42, P.line); rect(c, x - 1, 43, 4, 1, P.line); }
  for (let i = 0; i < 7; i++) {
    const x = 14 + i * 5 + Math.floor(r() * 2), y = 51 + Math.floor(r() * 3), head = P.heads[Math.floor(r() * P.heads.length)];
    rect(c, x + 1, y + 3, 1, ground - y - 2, P.stem);
    px(c, x, y, head); px(c, x + 2, y, head); rect(c, x, y + 1, 3, 2, head);
  }
  // the mailbox, on its own canvas so it can wobble when a letter goes in
  const mb = new PixelBuffer(64, 72);
  drawMailbox(mb);
  box.width = 64;
  box.height = 72;
  box.getContext('2d')!.drawImage(mb.canvas(), 0, 0);
  // the letter
  const lb = new PixelBuffer(14, 10);
  drawLetter(lb);
  letter.width = 14;
  letter.height = 10;
  letter.getContext('2d')!.drawImage(lb.canvas(), 0, 0);
  const lid = wrap.querySelector<HTMLElement>('[data-mailbox-lid]');
  if (lid) {
    Object.assign(lid.style, { left: `${POSTBOX.lid.x * S}px`, top: `${POSTBOX.lid.y * S}px`, width: `${POSTBOX.lid.w * S}px`, height: `${S}px` });
    lid.dataset.platformOffset = String(S);
  }
}

/** paint them all now, and again on resize or when day turns to night */
export function mountProps(): void {
  const tulips = document.querySelector<HTMLCanvasElement>('[data-tulips]');
  const postbox = document.querySelector<HTMLElement>('[data-postbox]');
  const paint = () => {
    if (tulips) paintTulips(tulips);
    if (postbox) paintPostbox(postbox);
  };
  paint();
  addEventListener('resize', paint);
  on('theme', paint);
}
