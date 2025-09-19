import { For, createEffect, createMemo, createResource, createSignal, onCleanup, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { resourceLabel, type ResourceName, loadSearchIndex } from '../../services/data';
import { t, getLocale } from '../../i18n';

type Entry = { resource: string; id: number | null; name: string; path: string };

async function loadIndex(loc: string): Promise<Entry[]> {
  return loadSearchIndex(loc as any) as unknown as Entry[];
}

export default function GlobalSearch() {
  const [open, setOpen] = createSignal(false);
  const [q, setQ] = createSignal('');
  const [entries] = createResource(() => getLocale(), (loc) => loadIndex(loc));
  const nav = useNavigate();
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

  function matchScore(text: string, term: string): number {
    const t = normalize(text);
    if (t === term) return 3;
    if (t.startsWith(term)) return 2;
    if (t.includes(term)) return 1;
    return 0;
  }

  function scoreEntry(e: any, term: string): number {
    let s = matchScore(e.name || '', term);
    const aliases = Array.isArray(e.aliases) ? e.aliases : [];
    for (const a of aliases) {
      const ms = matchScore(a, term);
      if (ms > 0) s = Math.max(s, ms + 0.25); // boost only when alias matches
    }
    const rw = e.resource === 'type' ? 1.2 : e.resource === 'move' ? 1.1 : e.resource === 'ability' ? 1.05 : 1;
    return s * rw;
  }

  const results = createMemo(() => {
    const term = normalize(q());
    const list = entries() || [];
    if (!term) return [] as Entry[];
    const scored: Array<{ e: Entry; s: number }> = [];
    for (const e of list) {
      const s = scoreEntry(e as any, term);
      if (s > 0) scored.push({ e, s });
    }
    scored.sort((a, b) => b.s - a.s || (a.e.name || '').length - (b.e.name || '').length || (a.e.id ?? 0) - (b.e.id ?? 0));
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
  onMount(() => window.addEventListener('keydown', onKey));
  onCleanup(() => window.removeEventListener('keydown', onKey));

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
    <div class="relative w-full max-w-xl">
      <input
        type="search"
        placeholder={t('search.placeholder')}
        class="h-11 w-full rounded-md border border-gray-300 bg-white px-4 text-base shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
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
