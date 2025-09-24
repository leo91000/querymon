import { For, createEffect, createMemo, createResource, createSignal, onCleanup, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { resourceLabel, type ResourceName, loadSearchIndex } from '../../services/data';
import { t, getLocale } from '../../i18n';

type Entry = { resource: string; id: number | null; name: string; path: string; aliases?: string[] };

async function loadIndex(loc: string): Promise<Entry[]> {
  return loadSearchIndex(loc as any) as unknown as Entry[];
}

export default function GlobalSearch() {
  const [open, setOpen] = createSignal(false);
  const [q, setQ] = createSignal('');
  const [shortcutLabel, setShortcutLabel] = createSignal('Ctrl K');
  const [entries] = createResource(() => getLocale(), (loc) => loadIndex(loc));
  const nav = useNavigate();
  let rootRef: HTMLDivElement | undefined;
  let inputRef: HTMLInputElement | undefined;
  let listRef: HTMLUListElement | undefined;
  const [active, setActive] = createSignal(0);

  function normalize(s: string) {
    return s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function matchRank(text: string, term: string): number {
    const t = normalize(text);
    if (!t || !term) return 0;
    if (t === term) return 3; // exact
    if (t.startsWith(term)) return 2; // prefix
    if (t.includes(term)) return 1; // substring
    return 0; // no match
  }

  function resourcePriority(resource: string): number {
    // Prefer Pokémon over others in ties, then moves, abilities, types
    switch (resource) {
      case 'pokemon': return 3;
      case 'move': return 2;
      case 'ability': return 1;
      default: return 0; // type or unknown
    }
  }

  const results = createMemo(() => {
    const term = normalize(q());
    const list = entries() || [];
    if (!term) return [] as Entry[];
    const scored: Array<{ e: Entry; nameRank: number; aliasRank: number; prio: number }> = [];
    for (const e of list as Entry[]) {
      const nameRank = matchRank(e.name || '', term);
      const aliases = Array.isArray(e.aliases) ? e.aliases : [];
      let aliasRank = 0;
      for (const a of aliases) aliasRank = Math.max(aliasRank, matchRank(a, term));
      // Skip entries with no signal at all
      const signal = Math.max(nameRank, aliasRank);
      if (signal === 0) continue;
      scored.push({ e, nameRank, aliasRank, prio: resourcePriority(e.resource) });
    }
    scored.sort((a, b) =>
      // 1) Prefer current-locale name matches first
      b.nameRank - a.nameRank ||
      // 2) Then consider aliases (cross-locale, nicknames)
      b.aliasRank - a.aliasRank ||
      // 3) Prefer Pokémon in ties
      b.prio - a.prio ||
      // 4) Prefer lower Pokédex id (classic expectation)
      (a.e.id ?? Number.MAX_SAFE_INTEGER) - (b.e.id ?? Number.MAX_SAFE_INTEGER) ||
      // 5) Finally, shorter name is a tiny tiebreaker
      (a.e.name || '').length - (b.e.name || '').length
    );
    return scored.slice(0, 20).map((x) => x.e);
  });

  function onKey(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      setOpen(true);
      inputRef?.focus();
      inputRef?.select();
      return;
    }
    if (e.key === 'Escape') setOpen(false);
  }
  function onPointerDown(e: PointerEvent) {
    const target = e.target as Node | null;
    if (!rootRef || !target) return;
    if (!rootRef.contains(target)) setOpen(false);
  }
  onMount(() => {
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointerDown);
    if (typeof navigator !== 'undefined') {
      const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';
      const ua = navigator.userAgent || '';
      const isApple = /mac|iphone|ipad|ipod/i.test(platform) || /mac os x/i.test(ua);
      setShortcutLabel(isApple ? '⌘ K' : 'Ctrl K');
    }
  });
  onCleanup(() => {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('pointerdown', onPointerDown);
  });

  // Reset active index when results change
  createEffect(() => {
    void results();
    setActive(0);
  });

  // Keep active option visible
  createEffect(() => {
    const el = listRef?.children?.[active()] as HTMLElement | undefined;
    el?.scrollIntoView?.({ block: 'nearest' });
  });

  return (
    <div ref={(el) => (rootRef = el as HTMLDivElement)} class="relative w-full max-w-xl">
      <input
        type="search"
        placeholder={t('search.placeholder')}
        class="h-11 w-full rounded-md border border-gray-300 bg-white px-4 pr-16 text-base shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        value={q()}
        ref={(el) => (inputRef = el as HTMLInputElement)}
        onInput={(e) => { setQ(e.currentTarget.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          const len = results().length;
          if (e.key === 'ArrowDown' && len > 0) {
            e.preventDefault();
            setActive((a) => (a + 1) % len);
          } else if (e.key === 'ArrowUp' && len > 0) {
            e.preventDefault();
            setActive((a) => (a - 1 + len) % len);
          } else if (e.key === 'Enter' && len > 0) {
            e.preventDefault();
            const r = results()[active()];
            if (r) {
              setOpen(false);
              nav(r.path);
            }
          }
        }}
      />
      <span
        aria-hidden="true"
        class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none rounded border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
      >
        {shortcutLabel()}
      </span>
      {open() && results().length > 0 && (
        <div class="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <ul ref={(el) => (listRef = el as HTMLUListElement)} class="max-h-80 divide-y divide-gray-100 overflow-auto dark:divide-gray-700" role="listbox">
            <For each={results()}>
              {(r, i) => (
                <li role="option" aria-selected={active() === i()}>
                  <a
                    href={r.path}
                    onClick={(e) => { e.preventDefault(); setOpen(false); nav(r.path); }}
                    onMouseEnter={() => setActive(i())}
                    class={`flex items-center justify-between gap-2 px-3 py-2 text-base hover:bg-gray-50 dark:hover:bg-gray-700/50 ${active() === i() ? 'bg-gray-100 dark:bg-gray-700/60' : ''}`}
                  >
                    <span class="truncate">
                      <span class="font-medium">{r.name}</span>
                      <span class="text-gray-500 dark:text-gray-400"> — {resourceLabel(r.resource as ResourceName)}</span>
                    </span>
                    {r.id != null && (
                      <span class="text-xs text-gray-400 dark:text-gray-500">#{String(r.id)}</span>
                    )}
                  </a>
                </li>
              )}
            </For>
          </ul>
        </div>
      )}
    </div>
  );
}
