import { createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { authStore } from '../stores/auth';

export default function ProfileDropdown() {
    const [open, setOpen] = createSignal(false);
    const [coords, setCoords] = createSignal<{ top: number; left: number }>({ top: 0, left: 0 });
    const [ready, setReady] = createSignal(false);

    let rootRef: HTMLDivElement | undefined;
    let triggerRef: HTMLButtonElement | undefined;
    let dropdownRef: HTMLDivElement | undefined;

    function close() {
        setOpen(false);
        setReady(false);
    }

    function reposition() {
        const btn = triggerRef;
        if (!btn)
            return;
        const r = btn.getBoundingClientRect();
        const margin = 4;
        const top = r.bottom + margin;
        const left = r.right - 160; // dropdown width is 160px, align right
        setCoords({ top, left });
        setReady(true);
    }

    function onPointerDown(e: PointerEvent) {
        const target = e.target as Node | null;
        if (!rootRef || !target)
            return;
        const dropdownEl = dropdownRef as unknown as Node | null;
        if (!rootRef.contains(target) && !(dropdownEl && dropdownEl.contains(target)))
            close();
    }

    onMount(() => window.addEventListener('pointerdown', onPointerDown));
    onCleanup(() => window.removeEventListener('pointerdown', onPointerDown));

    function onWindowChange() {
        if (open())
            reposition();
    }
    onMount(() => {
        window.addEventListener('scroll', onWindowChange, true);
        window.addEventListener('resize', onWindowChange);
    });
    onCleanup(() => {
        window.removeEventListener('scroll', onWindowChange, true);
        window.removeEventListener('resize', onWindowChange);
    });

    createEffect(() => {
        if (open()) {
            reposition();
        }
    });

    const userImage = () => {
        const s = authStore.session();
        const user = (s as any)?.user || (s as any)?.data?.user;
        return user?.image || null;
    };

    const userName = () => {
        const s = authStore.session();
        const user = (s as any)?.user || (s as any)?.data?.user;
        return user?.name || user?.email || 'User';
    };

    const userEmail = () => {
        const s = authStore.session();
        const user = (s as any)?.user || (s as any)?.data?.user;
        return user?.email || null;
    };

    return (
        <div ref={el => (rootRef = el as HTMLDivElement)} class="relative">
            <button
                ref={el => (triggerRef = el as HTMLButtonElement)}
                type="button"
                aria-label="User menu"
                aria-haspopup="true"
                aria-expanded={open()}
                class="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-gray-200 text-lg hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                onClick={() => {
                    if (open()) {
                        close();
                    }
                    else {
                        setOpen(true);
                        reposition();
                    }
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        close();
                    }
                    else if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (open()) {
                            close();
                        }
                        else {
                            setOpen(true);
                            reposition();
                        }
                    }
                }}
            >
                <Show
                    when={userImage()}
                    fallback={
                        <span class="icon-[ph--user-circle] text-2xl text-gray-500 dark:text-gray-400" />
                    }
                >
                    <img
                        src={userImage()!}
                        alt={userName()}
                        class="h-full w-full rounded-full object-cover"
                    />
                </Show>
            </button>
            <Show when={open()}>
                <Portal>
                    <div
                        ref={el => (dropdownRef = el as HTMLDivElement)}
                        class="fixed z-[60] w-40 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
                        style={{
                            top: `${coords().top}px`,
                            left: `${coords().left}px`,
                            visibility: ready() ? 'visible' : 'hidden',
                        }}
                    >
                        <div class="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
                            <div class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                                {userName()}
                            </div>
                            <Show when={userEmail()}>
                                <div class="truncate text-xs text-gray-500 dark:text-gray-400">
                                    {userEmail()}
                                </div>
                            </Show>
                        </div>
                        <button
                            type="button"
                            class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/60 hover:cursor-pointer"
                            onClick={async () => {
                                await authStore.signOut();
                                close();
                            }}
                        >
                            <span class="icon-[ph--sign-out] text-base" />
                            <span>Sign out</span>
                        </button>
                    </div>
                </Portal>
            </Show>
        </div>
    );
}
