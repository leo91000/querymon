import { createSignal } from 'solid-js';

export type Theme = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'theme';
const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

const [theme, setThemeSignal] = createSignal<Theme>('system');

function apply(themeValue: Theme) {
  const dark = themeValue === 'dark' || (themeValue === 'system' && !!mq?.matches);
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  // Also set data attribute so CSS or third-party libs can hook into it
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
}

export function setTheme(next: Theme) {
  setThemeSignal(next);
  localStorage.setItem(STORAGE_KEY, next);
  apply(next);
}

export function getTheme() {
  return theme();
}

export function initTheme() {
  const saved = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'system';
  setThemeSignal(saved);
  apply(saved);
  if (mq) {
    const listener = () => { if (theme() === 'system') apply('system'); };
    // Persist listener without relying on Solid lifecycle
    mq.addEventListener?.('change', listener);
    // No cleanup needed in SPA lifetime; harmless
  }
}
