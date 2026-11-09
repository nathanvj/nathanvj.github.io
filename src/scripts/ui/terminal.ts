/**
 * The terminal: press ` (or the >_ button). Its answers come from the same
 * content files as the page, and it doubles as a remote control for Ruby.
 */
import { build, work } from '../../content/home';
import { game as gameConfig, terminal as copy } from '../../content/ruby';
import { site } from '../../content/site';
import { fill } from '../../lib/rich';
import { emit } from '../events';
import type { Game } from '../game/game';
import type { PageWorld } from '../mascot/world';
import { HAT_NAMES } from '../pixel/hats';
import { setTheme } from './theme';
import type { HatName } from '../../content/types';

type Part = string | [cls: 'ok' | 'dim' | 'hl', text: string] | ['a', text: string, href: string];

interface Deps {
  world: PageWorld;
  game: Game;
  party: () => void;
  /** opens Ruby Run */
  play: () => void;
}

const COMMANDS = ['help', 'about', 'work', 'build', 'contact', 'socials', 'open', 'goto', 'theme', 'ruby', 'treat', 'ball', 'stats', 'play', 'party', 'clear', 'exit', 'ls', 'cat', 'whoami', 'date', 'echo', 'sudo', 'coffee'];
const SECTIONS = ['top', 'about', 'work', 'build', 'contact'];

