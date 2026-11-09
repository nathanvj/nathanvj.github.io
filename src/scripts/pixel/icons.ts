/**
 * Pixel icons as text templates, turned into crisp inline SVG.
 * Used at build time (Astro components) and in the browser alike: no DOM needed.
 *
 *   o  the current text colour (so icons follow day and night)
 *   x  Dutch orange, the accent
 *   c  cobalt fill      s  light cobalt highlight      w  white
 */
import type { IconName } from '../../content/types';

const grid = (w: number, h: number, f: (x: number, y: number) => string): string[] =>
  Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => f(x, y)).join(''));

/** a proper heater shield: rounded top, tapered point, cobalt fill, lit edge, orange check */
function shield(): string[] {
  const inside = (x: number, y: number): boolean => {
    if (y < 1 || y > 15 || x < 1 || x > 14) return false;
    if (y === 1) return x >= 3 && x <= 12;
    if (y === 2) return x >= 2 && x <= 13;
    if (y <= 9) return true;
    return Math.abs(x + 0.5 - 8) <= 6.6 - (y - 9) * 1.12;
  };
  const check = new Set(['4,8', '5,9', '6,10', '7,9', '8,8', '9,7', '10,6', '11,5', '4,7', '5,8', '6,9', '7,8', '8,7', '9,6', '10,5', '11,4']);
  return grid(16, 16, (x, y) => {
    if (!inside(x, y)) return '.';
    if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) return 'o';
    if (check.has(`${x},${y}`)) return 'x';
    if (!inside(x - 2, y) || !inside(x, y - 2)) return 's';
    return 'c';
  });
}

export const ICONS: Record<IconName, string[]> = {
  shield: shield(),
  cube: ['.....oo.....', '...oo..oo...', '.oo......oo.', 'oo........oo', 'o.oo....oo.o', 'o...oxxo...o', 'o....oo....o', 'o....oo....o', 'o....oo....o', '.oo..oo..oo.', '...oooooo...', '.....oo.....'],
  cap: ['............', '.....oo.....', '...oooooo...', '.oooooooooo.', 'oooooooooooo', '.oooooooooox', '...oooooo..x', '...oooooo..x', '...o....o.xx', '....oooo..xx', '............', '............'],
  chat: ['............', '.oooooooooo.', 'o..........o', 'o.x..x..x..o', 'o..........o', '.ooooooooo..', '..oo........', '..o.........', '............', '............', '............', '............'],
  heart: ['............', '.ooo....ooo.', 'ooxoo..ooooo', 'oxoooooooooo', 'oooooooooooo', '.oooooooooo.', '..oooooooo..', '...oooooo...', '....oooo....', '.....oo.....', '............', '............'],
  bone: ['............', '............', '............', '.oo......oo.', 'oooo....oooo', '.oooooooooo.', '.oooooooooo.', 'oooo....oooo', '.oo......oo.', '............', '............', '............'],
  bolt: ['.......oo...', '......oo....', '.....oo.....', '....oo......', '...oooooo...', '......oo....', '.....oo.....', '....oo......', '...oo.......', '............', '............', '............'],
  spring: ['.....oo.....', '....oooo....', '...o.oo.o...', '.....oo.....', '............', '..xxxxxxxx..', '...o....o...', '..xxxxxxxx..', '...o....o...', '..xxxxxxxx..', '............', '.oooooooooo.'],
  game: ['............', '............', '..oooooooo..', '.oooooooooo.', 'oo.ooooooxoo', 'o...ooooxoxo', 'oo.ooooooxoo', 'oooooooooooo', 'oooo....oooo', '.oo......oo.', '............', '............'],
  term: ['oooooooooooo', 'o..........o', 'o.o........o', 'o..o.......o', 'o...o......o', 'o..o.......o', 'o.o..xxxx..o', 'o..........o', 'oooooooooooo'],
  moon: grid(12, 12, (x, y) => ((x - 5.5) ** 2 + (y - 5.5) ** 2 <= 30 && (x - 8.2) ** 2 + (y - 3.2) ** 2 > 22 ? 'o' : '.')),
  sun: grid(12, 12, (x, y) => {
    const d = Math.hypot(x - 5.5, y - 5.5);
    if (d <= 3.2) return 'x';
    if (d <= 4.2) return 'o';
    const ray = x === 5 || x === 6 || y === 5 || y === 6 || x === y || x + y === 11;
    return ray && d >= 5 && d <= 6.6 ? 'o' : '.';
  }),
  ball: grid(12, 12, (x, y) => {
    const d = Math.hypot(x - 5.5, y - 5.5);
    if (d > 5.3) return '.';
    if (d > 4.2) return 'o';
    return Math.abs(Math.hypot(x - 1.5, y - 5.5) - 4.6) < 0.6 || Math.abs(Math.hypot(x - 9.5, y - 5.5) - 4.6) < 0.6 ? 'o' : 'x';
  }),
  spark: grid(12, 12, (x, y) => {
    const dx = Math.abs(x - 5), dy = Math.abs(y - 6);
    if (dx + dy * 3 <= 5 || dx * 3 + dy <= 5) return 'o';
    const sx = Math.abs(x - 10), sy = Math.abs(y - 1.5);
    return (sx === 0 && sy <= 1.5) || (sy <= 0.5 && sx <= 1) ? 'x' : '.';
  }),
};

const FILL: Record<string, string> = { o: 'currentColor', x: 'var(--orange)', c: '#1f74c8', s: '#9cc6e6', w: '#ffffff' };

/** the icon as an SVG string, sized by CSS */
export function iconSvg(name: IconName): string {
  const rows = ICONS[name];
  const paths: Record<string, string> = {};
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (FILL[ch]) paths[ch] = (paths[ch] ?? '') + `M${x} ${y}h1v1h-1z`;
  }));
  const body = Object.entries(paths).map(([ch, d]) => `<path fill="${FILL[ch]}" d="${d}"/>`).join('');
  return `<svg viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** add a 1px outline (k) around a template, 4-neighbour, the same way sprites are outlined */
export function outlined(rows: string[]): string[] {
  const w = rows[0].length + 2, h = rows.length + 2;
  const at = (x: number, y: number) => rows[y - 1]?.[x - 1] ?? '.';
  return Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => {
    const ch = at(x, y);
    if (ch !== '.') return ch;
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx, y + dy) !== '.') ? 'k' : '.';
  }).join(''));
}

/** any template as a crisp SVG, with explicit colours per character */
export function pixelSvg(rows: string[], fills: Record<string, string>): string {
  const paths: Record<string, string> = {};
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (fills[ch]) paths[ch] = (paths[ch] ?? '') + `M${x} ${y}h1v1h-1z`;
  }));
  const body = Object.entries(paths).map(([ch, d]) => `<path fill="${fills[ch]}" d="${d}"/>`).join('');
  return `<svg viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** the hidden bones, same shape as the bones Ruby digs up */
export const BONE_SVG = pixelSvg(outlined(['.w......w.', 'wwwwwwwwww', '.wwwwwwww.', 'ssssssssss', '.s......s.']), { w: '#ffffff', s: '#d3dbee', k: '#101a52' });
