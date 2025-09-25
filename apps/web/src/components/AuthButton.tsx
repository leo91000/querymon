import type { Session } from '../services/authClient';
import { createSignal, onMount, Show } from 'solid-js';
import { authClient } from '../services/authClient';
import { syncLocalFavoritesToRemote } from '../services/favoriteSync';

export default function AuthButton() {
    const [session, setSession] = createSignal<Session | null>(null);
    const [loading, setLoading] = createSignal(true);

    async function refresh() {
        try {
            const s = await authClient.getSession();
            setSession((s as any) ?? null);
        }
        finally {
            setLoading(false);
        }
    }

    onMount(() => {
        void refresh();
    });
    // On initial authenticated load, try to push any local favorites to remote
    onMount(async () => {
        const s = await authClient.getSession();
        const hasUser = Boolean((s as any)?.user || (s as any)?.data?.user);
        if (hasUser) {
            // ensure per-user DB exists
            try {
                await fetch(`${import.meta.env.VITE_API_BASE?.replace(/\/?$/, '') || 'http://localhost:8787'}/api/provision`, {
                    method: 'POST',
                    credentials: 'include',
                });
            }
            catch { }
            void syncLocalFavoritesToRemote();
        }
    });

    return (
        <div class="flex items-center gap-2">
            <Show when={!loading()}>
                <Show
                    when={(session() as any)?.user || (session() as any)?.data?.user}
                    fallback={(
                        <button
                            class="rounded-full border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                            onClick={() => {
                                const appBase = (import.meta.env.VITE_APP_BASE?.replace(/\/?$/, '') || window.location.origin);
                                authClient.signIn.social({ provider: 'google', callbackURL: `${appBase}/` });
                            }}
                        >
                            Sign in
                        </button>
                    )}
                >
                    <button
                        class="rounded-full border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                        onClick={async () => {
                            await authClient.signOut();
                            setSession(null);
                        }}
                    >
                        Sign out
                    </button>
                </Show>
            </Show>
        </div>
    );
}
