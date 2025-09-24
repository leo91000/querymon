import { For, Show, createMemo, createResource } from 'solid-js';
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
  versionGroup: string;
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

function idFromUrl(url?: string | null) {
  const match = url?.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : undefined;
}

export default function PokemonLearnset(props: PokemonLearnsetProps) {
  const moveIdList = createMemo(() => {
    const set = new Set<number>();
    for (const entry of props.moves || []) {
      const id = idFromUrl(entry?.move?.url);
      if (id != null) set.add(id);
    }
    return Array.from(set).sort((a, b) => a - b);
  });

  const [moveDetails] = createResource(moveIdList, async (ids) => {
    const results = await Promise.all(
      ids.map(async (id) => {
        const detail = await loadItemById('move' as ResourceName, id);
        return [id, detail] as const;
      })
    );
    return new Map(results);
  });

  const learnset = createMemo(() => {
    const moves = props.moves || [];
    const details = moveDetails();
    if (!moves.length || !details) return [] as Array<{ generation: GenerationSlug; entries: Array<{ method: MethodKey; items: LearnsetEntry[] }>; order: number }>;

    const genMap = new Map<GenerationSlug, { order: number; methods: Map<MethodKey, Map<string, LearnsetEntry>> }>();

    for (const move of moves) {
      const moveId = idFromUrl(move?.move?.url);
        const detail = moveId != null ? details.get(moveId) : undefined;
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

        const key = `${vgName}::${moveId ?? localizedName}`;
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
            versionGroup: vgName,
          });
        } else {
          const existing = methodMap.get(key)!;
          if (mappedMethod === 'level-up') {
            const level = vg?.level_learned_at ?? null;
            if (level != null && level !== 0 && (existing.level == null || existing.level === 0 || level < existing.level)) {
              existing.level = level;
            }
          }
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

  return (
    <Show when={learnset().length > 0}>
      <div class="space-y-6">
        <h3 class="text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-300">
          {t('pokemon.learnset')}
        </h3>
        <For each={learnset()}>
          {(section) => (
            <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
              <div class="mb-4 flex items-center justify-between">
                <h4 class="text-base font-semibold text-gray-800 dark:text-gray-100">{t(`move.generationName.${section.generation}`)}</h4>
              </div>
              <div class="space-y-6">
                <For each={section.entries}>
                  {(methodSection) => (
                    <div class="space-y-3">
                      <div class="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">{t(METHOD_LABEL_KEY[methodSection.method])}</div>
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
                                const versionLabel = formatName(entry.versionGroup);
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
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
}
