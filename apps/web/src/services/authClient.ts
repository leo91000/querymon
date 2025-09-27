import { createAuthClient } from 'better-auth/client';
import { getApiBase } from './apiBase';

// Point the client at the API auth routes (defaults to local API during dev, falls back to same-origin elsewhere)
const apiBase = getApiBase();
const resolvedBase = apiBase || (typeof window !== 'undefined' ? window.location.origin : '');

export const authClient = createAuthClient({
    baseURL: `${resolvedBase}/api/auth`,
    fetchOptions: { credentials: 'include' },
});

export type Session = Awaited<ReturnType<typeof authClient.getSession>>;
