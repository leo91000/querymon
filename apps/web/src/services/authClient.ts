import { createAuthClient } from 'better-auth/client';

// Point the client at the API auth routes
export const authClient = createAuthClient({
    baseURL: `${import.meta.env.VITE_API_BASE?.replace(/\/?$/, '') || 'http://localhost:8787'}/api/auth`,
    fetchOptions: { credentials: 'include' },
});

export type Session = Awaited<ReturnType<typeof authClient.getSession>>;
