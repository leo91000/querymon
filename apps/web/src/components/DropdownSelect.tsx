import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { Portal } from 'solid-js/web';

export interface DropdownOption<T extends string = string> {
    value: T;
    label: string;
    icon?: string;
}

interface DropdownSelectProps<T extends string = string> {
    id: string;
    value: T;
    options: DropdownOption<T>[];
    srLabel: string;
    onChange: (value: T) => void;
    align?: 'left' | 'right';
    class?: string;
    iconOnly?: boolean; // hide text label on small screens
}

export default function DropdownSelect<T extends string>(props: DropdownSelectProps<T>) {
    const [open, setOpen] = createSignal(false);
    const [active, setActive] = createSignal(0);
    const currentOption = createMemo(() => {
        if (!props.options.length)
            return undefined;
        return props.options.find(opt => opt.value === props.value) ?? props.options[0];
    });
    let rootRef: HTMLDivElement | undefined;
    let triggerRef: HTMLButtonElement | undefined;
    let listRef: HTMLUListElement | undefined;
    const [coords, setCoords] = createSignal<{ top: number; left: number; width: number; placeAbove: boolean }>({ top: 0, left: 0, width: 0, placeAbove: false });
    const [ready, setReady] = createSignal(false);

    function close() {
        setOpen(false);
    }

    function openMenu(initialIndex?: number) {
        const len = props.options.length;
        if (!len)
            return;
        const fallback = () => {
            const found = props.options.findIndex(opt => opt.value === props.value);
            return found >= 0 ? found : 0;
        };
        const idx = initialIndex != null ? ((initialIndex % len) + len) % len : fallback();
        setActive(idx);
        setOpen(true);
    }

    function selectValue(next: T) {
        if (next !== props.value)
            props.onChange(next);
        close();
        triggerRef?.focus();
    }

    function onPointerDown(e: PointerEvent) {
        const target = e.target as Node | null;
        if (!rootRef || !target)
            return;
        const listEl = listRef as unknown as Node | null;
        if (!rootRef.contains(target) && !(listEl && listEl.contains(target)))
            close();
    }

    createEffect(() => {
        const len = props.options.length;
        if (!len)
            return setActive(0);
        const idx = props.options.findIndex(opt => opt.value === props.value);
        setActive(idx >= 0 ? idx : 0);
    });

    createEffect(() => {
        if (!open() || !props.options.length)
            return;
        const focusList = () => listRef?.focus();
        if (typeof queueMicrotask === 'function')
            queueMicrotask(focusList);
        else void Promise.resolve().then(focusList);
    });

    onMount(() => window.addEventListener('pointerdown', onPointerDown));
    onCleanup(() => window.removeEventListener('pointerdown', onPointerDown));

    const optionId = (value: string) => `${props.id}-option-${value}`;

    function reposition() {
        const btn = triggerRef;
        if (!btn)
            return;
        const r = btn.getBoundingClientRect();
        const viewW = window.innerWidth;
        const viewH = window.innerHeight;
        const estWidth = Math.max(r.width, 160);
        const margin = 4;
        // Default below
        let top = r.bottom + margin;
        let placeAbove = false;
        const maxBelow = viewH - r.bottom - margin;
        // If not enough space below but plenty above, flip
        if (maxBelow < 180 && r.top > maxBelow) {
            top = Math.max(margin, r.top - margin); // temp, will adjust after measuring
            placeAbove = true;
        }
        // Horizontal
        let left = r.left;
        if (props.align !== 'left') {
            left = Math.max(8, r.right - estWidth);
        }
        left = Math.min(Math.max(8, left), viewW - estWidth - 8);
        setCoords({ top, left, width: r.width, placeAbove });
        setReady(true);
        // After panel renders, refine for above placement and width
        const alignIsLeft = props.align === 'left';
        queueMicrotask(() => {
            const panel = listRef as HTMLUListElement | undefined;
            if (!panel)
                return;
            const ph = panel.offsetHeight;
            const pw = Math.max(estWidth, panel.offsetWidth);
            let t = top;
            if (placeAbove)
                t = Math.max(8, r.top - ph - margin);
            let l = left;
            if (!alignIsLeft)
                l = Math.max(8, r.right - pw);
            l = Math.min(Math.max(8, l), viewW - pw - 8);
            setCoords({ top: t, left: l, width: r.width, placeAbove });
        });
    }

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

    return (
        <div ref={el => (rootRef = el as HTMLDivElement)} class={`relative text-sm ${props.class ?? ''}`}>
            <span class="sr-only" id={`${props.id}-label`}>
                {props.srLabel}
            </span>
            <button
                type="button"
                ref={el => (triggerRef = el as HTMLButtonElement)}
                class={`flex ${props.iconOnly ? 'h-9 w-9 justify-center px-0' : 'h-9 w-full justify-between px-3'} cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${props.class ?? ''}`}
                aria-haspopup="listbox"
                aria-expanded={open()}
                aria-labelledby={`${props.id}-label`}
                aria-controls={`${props.id}-list`}
                onClick={() => {
                    if (open()) {
                        close();
                    }
                    else {
                        openMenu();
                        reposition();
                    }
                }}
                onKeyDown={(e) => {
                    const len = props.options.length;
                    if (!len)
                        return;
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (open()) {
                            setActive(a => (a + 1) % len);
                        }
                        else {
                            openMenu((active() + 1) % len);
                            reposition();
                        }
                    }
                    else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (open()) {
                            setActive(a => (a - 1 + len) % len);
                        }
                        else {
                            openMenu((active() - 1 + len) % len);
                            reposition();
                        }
                    }
                    else if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (open()) {
                            close();
                        }
                        else {
                            openMenu();
                            reposition();
                        }
                    }
                    else if (e.key === 'Escape') {
                        e.preventDefault();
                        close();
                    }
                }}
            >
                <span class="flex min-w-0 items-center gap-2">
                    <Show when={currentOption()?.icon}>
                        <span aria-hidden="true" class={`text-lg ${currentOption()?.icon ?? ''}`} />
                    </Show>
                    <span class={`truncate ${props.iconOnly ? 'hidden md:inline' : ''}`}>{currentOption()?.label ?? ''}</span>
                </span>
                <span
                    aria-hidden="true"
                    class={`icon-[ph--caret-down] text-base text-gray-500 dark:text-gray-300 ${props.iconOnly ? 'hidden md:inline' : ''}`}
                />
            </button>
            <Show when={open() && props.options.length > 0}>
                <Portal>
                    <ul
                        role="listbox"
                        aria-labelledby={`${props.id}-label`}
                        aria-activedescendant={optionId(props.options[active()].value)}
                        id={`${props.id}-list`}
                        tabIndex={-1}
                        ref={el => (listRef = el as HTMLUListElement)}
                        class="fixed z-[60] overflow-auto rounded-md border border-gray-200 bg-white text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                        style={{
                            'top': `${coords().top}px`,
                            'left': `${coords().left}px`,
                            'min-width': `${coords().width}px`,
                            'max-height': `${Math.max(200, window.innerHeight - coords().top - 12)}px`,
                            'visibility': ready() ? 'visible' : 'hidden',
                        }}
                        onFocusOut={(e) => {
                            const next = e.relatedTarget as Node | null;
                            if (!next) {
                                close();
                                return;
                            }
                            const listEl = listRef as unknown as Node | null;
                            if (next && (rootRef?.contains(next) || (listEl && listEl.contains(next))))
                                return;
                            close();
                        }}
                        onKeyDown={(e) => {
                            const len = props.options.length;
                            if (!len)
                                return;
                            if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setActive(a => (a + 1) % len);
                            }
                            else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setActive(a => (a - 1 + len) % len);
                            }
                            else if (e.key === 'Home') {
                                e.preventDefault();
                                setActive(0);
                            }
                            else if (e.key === 'End') {
                                e.preventDefault();
                                setActive(len - 1);
                            }
                            else if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                selectValue(props.options[active()].value);
                            }
                            else if (e.key === 'Escape') {
                                e.preventDefault();
                                close();
                                triggerRef?.focus();
                            }
                        }}
                        onMouseDown={e => e.preventDefault()}
                    >
                        <For each={props.options}>
                            {(opt, i) => (
                                <li
                                    id={optionId(opt.value)}
                                    role="option"
                                    aria-selected={props.value === opt.value}
                                    class={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/60 ${active() === i() ? 'bg-gray-100 dark:bg-gray-700/60' : ''}`}
                                    onMouseEnter={() => setActive(i())}
                                    onClick={() => selectValue(opt.value)}
                                >
                                    <Show when={opt.icon}>
                                        <span aria-hidden="true" class={`text-lg ${opt.icon ?? ''}`} />
                                    </Show>
                                    <span class="truncate">{opt.label}</span>
                                </li>
                            )}
                        </For>
                    </ul>
                </Portal>
            </Show>
        </div>
    );
}
