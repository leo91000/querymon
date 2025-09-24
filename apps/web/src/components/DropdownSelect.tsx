import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js';

export type DropdownOption<T extends string = string> = {
  value: T;
  label: string;
  icon?: string;
};

interface DropdownSelectProps<T extends string = string> {
  id: string;
  value: T;
  options: DropdownOption<T>[];
  srLabel: string;
  onChange: (value: T) => void;
  align?: 'left' | 'right';
  class?: string;
}

export default function DropdownSelect<T extends string>(props: DropdownSelectProps<T>) {
  const [open, setOpen] = createSignal(false);
  const [active, setActive] = createSignal(0);
  const alignClass = () => (props.align === 'left' ? 'left-0' : 'right-0');
  const currentOption = createMemo(() => {
    if (!props.options.length) return undefined;
    return props.options.find((opt) => opt.value === props.value) ?? props.options[0];
  });
  let rootRef: HTMLDivElement | undefined;
  let triggerRef: HTMLButtonElement | undefined;
  let listRef: HTMLUListElement | undefined;

  function close() {
    setOpen(false);
  }

  function openMenu(initialIndex?: number) {
    const len = props.options.length;
    if (!len) return;
    const fallback = () => {
      const found = props.options.findIndex((opt) => opt.value === props.value);
      return found >= 0 ? found : 0;
    };
    const idx = initialIndex != null ? ((initialIndex % len) + len) % len : fallback();
    setActive(idx);
    setOpen(true);
  }

  function selectValue(next: T) {
    if (next !== props.value) props.onChange(next);
    close();
    triggerRef?.focus();
  }

  function onPointerDown(e: PointerEvent) {
    const target = e.target as Node | null;
    if (!rootRef || !target) return;
    if (!rootRef.contains(target)) close();
  }

  createEffect(() => {
    const len = props.options.length;
    if (!len) return setActive(0);
    const idx = props.options.findIndex((opt) => opt.value === props.value);
    setActive(idx >= 0 ? idx : 0);
  });

  createEffect(() => {
    if (!open() || !props.options.length) return;
    const focusList = () => listRef?.focus();
    if (typeof queueMicrotask === 'function') queueMicrotask(focusList);
    else void Promise.resolve().then(focusList);
  });

  onMount(() => window.addEventListener('pointerdown', onPointerDown));
  onCleanup(() => window.removeEventListener('pointerdown', onPointerDown));

  const optionId = (value: string) => `${props.id}-option-${value}`;

  return (
    <div ref={(el) => (rootRef = el as HTMLDivElement)} class={`relative text-sm ${props.class ?? ''}`}>
      <span class="sr-only" id={`${props.id}-label`}>
        {props.srLabel}
      </span>
      <button
        type="button"
        ref={(el) => (triggerRef = el as HTMLButtonElement)}
        class="flex h-9 w-full cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        aria-haspopup="listbox"
        aria-expanded={open()}
        aria-labelledby={`${props.id}-label`}
        aria-controls={`${props.id}-list`}
        onClick={() => {
          if (open()) close();
          else openMenu();
        }}
        onKeyDown={(e) => {
          const len = props.options.length;
          if (!len) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (open()) setActive((a) => (a + 1) % len);
            else openMenu((active() + 1) % len);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (open()) setActive((a) => (a - 1 + len) % len);
            else openMenu((active() - 1 + len) % len);
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (open()) close();
            else openMenu();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            close();
          }
        }}
      >
        <Show when={currentOption()?.icon}>
          <span aria-hidden="true" class={`text-lg ${currentOption()?.icon ?? ''}`} />
        </Show>
        <span>{currentOption()?.label ?? ''}</span>
        <span aria-hidden="true" class="icon-[ph--caret-down] text-base text-gray-500 dark:text-gray-300" />
      </button>
      <Show when={open() && props.options.length > 0}>
        <ul
          role="listbox"
          aria-labelledby={`${props.id}-label`}
          aria-activedescendant={optionId(props.options[active()].value)}
          id={`${props.id}-list`}
          tabIndex={-1}
          ref={(el) => (listRef = el as HTMLUListElement)}
          class={`absolute ${alignClass()} z-30 mt-1 w-40 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800`}
          onFocusOut={(e) => {
            const next = e.relatedTarget as Node | null;
            if (next && rootRef?.contains(next)) return;
            close();
          }}
          onKeyDown={(e) => {
            const len = props.options.length;
            if (!len) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => (a + 1) % len);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => (a - 1 + len) % len);
            } else if (e.key === 'Home') {
              e.preventDefault();
              setActive(0);
            } else if (e.key === 'End') {
              e.preventDefault();
              setActive(len - 1);
            } else if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              selectValue(props.options[active()].value);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              close();
              triggerRef?.focus();
            }
          }}
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
                <span>{opt.label}</span>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}
