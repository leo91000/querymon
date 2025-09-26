import type { AppRouter } from '../../../api/src/trpc/router';
import { createTRPCProxyClient, httpBatchLink, splitLink, wsLink } from '@trpc/client';

export type Lang = 'en' | 'fr' | 'jp';
export type Theme = 'system' | 'light' | 'dark';
export interface UserData { lang: Lang; theme: Theme; favorites: number[] }

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
        return { lang, theme, favorites };
    }
    catch {
        return { lang: 'en', theme: 'system', favorites: [] };
    }
}

export function setLocal(data: UserData) {
    localStorage.setItem(KEY, JSON.stringify(data));
}

export function updateLocal(partial: Partial<UserData>): UserData {
    const cur = getLocal();
    const next = { ...cur, ...partial } as UserData;
    setLocal(next);
    return next;
}

function createClient() {
    const base = (import.meta.env.VITE_API_BASE?.replace(/\/?$/, '') || 'http://localhost:8787');
    const wsBase = (import.meta.env.VITE_API_WS?.replace(/\/?$/, '') || 'ws://localhost:8790');
    const ws = wsLink<AppRouter>({ url: `${wsBase}/trpc` });
    const http = httpBatchLink({
        url: `${base}/trpc`,
        fetch(url, opts) {
            return fetch(url, { ...opts, credentials: 'include' as const });
        },
    });
    return createTRPCProxyClient<AppRouter>({
        links: [splitLink({ condition: op => op.type === 'subscription', true: ws, false: http })],
    });
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

export function subscribeRemote(onData: (d: UserData) => void) {
    try {
        return trpc().userData.onChange.subscribe(undefined, {
            onData(data) {
                setLocal(data);
                onData(data);
            },
            onError() {},
        });
    }
    catch {
        const unsub = () => {};
        return { unsubscribe: unsub } as { unsubscribe: () => void };
    }
}
