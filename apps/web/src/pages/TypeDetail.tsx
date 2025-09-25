import type { ResourceName } from '../services/data';
import type { NamedRef, TypeDetailData } from '../types/pokeapi';
import { createMemo, createResource, createSignal, For, Show } from 'solid-js';
import Card from '../components/Card';
import TypeBox from '../components/TypeBox';
import { getLocale, t } from '../i18n';
import { formatName, loadItemById } from '../services/data';

function idFromUrl(url?: string | null) {
    const m = url?.match(/\/(\d+)\/?$/);
    return m ? Number(m[1]) : undefined;
}

export default function TypeDetail(props: { id: number }) {
    const [data] = createResource(() => ({ id: props.id, loc: getLocale() }), key => loadItemById('type' as ResourceName, key.id));
    // New list: types.<loc>.json for localized type names (loaded elsewhere as needed)
    const type = createMemo(() => data() as TypeDetailData | undefined);
    const dmg = createMemo(() => type()?.damage_relations || {});
    const localizedTypeName = createMemo(() => type()?.name || '');

    const unwrap = (x: NamedRef | { type?: NamedRef }) => ('type' in (x as any) ? (x as any).type ?? { name: '' } : (x as NamedRef));
    const offense = createMemo(() => ({
        super: (dmg().double_damage_to || []).map((x: any) => unwrap(x)),
        not: (dmg().half_damage_to || []).map((x: any) => unwrap(x)),
        none: (dmg().no_damage_to || []).map((x: any) => unwrap(x)),
    }));
    const defense = createMemo(() => ({
        weak: (dmg().double_damage_from || []).map((x: any) => unwrap(x)),
        resist: (dmg().half_damage_from || []).map((x: any) => unwrap(x)),
        immune: (dmg().no_damage_from || []).map((x: any) => unwrap(x)),
    }));

    const [showAllMoves, setShowAllMoves] = createSignal(false);
    const [showAllPokemon, setShowAllPokemon] = createSignal(false);
    const movesList = createMemo(() => type()?.moves || []);
    const pokemonList = createMemo(() => type()?.pokemon || []);
    const visibleMoves = createMemo(() => showAllMoves() ? movesList() : movesList().slice(0, 48));
    const visiblePokemon = createMemo(() => showAllPokemon() ? pokemonList() : pokemonList().slice(0, 48));

    return (
        <Show when={type()} fallback={<div class="text-gray-500">{t('detail.loading')}</div>}>
            {td => (
                <div class="space-y-6">
                    <Card class="overflow-hidden p-0">
                        <div class="grid grid-cols-1 md:grid-cols-[1fr_320px]">
                            <div class="p-6">
                                <div class="flex flex-wrap items-center gap-3">
                                    <h2 class="text-2xl font-bold tracking-tight font-jersey">{localizedTypeName()}</h2>
                                    <TypeBox id={td().id} name={td().name} />
                                </div>

                                <div class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <div>
                                        <h3 class="mb-2 text-sm font-semibold tracking-wide text-gray-500">{t('type.offense')}</h3>
                                        <RelRow label={t('type.superEffectiveVs')} list={offense().super} />
                                        <RelRow label={t('type.notVeryEffectiveVs')} list={offense().not} />
                                        <RelRow label={t('type.noEffectVs')} list={offense().none} />
                                    </div>
                                    <div>
                                        <h3 class="mb-2 text-sm font-semibold tracking-wide text-gray-500">{t('type.defense')}</h3>
                                        <RelRow label={t('type.weakTo')} list={defense().weak} />
                                        <RelRow label={t('type.resists')} list={defense().resist} />
                                        <RelRow label={t('type.immuneTo')} list={defense().immune} />
                                    </div>
                                </div>
                            </div>
                            <div class="relative flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-6 text-center text-sm text-gray-500 dark:from-gray-800 dark:to-gray-900 dark:text-gray-400">
                                <div>
                                    <div class="text-lg font-semibold">Type</div>
                                    <div class="mt-1">{formatName(td().name)}</div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <h3 class="mb-3 text-sm font-semibold tracking-wide text-gray-500">{t('type.moves')}</h3>
                        <div class="flex flex-wrap gap-2">
                            <For each={visibleMoves()}>
                                {(m) => {
                                    const id = (typeof m?.id === 'number' ? m.id : idFromUrl(m?.url));
                                    return (
                                        <a href={id ? `/move/${id}` : '#'} class="rounded-full border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                                            <MoveName id={id} fallback={formatName(String(m.name || ''))} />
                                        </a>
                                    );
                                }}
                            </For>
                            <Show when={!showAllMoves() && (movesList()?.length || 0) > 48}>
                                <button type="button" class="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50" onClick={() => setShowAllMoves(true)}>
                                    +
                                    {(movesList().length - 48)}
                                    {' '}
                                    {t('common.more')}
                                </button>
                            </Show>
                        </div>
                    </Card>

                    <Card>
                        <h3 class="mb-3 text-sm font-semibold tracking-wide text-gray-500">{t('type.pokemon')}</h3>
                        <div class="flex flex-wrap gap-2">
                            <For each={visiblePokemon()}>
                                {(p) => {
                                    const id = (typeof p?.id === 'number' ? p.id : idFromUrl(p?.pokemon?.url));
                                    return (
                                        <a href={id ? `/pokemon/${id}` : '#'} class="rounded-full border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                                            <PokemonName id={id} fallback={formatName(String(p?.name || p?.pokemon?.name || ''))} />
                                        </a>
                                    );
                                }}
                            </For>
                            <Show when={!showAllPokemon() && (pokemonList()?.length || 0) > 48}>
                                <button type="button" class="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50" onClick={() => setShowAllPokemon(true)}>
                                    +
                                    {(pokemonList().length - 48)}
                                    {' '}
                                    {t('common.more')}
                                </button>
                            </Show>
                        </div>
                    </Card>
                </div>
            )}
        </Show>
    );
}

function RelRow(props: { label: string; list: Array<NamedRef | { type?: NamedRef }> }) {
    return (
        <div class="mb-3">
            <div class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{props.label}</div>
            <div class="flex flex-wrap gap-2">
                <For each={props.list}>
                    {(t: any) => {
                        const id = (typeof t?.id === 'number' ? t.id : idFromUrl(t?.url));
                        return <TypeBox id={id} link />;
                    }}
                </For>
                <Show when={(props.list?.length || 0) === 0}>
                    <span class="text-sm text-gray-400">—</span>
                </Show>
            </div>
        </div>
    );
}

function PokemonName(props: { id?: number; fallback: string }) {
    return <>{props.fallback}</>;
}

function MoveName(props: { id?: number; fallback: string }) {
    return <>{props.fallback}</>;
}

// TypeName component was unused; removed to satisfy lint
