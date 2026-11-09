/**
 * Ruby's game: three moods that drift over time, a level, achievements and
 * hidden bones. It only listens to events (see events.ts) and talks back
 * through Ruby, the toasts and the panel.
 */
import { game as config } from '../../content/ruby';
import { run } from '../../content/run';
import { fill } from '../../lib/rich';
import { on } from '../events';
import { onTick } from '../mascot/loop';
import type { Platform } from '../mascot/types';
import type { Ruby } from '../mascot/ruby';
import type { PageWorld } from '../mascot/world';
import { mountPanel, type Panel } from './panel';
import { clamp100, loadState, saveState, type GameState } from './state';

type MoodKey = keyof GameState['mood'];

export class Game {
  readonly state: GameState;
  readonly world: PageWorld;
  private readonly ruby: Ruby;
  private readonly toast: (msg: string) => void;
  private readonly panel: Panel;
  private saveT = 0;
  private lastPet = 0;

  constructor(world: PageWorld, toast: (msg: string) => void) {
    const { state, minutesAway } = loadState();
    this.state = state;
    this.world = world;
    this.ruby = world.ruby;
    this.toast = toast;
    this.panel = mountPanel(this);

    world.moodSource = () => this.state.mood;
    world.landHooks.push((r, p) => this.sniffForBones(r, p));
    this.listen();
    this.mountBones();
    onTick((dt) => this.tick(dt));
    if (minutesAway > 60 && state.xp > 0) setTimeout(() => !world.hidden && this.ruby.say('cameBack', 2.4), 2600);
  }

  get level(): number {
    return 1 + Math.floor(this.state.xp / config.xpPerLevel);
  }

  // ---------------------------------------------------------------- rewards
  private addXP(n: number): void {
    const before = this.level;
    this.state.xp += n;
    if (this.level > before) {
      this.toast(fill(config.toasts.level, { level: this.level }));
      this.ruby.eyes('happy', 2);
      this.ruby.emitHead('heart', { vy: -16, life: 1.2 });
    }
    this.panel.render();
  }

  award(id: string): void {
    if (this.state.achievements[id]) return;
    const a = config.achievements.find((x) => x.id === id);
    if (!a) return;
    this.state.achievements[id] = Date.now();
    this.toast(fill(config.toasts.achievement, { name: a.name }));
    this.addXP(10);
    saveState(this.state);
  }

  private mood(k: MoodKey, delta: number): void {
    this.state.mood[k] = clamp100(this.state.mood[k] + delta);
  }

  private listen(): void {
    on('ruby', ({ type }) => {
      if (type === 'hello') { this.award('hello'); this.mood('happy', 4); this.addXP(1); }
      if (type === 'pet' && performance.now() - this.lastPet > 2500) { this.lastPet = performance.now(); this.award('pet'); this.mood('happy', 10); this.addXP(2); }
      if (type === 'fetch') { this.award('fetch'); this.mood('happy', 12); this.mood('energy', -6); this.addXP(5); }
      if (type === 'play') { this.mood('happy', 6); this.mood('energy', -3); this.addXP(2); }
      if (type === 'treat') { this.award('treat'); this.mood('full', 35); this.mood('happy', 6); this.addXP(3); }
      if (type === 'fly') { this.award('fly'); this.mood('happy', -3); this.addXP(2); }
      saveState(this.state);
    });
    on('theme', ({ theme }) => { if (theme === 'night') this.award('night'); });
    on('terminal:open', () => this.award('term'));
    on('water:boat', () => { this.award('date'); this.mood('happy', 10); saveState(this.state); });
    on('run:over', ({ metres, bones, skyTurned }) => {
      this.award('run');
      if (skyTurned) this.award('runSky');
      if (bones >= run.bonesGoal) this.award('runBones');
      this.mood('happy', 8);
      this.mood('energy', -10);
      this.addXP(Math.min(10, 1 + Math.floor(metres / 150)));
      saveState(this.state);
    });
  }

  // ---------------------------------------------------------------- feeding and playing
  feed(): void {
    if (this.world.hidden) this.world.setHidden(false);
    if (this.state.mood.full > 88) { this.ruby.say('full', 2); return; }
    if (!this.world.dropTreat()) this.ruby.say('oneAtATime', 1.6);
  }

  // ---------------------------------------------------------------- bones
  private mountBones(): void {
    for (const el of document.querySelectorAll<HTMLElement>('[data-bone]')) {
      if (this.state.bones.includes(el.dataset.bone!)) el.hidden = true;
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.collectBone(el.dataset.bone!, el);
      });
    }
  }

  /** returns false when there is no such bone or it was already found */
  collectBone(id: string, el?: HTMLElement): boolean {
    const bones = config.bones;
    if (!bones.includes(id) || this.state.bones.includes(id)) return false;
    this.state.bones.push(id);
    if (el) { el.classList.add('found'); setTimeout(() => { el.hidden = true; }, 400); }
    const n = this.state.bones.length;
    this.addXP(10);
    if (!this.world.hidden) {
      this.ruby.eyes('happy', 1.5);
      this.ruby.say(n === bones.length ? 'allBones' : 'bone', 1.8);
    }
    if (n === bones.length) {
      this.award('bones');
      this.ruby.wearHat('crown', 120);
      this.ruby.party(5);
    } else this.toast(fill(config.toasts.bone, { n, total: bones.length }));
    saveState(this.state);
    return true;
  }

  /** when she lands near a hidden bone, she sometimes sniffs her way over to it */
  private sniffForBones(r: Ruby, p: Platform): boolean {
    if (Math.random() > 0.45) return false;
    for (const el of document.querySelectorAll<HTMLElement>('[data-bone]:not([hidden])')) {
      const b = el.getBoundingClientRect();
      const bx = b.left + scrollX + b.width / 2, by = b.top + scrollY;
      if (Math.abs(by - p.y) < 220 && Math.abs(bx - r.x) < 420) {
        r.walkTo(bx, 'sniff');
        setTimeout(() => r.say('sniffBone', 2.4), 300);
        return true;
      }
    }
    return false;
  }

  // ---------------------------------------------------------------- time passing
  private tick(dt: number): void {
    const m = this.ruby.mode, task = this.ruby.task;
    this.mood('full', (-100 / (45 * 60)) * dt);      // empty in 45 minutes
    this.mood('happy', (-100 / (30 * 60)) * dt);     // bored in 30 minutes
    if (m === 'sleep') this.mood('energy', 4 * dt);
    else if (m === 'run' || task?.type === 'zoom') this.mood('energy', -1.1 * dt);
    else if (m === 'walk' || m === 'sniff' || m === 'jump') this.mood('energy', -0.15 * dt);
    else this.mood('energy', -0.04 * dt);
    if (m === 'sleep' && this.state.mood.energy > 98 && this.ruby.modeT > 6) this.ruby.wake();
    if ((this.saveT += dt) > 3) { this.saveT = 0; saveState(this.state); }
    this.panel.tick(dt);
  }
}
