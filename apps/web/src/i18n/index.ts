import { flatten, resolveTemplate, translator } from '@solid-primitives/i18n';
import { createResource, createRoot, createSignal } from 'solid-js';
import { queryClient } from '../queryClient';
import { getLocal, pushToRemoteIfLoggedIn, updateLocal } from '../services/userData';

export type Locale = 'en' | 'fr' | 'jp';

const i18n = createRoot(() => {
    const [locale, setLocale] = createSignal<Locale>('en');
    const [dict] = createResource(locale, async (loc) => {
        // Cache and persist locale dictionaries via TanStack Query for fast switches/offline
        return queryClient.ensureQueryData({
            queryKey: ['i18n', loc, 'common', 'v1'],
            queryFn: async () => {
                const res = await fetch(`/locales/${loc}/common.json`, { cache: 'no-store' });
                if (!res.ok)
                    throw new Error(`Failed to load locale ${loc}`);
                const json = await res.json();
                return flatten(json);
            },
        });
    });

    const translate = translator(dict, resolveTemplate);

    const changeLocale = async (next: Locale, opts?: { skipSync?: boolean }) => {
        setLocale(next);
        document.documentElement.lang = next === 'jp' ? 'ja' : next;
        if (!opts?.skipSync) {
            updateLocal({ lang: next });
            void pushToRemoteIfLoggedIn();
        }
    };

    const init = () => {
        const fromUser = getLocal().lang;
        const initial: Locale = fromUser || ((navigator?.language || 'en').startsWith('fr') ? 'fr' : (navigator?.language || 'en').startsWith('ja') ? 'jp' : 'en');
        void changeLocale(initial, { skipSync: true });
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

export function changeLocale(next: Locale, opts?: { skipSync?: boolean }) {
    return i18n.changeLocale(next, opts);
}

export function initI18n() {
    return i18n.init();
}
