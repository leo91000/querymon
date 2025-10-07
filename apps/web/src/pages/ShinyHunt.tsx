import type { ListItem, PokemonDetailData, PokemonSprites } from '../types/pokeapi';
import type { ResourceName } from '../services/data';
import { A } from '@solidjs/router';
import { createEffect, createMemo, createResource, createSignal, For, Show, onCleanup, onMount } from 'solid-js';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import Select from '../components/Select';
import { getLocale, t } from '../i18n';
import { formatName, loadItemById, loadList } from '../services/data';
import { createHuntBase, loadHunts, onHuntsUpdate, saveHunts, type ShinyHuntEntry } from '../services/shinyHunt';
import ResourceTabs from '../components/ResourceTabs';

interface SpriteOption {
    id: string;
    label: string;
    defaultUrl: string;
    shinyUrl: string | null;
    generation?: string | null;
    versionKey?: string | null;
}

type GenerationSlug
    = | 'generation-i'
        | 'generation-ii'
        | 'generation-iii'
        | 'generation-iv'
        | 'generation-v'
        | 'generation-vi'
        | 'generation-vii'
        | 'generation-viii'
        | 'generation-ix';

const GENERATION_ORDER: GenerationSlug[] = [
    'generation-i',
    'generation-ii',
    'generation-iii',
    'generation-iv',
    'generation-v',
    'generation-vi',
    'generation-vii',
    'generation-viii',
    'generation-ix',
];

const GENERATION_ROMAN: Record<GenerationSlug, string> = {
    'generation-i': 'I',
    'generation-ii': 'II',
    'generation-iii': 'III',
    'generation-iv': 'IV',
    'generation-v': 'V',
    'generation-vi': 'VI',
    'generation-vii': 'VII',
    'generation-viii': 'VIII',
    'generation-ix': 'IX',
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getString(record: Record<string, unknown>, key: string): string {
    const value = record[key];
    return typeof value === 'string' ? value : '';
}

function getNullableString(record: Record<string, unknown>, key: string): string | null {
    const value = record[key];
    return typeof value === 'string' ? value : null;
}

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036F]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function generationLabel(gen: string): string {
    if ((gen as GenerationSlug) in GENERATION_ROMAN) {
        const roman = GENERATION_ROMAN[gen as GenerationSlug];
        return t('learnset.genShort', { roman });
    }
    return formatName(gen.replace(/-/g, ' '));
}

function versionGroupLabel(key: string): string {
    const raw = t(`versionGroupName.${key}`);
    if (typeof raw === 'string' && raw !== `versionGroupName.${key}`)
        return raw;
    return formatName(key.replace(/-/g, ' '));
}

