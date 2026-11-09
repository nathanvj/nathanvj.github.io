/**
 * The sprite palette. Sprites store palette indices (C.tan, C.ink, …), never
 * raw colours, so every pixel on the page comes from this one list.
 * Index 0 means transparent.
 */
const COLORS = {
  ink: '#101a52',
  white: '#ffffff',
  mouth: '#7a2414',
  blush: '#f7a28c',
  heart: '#ff4f6d',
  spark: '#ffd23f',

  // Ruby
  tan: '#d08a45',
  tanDeep: '#a8692c',
  tanLight: '#e9b071',
  earDeep: '#8a5221',
  saddle: '#4a372b',
  saddleHi: '#6e5441',
  coatShade: '#dfe3ef',
  tongue: '#ff7f93',
  collar: '#2f2724',
  collarText: '#ece6dc',

  // the ball, treats and bones
  ball: '#ff7a1a',
  ballDeep: '#cf4f08',
  ballSeam: '#fff1dd',
  biscuit: '#e2a85c',
  biscuitDeep: '#b97a33',
  boneShade: '#d3dbee',

  // hats, the duck, the mailbox
  capTop: '#2a3466',
  capBand: '#1a2350',
  gold: '#ffcf3a',
  goldDeep: '#df9512',
  jewel: '#ff4f6d',
  yellow: '#ffd23f',
  yellowDeep: '#eea11c',
  yellowLight: '#fff3b0',
  orange: '#ff7a1a',
  orangeDeep: '#d4520a',
  orangeLight: '#ffb070',
  cobalt: '#3355c8',
  cobaltDeep: '#1f3494',
  steelDeep: '#8797bb',

  // people: Nathan and Daniëlle
  skin: '#f5c9a3',
  skinDeep: '#dc9e7a',
  lip: '#a9523f',
  hair: '#5c3a25',
  hairDeep: '#382114',
  hairLight: '#8a5b39',
  tee: '#6e4d48',
  teeDeep: '#513735',
  teeLight: '#8c6861',
  blonde: '#f2d283',
  blondeDeep: '#c99f4c',
  navy: '#2c3b78',

  // the boat
  wood: '#7b4b2b',
  woodDeep: '#56331f',
  woodLight: '#a87549',

  // Ruby Run: bike-path posts, pigeons, tulips, stroopwafels
  pigeon: '#a7afc6',
  pigeonDeep: '#737c99',
  pigeonNeck: '#5f9f86',
  leaf: '#5d9a5e',
  leafDeep: '#3d7445',
  caramel: '#c26a26',
  /** the outline of obstacles at night, so they read on dark cobbles */
  rim: '#7d93dc',
} as const;

export type Color = keyof typeof COLORS;

const names = Object.keys(COLORS) as Color[];

/** palette index per colour name */
export const C = Object.fromEntries(names.map((n, i) => [n, i + 1])) as Record<Color, number>;

/** RGB per palette index (index 0 is unused: transparent) */
export const RGB: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0],
  ...names.map((n) => {
    const h = COLORS[n];
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] as const;
  }),
];
