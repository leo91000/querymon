import { createEffect, createRoot, createSignal } from 'solid-js';
import { userDataStore } from '../stores/userData';

export type Theme = 'system' | 'light' | 'dark';

const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

const themeStore = createRoot(() => {
    const [theme, setThemeSignal] = createSignal<Theme>('system');

    const apply = (themeValue: Theme) => {
        const dark = themeValue === 'dark' || (themeValue === 'system' && !!mq?.matches);
        const root = document.documentElement;
        root.classList.toggle('dark', dark);
        root.setAttribute('data-theme', dark ? 'dark' : 'light');
    };

    const setTheme = (next: Theme) => {
        setThemeSignal(next);
        apply(next);
        userDataStore.update({ theme: next });
    };

    const init = () => {
        const saved = (userDataStore.data.theme ?? 'system') as Theme;
        setThemeSignal(saved);
        apply(saved);
        if (mq) {
            const listener = () => {
                if (theme() === 'system')
                    apply('system');
            };
            mq.addEventListener?.('change', listener);
        }
    };

    // Sync theme when userData store changes (e.g., from server)
    createEffect(() => {
        const serverTheme = userDataStore.data.theme;
        if (serverTheme && serverTheme !== theme()) {
            setThemeSignal(serverTheme);
            apply(serverTheme);
        }
    });

    return {
        getTheme: () => theme(),
        setTheme,
        init,
    };
});

export function setTheme(next: Theme) {
    return themeStore.setTheme(next);
}

export function getTheme() {
    return themeStore.getTheme();
}

export function initTheme() {
    return themeStore.init();
}
