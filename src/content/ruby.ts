/**
 * Ruby: everything she says, her little game, and the easter eggs.
 * A line can be a string, or a list of strings to pick one at random.
 */
import { run } from './run';
import type { Achievement } from './types';

type Line = string | string[];

export const ruby = {
  name: 'Ruby',

  lines: {
    intro: "Woof! I'm Ruby.",
    hi: ['Woof!', 'Sniff sniff.', 'I smell a bug.', 'Did someone say walk?', 'Hi! Hi! Hi!', 'Is that a treat?'],
    howl: 'Awooo!',
    back: 'Wait for me!',
    cameBack: ['You came back!', 'I missed you!'],
    thrown: 'Awooo!',
    dizzy: 'Woozy…',
    pet: 'More, please.',
    drive: 'Arrow keys or A and D to walk me. Esc to let me off the leash.',
    got: ['Got it!', 'Mine!'],
    again: ['Again!', 'Again! Again!', 'Throw it!'],
    far: 'Too far…',
    eat: ['Nom.', 'Crunch!', 'Delicious.'],
    full: "I'm full. Let's play instead.",
    oneAtATime: 'One at a time!',
    hungry: ['Treat?', 'Is it dinner time?', 'I could eat.'],
    zoom: 'Zoomies!',
    sleepy: 'Nap time.',
    levelUp: 'Level up!',
    bone: ['A bone!', 'Ooh, a bone!', 'Good find!'],
    allBones: 'You found them all!',
    sniffBone: 'Sniff… something smells good around here.',
    duck: 'Woof! Woof! A duck!',
    boatPasses: ['Hi, you two!', 'Woof! My humans!', 'Bring me a snack!'],
    boatClicked: 'Awww. My humans.',
    /** when she sits down with Mum on the bench */
    mum: ['Time for cuddles!', 'Maybe Mum has a snack for me.'],
    afterRun: ['Phew.', 'That was fun!', 'Again? Again!'],
  } satisfies Record<string, Line>,
};

/** Ruby's game: moods, a level, achievements and hidden bones. */
export const game = {
  xpPerLevel: 30,

  /**
   * Every hidden bone on the page. Each id needs a <Bone id="…"> somewhere in
   * the markup, except 'terminal', which is found with `cat .bone`.
   */
  bones: ['street', 'photo', 'quest', 'tulips', 'terminal'],
  bonesTitle: 'Bones',
  bonesNote: 'Ruby can smell them somewhere on this page.',
  bonesDone: 'All bones found. Ruby wears the crown now.',

  achievementsTitle: 'Achievements',
  achievements: [
    { id: 'hello', name: 'Hello', how: 'Click Ruby', icon: 'chat' },
    { id: 'pet', name: 'Good girl', how: 'Wiggle your cursor over Ruby', icon: 'heart' },
    { id: 'fetch', name: 'Fetch', how: 'Throw the ball and get it back', icon: 'ball' },
    { id: 'treat', name: 'Snack time', how: 'Give Ruby a treat', icon: 'bone' },
    { id: 'fly', name: 'Frequent flyer', how: 'Throw Ruby. Hard.', icon: 'spring' },
    { id: 'night', name: 'Night walk', how: 'Switch to night', icon: 'moon' },
    { id: 'term', name: 'Hacker', how: 'Open the terminal', icon: 'term' },
    { id: 'bones', name: 'Nose for it', how: 'Find all the hidden bones', icon: 'bone' },
    { id: 'run', name: 'Off the leash', how: 'Play a game of Ruby Run', icon: 'game' },
    { id: 'runSky', name: 'Golden hour', how: 'Run Ruby until the sky turns', icon: 'sun' },
    { id: 'runBones', name: 'Bone collector', how: `Grab ${run.bonesGoal} bones in one run`, icon: 'bone' },
    { id: 'date', name: '♥ Daniëlle', how: 'Found the two of us on the water', icon: 'heart', secret: 'Keep an eye on the water' },
  ] satisfies Achievement[],

  panel: {
    treat: 'Give a treat',
    ball: 'Throw the ball',
    run: 'Play Ruby Run',
    moods: { happy: 'Happy', full: 'Fed', energy: 'Rested' },
    nextLevel: '{xp} XP to level {next}',
    secret: 'Secret',
  },

  toasts: {
    achievement: 'Achievement: {name}',
    level: 'Ruby reached level {level}',
    bone: 'Bone {n} of {total}',
    party: 'Party mode',
  },
};

/** The terminal (press ` on the page). */
export const terminal = {
  title: '~/nathanvj',
  prompt: 'ruby@nathanvj ~ $',
  welcome: ['Welcome to nathanvj.com, terminal edition.', 'Type help to see what you can do.'],
  about: [
    'Nathan van Jole.',
    'Writing code since I was twelve, professionally since 2020.',
    'CTO at Advey. Also lead developer at GetMore Systems.',
  ],
  whoami: "You're a visitor. I'm Nathan van Jole.",
  secrets: 'Permission denied. Try the heart at the very bottom of the page.',
  sudo: 'Nice try. This incident will be reported to Ruby.',
  boneFound: 'You found a bone. Ruby is thrilled.',
  boneGone: 'Nothing left in here but crumbs.',
  notFound: '{cmd}: command not found. Type help.',
};
