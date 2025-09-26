import { createRoot, createSignal } from 'solid-js';
import { getLocal, pushToRemoteIfLoggedIn, updateLocal } from '../services/userData';

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

    const setTheme = (next: Theme, opts?: { skipSync?: boolean }) => {
        setThemeSignal(next);
        apply(next);
        if (!opts?.skipSync) {
            updateLocal({ theme: next });
            void pushToRemoteIfLoggedIn();
        }
    };

    const init = () => {
        const saved = (getLocal().theme ?? 'system') as Theme;
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

    return {
        getTheme: () => theme(),
        setTheme,
        init,
    };
});

export function setTheme(next: Theme, opts?: { skipSync?: boolean }) {
    return themeStore.setTheme(next, opts);
}

export function getTheme() {
    return themeStore.getTheme();
}

export function initTheme() {
    return themeStore.init();
}
