import type { ResourceName } from '../services/data';
import type { ShinyHuntEntry } from '../services/shinyHunt';
import type { ListItem, PokemonDetailData } from '../types/pokeapi';
import { A } from '@solidjs/router';
import { createEffect, createMemo, createResource, createSignal, For, Show } from 'solid-js';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import ResourceTabs from '../components/ResourceTabs';
import ShinySpritePicker from '../components/ShinySpritePicker';
import { getLocale, t } from '../i18n';
import { formatName, loadItemById, loadList } from '../services/data';
import { createHuntBase } from '../services/shinyHunt';
import { userDataStore } from '../stores/userData';

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036F]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function translateWithFallback(key: string, fallback: string, params?: Record<string, string | number>): string {
    getLocale();
    const normalized = params
        ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, typeof v === 'number' ? String(v) : v]))
        : undefined;
    const value = t(key, normalized as any);
    if (typeof value === 'string' && value !== key)
        return value;
    return fallback;
}

interface ShinyHuntCardProps {
    entry: ShinyHuntEntry;
    onSpriteChange: (id: string, url: string, generation: string, variantKey: string) => void;
    onChangeStartDate: (id: string, value: string) => void;
    onEncounterDelta: (id: string, delta: number) => void;
    onEncounterSet: (id: string, value: number) => void;
    onOddsChange: (id: string, numerator: number, denominator: number) => void;
    onNoteChange: (id: string, value: string) => void;
    onComplete: (id: string) => void;
    onRemove: (id: string) => void;
}

