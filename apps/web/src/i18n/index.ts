import { createSignal, createResource, onMount } from 'solid-js';
import { flatten, translator, resolveTemplate } from '@solid-primitives/i18n';

export type Locale = 'en' | 'fr' | 'jp';

const [locale, setLocale] = createSignal<Locale>('en');
const [dict] = createResource(locale, async (loc) => {
  const res = await fetch(`/locales/${loc}/common.json`);
  const json = await res.json();
  return flatten(json);
});

export const t = translator(dict, resolveTemplate);

export function getLocale() {
  return locale();
}

export async function changeLocale(next: Locale) {
  setLocale(next);
  localStorage.setItem('locale', next);
  document.documentElement.lang = next === 'jp' ? 'ja' : next;
}

export function initI18n() {
  const saved = localStorage.getItem('locale') as Locale | null;
  const initial: Locale = saved && ['en', 'fr', 'jp'].includes(saved) ? saved :
    ((navigator?.language || 'en').startsWith('fr') ? 'fr' : (navigator?.language || 'en').startsWith('ja') ? 'jp' : 'en');
  void changeLocale(initial);
}