function spriteLabel(id: string, fallback: string): string {
    getLocale();
    const raw = t(`shinyHunt.sprite.${id}`);
    if (typeof raw === 'string' && raw !== `shinyHunt.sprite.${id}`)
        return raw;
    return fallback;
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

function pushOption(list: SpriteOption[], seen: Set<string>, option: SpriteOption) {
    if (seen.has(option.id))
        return;
    if (!option.defaultUrl && !option.shinyUrl)
        return;
    if (!option.defaultUrl && option.shinyUrl)
        option.defaultUrl = option.shinyUrl;
    if (!option.defaultUrl)
        return;
    list.push(option);
    seen.add(option.id);
}

function buildSpriteOptions(sprites: PokemonSprites | undefined): SpriteOption[] {
    if (!sprites)
        return [];
    const options: SpriteOption[] = [];
    const seen = new Set<string>();

    const other = isRecord(sprites.other) ? sprites.other : {};
    const modern: SpriteOption[] = [];
    const officialArt = isRecord(other['official-artwork']) ? other['official-artwork'] as Record<string, unknown> : {};
    pushOption(modern, seen, {
        id: 'modern:official-artwork',
        label: spriteLabel('officialArtwork', 'Official Artwork'),
        defaultUrl: getString(officialArt, 'front_default'),
        shinyUrl: getNullableString(officialArt, 'front_shiny'),
        generation: null,
        versionKey: null,
    });
    const home = isRecord(other.home) ? other.home as Record<string, unknown> : {};
    pushOption(modern, seen, {
        id: 'modern:home',
        label: spriteLabel('home', 'HOME'),
        defaultUrl: getString(home, 'front_default'),
        shinyUrl: getNullableString(home, 'front_shiny'),
        generation: null,
        versionKey: null,
    });
    const dream = isRecord(other.dream_world) ? other.dream_world as Record<string, unknown> : {};
    pushOption(modern, seen, {
        id: 'modern:dream-world',
        label: spriteLabel('dreamWorld', 'Dream World'),
        defaultUrl: getString(dream, 'front_default'),
        shinyUrl: null,
        generation: null,
        versionKey: null,
    });
    pushOption(modern, seen, {
        id: 'modern:front',
        label: spriteLabel('default', 'Default Sprite'),
        defaultUrl: typeof sprites.front_default === 'string' ? sprites.front_default : '',
        shinyUrl: typeof sprites.front_shiny === 'string' ? sprites.front_shiny : null,
        generation: null,
        versionKey: null,
    });

    const generationOptions: SpriteOption[] = [];
    const versions = isRecord(sprites.versions) ? sprites.versions : (isRecord(other.versions) ? other.versions as Record<string, unknown> : undefined);
    if (versions) {
        for (const gen of Object.keys(versions)) {
            const genObjRaw = versions[gen];
            if (!isRecord(genObjRaw))
                continue;
            const genObj = genObjRaw as Record<string, unknown>;
            const genName = generationLabel(gen);
            const directFront = getString(genObj, 'front_default');
            const directShiny = getNullableString(genObj, 'front_shiny');
            pushOption(generationOptions, seen, {
                id: `gen:${gen}`,
                label: genName,
                defaultUrl: directFront,
                shinyUrl: directShiny,
                generation: gen,
                versionKey: null,
            });
            for (const versionKey of Object.keys(genObj)) {
                if (versionKey === 'front_default' || versionKey === 'front_shiny')
                    continue;
                const groupRaw = genObj[versionKey];
                if (!isRecord(groupRaw))
                    continue;
                const group = groupRaw as Record<string, unknown>;
                let front = getString(group, 'front_default');
                let shiny = getNullableString(group, 'front_shiny');
                if (!front && !shiny && isRecord(group.animated)) {
                    const animated = group.animated as Record<string, unknown>;
                    front = getString(animated, 'front_default');
                    if (!shiny)
                        shiny = getNullableString(animated, 'front_shiny');
                }
                if (!front && !shiny)
                    continue;
                pushOption(generationOptions, seen, {
                    id: `vg:${gen}:${versionKey}`,
                    label: `${genName} • ${versionGroupLabel(versionKey)}`,
                    defaultUrl: front,
                    shinyUrl: shiny,
                    generation: gen,
                    versionKey,
                });
            }
        }
    }

    generationOptions.sort((a, b) => {
        const rankA = a.generation && (GENERATION_ORDER.indexOf(a.generation as GenerationSlug) >= 0)
            ? GENERATION_ORDER.indexOf(a.generation as GenerationSlug)
            : GENERATION_ORDER.length + 1;
        const rankB = b.generation && (GENERATION_ORDER.indexOf(b.generation as GenerationSlug) >= 0)
            ? GENERATION_ORDER.indexOf(b.generation as GenerationSlug)
            : GENERATION_ORDER.length + 1;
        if (rankA !== rankB)
            return rankA - rankB;
        return a.label.localeCompare(b.label);
    });

    for (const opt of modern)
        options.push(opt);
    for (const opt of generationOptions)
        options.push(opt);

    return options;
}

interface ShinyHuntCardProps {
    entry: ShinyHuntEntry;
    onSelectSprite: (id: string, option: SpriteOption) => void;
    onChangeStartDate: (id: string, value: string) => void;
    onEncounterDelta: (id: string, delta: number) => void;
    onEncounterSet: (id: string, value: number) => void;
    onComplete: (id: string, option: SpriteOption | undefined) => void;
    onRemove: (id: string) => void;
}

function ShinyHuntCard(props: ShinyHuntCardProps) {
    const [detail] = createResource(
        () => props.entry.pokemonId,
        id => loadItemById<PokemonDetailData>('pokemon' as ResourceName, id),
    );

    const locale = createMemo(() => getLocale());

    const spriteOptions = createMemo(() => {
        locale();
        return buildSpriteOptions(detail()?.sprites);
    });

    const selectedOption = createMemo(() => {
        const opts = spriteOptions();
        if (!opts.length)
            return undefined;
        const wanted = opts.find(opt => opt.id === props.entry.selectedSpriteId);
        return wanted ?? opts[0];
    });

    createEffect(() => {
        const opts = spriteOptions();
        if (!opts.length)
            return;
        const match = opts.find(opt => opt.id === props.entry.selectedSpriteId);
        if (!match)
            props.onSelectSprite(props.entry.id, opts[0]);
    });

    const displayUrl = createMemo(() => {
        const option = selectedOption();
        if (props.entry.status === 'completed' && option?.shinyUrl)
            return option.shinyUrl;
        return option?.defaultUrl || props.entry.spriteUrl || '';
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
        { label: '-10', delta: -10 },
        { label: '-1', delta: -1 },
        { label: '+1', delta: 1 },
        { label: '+10', delta: 10 },
        { label: '+50', delta: 50 },
    ];

    const disableControls = () => props.entry.status === 'completed';

    return (
        <Card class="p-5">
            <div class="flex flex-col gap-5 md:flex-row">
                <div class="flex flex-col items-center gap-3 md:w-36">
                    <div class="relative">
                        <img
                            src={displayUrl() || props.entry.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png'}
                            alt={formatName(props.entry.pokemonName)}
                            width={120}
                            height={120}
                            class="h-28 w-28 rounded-xl bg-gray-100 object-contain ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700"
                            loading="lazy"
                        />
                        <Show when={props.entry.status === 'completed'}>
                            <span class="absolute -right-1 -top-1 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow">
                                <span class="icon-[ph--sparkle]" aria-hidden="true" />
                                {translateWithFallback('shinyHunt.completedBadge', 'Shiny!')}
                            </span>
                        </Show>
                    </div>
                    <div class="text-center text-xs text-gray-500 dark:text-gray-400">
                        #{props.entry.pokemonId.toString().padStart(3, '0')}
                    </div>
                </div>
                <div class="flex-1 space-y-4">
                    <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatName(props.entry.pokemonName)}</h3>
                            <Show when={selectedOption()}>
                                {opt => (
                                    <p class="text-sm text-gray-500 dark:text-gray-400">{opt().label}</p>
                                )}
                            </Show>
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
                    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Select
                            id={`sprite-${props.entry.id}`}
                            label={translateWithFallback('shinyHunt.gameLabel', 'Game / Sprite')}
                            disabled={spriteOptions().length === 0 || disableControls()}
                            value={selectedOption()?.id || ''}
                            onChange={event => {
                                const opts = spriteOptions();
                                const next = opts.find(opt => opt.id === event.currentTarget.value);
                                if (next)
                                    props.onSelectSprite(props.entry.id, next);
                            }}
                            options={spriteOptions().map(opt => ({ value: opt.id, label: opt.label }))}
                        />
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
                                    onInput={event => {
                                        const value = Number(event.currentTarget.value);
                                        if (Number.isFinite(value))
                                            props.onEncounterSet(props.entry.id, Math.max(0, Math.floor(value)));
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-2">
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
                    </div>
                    <Show when={props.entry.status === 'active'}>
                        <Button
                            type="button"
                            size="md"
                            onClick={() => props.onComplete(props.entry.id, selectedOption())}
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
    const [hunts, setHunts] = createSignal<ShinyHuntEntry[]>([]);
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
        setHunts(next);
        saveHunts(next);
    }

    onMount(() => {
        setHunts(loadHunts());
        const off = onHuntsUpdate(entries => setHunts(entries));
        onCleanup(() => off());
    });

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
        const base = createHuntBase(item.id, String(item.name || ''), sprite);
        commit(current => [...current, base]);
    }

    function removeHunt(id: string) {
        commit(current => current.filter(entry => entry.id !== id));
    }

    function changeStartDate(id: string, value: string) {
        commit(current => current.map(entry => entry.id === id ? { ...entry, startDate: value || entry.startDate } : entry));
    }

    function changeSprite(id: string, option: SpriteOption) {
        commit(current => current.map(entry => entry.id === id ? { ...entry, selectedSpriteId: option.id, spriteUrl: option.defaultUrl } : entry));
    }

    function changeEncounters(id: string, delta: number) {
        commit(current => current.map(entry => {
            if (entry.id !== id)
                return entry;
            const next = Math.max(0, entry.encounterCount + delta);
            return next === entry.encounterCount ? entry : { ...entry, encounterCount: next };
        }));
    }

    function setEncounters(id: string, value: number) {
        commit(current => current.map(entry => entry.id === id ? { ...entry, encounterCount: Math.max(0, value) } : entry));
    }

    function completeHunt(id: string, option: SpriteOption | undefined) {
        const stamp = new Date().toISOString();
        commit(current => current.map(entry => {
            if (entry.id !== id)
                return entry;
            return {
                ...entry,
                status: 'completed',
                completedAt: stamp,
                caughtEncounters: entry.encounterCount,
                spriteUrl: option?.shinyUrl || option?.defaultUrl || entry.spriteUrl || null,
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
                            {item => {
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
                                                <div class="text-xs text-gray-500 dark:text-gray-400">#{item.id.toString().padStart(3, '0')}</div>
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
                                    onSelectSprite={changeSprite}
                                    onChangeStartDate={changeStartDate}
                                    onEncounterDelta={changeEncounters}
                                    onEncounterSet={setEncounters}
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
                                    onSelectSprite={changeSprite}
                                    onChangeStartDate={changeStartDate}
                                    onEncounterDelta={changeEncounters}
                                    onEncounterSet={setEncounters}
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
