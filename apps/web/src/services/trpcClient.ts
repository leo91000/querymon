import type { AppRouter } from '../../../api/src/trpc/router';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { getApiBase } from './apiBase';

/**
 * Shared tRPC client for API communication
 */
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

export function trpc() {
    client = client || createClient();
    return client;
}
