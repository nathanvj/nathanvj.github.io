/** Tiny effect glyphs (hearts, z's, sparks…) drawn straight onto a canvas, no outline. */

export const GLYPHS = {
  z: ['ooo', '..o', '.o.', 'o..', 'ooo'],
  heart: ['.o.o.', 'ooooo', 'ooooo', '.ooo.', '..o..'],
  spark: ['.o.', 'ooo', '.o.'],
  bang: ['o', 'o', 'o', '.', 'o'],
  puff: ['.oo.', 'oooo', '.oo.'],
  note: ['.oo', '.o.', '.o.', 'oo.', 'oo.'],
  bigHeart: ['.oo.oo.', 'ooooooo', 'ooooooo', '.ooooo.', '..ooo..', '...o...'],
  dot: ['o'],
} as const;

export type GlyphName = keyof typeof GLYPHS;

export function drawGlyph(ctx: CanvasRenderingContext2D, name: GlyphName, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  GLYPHS[name].forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'o') ctx.fillRect(x + i, y + j, 1, 1); }));
}

/** a glyph with a 1px ink outline, for things that float over busy backgrounds */
export function drawOutlinedGlyph(ctx: CanvasRenderingContext2D, name: GlyphName, x: number, y: number, color: string, ink = '#101a52'): void {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) drawGlyph(ctx, name, x + dx, y + dy, ink);
  drawGlyph(ctx, name, x, y, color);
}
