import { createSignal, createResource, createRoot } from 'solid-js';
import { flatten, translator, resolveTemplate } from '@solid-primitives/i18n';

export type Locale = 'en' | 'fr' | 'jp';

const i18n = createRoot(() => {
  const [locale, setLocale] = createSignal<Locale>('en');
  const [dict] = createResource(locale, async (loc) => {
    const res = await fetch(`/locales/${loc}/common.json`);
    const json = await res.json();
    return flatten(json);
  });

  const translate = translator(dict, resolveTemplate);

  const changeLocale = async (next: Locale) => {
    setLocale(next);
    localStorage.setItem('locale', next);
    document.documentElement.lang = next === 'jp' ? 'ja' : next;
  };

  const init = () => {
    const saved = localStorage.getItem('locale') as Locale | null;
    const initial: Locale = saved && ['en', 'fr', 'jp'].includes(saved) ? saved :
      ((navigator?.language || 'en').startsWith('fr') ? 'fr' : (navigator?.language || 'en').startsWith('ja') ? 'jp' : 'en');
    void changeLocale(initial);
  };

  return {
    t: translate,
    getLocale: () => locale(),
    changeLocale,
    init,
  };
});

export const t = i18n.t;
export function getLocale() {
  return i18n.getLocale();
}

export function changeLocale(next: Locale) {
  return i18n.changeLocale(next);
}

export function initI18n() {
  return i18n.init();
}
