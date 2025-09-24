import { A, useLocation } from '@solidjs/router';
import { For, Show, createMemo, createResource, createSignal, onCleanup, onMount, createEffect } from 'solid-js';
import Card from '../components/Card';
import Input from '../components/Input';
import { formatName, loadList, resourceLabel, type ResourceName } from '../services/data';
import { t, getLocale } from '../i18n';
import ResourceTabs from '../components/ResourceTabs';
import PokemonCard from '../components/PokemonCard';
import type { Pokemon, PokemonType } from '../types/pokemon';

export default function ResourceList(props: { resource: ResourceName }) {
  const [items] = createResource(
    () => ({ res: props.resource, loc: getLocale() }),
    (key) => loadList(key.res as ResourceName),
  );
  // Aliases removed in new layout to avoid extra fetches; simple name filtering only.
  const [q, setQ] = createSignal('');
  function normalize(s: string) {
    return s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  const filtered = createMemo(() => {
    const term = normalize(q());
    const list = items() || [];
    if (!term) return list;
    const out: typeof list = [] as any;
    for (const it of list) {
      const idStr = String((it as any).id);
      const nameMatch = normalize(it.name).includes(term);
      if (nameMatch) out.push(it);
    }
    return out;
  });

  return (
    <div class="space-y-4">
      <ResourceTabs current={props.resource} />
      <div class="flex items-end justify-between gap-4">
        <h2 class="text-xl font-semibold">{resourceLabel(props.resource)}</h2>
        <div class="w-72">
          {(() => {
            const ph = (() => {
              const base = t('list.filter') as unknown as string;
              const name = resourceLabel(props.resource);
              return typeof base === 'string' ? base.replace('{name}', name) : name;
            })();
            return (
              <Input
                id="filter"
                placeholder={ph}
                value={q()}
                onInput={(e) => setQ(e.currentTarget.value)}
              />
            );
          })()}
        </div>
      </div>
      <Show when={props.resource === 'pokemon'} fallback={
        <Card>
          <ul class="divide-y divide-gray-100 dark:divide-gray-700">
            <For each={filtered()}>
              {(it) => (
                <li>
                  <A
                    href={`/${props.resource}/${it.id}`}
                    class="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/60"
                  >
                    <span class="truncate"><span class="font-medium">{formatName(it.name)}</span> <span class="text-gray-500">#{it.id}</span></span>
                    <span class="text-gray-300">→</span>
                  </A>
                </li>
              )}
            </For>
          </ul>
        </Card>
      }>
        <PokemonGrid items={filtered()} />
      </Show>
    </div>
  );
}

function PokemonGrid(props: { items: Array<{ id: number; name: string; types?: string[]; sprite?: string }> }) {

  function typesOf(it: { types?: string[] }): PokemonType[] {
    return (it.types || [])
      .map((s) => String(s))
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .filter(Boolean) as PokemonType[];
  }

  const cards = createMemo(() => {
    // Names in new pokemons.<loc>.json are already localized
    return (props.items || []).map((it) => ({
      id: it.id,
      name: formatName(it.name),
      types: typesOf(it),
      sprite: it.sprite || '',
      description: '',
    })) as Pokemon[];
  });

  // Infinite scroll: reveal 50-by-50 using an intersection observer on a sentinel
  const PAGE = 50;
  const [limit, setLimit] = createSignal(PAGE);
  let sentinel: HTMLDivElement | undefined;
  let io: IntersectionObserver | undefined;

  const visible = createMemo(() => cards().slice(0, limit()));

  function startObserver() {
    if (io || !sentinel) return;
    io = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (!e?.isIntersecting) return;
      // Grow limit until all loaded
      setLimit((n) => Math.min(cards().length, n + PAGE));
    }, { rootMargin: '600px 0px' });
    io.observe(sentinel);
  }
  onMount(() => startObserver());
  onCleanup(() => io?.disconnect());

  // Reset when the filter changes
  createEffect(() => {
    void cards();
    setLimit(PAGE);
    // re-arm observer in case it was disconnected
    queueMicrotask(() => { io?.disconnect(); io = undefined; startObserver(); });
  });

  return (
    <>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <For each={visible()}>
          {(p, i) => (
            <A href={`/pokemon/${p.id}`} class="block h-full motion-safe:animate-[fade-in-up_0.35s_ease-out] [animation-delay:calc(var(--i)*15ms)]" style={{ '--i': String(i()) }}>
              <PokemonCard pokemon={p} />
            </A>
          )}
        </For>
      </div>
      <div ref={(el) => (sentinel = el as HTMLDivElement)} class="h-10" />
    </>
  );
}
