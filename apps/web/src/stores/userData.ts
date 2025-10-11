import { createEffect, createRoot } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { trpc } from '../services/trpcClient';
import { authStore } from './auth';

export type Lang = 'en' | 'fr' | 'jp';
export type Theme = 'system' | 'light' | 'dark';
export interface SpritePref { gen: string; variant: string }
export interface UserData {
    lang: Lang;
    theme: Theme;
    favorites: number[];
    sprite?: SpritePref;
    shinyCustomDelta?: number;
}

const STORAGE_KEY = 'userData';
const DEFAULT_DATA: UserData = { lang: 'en', theme: 'system', favorites: [] };

// Load from localStorage
function loadFromStorage(): UserData {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return DEFAULT_DATA;
        const parsed = JSON.parse(raw);
        const lang: Lang = parsed.lang ?? 'en';
        const theme: Theme = parsed.theme ?? 'system';
        const favorites: number[] = Array.isArray(parsed.favorites) ? parsed.favorites : [];
        const sprite: SpritePref | undefined = (parsed.sprite && typeof parsed.sprite === 'object' && typeof parsed.sprite.gen === 'string' && typeof parsed.sprite.variant === 'string')
            ? { gen: parsed.sprite.gen, variant: parsed.sprite.variant }
            : undefined;
        const shinyCustomDelta: number | undefined = (typeof parsed.shinyCustomDelta === 'number' && parsed.shinyCustomDelta > 0)
            ? Math.floor(parsed.shinyCustomDelta)
            : undefined;
        return { lang, theme, favorites, sprite, shinyCustomDelta };
    }
    catch {
        return DEFAULT_DATA;
    }
}

// Save to localStorage
function saveToStorage(data: UserData) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    catch (err) {
        console.error('[userDataStore] localStorage save failed', err);
    }
}

/**
 * Global userData store using SolidJS Store
 * Reactive, persisted to localStorage, synced to cloud when authenticated
 */
export const userDataStore = createRoot(() => {
    const [store, setStore] = createStore<UserData>(loadFromStorage());
    let syncInterval: ReturnType<typeof setInterval> | null = null;

    // Auto-save to localStorage whenever store changes
    createEffect(() => {
        const snapshot = { ...store };
        saveToStorage(snapshot);
    });

    // Push to server (with retry on failure)
    async function pushToServer(retries = 3): Promise<void> {
        if (!authStore.isAuthenticated())
            return;
        try {
            const data = await trpc().userData.set.mutate(store);
            // Update store with server response to ensure consistency
            setStore(reconcile(data));
        }
        catch (err) {
            console.error('[userDataStore] push failed', err);
            if (retries > 0) {
                // Retry with exponential backoff
                setTimeout(() => pushToServer(retries - 1), 1000 * (4 - retries));
            }
        }
    }

    // Pull from server
    async function pullFromServer(): Promise<void> {
        if (!authStore.isAuthenticated())
            return;
        try {
            const data = await trpc().userData.get.query();
            setStore(reconcile(data));
        }
        catch (err) {
            console.error('[userDataStore] pull failed', err);
        }
    }

    // Start periodic sync (every 5 minutes when authenticated)
    function startSync() {
        if (syncInterval)
            return;
        syncInterval = setInterval(() => {
            if (authStore.isAuthenticated()) {
                void pullFromServer();
            }
        }, 5 * 60 * 1000);
    }

    // Stop sync
    function stopSync() {
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
        }
    }

    // Auto-start/stop sync based on auth state
    createEffect(() => {
        if (authStore.isAuthenticated()) {
            void pullFromServer(); // Initial fetch
            startSync();
        }
        else {
            stopSync();
        }
    });

    return {
        // Read-only access to store (reactive)
        get data() {
            return store;
        },
        // Update store locally and sync to server
        update(partial: Partial<UserData>) {
            setStore(reconcile({ ...store, ...partial }));
            void pushToServer();
        },
        // Replace entire store (used when syncing from server)
        set(data: UserData) {
            setStore(reconcile(data));
        },
    };
});

/**
 * Hook for components to access userData store
 * Can be called from any component - no provider needed
 */
export function useUserData() {
    return {
        // Reactive store (use this in your components)
        data: userDataStore.data,
        // Update method
        update: (partial: Partial<UserData>) => userDataStore.update(partial),
    };
}
