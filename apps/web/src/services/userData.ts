import type { AppRouter } from '../../../api/src/trpc/router';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { getApiBase } from './apiBase';

export type Lang = 'en' | 'fr' | 'jp';
export type Theme = 'system' | 'light' | 'dark';
export interface SpritePref { gen: string; variant: string }
export interface UserData { lang: Lang; theme: Theme; favorites: number[]; sprite?: SpritePref; shinyCustomDelta?: number }

const KEY = 'userData';

export function getLocal(): UserData {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw)
            return { lang: 'en', theme: 'system', favorites: [] };
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
        return { lang: 'en', theme: 'system', favorites: [] };
    }
}

export function setLocal(data: UserData) {
    localStorage.setItem(KEY, JSON.stringify(data));
    try {
        window.dispatchEvent(new CustomEvent<UserData>('userDataUpdated', { detail: data } as any));
    }
    catch {}
}

export function updateLocal(partial: Partial<UserData>): UserData {
    const cur = getLocal();
    const next = { ...cur, ...partial } as UserData;
    setLocal(next);
    return next;
}

function createClient() {
    const base = getApiBase() || (typeof window !== 'undefined' ? window.location.origin : '');
    const http = httpBatchLink({
        url: `${base}/trpc`,
        fetch(url, opts) {
            return fetch(url, { ...opts, credentials: 'include' as const });
        },
    });
    return createTRPCProxyClient<AppRouter>({ links: [http] });
}

let client: ReturnType<typeof createClient> | null = null;
function trpc() {
    client = client || createClient();
    return client;
}

export async function pushToRemoteIfLoggedIn(): Promise<void> {
    try {
        await trpc().userData.set.mutate(getLocal());
    }
    catch {
        // unauthenticated or network
    }
}

// DOM-level helper to listen to local userData changes in-page
export function onUserDataUpdate(fn: (data: UserData) => void): () => void {
    const handler = (e: Event) => {
        const d = (e as CustomEvent<UserData>).detail;
        if (d) {
            fn(d);
        }
    };
    window.addEventListener('userDataUpdated', handler);
    return () => window.removeEventListener('userDataUpdated', handler);
}

export async function pullFromRemoteIfLoggedIn(): Promise<UserData | null> {
    try {
        const data = await trpc().userData.get.query();
        setLocal(data);
        return data;
    }
    catch {
        return null;
    }
}

export function startUserDataPoll(intervalMs = 60000): () => void {
    const tick = async () => {
        const data = await pullFromRemoteIfLoggedIn();
        if (data) {
            setLocal(data);
        }
    };
    const id = setInterval(tick, intervalMs);
    // kick once
    void tick();
    return () => clearInterval(id);
}
