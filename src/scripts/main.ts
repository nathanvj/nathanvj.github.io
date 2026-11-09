/**
 * Boots the page, in order:
 *   1. things that only paint (theme toggle, the polder, tulips, mailbox, logos, avatar)
 *   2. Ruby's world, once the fonts are in (so platforms are measured on real text)
 *   3. the game, Ruby Run, the terminal and the easter eggs, which all build on Ruby
 * Everything here is progressive: without JavaScript the page is complete, just still.
 */
import { Game } from './game/game';
import { onTick } from './mascot/loop';
import { PageWorld } from './mascot/world';
import { Landscape } from './scene/landscape';
import { mountRun } from './run/play';
import { reducedMotion } from './scene/env';
import { mountProps } from './scene/props';
import { greetOnce, makeParty, mountAsk, mountWaterLife, mountContact, mountHideToggle, mountLogos, mountPortraits } from './ui/extras';
import { mountTerminal } from './ui/terminal';
import { mountTheme } from './ui/theme';
import { toast } from './ui/toast';

mountTheme();
mountLogos();
mountPortraits();
mountProps();
mountAsk();

const streetHost = document.querySelector<HTMLElement>('[data-ground="street"]')!;
const land = new Landscape(streetHost);
onTick((dt) => land.tick(dt));

async function start(): Promise<void> {
  await document.fonts.ready;
  await new Promise((r) => setTimeout(r, 400));

  const world = new PageWorld();
  const ruby = world.ruby;
  const game = new Game(world, toast);
  const party = makeParty(world);
  // Ruby Run, in the hero: the page's Ruby steps aside while she runs in the game,
  // and is back on the street where the run ended
  let wasHidden = false;
  const rubyRun = mountRun({
    land,
    hat: () => (game.state.achievements.bones ? 'crown' : null),
    onStart: () => { wasHidden = world.hidden; world.setHidden(true); },
    onStop: (x) => {
      if (wasHidden) return;
      world.showOn(streetHost, x);
      setTimeout(() => ruby.say('afterRun'), 600);
    },
  });
  mountTerminal({ world, game, party, play: rubyRun.play });
  mountContact(world);
  mountWaterLife(world, land);
  greetOnce(world);

  // Ruby drops onto the street from the sky; the ball waits a little further along
  world.placeBallOn(streetHost, innerWidth * (innerWidth < 700 ? 0.3 : 0.36));
  ruby.x = Math.round(innerWidth * (innerWidth < 700 ? 0.72 : 0.7));
  if (reducedMotion) {
    ruby.platform = world.find(streetHost) ?? null;
    ruby.y = ruby.platform?.y ?? 0;
    ruby.setMode('idle');
  } else {
    ruby.y = scrollY - 40;
    ruby.vy = 200;
    ruby.setMode('fall');
  }
  mountHideToggle(world);
  onTick((dt) => world.update(dt));
}

void start();
