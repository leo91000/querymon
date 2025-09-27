import type { ResourceName } from '../services/data';
import type { Pokemon, PokemonType } from '../types/pokemon';
import { createAutoAnimate } from '@formkit/auto-animate/solid';
import { A } from '@solidjs/router';
import { createEffect, createMemo, createResource, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import Card from '../components/Card';
import Input from '../components/Input';
import PokemonCard from '../components/PokemonCard';
import ResourceTabs from '../components/ResourceTabs';
import Tooltip from '../components/Tooltip';
import { getLocale, t } from '../i18n';
import { formatName, loadList, resourceLabel } from '../services/data';
import { getLocal, onUserDataUpdate, pushToRemoteIfLoggedIn, setLocal } from '../services/userData';

export default function ResourceList(props: { resource: ResourceName }) {
    const [items] = createResource(
        () => ({ res: props.resource, loc: getLocale() }),
        key => loadList(key.res as ResourceName),
    );
    const [favorites, setFavorites] = createSignal<number[]>(getLocal().favorites || []);
    // Auto‑animate favorites list container
    const [favParent] = createAutoAnimate();
    onMount(() => {
        const off = onUserDataUpdate(d => setFavorites(d.favorites || []));
        onCleanup(() => off());
    });

    async function toggleFavorite(id: number) {
        const cur = getLocal();
        const next = cur.favorites.includes(id)
            ? cur.favorites.filter(x => x !== id)
            : [...cur.favorites, id];
        setLocal({ ...cur, favorites: next });
        setFavorites(next);
        void pushToRemoteIfLoggedIn();
    }
    // Aliases removed in new layout to avoid extra fetches; simple name filtering only.
    const [q, setQ] = createSignal('');
    function normalize(s: string) {
        return s
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[\u0300-\u036F]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    const filtered = createMemo(() => {
        const term = normalize(q());
        const list = items() || [];
        if (!term)
            return list;
        const out: typeof list = [] as any;
        for (const it of list) {
            const nameMatch = normalize(it.name).includes(term);
            if (nameMatch)
                out.push(it);
        }
        return out;
    });

    return (
        <div class="space-y-4">
            <ResourceTabs current={props.resource} />
            <Show when={props.resource === 'pokemon'}>
                <Card>
                    <div class="mb-2 flex items-center justify-between">
                        <h3 class="text-sm font-semibold tracking-wide text-gray-500">{t('pokemon.favorites') || 'Favorites'}</h3>
                        <span class="text-xs text-gray-400">{favorites().length}</span>
                    </div>
                    <div class="flex flex-wrap gap-3 px-0 py-1 overflow-visible" ref={favParent}>
                        <For each={(items() || []).filter(it => favorites().includes(it.id))}>
                            {p => (
                                <A
                                    href={`/pokemon/${p.id}`}
                                    class="group relative flex min-w-[200px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
                                >
                                    <div class="absolute right-1 top-1 z-10 md:right-2 md:top-2">
                                        <Tooltip placement="bottom" content={favorites().includes(p.id) ? 'Remove favorite' : 'Add favorite'}>
                                            <button
                                                type="button"
                                                class={`inline-flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-gray-100 dark:hover:bg-gray-700/60 cursor-pointer ${favorites().includes(p.id) ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500 dark:text-gray-300'}`}
                                                aria-pressed={favorites().includes(p.id)}
                                                aria-label={favorites().includes(p.id) ? 'Remove from favorites' : 'Add to favorites'}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    toggleFavorite(p.id);
                                                }}
                                            >
                                                <span class={`${favorites().includes(p.id) ? 'icon-[ph--heart-fill]' : 'icon-[ph--heart]'} text-lg`} />
                                            </button>
                                        </Tooltip>
                                    </div>
                                    <img src={String(p.sprite || '')} alt={p.name} width={40} height={40} class="h-10 w-10 rounded bg-gray-100 object-contain dark:bg-gray-700" loading="lazy" />
                                    <span class="truncate pr-6 font-medium group-hover:underline">{formatName(p.name)}</span>
                                </A>
                            )}
                        </For>
                        <Show when={(items() || []).filter(it => favorites().includes(it.id)).length === 0}>
                            <div class="text-sm text-gray-400">{t('pokemon.noFavorites') || 'No favorites yet'}</div>
                        </Show>
                    </div>
                </Card>
            </Show>
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
                                onInput={e => setQ(e.currentTarget.value)}
                            />
                        );
                    })()}
                </div>
            </div>
            <Show
                when={props.resource === 'pokemon'}
                fallback={(
                    <Card>
                        <ul class="divide-y divide-gray-100 dark:divide-gray-700">
                            <For each={filtered()}>
                                {it => (
                                    <li>
                                        <A
                                            href={`/${props.resource}/${it.id}`}
                                            class="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/60"
                                        >
                                            <span class="truncate">
                                                <span class="font-medium">{formatName(it.name)}</span>
                                                {' '}
                                                <span class="text-gray-500">
                                                    #
                                                    {it.id}
                                                </span>
                                            </span>
                                            <span class="text-gray-300">→</span>
                                        </A>
                                    </li>
                                )}
                            </For>
                        </ul>
                    </Card>
                )}
            >
                <PokemonGrid items={filtered()} favorites={favorites()} onToggleFavorite={toggleFavorite} />
            </Show>
        </div>
    );
}

function PokemonGrid(props: { items: Array<{ id: number; name: string; types?: string[]; sprite?: string }>; favorites: number[]; onToggleFavorite: (id: number) => void }) {
    function typesOf(it: { types?: string[] }): PokemonType[] {
        return (it.types || [])
            .map(s => String(s))
            .map(s => s.charAt(0).toUpperCase() + s.slice(1))
            .filter(Boolean) as PokemonType[];
    }

    const cards = createMemo(() => {
        // Names in new pokemons.<loc>.json are already localized
        return (props.items || []).map(it => ({
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
        if (io || !sentinel)
            return;
        io = new IntersectionObserver((entries) => {
            const e = entries[0];
            if (!e?.isIntersecting)
                return;
            // Grow limit until all loaded
            setLimit(n => Math.min(cards().length, n + PAGE));
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
        queueMicrotask(() => {
            io?.disconnect();
            io = undefined;
            startObserver();
        });
    });

    return (
        <>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                <For each={visible()}>
                    {(p, i) => (
                        <A href={`/pokemon/${p.id}`} class="block h-full motion-safe:animate-[fade-in-up_0.35s_ease-out] [animation-delay:calc(var(--i)*15ms)]" style={{ '--i': String(i()) }}>
                            <PokemonCard pokemon={p} isFavorited={props.favorites.includes(p.id)} onToggleFavorite={props.onToggleFavorite} />
                        </A>
                    )}
                </For>
            </div>
            <div ref={el => (sentinel = el as HTMLDivElement)} class="h-10" />
        </>
    );
}
