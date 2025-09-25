import { createRoot, createSignal } from 'solid-js';

export type Theme = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'theme';
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
        localStorage.setItem(STORAGE_KEY, next);
        apply(next);
    };

    const init = () => {
        const saved = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'system';
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

export function setTheme(next: Theme) {
    return themeStore.setTheme(next);
}

export function getTheme() {
    return themeStore.getTheme();
}

export function initTheme() {
    return themeStore.init();
}
