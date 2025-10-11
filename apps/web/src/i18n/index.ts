import { flatten, resolveTemplate, translator } from '@solid-primitives/i18n';
import { createEffect, createResource, createRoot, createSignal } from 'solid-js';
import { queryClient } from '../queryClient';
import { userDataStore } from '../stores/userData';

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

    const changeLocale = async (next: Locale) => {
        setLocale(next);
        document.documentElement.lang = next === 'jp' ? 'ja' : next;
        userDataStore.update({ lang: next });
    };

    const init = () => {
        const fromUser = userDataStore.data.lang;
        const initial: Locale = fromUser || ((navigator?.language || 'en').startsWith('fr') ? 'fr' : (navigator?.language || 'en').startsWith('ja') ? 'jp' : 'en');
        setLocale(initial);
        document.documentElement.lang = initial === 'jp' ? 'ja' : initial;
    };

    // Sync locale when userData store changes (e.g., from server)
    createEffect(() => {
        const serverLang = userDataStore.data.lang;
        if (serverLang && serverLang !== locale()) {
            setLocale(serverLang);
            document.documentElement.lang = serverLang === 'jp' ? 'ja' : serverLang;
        }
    });

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