function ShinyHuntCard(props: ShinyHuntCardProps) {
    const [detail] = createResource(
        () => ({ id: props.entry.pokemonId, locale: getLocale() }),
        ({ id }) => loadItemById<PokemonDetailData>('pokemon' as ResourceName, id),
    );

    const locale = createMemo(() => getLocale());

    const pokemonName = createMemo(() => {
        return formatName(detail()?.name || '');
    });

    const formattedCompletedAt = createMemo(() => {
        if (!props.entry.completedAt)
            return '';
        try {
            const d = new Date(props.entry.completedAt);
            if (Number.isNaN(d.getTime()))
                return '';
            const current = locale();
            const intl = new Intl.DateTimeFormat(current === 'jp' ? 'ja-JP' : current);
            return intl.format(d);
        }
        catch {
            return '';
        }
    });

    const buttons = [
        { label: '-5', delta: -5 },
        { label: '-2', delta: -2 },
        { label: '-1', delta: -1 },
        { label: '+1', delta: 1 },
        { label: '+2', delta: 2 },
        { label: '+5', delta: 5 },
    ];

    const [showCustomInput, setShowCustomInput] = createSignal(false);
    const [customValue, setCustomValue] = createSignal('');

    // Custom delta from userData store (reactive)
    const customDelta = () => userDataStore.data.shinyCustomDelta ?? 10;

    const disableControls = () => props.entry.status === 'completed';

    const probability = createMemo(() => {
        const encounters = props.entry.encounterCount;
        const num = props.entry.oddsNumerator ?? 1;
        const denom = props.entry.oddsDenominator ?? 4096;

        if (encounters === 0 || denom === 0)
            return 0;

        // P(at least one shiny) = 1 - (1 - p)^n
        const p = num / denom;
        const prob = 1 - (1 - p) ** encounters;
        return prob * 100; // as percentage
    });

    function handleCustomSubmit() {
        const val = Number(customValue());
        if (Number.isFinite(val) && val !== 0) {
            const newDelta = Math.abs(Math.floor(val));
            userDataStore.update({ shinyCustomDelta: newDelta });
            setCustomValue('');
            setShowCustomInput(false);
        }
    }

    return (
        <Card class="p-5">
            <div class="flex flex-col gap-5 md:flex-row">
                <div class="flex flex-col items-center gap-3 md:w-64">
                    <div class="relative">
                        <Show when={props.entry.status === 'completed'}>
                            <span class="absolute -right-1 -top-1 z-10 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow">
                                <span class="icon-[ph--sparkle]" aria-hidden="true" />
                                {translateWithFallback('shinyHunt.completedBadge', 'Shiny!')}
                            </span>
                        </Show>
                        <ShinySpritePicker
                            sprites={detail()?.sprites}
                            name={pokemonName()}
                            selectedGeneration={props.entry.selectedGeneration}
                            selectedVariantKey={props.entry.selectedVariantKey}
                            onSpriteChange={(url, gen, variantKey) => {
                                props.onSpriteChange(props.entry.id, url, gen, variantKey);
                            }}
                        />
                    </div>
                    <div class="text-center text-xs text-gray-500 dark:text-gray-400">
                        #
                        {props.entry.pokemonId.toString().padStart(3, '0')}
                    </div>
                </div>
                <div class="flex-1 space-y-4">
                    <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{pokemonName()}</h3>
                            <Show when={props.entry.status === 'completed'}>
                                <div class="mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                    <span class="icon-[ph--confetti] mr-1" aria-hidden="true" />
                                    {(() => {
                                        const encounters = props.entry.caughtEncounters ?? props.entry.encounterCount;
                                        const date = formattedCompletedAt() || props.entry.completedAt?.slice(0, 10) || '';
                                        return translateWithFallback(
                                            'shinyHunt.completedText',
                                            `Shiny caught in ${encounters} encounters`,
                                            { encounters, date },
                                        );
                                    })()}
                                </div>
                            </Show>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            class="text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/10"
                            onClick={() => props.onRemove(props.entry.id)}
                        >
                            <span class="icon-[ph--trash] mr-1" aria-hidden="true" />
                            {translateWithFallback('shinyHunt.remove', 'Remove')}
                        </Button>
                    </div>
                    <div class="grid gap-4 md:grid-cols-3">
                        <Input
                            id={`start-${props.entry.id}`}
                            label={translateWithFallback('shinyHunt.startDate', 'Start date')}
                            type="date"
                            disabled={disableControls()}
                            value={props.entry.startDate}
                            onChange={event => props.onChangeStartDate(props.entry.id, event.currentTarget.value)}
                        />
                        <div class="flex flex-col gap-1">
                            <span class="text-xs font-medium text-gray-600 dark:text-gray-300">{translateWithFallback('shinyHunt.encounters', 'Encounters')}</span>
                            <div class="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    class="h-10 w-full flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                    value={props.entry.encounterCount}
                                    disabled={disableControls()}
                                    onInput={(event) => {
                                        const value = Number(event.currentTarget.value);
                                        if (Number.isFinite(value))
                                            props.onEncounterSet(props.entry.id, Math.max(0, Math.floor(value)));
                                    }}
                                />
                            </div>
                        </div>
                        <div class="flex flex-col gap-1">
                            <span class="text-xs font-medium text-gray-600 dark:text-gray-300">{translateWithFallback('shinyHunt.odds', 'Shiny Odds')}</span>
                            <div class="flex items-center gap-1">
                                <input
                                    type="number"
                                    min="1"
                                    class="h-10 w-16 rounded-md border border-gray-300 bg-white px-2 text-center text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                    value={props.entry.oddsNumerator ?? 1}
                                    disabled={disableControls()}
                                    onInput={(event) => {
                                        const value = Number(event.currentTarget.value);
                                        if (Number.isFinite(value) && value > 0)
                                            props.onOddsChange(props.entry.id, Math.floor(value), props.entry.oddsDenominator ?? 4096);
                                    }}
                                />
                                <span class="text-gray-500 dark:text-gray-400">/</span>
                                <input
                                    type="number"
                                    min="1"
                                    class="h-10 w-20 rounded-md border border-gray-300 bg-white px-2 text-center text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                    value={props.entry.oddsDenominator ?? 4096}
                                    disabled={disableControls()}
                                    onInput={(event) => {
                                        const value = Number(event.currentTarget.value);
                                        if (Number.isFinite(value) && value > 0)
                                            props.onOddsChange(props.entry.id, props.entry.oddsNumerator ?? 1, Math.floor(value));
                                    }}
                                />
                            </div>
                            <div class="flex flex-wrap items-center gap-1">
                                <button
                                    type="button"
                                    class="cursor-pointer rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                                    disabled={disableControls()}
                                    onClick={() => props.onOddsChange(props.entry.id, 1, 4096)}
                                >
                                    1/4096
                                </button>
                                <span class="text-[10px] text-gray-400">|</span>
                                <button
                                    type="button"
                                    class="cursor-pointer rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                                    disabled={disableControls()}
                                    onClick={() => props.onOddsChange(props.entry.id, 1, 512)}
                                >
                                    1/512
                                </button>
                                <span class="text-[10px] text-gray-400">|</span>
                                <button
                                    type="button"
                                    class="cursor-pointer rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                                    disabled={disableControls()}
                                    onClick={() => props.onOddsChange(props.entry.id, 1, 100)}
                                >
                                    1/100
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for={`note-${props.entry.id}`} class="text-xs font-medium text-gray-600 dark:text-gray-300">
                            {translateWithFallback('shinyHunt.note', 'Notes')}
                        </label>
                        <textarea
                            id={`note-${props.entry.id}`}
                            class="min-h-20 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                            placeholder={translateWithFallback('shinyHunt.notePlaceholder', 'Add notes about your hunt (method, location, etc.)')}
                            value={props.entry.note ?? ''}
                            onInput={event => props.onNoteChange(props.entry.id, event.currentTarget.value)}
                        />
                    </div>
                    <Show when={props.entry.status === 'active' && probability() > 0}>
                        <div class="rounded-lg bg-blue-50 px-3 py-2 text-sm dark:bg-blue-500/10">
                            <span class="font-medium text-blue-900 dark:text-blue-100">
                                {probability().toFixed(3)}
                                % chance
                            </span>
                            <span class="text-blue-700 dark:text-blue-300">
                                {' '}
                                of encountering a shiny so far
                            </span>
                        </div>
                    </Show>
                    <div class="flex flex-wrap items-center gap-2">
                        <For each={buttons}>
                            {btn => (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    disabled={disableControls()}
                                    onClick={() => props.onEncounterDelta(props.entry.id, btn.delta)}
                                >
                                    {btn.label}
                                </Button>
                            )}
                        </For>
                        <Show
                            when={showCustomInput()}
                            fallback={(
                                <div class="relative">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        disabled={disableControls()}
                                        onClick={() => props.onEncounterDelta(props.entry.id, customDelta())}
                                    >
                                        +
                                        {customDelta()}
                                    </Button>
                                    <button
                                        type="button"
                                        class="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm transition hover:cursor-pointer hover:bg-blue-600 disabled:opacity-50"
                                        disabled={disableControls()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowCustomInput(true);
                                        }}
                                        title="Customize increment value"
                                    >
                                        <span class="icon-[ph--pencil-simple] text-[10px]" aria-hidden="true" />
                                    </button>
                                </div>
                            )}
                        >
                            <div class="flex items-center gap-1">
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="10"
                                    class="h-8 w-20 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                    value={customValue()}
                                    onInput={e => setCustomValue(e.currentTarget.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleCustomSubmit();
                                        }
                                        else if (e.key === 'Escape') {
                                            setCustomValue('');
                                            setShowCustomInput(false);
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleCustomSubmit}
                                >
                                    ✓
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setCustomValue('');
                                        setShowCustomInput(false);
                                    }}
                                >
                                    ✕
                                </Button>
                            </div>
                        </Show>
                    </div>
                    <Show when={props.entry.status === 'active'}>
                        <Button
                            type="button"
                            size="md"
                            onClick={() => props.onComplete(props.entry.id)}
                            class="bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-600"
                        >
                            <span class="icon-[ph--sparkle] mr-2" aria-hidden="true" />
                            {translateWithFallback('shinyHunt.completeButton', 'Mark shiny caught')}
                        </Button>
                    </Show>
                </div>
            </div>
        </Card>
    );
}