export function mountTerminal({ world, game, party, play }: Deps): { toggle: () => void } {
  const term = document.querySelector<HTMLElement>('[data-terminal]')!;
  const out = term.querySelector<HTMLElement>('[data-terminal-out]')!;
  const form = term.querySelector<HTMLFormElement>('form')!;
  const input = term.querySelector<HTMLInputElement>('input')!;
  const bar = term.querySelector<HTMLElement>('[data-terminal-bar]')!;
  const toggles = document.querySelectorAll<HTMLElement>('[data-terminal-toggle]');
  const history: string[] = [];
  let hIndex = 0, greeted = false;
  const ruby = world.ruby;

  function print(...parts: Part[]): void {
    const row = document.createElement('div');
    for (const p of parts) {
      if (typeof p === 'string') row.append(p);
      else if (p[0] === 'a') {
        const a = document.createElement('a');
        a.href = p[2];
        a.textContent = p[1];
        if (/^https?:/.test(p[2])) { a.target = '_blank'; a.rel = 'noopener'; }
        row.append(a);
      } else {
        const s = document.createElement('span');
        s.className = p[0];
        s.textContent = p[1];
        row.append(s);
      }
    }
    out.append(row);
    out.scrollTop = out.scrollHeight;
  }

  function run(raw: string, echo = true): void {
    const line = raw.trim();
    if (echo) print(['hl', `${copy.prompt} `], line);
    if (!line) return;
    const [cmd, ...args] = line.split(/\s+/);
    const arg = args.join(' ').toLowerCase();

    switch (cmd.toLowerCase()) {
      case 'help':
        print('Things you can type:');
        ([
          ['about', 'who I am, briefly'], ['work', 'where I work and have worked'], ['build', 'what I build'],
          ['contact', 'how to reach me'], ['socials', 'links elsewhere'], ['open <name>', `open ${site.socials.map((s) => s.id).join(', ')}`],
          ['goto <section>', 'scroll to about, work, build or contact'], ['theme', 'switch between day and night'],
          ['ruby', 'boss Ruby around'], ['treat', 'give Ruby a treat'], ['ball', 'throw the ball'], ['stats', "Ruby's level and moods"],
          ['play', 'Ruby Run, the game'],
          ['party', 'you will see'], ['clear', 'clear the screen'], ['exit', 'close the terminal'],
        ] as const).forEach(([c, d]) => print('  ', ['ok', c.padEnd(16)], ['dim', d]));
        break;
      case 'about':
        copy.about.forEach((l) => print(l));
        break;
      case 'whoami':
        print(copy.whoami);
        break;
      case 'work':
        work.entries.forEach((e) => print('  ', ['dim', e.period.padEnd(24)], ['ok', e.role], ` at ${e.company}`));
        break;
      case 'build':
      case 'stack':
        [build.featured, ...build.abilities].forEach((a) => print('  ', ['ok', a.title]));
        break;
      case 'contact':
        print('Email ', ['a', site.email, `mailto:${site.email}`], '. I usually reply within a day.');
        break;
      case 'socials':
        site.socials.forEach((s) => print('  ', ['ok', s.id.padEnd(10)], ['a', s.url.replace(/^https?:\/\/(www\.)?/, ''), s.url]));
        break;
      case 'open': {
        const s = site.socials.find((x) => x.id === arg);
        if (!s) { print(['dim', 'open what? Try: open github']); break; }
        window.open(s.url, '_blank', 'noopener');
        print(['dim', `Opening ${s.name}…`]);
        break;
      }
      case 'goto':
      case 'cd': {
        const name = arg.replace(/^\.?\/?/, '').replace(/\/$/, '');
        if (cmd === 'cd' && name === 'secrets') { print(copy.secrets); break; }
        const el = SECTIONS.includes(name) ? document.getElementById(name) : null;
        if (!el) { print(['dim', 'Sections: about, work, build, contact']); break; }
        el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        print(['dim', `Going to ${name}.`]);
        break;
      }
      case 'ls': {
        const showHidden = /-\w*a/.test(arg) && !game.state.bones.includes('terminal');
        print(...(showHidden ? [['dim', '.  ..  '], ['hl', '.bone  ']] as Part[] : []), ['ok', 'about.txt  '], ['ok', 'work/  '], ['ok', 'build/  '], ['ok', 'contact.txt  '], ['dim', 'secrets/']);
        break;
      }
      case 'cat':
        if (arg === 'about.txt') run('about', false);
        else if (arg === 'contact.txt') run('contact', false);
        else if (arg === '.bone') print(game.collectBone('terminal') ? ['ok', copy.boneFound] : ['dim', copy.boneGone]);
        else print(['dim', `cat: ${arg || '?'}: no such file`]);
        return;
      case 'theme':
        setTheme(arg === 'day' || arg === 'night' ? arg : undefined);
        print(['dim', `It's ${document.documentElement.dataset.theme} now.`]);
        break;
      case 'treat':
      case 'feed':
        game.feed();
        print(['dim', 'Treat incoming.']);
        break;
      case 'ball':
      case 'fetch':
        world.tossBall();
        print(['dim', 'Thrown.']);
        break;
      case 'stats': {
        const m = game.state.mood, s = game.state;
        const bar = (v: number) => '#'.repeat(Math.round(v / 10)).padEnd(10, '.');
        print(['ok', `Ruby, level ${game.level}`], ['dim', `  (${s.xp} XP)`]);
        print('  happy   ', ['hl', bar(m.happy)]);
        print('  fed     ', ['hl', bar(m.full)]);
        print('  rested  ', ['hl', bar(m.energy)]);
        print(['dim', `  ${Object.keys(s.achievements).length} of ${gameConfig.achievements.length} achievements, ${s.bones.length} of ${gameConfig.bones.length} bones`]);
        break;
      }
      case 'play':
      case 'run':
      case 'game':
        print(['dim', 'Starting Ruby Run…']);
        close();
        play();
        return;
      case 'party':
        party();
        print(['ok', 'Party mode. The Konami code works too.']);
        break;
      case 'ruby':
      case 'mascot':
        commandRuby(arg);
        break;
      case 'woof':
      case 'bark':
        ruby.poke();
        break;
      case 'quack':
      case 'kwak':
        print('Kwak lives in the ditch now. Try clicking the duck.');
        break;
      case 'date':
        print(new Date().toString());
        break;
      case 'echo':
        print(args.join(' '));
        break;
      case 'sudo':
        print(copy.sudo);
        break;
      case 'rm':
        print('Nope.');
        break;
      case 'coffee':
        print('Brewing… done. Back to work.');
        break;
      case 'vim':
      case 'emacs':
        print("You're stuck now. Kidding, type exit.");
        break;
      case 'hi':
      case 'hello':
      case 'hoi':
        print('Hoi! Type help to see what you can do.');
        break;
      case 'clear':
        out.textContent = '';
        return;
      case 'exit':
      case 'close':
      case 'quit':
        close();
        return;
      default:
        print(['dim', fill(copy.notFound, { cmd })]);
    }
  }

  function commandRuby(arg: string): void {
    const [verb, what] = arg.split(/\s+/);
    if (world.hidden && verb !== 'show') { print(['dim', 'Ruby is hidden. Try: ruby show']); return; }
    switch (verb) {
      case undefined:
      case '':
        print(`Ruby is ${ruby.mode === 'held' ? 'being carried' : ruby.mode === 'sleep' ? 'asleep' : 'around'}.`);
        print(['dim', `Try: ruby jump, sit, sleep, wake, howl, dance, come, hat <${HAT_NAMES.join('|')}|off>, hide`]);
        return;
      case 'jump':
        if (ruby.platform) ruby.jumpKey();
        break;
      case 'sit': ruby.setMode('sit', 6); break;
      case 'sleep': ruby.sleep(); break;
      case 'wake': ruby.wake(); break;
      case 'howl': if (ruby.platform) { ruby.setMode('howl', 1.4); ruby.say('howl', 1.4); } break;
      case 'dance': ruby.party(6); break;
      case 'hat':
        if (what === 'off') ruby.wearHat(null);
        else if ((HAT_NAMES as string[]).includes(what)) ruby.wearHat(what as HatName, 1e9);
        else { print(['dim', `Hats: ${HAT_NAMES.join(', ')}, off`]); return; }
        break;
      case 'come': {
        const r = bar.getBoundingClientRect();
        ruby.platform = null;
        ruby.x = r.left + scrollX + r.width / 2;
        ruby.y = r.top + scrollY - 140;
        ruby.vx = ruby.vy = 0;
        ruby.setMode('fall');
        print(['dim', 'Ruby is on the way.']);
        return;
      }
      case 'hide': world.setHidden(true); print(['dim', 'Hidden. ruby show brings her back.']); return;
      case 'show': world.setHidden(false); print(['dim', 'Back again.']); return;
      default:
        print(['dim', `ruby: unknown trick "${verb}"`]);
        return;
    }
    print(['dim', 'Done.']);
  }

  function open(): void {
    term.hidden = false;
    if (!greeted) {
      greeted = true;
      print(copy.welcome[0]);
      print('Type ', ['ok', 'help'], ' to see what you can do.');
      print(' ');
    }
    input.focus();
    world.scan();
    toggles.forEach((t) => t.setAttribute('aria-expanded', 'true'));
    emit('terminal:open', {});
  }

  function close(): void {
    term.hidden = true;
    world.scan();
    toggles.forEach((t) => t.setAttribute('aria-expanded', 'false'));
    toggles[0]?.focus();
  }

  const toggle = () => (term.hidden ? open() : close());

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value;
    if (v.trim()) history.push(v);
    hIndex = history.length;
    input.value = '';
    run(v);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && history.length) { hIndex = Math.max(0, hIndex - 1); input.value = history[hIndex]; e.preventDefault(); }
    else if (e.key === 'ArrowDown' && history.length) { hIndex = Math.min(history.length, hIndex + 1); input.value = history[hIndex] ?? ''; e.preventDefault(); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const v = input.value.trim().toLowerCase(), hits = COMMANDS.filter((c) => c.startsWith(v));
      if (v && hits.length === 1) input.value = `${hits[0]} `;
      else if (v && hits.length > 1) print(['dim', hits.join('  ')]);
    } else if (e.key === 'Escape') close();
  });

  term.querySelector('[data-terminal-close]')!.addEventListener('click', close);
  toggles.forEach((t) => t.addEventListener('click', toggle));

  document.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement | null;
    const typingElsewhere = t && /^(INPUT|TEXTAREA)$/.test(t.tagName) && t !== input;
    if ((e.key === '`' || e.key === '~') && !typingElsewhere) {
      e.preventDefault();
      toggle();
    }
  });

  // drag the window by its title bar
  bar.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const r = term.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    bar.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const x = Math.max(0, Math.min(innerWidth - r.width, ev.clientX - dx));
      const y = Math.max(0, Math.min(innerHeight - 40, ev.clientY - dy));
      Object.assign(term.style, { left: `${x}px`, top: `${y}px`, right: 'auto', bottom: 'auto' });
    };
    const up = () => { bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
  });

  return { toggle };
}
