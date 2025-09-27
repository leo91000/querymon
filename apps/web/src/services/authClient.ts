import { createAuthClient } from 'better-auth/client';

// Point the client at the API auth routes (same-origin by default; Vercel rewrites /api/* to the API)
const apiBase = (import.meta.env.VITE_API_BASE?.replace(/\/?$/, '')
    || (typeof window !== 'undefined' ? window.location.origin : ''));

export const authClient = createAuthClient({
    baseURL: `${apiBase}/api/auth`,
    fetchOptions: { credentials: 'include' },
});

export type Session = Awaited<ReturnType<typeof authClient.getSession>>;
