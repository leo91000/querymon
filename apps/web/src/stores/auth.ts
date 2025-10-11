import type { Session } from '../services/authClient';
import { createRoot, createSignal } from 'solid-js';
import { authClient } from '../services/authClient';

/**
 * Global auth store using SolidJS reactive primitives
 * Provides session state and authentication helpers
 */
export const authStore = createRoot(() => {
    const [session, setSession] = createSignal<Session | null>(null);
    const [loading, setLoading] = createSignal(true);

    const isAuthenticated = () => {
        const s = session();
        return Boolean((s as any)?.user || (s as any)?.data?.user);
    };

    const userId = () => {
        const s = session();
        const user = (s as any)?.user || (s as any)?.data?.user;
        return user?.id || null;
    };

    async function refresh() {
        try {
            const s = await authClient.getSession();
            setSession((s as any) ?? null);
        }
        catch (err) {
            console.error('[authStore] refresh failed', err);
            setSession(null);
        }
        finally {
            setLoading(false);
        }
    }

    async function signOut() {
        try {
            await authClient.signOut();
            setSession(null);
        }
        catch (err) {
            console.error('[authStore] signOut failed', err);
        }
    }

    return {
        session,
        loading,
        isAuthenticated,
        userId,
        refresh,
        signOut,
    };
});
