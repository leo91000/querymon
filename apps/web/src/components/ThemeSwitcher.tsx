import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import type { Theme } from '../theme';
import { getTheme, setTheme } from '../theme';
import { t } from '../i18n';

const options: { value: Theme; labelKey: string; icon: string }[] = [
  { value: 'system', labelKey: 'theme.system', icon: 'icon-[ph--monitor-duotone]' },
  { value: 'light', labelKey: 'theme.light', icon: 'icon-[ph--sun-duotone]' },
  { value: 'dark', labelKey: 'theme.dark', icon: 'icon-[ph--moon-stars-duotone]' }
];

export default function ThemeSwitcher() {
  const current = createMemo(() => getTheme());
  const [open, setOpen] = createSignal(false);
  const [active, setActive] = createSignal(0);
  const currentOption = createMemo(() => options.find((opt) => opt.value === current()) ?? options[0]);
  const listId = 'theme-switcher-list';
  let rootRef: HTMLDivElement | undefined;
  let triggerRef: HTMLButtonElement | undefined;
  let listRef: HTMLUListElement | undefined;

  function close() {
    setOpen(false);
  }

  function openMenu(initialIndex?: number) {
    const idx =
      initialIndex ??
      (() => {
        const found = options.findIndex((opt) => opt.value === current());
        return found >= 0 ? found : 0;
      })();
    setActive(idx);
    setOpen(true);
  }

  function applyTheme(theme: Theme) {
    setTheme(theme);
    close();
    triggerRef?.focus();
  }

  function onPointerDown(e: PointerEvent) {
    const target = e.target as Node | null;
    if (!rootRef || !target) return;
    if (!rootRef.contains(target)) close();
  }

  createEffect(() => {
    const idx = options.findIndex((opt) => opt.value === current());
    setActive(idx >= 0 ? idx : 0);
  });

  createEffect(() => {
    if (open()) {
      const focusList = () => listRef?.focus();
      if (typeof queueMicrotask === 'function') queueMicrotask(focusList);
      else void Promise.resolve().then(focusList);
    }
  });

  onMount(() => window.addEventListener('pointerdown', onPointerDown));
  onCleanup(() => window.removeEventListener('pointerdown', onPointerDown));

  return (
    <div ref={(el) => (rootRef = el as HTMLDivElement)} class="relative text-sm">
      <span class="sr-only" id="theme-switcher-label">
        {t('theme.mode')}
      </span>
      <button
        type="button"
        ref={(el) => (triggerRef = el as HTMLButtonElement)}
        class="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        aria-haspopup="listbox"
        aria-expanded={open()}
        aria-labelledby="theme-switcher-label"
        aria-controls={listId}
        onClick={() => {
          if (open()) close();
          else openMenu();
        }}
        onKeyDown={(e) => {
          const idx = options.findIndex((opt) => opt.value === current());
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (open()) setActive((a) => (a + 1) % options.length);
            else openMenu(idx >= 0 ? (idx + 1) % options.length : 0);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (open()) setActive((a) => (a - 1 + options.length) % options.length);
            else openMenu(idx >= 0 ? (idx - 1 + options.length) % options.length : options.length - 1);
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
        <span aria-hidden="true" class={`text-lg ${currentOption().icon}`} />
        <span>{t(currentOption().labelKey)}</span>
        <span aria-hidden="true" class="icon-[ph--caret-down] text-base text-gray-500 dark:text-gray-300" />
      </button>
      <Show when={open()}>
        <ul
          role="listbox"
          aria-labelledby="theme-switcher-label"
          aria-activedescendant={`theme-option-${options[active()].value}`}
          id={listId}
          tabIndex={-1}
          ref={(el) => (listRef = el as HTMLUListElement)}
          class="absolute right-0 z-30 mt-1 w-40 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
          onFocusOut={(e) => {
            const next = e.relatedTarget as Node | null;
            if (next && rootRef?.contains(next)) return;
            close();
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => (a + 1) % options.length);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => (a - 1 + options.length) % options.length);
            } else if (e.key === 'Home') {
              e.preventDefault();
              setActive(0);
            } else if (e.key === 'End') {
              e.preventDefault();
              setActive(options.length - 1);
            } else if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              applyTheme(options[active()].value);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              close();
              triggerRef?.focus();
            }
          }}
        >
          <For each={options}>
            {(opt, i) => {
              const id = `theme-option-${opt.value}`;
              return (
                <li
                  id={id}
                  role="option"
                  aria-selected={current() === opt.value}
                  class={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/60 ${active() === i() ? 'bg-gray-100 dark:bg-gray-700/60' : ''}`}
                  onMouseEnter={() => setActive(i())}
                  onClick={() => applyTheme(opt.value)}
                >
                  <span aria-hidden="true" class={`text-lg ${opt.icon}`} />
                  <span>{t(opt.labelKey)}</span>
                </li>
              );
            }}
          </For>
        </ul>
      </Show>
    </div>
  );
}
