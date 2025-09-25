import { createSignal, createResource, createRoot } from 'solid-js';
import { flatten, translator, resolveTemplate } from '@solid-primitives/i18n';
import { queryClient } from '../queryClient';

export type Locale = 'en' | 'fr' | 'jp';

const i18n = createRoot(() => {
  const [locale, setLocale] = createSignal<Locale>('en');
  const [dict] = createResource(locale, async (loc) => {
    // Cache and persist locale dictionaries via TanStack Query for fast switches/offline
    return queryClient.ensureQueryData({
      queryKey: ['i18n', loc, 'common', 'v1'],
      queryFn: async () => {
        const res = await fetch(`/locales/${loc}/common.json`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load locale ${loc}`);
        const json = await res.json();
        return flatten(json);
      },
    });
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

// Typed translation helper: always return string
export function t(key: string, params?: Record<string, string | number>): string {
  return (i18n.t as any)(key, params) as string;
}
export function getLocale() {
  return i18n.getLocale();
}

export function changeLocale(next: Locale) {
  return i18n.changeLocale(next);
}

export function initI18n() {
  return i18n.init();
}
