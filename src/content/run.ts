/**
 * Ruby Run, the endless runner in the hero: every word in it, and the few
 * numbers worth tuning. The best score stays in the visitor's browser
 * (localStorage); nothing is sent anywhere.
 * A line can be a string, or a list of strings to pick one at random.
 */

export const run = {
  title: 'Ruby Run',
  /** the button under the hero intro */
  play: 'Play Ruby Run',
  intro: 'Run Ruby down the bike path. Jump the posts, bikes and cyclists, duck under the pigeons, grab every bone.',
  controls: {
    keys: 'Space or ↑ to jump, hold for higher, press again in the air for a double jump. ↓ to duck.',
    touch: 'Tap to jump, hold for higher, tap again in the air for a double jump. Swipe down to duck.',
  },
  /** the first time a low pigeon comes along */
  duckHint: { keys: 'Duck! Press ↓', touch: 'Duck! Swipe down' },

  start: 'Start running',
  again: 'Run again',
  resume: 'Keep running',
  paused: 'Paused',
  pause: 'Pause',
  stop: 'Stop playing',
  share: 'Share score',
  copied: 'Copied',

  best: 'Best {m} m',
  newBest: 'New best',
  result: '{m} m, {bones} bones',

  /** what she ran into, as the title of the game over card */
  crash: {
    bollard: ['Bonk. Bike-path post.', 'Who puts a post in a bike path?'],
    bike: ['Not the bikes!', 'Someone parked right there.'],
    planter: ['Straight into the tulips.', 'Sorry, tulips.'],
    pigeon: ['Pigeon!', 'That pigeon came out of nowhere.'],
    cyclist: ['Tring tring! Too late.', 'The cyclist always wins.'],
  },

  /** what Ruby says on the way */
  says: {
    start: ['Off the leash!', 'Zoomies!', "Let's go!"],
    night: 'The stars are out.',
    morning: 'Good morning!',
    boat: ['My humans!', 'Hi, you two!'],
    waffle: 'Stroopwafel! Zoomies!',
  },
  /** at these distances (in metres) she lets you know how far you got */
  milestones: [
    [250, 'Past the first windmill!'],
    [500, 'Smell those tulips!'],
    [1000, 'How big is this polder?'],
    [1500, 'Is this Friesland?'],
    [2500, 'Germany is that way.'],
  ] as [number, string][],

  shareText: 'I ran {m} m with Ruby and grabbed {bones} bones. {url}',

  /** bones in one run for the "Bone collector" achievement */
  bonesGoal: 25,
};
