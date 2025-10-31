import { onMount, Show } from 'solid-js';
import { authClient } from '../services/authClient';
import { authStore } from '../stores/auth';
import { useUserData } from '../stores/userData';
import ProfileDropdown from './ProfileDropdown';
import Tooltip from './Tooltip';

export default function AuthButton() {
    // Initialize auth store on mount
    onMount(() => {
        void authStore.refresh();
    });

    // Initialize userData sync (called for side effects)
    useUserData();

    return (
        <div class="flex items-center gap-2">
            <Show when={!authStore.loading()}>
                <Show
                    when={authStore.isAuthenticated()}
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
                    <ProfileDropdown />
                </Show>
            </Show>
        </div>
    );
}
