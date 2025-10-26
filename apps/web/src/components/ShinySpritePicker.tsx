import type { GenerationSlug } from '../types/generations';
import type { PokemonSprites } from '../types/pokeapi';
import { batch, createEffect, createMemo, createSignal, For, Show, untrack } from 'solid-js';
import { t } from '../i18n';
import { GENERATION_ORDER, GENERATION_ROMAN } from '../types/generations';
import DropdownSelect from './DropdownSelect';

interface Props {
    sprites: PokemonSprites | undefined;
    name: string;
    /** Currently selected generation (controlled) */
    selectedGeneration?: string | null;
    /** Currently selected variant key (controlled) */
    selectedVariantKey?: string | null;
    /** Callback when sprite selection changes */
    onSpriteChange?: (url: string, genKey: string, variantKey: string) => void;
}

function genLabel(slug: GenerationSlug | 'modern') {
    if (slug === 'modern')
        return 'Modern';
    const roman = GENERATION_ROMAN[slug];
    return t('learnset.genShort', { roman });
}

interface Variant {
    key: string;
    label: string;
    url: string;
}

export default function ShinySpritePicker(props: Props) {
    const [selectedGen, setSelectedGen]
        = createSignal<GenerationSlug | 'modern'>('modern');
    const [selectedVariant, setSelectedVariant] = createSignal<string>('');
    const [initialized, setInitialized] = createSignal(false);

    const variantsByGen = createMemo(() => {
        const out = new Map<GenerationSlug | 'modern', Variant[]>();
        const s = props.sprites || ({} as PokemonSprites);

        // Modern - ONLY shiny variants
        const modern: Variant[] = [];

        // Official Artwork Shiny
        const oaShiny = s?.['official-artwork']?.front_shiny;
        if (oaShiny) {
            modern.push({
                key: 'official-artwork_shiny',
                label: 'Official Artwork Shiny',
                url: oaShiny,
            });
        }

        // HOME Shiny
        const homeShiny = s?.home?.front_shiny;
        if (homeShiny) {
            modern.push({
                key: 'home_front_shiny',
                label: 'HOME Shiny',
                url: homeShiny,
            });
        }

        // Showdown Animated Shiny
        const showdownShiny = s?.showdown?.front_shiny;
        if (showdownShiny) {
            modern.push({
                key: 'showdown_front_shiny',
                label: 'Showdown Animated',
                url: showdownShiny,
            });
        }

        // Top-level front_shiny
        if (s.front_shiny) {
            modern.push({
                key: 'front_shiny',
                label: 'Default Shiny',
                url: s.front_shiny,
            });
        }
        if (modern.length)
            out.set('modern', modern);

        const versions = s?.versions || {};
        // Only shiny sprite categories
        const catDefs = [
            { key: 'front_shiny', label: 'Front Shiny' },
            { key: 'back_shiny', label: 'Back Shiny' },
            { key: 'front_shiny_female', label: 'Front Shiny F' },
            { key: 'back_shiny_female', label: 'Back Shiny F' },
        ] as const;

        for (const gen of GENERATION_ORDER) {
            const gobj = (versions as Record<string, unknown>)?.[gen] as
                | Record<string, unknown>
                | undefined;
            if (!gobj)
                continue;
            const list: Variant[] = [];

            for (const { key, label } of catDefs) {
                let url: string | null = null;
                // Direct mapping
                const direct = (gobj as Record<string, unknown>)?.[key];
                if (typeof direct === 'string' && direct)
                    url = direct;
                // Legacy nested mapping: iterate version groups
                if (!url) {
                    for (const vgName of Object.keys(gobj)) {
                        const group
                            = ((gobj as Record<string, unknown>)[
                                vgName
                            ] as Record<string, unknown>) || {};
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

            // Animated shiny (Gen V Black/White)
            try {
                const bwGroup = (gobj as { ['black-white']?: unknown })[
                    'black-white'
                ];
                const animated
                    = bwGroup && typeof bwGroup === 'object'
                        ? (
                                bwGroup as {
                                    animated?: {
                                        front_shiny?: string;
                                        back_shiny?: string;
                                    };
                                }
                            ).animated
                        : undefined;
                if (animated) {
                    const amap: Array<[string, string, string | null]> = [
                        [
                            'animated_front_shiny',
                            'Anim Front Shiny',
                            animated.front_shiny || null,
                        ],
                        [
                            'animated_back_shiny',
                            'Anim Back Shiny',
                            animated.back_shiny || null,
                        ],
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
        const arr: { value: GenerationSlug | 'modern'; label: string }[] = [];
        for (const [gen, vars] of variantsByGen()) {
            if (vars.length)
                arr.push({ value: gen, label: genLabel(gen) });
        }
        // Sort with modern first
        arr.sort((a, b) => {
            if (a.value === 'modern' && b.value !== 'modern')
                return -1;
            if (b.value === 'modern' && a.value !== 'modern')
                return 1;
            return (GENERATION_ORDER.indexOf(a.value as GenerationSlug) - GENERATION_ORDER.indexOf(b.value as GenerationSlug));
        });
        return arr;
    });

    function selectDefaults() {
        const map = variantsByGen();
        const currentGen = untrack(selectedGen);
        const currentVariant = untrack(selectedVariant);

        // Prefer modern (official artwork shiny), else latest generation
        if (map.has('modern')) {
            const modernList = map.get('modern')!;
            const firstVariant = modernList[0]?.key || '';
            if (currentGen !== 'modern' || currentVariant !== firstVariant) {
                batch(() => {
                    setSelectedGen('modern');
                    setSelectedVariant(firstVariant);
                });
            }
            return;
        }

        // Fallback: latest available generation (descending order)
        for (let i = GENERATION_ORDER.length - 1; i >= 0; i--) {
            const g = GENERATION_ORDER[i] as GenerationSlug;
            if (map.has(g) && (map.get(g)?.length || 0) > 0) {
                const firstVariant = map.get(g)![0].key;
                if (currentGen !== g || currentVariant !== firstVariant) {
                    batch(() => {
                        setSelectedGen(g);
                        setSelectedVariant(firstVariant);
                    });
                }
                return;
            }
        }
    }

    // Initialize when sprites are available (only once)
    createEffect(() => {
        const sprites = props.sprites;

        // Only initialize once, and only when sprites are available
        if (initialized() || !sprites)
            return;

        if (props.selectedGeneration && props.selectedVariantKey) {
            // Use saved values from parent
            batch(() => {
                setSelectedGen(props.selectedGeneration as GenerationSlug | 'modern');
                setSelectedVariant(props.selectedVariantKey || '');
            });
        }
        else {
            // Select defaults
            selectDefaults();
        }

        setInitialized(true);
    });

    const currentUrl = createMemo(() => {
        const list = variantsByGen().get(selectedGen());
        const v = list?.find(x => x.key === selectedVariant()) || list?.[0];
        return v?.url || '';
    });

    return (
        <div class="flex w-full flex-col items-center gap-3">
            <div class="relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-500/10 dark:via-amber-500/10 dark:to-orange-500/10">
                <Show
                    when={currentUrl()}
                    fallback={(
                        <span class="text-sm text-gray-400">
                            {t('detail.loading')}
                        </span>
                    )}
                >
                    <img
                        src={currentUrl()}
                        alt={`${props.name} (Shiny)`}
                        class="h-full w-full object-contain drop-shadow-lg"
                        loading="lazy"
                    />
                </Show>
            </div>

            <div class="flex flex-wrap justify-center gap-1">
                <For each={variantsByGen().get(selectedGen()) || []}>
                    {v => (
                        <button
                            type="button"
                            class={`cursor-pointer rounded-full border px-2 py-0.5 text-xs transition hover:bg-yellow-50 dark:hover:bg-yellow-500/10 ${selectedVariant() === v.key
                                ? 'border-yellow-400 bg-yellow-100 text-yellow-900 dark:border-yellow-500/60 dark:bg-yellow-500/20 dark:text-yellow-200'
                                : 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300'
                            }`}
                            onClick={() => {
                                setSelectedVariant(v.key);
                                // Notify parent immediately on manual selection
                                if (props.onSpriteChange) {
                                    props.onSpriteChange(v.url, selectedGen(), v.key);
                                }
                            }}
                        >
                            {v.label}
                        </button>
                    )}
                </For>
            </div>

            <Show when={generationOptions().length > 1}>
                <div class="w-full pt-1">
                    <DropdownSelect
                        id="shiny-sprite-gen"
                        value={selectedGen()}
                        options={generationOptions()}
                        srLabel="Shiny sprite generation"
                        onChange={(next) => {
                            const gen = next as GenerationSlug | 'modern';
                            const list = variantsByGen().get(gen) || [];
                            // Try to keep the same variant key if it exists in new gen, else pick first
                            const pick = list.find(v => v.key === selectedVariant()) || list[0];
                            if (pick) {
                                batch(() => {
                                    setSelectedGen(gen);
                                    setSelectedVariant(pick.key);
                                });
                                // Notify parent
                                if (props.onSpriteChange) {
                                    props.onSpriteChange(pick.url, gen, pick.key);
                                }
                            }
                        }}
                        align="right"
                    />
                </div>
            </Show>
        </div>
    );
}
