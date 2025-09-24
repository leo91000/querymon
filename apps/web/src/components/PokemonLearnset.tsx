import { For, Show, createMemo, createResource, createSignal, createEffect, onMount } from 'solid-js';
import TypeBox from './TypeBox';
import { formatName, loadItemById, type ResourceName } from '../services/data';
import { t } from '../i18n';

interface PokemonLearnsetProps {
  pokemonId: number;
  moves: Array<any> | undefined;
  locale: 'en' | 'fr' | 'jp';
  moveNames?: Record<string, string>;
}

type MethodKey = 'level-up' | 'machine' | 'tutor' | 'egg' | 'special';

type LearnsetEntry = {
  moveId?: number;
  name: string;
  typeName?: string;
  damageClass?: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  level: number | null;
  versionGroups: string[]; // merged across version groups within the same generation
};

const METHOD_MAP: Record<string, MethodKey> = {
  'level-up': 'level-up',
  machine: 'machine',
  tutor: 'tutor',
  egg: 'egg',
  'light-ball-egg': 'egg',
  'stadium-surfing-pikachu': 'special',
};

const METHOD_ORDER: MethodKey[] = ['level-up', 'machine', 'tutor', 'egg', 'special'];

const METHOD_LABEL_KEY: Record<MethodKey, string> = {
  'level-up': 'learnset.levelUp',
  machine: 'learnset.machine',
  tutor: 'learnset.tutor',
  egg: 'learnset.egg',
  special: 'learnset.special',
};

interface VersionGroupInfo {
  generation: GenerationSlug;
  order: number;
}

type GenerationSlug =
  | 'generation-i'
  | 'generation-ii'
  | 'generation-iii'
  | 'generation-iv'
  | 'generation-v'
  | 'generation-vi'
  | 'generation-vii'
  | 'generation-viii'
  | 'generation-ix';

const VERSION_GROUP_TO_GENERATION: Record<string, VersionGroupInfo> = {
  'red-blue': { generation: 'generation-i', order: 1 },
  yellow: { generation: 'generation-i', order: 2 },
  'gold-silver': { generation: 'generation-ii', order: 3 },
  crystal: { generation: 'generation-ii', order: 4 },
  'ruby-sapphire': { generation: 'generation-iii', order: 5 },
  emerald: { generation: 'generation-iii', order: 6 },
  'firered-leafgreen': { generation: 'generation-iii', order: 7 },
  'diamond-pearl': { generation: 'generation-iv', order: 8 },
  platinum: { generation: 'generation-iv', order: 9 },
  'heartgold-soulsilver': { generation: 'generation-iv', order: 10 },
  'black-white': { generation: 'generation-v', order: 11 },
  'black-2-white-2': { generation: 'generation-v', order: 12 },
  'x-y': { generation: 'generation-vi', order: 13 },
  'omega-ruby-alpha-sapphire': { generation: 'generation-vi', order: 14 },
  'sun-moon': { generation: 'generation-vii', order: 15 },
  'ultra-sun-ultra-moon': { generation: 'generation-vii', order: 16 },
  'lets-go-pikachu-lets-go-eevee': { generation: 'generation-vii', order: 17 },
  'sword-shield': { generation: 'generation-viii', order: 18 },
  'brilliant-diamond-and-shining-pearl': { generation: 'generation-viii', order: 19 },
  'legends-arceus': { generation: 'generation-viii', order: 20 },
  'scarlet-violet': { generation: 'generation-ix', order: 21 },
};

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

