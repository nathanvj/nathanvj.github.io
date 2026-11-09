/**
 * Day and night. The first paint is decided by an inline script in Base.astro
 * (saved choice, else the system setting); this handles the toggle afterwards.
 */
import { emit } from '../events';

const KEY = 'nathanvj:theme';

export type Theme = 'day' | 'night';

export const currentTheme = (): Theme => (document.documentElement.dataset.theme === 'night' ? 'night' : 'day');

export function setTheme(theme?: Theme): void {
  const next = theme ?? (currentTheme() === 'night' ? 'day' : 'night');
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(KEY, next); } catch { /* private mode */ }
  document.querySelectorAll('[data-theme-toggle]').forEach((b) => b.setAttribute('aria-label', next === 'night' ? 'Switch to day' : 'Switch to night'));
  emit('theme', { theme: next });
}

export function mountTheme(): void {
  document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
    b.setAttribute('aria-label', currentTheme() === 'night' ? 'Switch to day' : 'Switch to night');
    b.addEventListener('click', () => setTheme());
  });
}
