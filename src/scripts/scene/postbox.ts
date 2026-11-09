/**
 * The corner of a field by the contact form: grass, a wooden fence, tulips,
 * the orange mailbox, and a letter waiting on the grass. Its measurements in
 * native pixels, shared by the painter (props.ts), the markup (Contact.astro)
 * and the letter's flight (ui/extras.ts). No DOM in here, so the build can read it too.
 */
export const POSTBOX = {
  w: 120,
  h: 72,
  /** the row the grass starts on */
  ground: 60,
  /** the mailbox sprite (64×72) sits here, its pole in the grass; its lid is Ruby's ledge */
  box: { x: 56, y: -4, w: 64, h: 72 },
  lid: { x: 71, y: 4, w: 34 },
  /** where letters go in */
  slot: { x: 87, y: 14 },
  /** where the letter lies waiting */
  letter: { x: 24, y: 55, w: 14, h: 10 },
} as const;
