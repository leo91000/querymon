import type { GenerationSlug as BaseGenerationSlug } from '../types/generations';
import type { PokemonSprites } from '../types/pokeapi';
import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import { t } from '../i18n';
import { userDataStore } from '../stores/userData';
import { GENERATION_ORDER, GENERATION_ROMAN } from '../types/generations';
import DropdownSelect from './DropdownSelect';

interface Props {
    sprites: PokemonSprites | undefined;
    name: string;
}

type GenerationSlug = 'modern' | BaseGenerationSlug;

function genLabel(slug: GenerationSlug) {
    if (slug === 'modern')
        return 'Modern';
    const roman = GENERATION_ROMAN[slug as Exclude<GenerationSlug, 'modern'>];
    return t('learnset.genShort', { roman });
}

interface Variant { key: string; label: string; url: string }

// Persist selection in userData for sync across devices

export default function PokemonSpriteViewer(props: Props) {
    const [selectedGen, setSelectedGen] = createSignal<GenerationSlug>('modern');
    const [selectedVariant, setSelectedVariant] = createSignal<string>('');

    const variantsByGen = createMemo(() => {
        const out = new Map<GenerationSlug, Variant[]>();
        const s = props.sprites || {} as PokemonSprites;
        // Access helpers no longer needed; types include nested optional keys.

        // Modern
        const modern: Variant[] = [];

        // Official Artwork (high-quality PNG)
        const oaFront = s?.['official-artwork']?.front_default;
        if (oaFront)
            modern.push({ key: 'official-artwork', label: 'Official Artwork', url: oaFront });
        const oaShiny = s?.['official-artwork']?.front_shiny;
        if (oaShiny)
            modern.push({ key: 'official-artwork_shiny', label: 'Official Artwork Shiny', url: oaShiny });

        // HOME sprites (all variants)
        const homeFront = s?.home?.front_default;
        if (homeFront)
            modern.push({ key: 'home_front', label: 'HOME Front', url: homeFront });
        const homeShiny = s?.home?.front_shiny;
        if (homeShiny)
            modern.push({ key: 'home_front_shiny', label: 'HOME Front Shiny', url: homeShiny });
        const homeFrontFemale = s?.home?.front_female;
        if (homeFrontFemale)
            modern.push({ key: 'home_front_female', label: 'HOME Front Female', url: homeFrontFemale });
        const homeFrontShinyFemale = s?.home?.front_shiny_female;
        if (homeFrontShinyFemale)
            modern.push({ key: 'home_front_shiny_female', label: 'HOME Front Shiny Female', url: homeFrontShinyFemale });
        const homeBack = s?.home?.back_default;
        if (homeBack)
            modern.push({ key: 'home_back', label: 'HOME Back', url: homeBack });
        const homeBackShiny = s?.home?.back_shiny;
        if (homeBackShiny)
            modern.push({ key: 'home_back_shiny', label: 'HOME Back Shiny', url: homeBackShiny });
        const homeBackFemale = s?.home?.back_female;
        if (homeBackFemale)
            modern.push({ key: 'home_back_female', label: 'HOME Back Female', url: homeBackFemale });
        const homeBackShinyFemale = s?.home?.back_shiny_female;
        if (homeBackShinyFemale)
            modern.push({ key: 'home_back_shiny_female', label: 'HOME Back Shiny Female', url: homeBackShinyFemale });

        // Dream World (SVG)
        const dwFront = s?.dream_world?.front_default;
        if (dwFront)
            modern.push({ key: 'dream_world', label: 'Dream World', url: dwFront });

        // Showdown (animated GIFs)
        const showdownFront = s?.showdown?.front_default;
        if (showdownFront)
            modern.push({ key: 'showdown_front', label: 'Showdown Front', url: showdownFront });
        const showdownShiny = s?.showdown?.front_shiny;
        if (showdownShiny)
            modern.push({ key: 'showdown_front_shiny', label: 'Showdown Front Shiny', url: showdownShiny });
        const showdownFrontFemale = s?.showdown?.front_female;
        if (showdownFrontFemale)
            modern.push({ key: 'showdown_front_female', label: 'Showdown Front Female', url: showdownFrontFemale });
        const showdownFrontShinyFemale = s?.showdown?.front_shiny_female;
        if (showdownFrontShinyFemale)
            modern.push({ key: 'showdown_front_shiny_female', label: 'Showdown Front Shiny Female', url: showdownFrontShinyFemale });
        const showdownBack = s?.showdown?.back_default;
        if (showdownBack)
            modern.push({ key: 'showdown_back', label: 'Showdown Back', url: showdownBack });
        const showdownBackShiny = s?.showdown?.back_shiny;
        if (showdownBackShiny)
            modern.push({ key: 'showdown_back_shiny', label: 'Showdown Back Shiny', url: showdownBackShiny });
        const showdownBackFemale = s?.showdown?.back_female;
        if (showdownBackFemale)
            modern.push({ key: 'showdown_back_female', label: 'Showdown Back Female', url: showdownBackFemale });
        const showdownBackShinyFemale = s?.showdown?.back_shiny_female;
        if (showdownBackShinyFemale)
            modern.push({ key: 'showdown_back_shiny_female', label: 'Showdown Back Shiny Female', url: showdownBackShinyFemale });

        // Fallback to top-level sprite if no modern sprites available
        if (!modern.length && s.front_default)
            modern.push({ key: 'front_default', label: 'Front', url: s.front_default });
        if (modern.length)
            out.set('modern', modern);

        const versions = s?.versions || {};
        const catDefs = [
            { key: 'front_default', label: 'Front' },
            { key: 'back_default', label: 'Back' },
            { key: 'front_shiny', label: 'Front Shiny' },
            { key: 'back_shiny', label: 'Back Shiny' },
            { key: 'front_female', label: 'Front Female' },
            { key: 'back_female', label: 'Back Female' },
            { key: 'front_shiny_female', label: 'Front Shiny F' },
            { key: 'back_shiny_female', label: 'Back Shiny F' },
        ] as const;

        for (const gen of GENERATION_ORDER) {
            const gobj = (versions as Record<string, unknown>)?.[gen] as Record<string, unknown> | undefined;
            if (!gobj)
                continue;
            const list: Variant[] = [];
            // Prefer one URL per category across version groups
            for (const { key, label } of catDefs) {
                let url: string | null = null;
                // Collapsed per-gen mapping (new layout): value at gobj[key]
                const direct = (gobj as Record<string, unknown>)?.[key];
                if (typeof direct === 'string' && direct)
                    url = direct;
                // Legacy nested mapping: iterate version groups
                if (!url) {
                    for (const vgName of Object.keys(gobj)) {
                        const group = (gobj as Record<string, unknown>)[vgName] as Record<string, unknown> || {};
                        const candidate = group?.[key];
                        if (typeof candidate === 'string' && candidate) {
                            url = candidate;
                            break;
                        }
                    }
                }
                if (url)
                    list.push({ key, label, url });
            }
            // Animated (Gen V Black/White)
            try {
                const bwGroup = (gobj as { ['black-white']?: unknown })['black-white'];
                const animated = (bwGroup && typeof bwGroup === 'object')
                    ? (bwGroup as { animated?: { front_default?: string; back_default?: string; front_shiny?: string; back_shiny?: string } }).animated
                    : undefined;
                if (animated) {
                    const amap: Array<[string, string, string | null]> = [
                        ['animated_front_default', 'Anim Front', animated.front_default || null],
                        ['animated_back_default', 'Anim Back', animated.back_default || null],
                        ['animated_front_shiny', 'Anim Front Shiny', animated.front_shiny || null],
                        ['animated_back_shiny', 'Anim Back Shiny', animated.back_shiny || null],
                    ];
                    for (const [k, label, u] of amap) {
                        if (u)
                            list.push({ key: k, label, url: u });
                    }
                }
            }
            catch { }
            if (list.length)
                out.set(gen, list);
        }
        return out;
    });

    const generationOptions = createMemo(() => {
        const arr: { value: GenerationSlug; label: string }[] = [];
        for (const [gen, vars] of variantsByGen()) {
            if (vars.length)
                arr.push({ value: gen, label: genLabel(gen) });
        }
        // Sort by our known order, with modern first if present
        arr.sort((a, b) => {
            if (a.value === 'modern' && b.value !== 'modern')
                return -1;
            if (b.value === 'modern' && a.value !== 'modern')
                return 1;
            return GENERATION_ORDER.indexOf(a.value as Exclude<GenerationSlug, 'modern'> & GenerationSlug) - GENERATION_ORDER.indexOf(b.value as Exclude<GenerationSlug, 'modern'> & GenerationSlug);
        });
        return arr;
    });

    function selectDefaults() {
        const map = variantsByGen();
        // Try saved in userData
        const saved = userDataStore.data.sprite;
        if (saved && typeof saved.gen === 'string' && typeof saved.variant === 'string') {
            const gen = saved.gen as GenerationSlug;
            if (map.has(gen)) {
                const list = map.get(gen)!;
                const match = list.find(v => v.key === saved.variant) || list[0];
                setSelectedGen(gen);
                setSelectedVariant(match?.key || list[0]?.key || '');
                return;
            }
        }
        // Default latest available generation (descending order), else modern
        for (let i = GENERATION_ORDER.length - 1; i >= 0; i--) {
            const g = GENERATION_ORDER[i] as GenerationSlug;
            if (map.has(g) && (map.get(g)?.length || 0) > 0) {
                setSelectedGen(g);
                setSelectedVariant(map.get(g)![0].key);
                return;
            }
        }
        if (map.has('modern')) {
            setSelectedGen('modern');
            setSelectedVariant(map.get('modern')![0]?.key || '');
        }
    }

    // Initialize defaults when sprites change
    createEffect(() => {
        void props.sprites;
        selectDefaults();
    });

    // Persist on change to userData and sync if logged in
    createEffect(() => {
        const gen = selectedGen();
        const varKey = selectedVariant();
        if (!gen || !varKey)
            return;
        userDataStore.update({ sprite: { gen, variant: varKey } });
    });

    // React to userData store updates (e.g., from server sync)
    createEffect(() => {
        const map = variantsByGen();
        const sprite = userDataStore.data.sprite;
        if (sprite) {
            const gen = sprite.gen as GenerationSlug;
            if (map.has(gen) && (selectedGen() !== gen || selectedVariant() !== sprite.variant)) {
                const list = map.get(gen)!;
                const match = list.find(v => v.key === sprite.variant) || list[0];
                setSelectedGen(gen);
                setSelectedVariant(match?.key || list[0]?.key || '');
            }
        }
    });

    const currentUrl = createMemo(() => {
        const list = variantsByGen().get(selectedGen());
        const v = list?.find(x => x.key === selectedVariant()) || list?.[0];
        return v?.url || '';
    });

    return (
        <div class="flex w-full flex-col items-center gap-3">
            <div class="relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-xl">
                <Show when={currentUrl()} fallback={<span class="text-sm text-gray-400">{t('detail.loading')}</span>}>
                    <img src={currentUrl()} alt={props.name} class="h-full w-full object-contain" loading="lazy" />
                </Show>
            </div>

            <div class="flex flex-wrap justify-center gap-1">
                <For each={variantsByGen().get(selectedGen()) || []}>
                    {v => (
                        <button
                            type="button"
                            class={`cursor-pointer rounded-full border px-2 py-0.5 text-xs transition hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedVariant() === v.key
                                ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300'
                                : 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300'
                            }`}
                            onClick={() => setSelectedVariant(v.key)}
                        >
                            {v.label}
                        </button>
                    )}
                </For>
            </div>

            <Show when={(generationOptions().length > 1)}>
                <div class="w-full pt-1">
                    <DropdownSelect
                        id="sprite-gen"
                        value={selectedGen()}
                        options={generationOptions()}
                        srLabel="Sprite generation"
                        onChange={(next) => {
                            const gen = next as GenerationSlug;
                            setSelectedGen(gen);
                            const list = variantsByGen().get(gen) || [];
                            const pick = list.find(v => v.key === selectedVariant()) || list[0];
                            setSelectedVariant(pick?.key || '');
                        }}
                        align="right"
                    />
                </div>
            </Show>
        </div>
    );
}