const GEN_ROMAN: Record<GenerationSlug, string> = {
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

function idFromUrl(url?: string | null) {
  const match = url?.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : undefined;
}

export default function PokemonLearnset(props: PokemonLearnsetProps) {
  const [openGeneration, setOpenGeneration] = createSignal<GenerationSlug | null>(null);
  const [openMethods, setOpenMethods] = createSignal<Record<string, Partial<Record<MethodKey, boolean>>>>({});

  // Pre-compute move ids grouped by generation so we can fetch lazily per generation
  const idsByGeneration = createMemo(() => {
    const map = new Map<GenerationSlug, Set<number>>();
    for (const entry of props.moves || []) {
      const moveId = idFromUrl(entry?.move?.url);
      if (moveId == null) continue;
      for (const vg of entry?.version_group_details || []) {
        const vgName = vg?.version_group?.name;
        const info = vgName ? VERSION_GROUP_TO_GENERATION[vgName] : undefined;
        if (!info) continue;
        const set = map.get(info.generation) ?? new Set<number>();
        set.add(moveId);
        map.set(info.generation, set);
      }
    }
    return map;
  });

  // Cache move details across generations (so reopening is instant)
  const detailCache = new Map<number, any>();

  const [moveDetails] = createResource(openGeneration, async (gen) => {
    if (!gen) return new Map(detailCache);
    const idsForGen = Array.from(idsByGeneration().get(gen) ?? []);
    const missing = idsForGen.filter((id) => !detailCache.has(id));
    if (missing.length > 0) {
      const results = await Promise.all(
        missing.map(async (id) => {
          const detail = await loadItemById('move' as ResourceName, id);
          return [id, detail] as const;
        })
      );
      for (const [id, detail] of results) detailCache.set(id, detail);
    }
    return new Map(detailCache);
  });

  const learnset = createMemo(() => {
    const moves = props.moves || [];
    const details = moveDetails(); // may be partially filled; OK
    if (!moves.length) return [] as Array<{ generation: GenerationSlug; entries: Array<{ method: MethodKey; items: LearnsetEntry[] }>; order: number }>;

    const genMap = new Map<GenerationSlug, { order: number; methods: Map<MethodKey, Map<string, LearnsetEntry>> }>();

    for (const move of moves) {
      const moveId = idFromUrl(move?.move?.url);
      const detail = moveId != null ? details?.get(moveId) : undefined;
      const moveSlug = typeof move?.move?.name === 'string' ? move.move.name : '';
      const localizedName = moveId != null ? props.moveNames?.[String(moveId)] ?? formatName(moveSlug) : formatName(moveSlug);

      for (const vg of move?.version_group_details || []) {
        const mappedMethod = METHOD_MAP[vg?.move_learn_method?.name];
        if (!mappedMethod) continue;
        const vgName = vg?.version_group?.name;
        if (!vgName) continue;
        const vgInfo = VERSION_GROUP_TO_GENERATION[vgName];
        if (!vgInfo) continue;

        const generationEntry = genMap.get(vgInfo.generation) ?? {
          order: vgInfo.order,
          methods: new Map<MethodKey, Map<string, LearnsetEntry>>(),
        };
        genMap.set(vgInfo.generation, generationEntry);

        const methodMap = generationEntry.methods.get(mappedMethod) ?? new Map<string, LearnsetEntry>();
        generationEntry.methods.set(mappedMethod, methodMap);

        // De-duplicate the same move across version groups inside a generation.
        // Key by move (id or localized name) within method.
        const key = `${moveId ?? localizedName}`;
        if (!methodMap.has(key)) {
          methodMap.set(key, {
            moveId,
            name: localizedName,
            typeName: detail?.type?.name,
            damageClass: detail?.damage_class?.name,
            power: detail?.power ?? null,
            accuracy: detail?.accuracy ?? null,
            pp: detail?.pp ?? null,
            level: mappedMethod === 'level-up' ? vg?.level_learned_at ?? null : null,
            versionGroups: vgName ? [vgName] : [],
          });
        } else {
          const existing = methodMap.get(key)!;
          if (mappedMethod === 'level-up') {
            const level = vg?.level_learned_at ?? null;
            if (level != null && level !== 0 && (existing.level == null || existing.level === 0 || level < existing.level)) {
              existing.level = level;
            }
          }
          if (vgName && !existing.versionGroups.includes(vgName)) existing.versionGroups.push(vgName);
        }
      }
    }

    const generationSections = [] as Array<{ generation: GenerationSlug; entries: Array<{ method: MethodKey; items: LearnsetEntry[] }>; order: number }>;

    for (const [generation, info] of genMap) {
      const methodSections: Array<{ method: MethodKey; items: LearnsetEntry[] }> = [];
      for (const method of METHOD_ORDER) {
        const items = info.methods.get(method);
        if (!items) continue;
        const list = Array.from(items.values()).sort((a, b) => {
          if (method === 'level-up') {
            const levelA = a.level ?? 0;
            const levelB = b.level ?? 0;
            if (levelA !== levelB) return levelA - levelB;
          }
          return a.name.localeCompare(b.name);
        });
        if (list.length === 0) continue;
        methodSections.push({ method, items: list });
      }
      if (methodSections.length > 0) {
        generationSections.push({ generation, entries: methodSections, order: info.order });
      }
    }

    generationSections.sort((a, b) => GENERATION_ORDER.indexOf(a.generation) - GENERATION_ORDER.indexOf(b.generation));
    return generationSections;
  });

  // Start collapsed: leave openGeneration as null; clicking a header toggles visibility.

  // Default to the first available generation when data arrives
  createEffect(() => {
    const sections = learnset();
    if (!sections.length) return;
    if (!openGeneration() || !sections.some((s) => s.generation === openGeneration())) {
      setOpenGeneration(sections[0].generation);
    }
  });

  // Ensure Level-up is open by default within the active generation
  createEffect(() => {
    const gen = openGeneration();
    if (!gen) return;
    setOpenMethods((prev) => ({
      ...prev,
      [gen]: {
        'level-up': true,
        machine: false,
        tutor: false,
        egg: false,
        special: false,
        ...(prev[gen] || {}),
      },
    }));
  });

  const currentSection = createMemo(() => learnset().find((s) => s.generation === openGeneration()));
  const isMethodOpen = (method: MethodKey) => !!openMethods()[openGeneration() || '']?.[method];
  const toggleMethod = (method: MethodKey) => {
    const gen = openGeneration();
    if (!gen) return;
    setOpenMethods((prev) => {
      const cur = prev[gen] || {};
      const willClose = !!cur[method];
      const next: Partial<Record<MethodKey, boolean>> = willClose ? {} : ({ [method]: true } as any);
      return { ...prev, [gen]: next };
    });
  };

  return (
    <Show when={learnset().length > 0}>
      <div class="space-y-4">
        <h3 class="text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-300">
          {t('pokemon.learnset')}
        </h3>

        {/* Tabs: generations */}
        <div role="tablist" aria-label="Generations" class="-mb-px flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
          <For each={learnset()}>
            {(section) => {
              const selected = () => section.generation === openGeneration();
              const id = `tab-${section.generation}`;
              const panelId = `panel-${section.generation}`;
              return (
                <button
                  role="tab"
                  id={id}
                  aria-controls={panelId}
                  aria-selected={selected()}
                  type="button"
                  class={`cursor-pointer rounded-t-md px-3 py-2 text-sm font-medium transition focus:outline-none ${
                    selected()
                      ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-300'
                      : 'text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100'
                  }`}
                  onClick={() => setOpenGeneration(section.generation)}
                >
                  {t('learnset.genShort' as any, { roman: GEN_ROMAN[section.generation] } as any)}
                  <span
                    aria-hidden="true"
                    class="ml-2 align-[-2px] text-xs"
                    classList={{ 'icon-[ph--circle-notch-bold] animate-spin': selected() && (moveDetails as any).loading }}
                  />
                </button>
              );
            }}
          </For>
        </div>

        {/* Active generation content */}
        <Show when={currentSection()}>
          {(sec) => (
            <div
              role="tabpanel"
              id={`panel-${sec().generation}`}
              aria-labelledby={`tab-${sec().generation}`}
              class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900/60"
            >
              <div class="space-y-6">
                <For each={sec().entries}>
                  {(methodSection) => {
                    const method = methodSection.method as MethodKey;
                    const methodOpen = () => isMethodOpen(method);
                    let methodRef: HTMLDivElement | undefined;
                    const [mh, setMh] = createSignal('0px');
                    const [animate, setAnimate] = createSignal(false);
                    onMount(() => {
                      // Enable transitions after initial mount so default-open panels don't animate.
                      if (typeof queueMicrotask === 'function') queueMicrotask(() => setAnimate(true));
                      else setTimeout(() => setAnimate(true), 0);
                    });
                    const recalcM = () => {
                      if (methodOpen()) queueMicrotask(() => setMh(`${methodRef?.scrollHeight ?? 0}px`));
                      else setMh('0px');
                    };
                    createEffect(recalcM);
                    return (
                      <div class="space-y-3">
                        <div class="flex items-center justify-between">
                          <div class="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">{t(METHOD_LABEL_KEY[method])}</div>
                          <button
                            type="button"
                            onClick={() => toggleMethod(method)}
                            aria-expanded={methodOpen()}
                            class="inline-flex cursor-pointer items-center gap-2 rounded-full border border-blue-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-600 transition hover:bg-blue-50 dark:border-blue-500/40 dark:text-blue-300 dark:hover:bg-blue-500/10"
                          >
                            <span aria-hidden="true" class="icon-[ph--caret-down-bold] text-sm" classList={{ hidden: methodOpen() }} />
                            <span aria-hidden="true" class="icon-[ph--caret-up-bold] text-sm" classList={{ hidden: !methodOpen() }} />
                            {methodOpen() ? t('common.hide') : t('common.show')}
                          </button>
                        </div>
                        <div
                          ref={(el) => (methodRef = el as HTMLDivElement)}
                          class={`overflow-hidden ${animate() ? 'transition-all duration-300 ease-in-out' : ''}`}
                          style={{ 'max-height': mh(), opacity: methodOpen() ? 1 : 0 }}
                        >
                          <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                              <thead>
                                <tr class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                  <th class="px-3 py-2 text-left">{t('learnset.columns.move')}</th>
                                  <th class="px-3 py-2 text-left">{t('learnset.columns.type')}</th>
                                  <th class="px-3 py-2 text-left">{t('learnset.columns.category')}</th>
                                  <th class="px-3 py-2 text-right">{t('learnset.columns.power')}</th>
                                  <th class="px-3 py-2 text-right">{t('learnset.columns.accuracy')}</th>
                                  <th class="px-3 py-2 text-right">{t('learnset.columns.pp')}</th>
                                  <Show when={methodSection.method === 'level-up'}>
                                    <th class="px-3 py-2 text-right">{t('learnset.columns.level')}</th>
                                  </Show>
                                  <th class="px-3 py-2 text-left">{t('learnset.columns.version')}</th>
                                </tr>
                              </thead>
                              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                                <For each={methodSection.items}>
                                  {(entry) => {
                                    const accuracy = entry.accuracy != null ? `${entry.accuracy}%` : '—';
                                    const power = entry.power != null && entry.power !== 0 ? entry.power : '—';
                                    const pp = entry.pp != null ? entry.pp : '—';
                                    const damageClassKey = entry.damageClass ? `move.damageClass.${entry.damageClass}` : undefined;
                                    const categoryLabel = damageClassKey ? t(damageClassKey) : '—';
                                    const levelLabel = entry.level != null && entry.level > 0 ? `N.${entry.level}` : t('learnset.levelStart');
                                    const versionLabel = entry.versionGroups && entry.versionGroups.length
                                      ? entry.versionGroups
                                          .map((v) => {
                                            const key = `versionGroupName.${v}`;
                                            const translated = t(key as any) as string;
                                            return translated && translated !== key ? translated : formatName(v);
                                          })
                                          .join(', ')
                                      : '—';
                                    return (
                                      <tr class="text-gray-700 dark:text-gray-200">
                                        <td class="px-3 py-2">
                                          <Show when={entry.moveId} fallback={<span>{entry.name}</span>}>
                                            <a href={`/move/${entry.moveId}`} class="font-medium text-blue-600 hover:underline dark:text-blue-300">{entry.name}</a>
                                          </Show>
                                        </td>
                                        <td class="px-3 py-2">
                                          <Show when={entry.typeName} fallback={<span>—</span>}>
                                            {(typeName) => <TypeBox name={typeName()} size="sm" showLabel />}
                                          </Show>
                                        </td>
                                        <td class="px-3 py-2">{categoryLabel}</td>
                                        <td class="px-3 py-2 text-right tabular-nums">{power}</td>
                                        <td class="px-3 py-2 text-right tabular-nums">{accuracy}</td>
                                        <td class="px-3 py-2 text-right tabular-nums">{pp}</td>
                                        <Show when={methodSection.method === 'level-up'}>
                                          <td class="px-3 py-2 text-right tabular-nums">{levelLabel}</td>
                                        </Show>
                                        <td class="px-3 py-2 capitalize">{versionLabel}</td>
                                      </tr>
                                    );
                                  }}
                                </For>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>
          )}
        </Show>
      </div>
    </Show>
  );
}
