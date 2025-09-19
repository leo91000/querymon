import { For, createMemo, createResource, createSignal, onCleanup, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { resourceLabel, type ResourceName } from '../../services/data';
import { t } from '../../i18n';

type Entry = { resource: string; id: number | null; name: string; path: string };

async function loadIndex(): Promise<Entry[]> {
  const res = await fetch('/data/pokeapi/search-index.json');
  if (!res.ok) throw new Error('Failed to load search index');
  return res.json();
}

export default function GlobalSearch() {
  const [open, setOpen] = createSignal(false);
  const [q, setQ] = createSignal('');
  const [entries] = createResource(loadIndex);
  const nav = useNavigate();

  const results = createMemo(() => {
    const term = q().trim().toLowerCase();
    const list = entries() || [];
    if (!term) return [] as Entry[];
    const out: Entry[] = [];
    for (const e of list) {
      if (e.name?.toLowerCase().includes(term)) out.push(e);
      if (out.length >= 12) break;
    }
    return out;
  });

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') setOpen(false);
  }
  onMount(() => window.addEventListener('keydown', onKey));
  onCleanup(() => window.removeEventListener('keydown', onKey));

  return (
    <div class="relative w-full max-w-xl">
      <input
        type="search"
        placeholder={t('search.placeholder')}
        class="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        value={q()}
        onInput={(e) => { setQ(e.currentTarget.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open() && results().length > 0 && (
        <div class="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <ul class="max-h-80 divide-y divide-gray-100 overflow-auto dark:divide-gray-700">
            <For each={results()}>
              {(r) => (
                <li>
                  <a
                    href={r.path}
                    onClick={(e) => { e.preventDefault(); setOpen(false); nav(r.path); }}
                    class="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50"
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
