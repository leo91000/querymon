import type { Session } from '../services/authClient';
import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import { changeLocale } from '../i18n';
import { authClient } from '../services/authClient';
import { onUserDataUpdate, pullFromRemoteIfLoggedIn, pushToRemoteIfLoggedIn, startUserDataPoll } from '../services/userData';
import { setTheme } from '../theme';
import Tooltip from './Tooltip';

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
    // When authenticated, push current local data and subscribe for remote changes
    onMount(async () => {
        const s = await authClient.getSession();
        const hasUser = Boolean((s as any)?.user || (s as any)?.data?.user);
        if (hasUser) {
            // Pull remote snapshot first so a refresh applies server state
            const snap = await pullFromRemoteIfLoggedIn();
            if (snap) {
                changeLocale(snap.lang, { skipSync: true });
                setTheme(snap.theme, { skipSync: true });
            }
            const offEvt = onUserDataUpdate((data) => {
                changeLocale(data.lang, { skipSync: true });
                setTheme(data.theme, { skipSync: true });
            });
            const stop = startUserDataPoll(60000);
            onCleanup(() => {
                offEvt();
                stop();
            });
            void pushToRemoteIfLoggedIn();
        }
    });

    return (
        <div class="flex items-center gap-2">
            <Show when={!loading()}>
                <Show
                    when={(session() as any)?.user || (session() as any)?.data?.user}
                    fallback={(
                        <Tooltip placement="bottom" content="Sign in">
                            <button
                                aria-label="Sign in"
                                class="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-gray-200 text-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                                onClick={() => {
                                    const appBase = (import.meta.env.VITE_APP_BASE?.replace(/\/?$/, '') || window.location.origin);
                                    authClient.signIn.social({ provider: 'google', callbackURL: `${appBase}/` });
                                }}
                            >
                                <span class="icon-[ph--sign-in]" />
                            </button>
                        </Tooltip>
                    )}
                >
                    <Tooltip placement="bottom" content="Sign out">
                        <button
                            aria-label="Sign out"
                            class="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-gray-200 text-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                            onClick={async () => {
                                await authClient.signOut();
                                setSession(null);
                            }}
                        >
                            <span class="icon-[ph--sign-out]" />
                        </button>
                    </Tooltip>
                </Show>
            </Show>
        </div>
    );
}