export default function ShinyHunt() {
    const [search, setSearch] = createSignal('');
    const [list] = createResource(() => getLocale(), () => loadList('pokemon'));

    // Use userDataStore for synced storage
    const hunts = createMemo(() => userDataStore.data.shinyHunts || []);
    const [labels, setLabels] = createSignal({
        title: translateWithFallback('shinyHunt.title', 'Shiny Hunt Tracker'),
        subtitle: translateWithFallback('shinyHunt.subtitle', 'Plan your shiny hunts, count encounters, and celebrate your catches.'),
        searchLabel: translateWithFallback('shinyHunt.searchLabel', 'Search Pokémon'),
        searchPlaceholder: translateWithFallback('shinyHunt.searchPlaceholder', 'Type a Pokémon name…'),
        noHuntsYet: translateWithFallback('shinyHunt.noHuntsYet', 'No hunts yet—add your first Pokémon below.'),
        noMatches: translateWithFallback('shinyHunt.noMatches', 'No Pokémon match your search.'),
        add: translateWithFallback('shinyHunt.add', 'Add to hunts'),
        addAnother: translateWithFallback('shinyHunt.addAnother', 'Track another'),
        activeTitle: translateWithFallback('shinyHunt.activeTitle', 'Active Hunts'),
        completedTitle: translateWithFallback('shinyHunt.completedTitle', 'Completed Hunts'),
        emptyState: translateWithFallback('shinyHunt.emptyState', 'Start by searching for a Pokémon above and add it to your shiny hunt list.'),
        browseLink: translateWithFallback('shinyHunt.browseLink', 'Browse the Pokédex'),
        browseSuffix: translateWithFallback('shinyHunt.browseSuffix', 'to gather more details while you hunt.'),
    });

    createEffect(() => {
        const locale = getLocale();
        void locale;
        setLabels({
            title: translateWithFallback('shinyHunt.title', 'Shiny Hunt Tracker'),
            subtitle: translateWithFallback('shinyHunt.subtitle', 'Plan your shiny hunts, count encounters, and celebrate your catches.'),
            searchLabel: translateWithFallback('shinyHunt.searchLabel', 'Search Pokémon'),
            searchPlaceholder: translateWithFallback('shinyHunt.searchPlaceholder', 'Type a Pokémon name…'),
            noHuntsYet: translateWithFallback('shinyHunt.noHuntsYet', 'No hunts yet—add your first Pokémon below.'),
            noMatches: translateWithFallback('shinyHunt.noMatches', 'No Pokémon match your search.'),
            add: translateWithFallback('shinyHunt.add', 'Add to hunts'),
            addAnother: translateWithFallback('shinyHunt.addAnother', 'Track another'),
            activeTitle: translateWithFallback('shinyHunt.activeTitle', 'Active Hunts'),
            completedTitle: translateWithFallback('shinyHunt.completedTitle', 'Completed Hunts'),
            emptyState: translateWithFallback('shinyHunt.emptyState', 'Start by searching for a Pokémon above and add it to your shiny hunt list.'),
            browseLink: translateWithFallback('shinyHunt.browseLink', 'Browse the Pokédex'),
            browseSuffix: translateWithFallback('shinyHunt.browseSuffix', 'to gather more details while you hunt.'),
        });
    });

    function commit(builder: (current: readonly ShinyHuntEntry[]) => ShinyHuntEntry[]) {
        const next = builder(hunts());
        userDataStore.update({ shinyHunts: next });
    }

    const filteredPokemon = createMemo(() => {
        const listItems = list() ?? [];
        const term = normalizeText(search());
        if (!term)
            return listItems.slice(0, 12);
        const out: ListItem[] = [];
        for (const item of listItems) {
            if (normalizeText(String(item.name || '')).includes(term)) {
                out.push(item);
                if (out.length >= 12)
                    break;
            }
        }
        return out;
    });

    const activeIds = createMemo(() => {
        const ids = new Set<number>();
        for (const entry of hunts()) {
            if (entry.status === 'active')
                ids.add(entry.pokemonId);
        }
        return ids;
    });

    const activeHunts = createMemo(() => hunts().filter(h => h.status === 'active'));
    const completedHunts = createMemo(() => hunts().filter(h => h.status === 'completed'));

    const trackingLabel = createMemo(() => {
        const count = hunts().length;
        return translateWithFallback('shinyHunt.trackingCount', `Tracking ${count} hunts`, { count });
    });

    const countLabel = (count: number) => {
        return translateWithFallback('shinyHunt.countLabel', `${count} listed`, { count });
    };

    function addPokemon(item: ListItem) {
        const sprite = String((item as Record<string, unknown>).sprite || '') || null;
        const base = createHuntBase(item.id, sprite);
        commit(current => [...current, base]);
    }

    function removeHunt(id: string) {
        commit(current => current.filter(entry => entry.id !== id));
    }

    function changeStartDate(id: string, value: string) {
        commit(current => current.map(entry => entry.id === id ? { ...entry, startDate: value || entry.startDate } : entry));
    }

    function changeSprite(id: string, url: string, generation: string, variantKey: string) {
        commit(current => current.map(entry => entry.id === id
            ? { ...entry, spriteUrl: url, selectedGeneration: generation, selectedVariantKey: variantKey }
            : entry));
    }

    function changeEncounters(id: string, delta: number) {
        commit(current => current.map((entry) => {
            if (entry.id !== id)
                return entry;
            const next = Math.max(0, entry.encounterCount + delta);
            return next === entry.encounterCount ? entry : { ...entry, encounterCount: next };
        }));
    }

    function setEncounters(id: string, value: number) {
        commit(current => current.map(entry => entry.id === id ? { ...entry, encounterCount: Math.max(0, value) } : entry));
    }

    function changeOdds(id: string, numerator: number, denominator: number) {
        commit(current => current.map(entry => entry.id === id
            ? { ...entry, oddsNumerator: numerator, oddsDenominator: denominator }
            : entry));
    }

    function changeNote(id: string, value: string) {
        commit(current => current.map(entry => entry.id === id ? { ...entry, note: value } : entry));
    }

    function completeHunt(id: string) {
        const stamp = new Date().toISOString();
        commit(current => current.map((entry) => {
            if (entry.id !== id)
                return entry;
            return {
                ...entry,
                status: 'completed',
                completedAt: stamp,
                caughtEncounters: entry.encounterCount,
            };
        }));
    }

    return (
        <div class="space-y-6">
            <ResourceTabs current="shiny-hunt" />
            <div class="space-y-2">
                <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{labels().title}</h1>
                <p class="text-sm text-gray-600 dark:text-gray-300">{labels().subtitle}</p>
            </div>

            <Card class="space-y-4">
                <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div class="flex-1">
                        <Input
                            id="shiny-hunt-search"
                            label={labels().searchLabel}
                            placeholder={labels().searchPlaceholder}
                            value={search()}
                            onInput={event => setSearch(event.currentTarget.value)}
                        />
                    </div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                        <Show when={hunts().length > 0} fallback={<span>{labels().noHuntsYet}</span>}>
                            <span>{trackingLabel()}</span>
                        </Show>
                    </div>
                </div>
                <Show when={filteredPokemon().length} fallback={<div class="rounded-lg bg-gray-50 p-4 text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400">{labels().noMatches}</div>}>
                    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <For each={filteredPokemon()}>
                            {(item) => {
                                const sprite = String((item as Record<string, unknown>).sprite || '') || '';
                                const nameLabel = formatName(String(item.name || ''));
                                const already = activeIds().has(item.id);
                                return (
                                    <Card class="flex items-center justify-between gap-3 p-3">
                                        <div class="flex items-center gap-3">
                                            <img
                                                src={sprite}
                                                alt={nameLabel}
                                                width={48}
                                                height={48}
                                                class="h-12 w-12 rounded-lg bg-gray-100 object-contain ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700"
                                                loading="lazy"
                                            />
                                            <div>
                                                <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">{nameLabel}</div>
                                                <div class="text-xs text-gray-500 dark:text-gray-400">
                                                    #
                                                    {item.id.toString().padStart(3, '0')}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => addPokemon(item)}
                                        >
                                            {already ? labels().addAnother : labels().add}
                                        </Button>
                                    </Card>
                                );
                            }}
                        </For>
                    </div>
                </Show>
            </Card>

            <Show when={activeHunts().length > 0}>
                <section class="space-y-3">
                    <div class="flex items-center justify-between">
                        <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">{labels().activeTitle}</h2>
                        <span class="text-sm text-gray-500 dark:text-gray-400">{countLabel(activeHunts().length)}</span>
                    </div>
                    <div class="space-y-4">
                        <For each={activeHunts()}>
                            {entry => (
                                <ShinyHuntCard
                                    entry={entry}
                                    onSpriteChange={changeSprite}
                                    onChangeStartDate={changeStartDate}
                                    onEncounterDelta={changeEncounters}
                                    onEncounterSet={setEncounters}
                                    onOddsChange={changeOdds}
                                    onNoteChange={changeNote}
                                    onComplete={completeHunt}
                                    onRemove={removeHunt}
                                />
                            )}
                        </For>
                    </div>
                </section>
            </Show>

            <Show when={completedHunts().length > 0}>
                <section class="space-y-3">
                    <div class="flex items-center justify-between">
                        <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">{labels().completedTitle}</h2>
                        <span class="text-sm text-gray-500 dark:text-gray-400">{countLabel(completedHunts().length)}</span>
                    </div>
                    <div class="space-y-4">
                        <For each={completedHunts()}>
                            {entry => (
                                <ShinyHuntCard
                                    entry={entry}
                                    onSpriteChange={changeSprite}
                                    onChangeStartDate={changeStartDate}
                                    onEncounterDelta={changeEncounters}
                                    onEncounterSet={setEncounters}
                                    onOddsChange={changeOdds}
                                    onNoteChange={changeNote}
                                    onComplete={completeHunt}
                                    onRemove={removeHunt}
                                />
                            )}
                        </For>
                    </div>
                </section>
            </Show>

            <Show when={hunts().length === 0}>
                <div class="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    <p>{labels().emptyState}</p>
                </div>
            </Show>

            <div class="text-sm text-gray-500 dark:text-gray-400">
                <A href="/pokemon" class="text-blue-600 hover:underline dark:text-blue-400">{labels().browseLink}</A>
                {' '}
                {labels().browseSuffix}
            </div>
        </div>
    );
}
