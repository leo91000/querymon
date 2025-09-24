import Card from '../components/Card';
import Badge from '../components/Badge';
import { For, Show, createMemo, createResource, createSignal } from 'solid-js';
import { formatName, loadItemById, type ResourceName, loadList } from '../services/data';
import { t, getLocale } from '../i18n';

type Ability = any;

function idFromUrl(url?: string | null) { const m = url?.match(/\/(\d+)\/?$/); return m ? Number(m[1]) : undefined; }

function pickEffectText(ability: Ability, lang: 'en'|'fr'|'jp') {
  const map: Record<'en'|'fr'|'jp', string> = { en: 'en', fr: 'fr', jp: 'ja' } as any;
  const want = map[lang] || 'en';
  const list = ability?.effect_entries as any[] | undefined;
  if (!list) return { short: undefined, full: undefined };
  const localized = list.find((e) => e.language?.name === want);
  const english = list.find((e) => e.language?.name === 'en');
  const chosen = localized ?? (want === 'en' ? english : undefined);
  return {
    short: chosen?.short_effect?.replace(/[\n\f]/g, ' '),
    full: chosen?.effect?.replace(/[\n\f]/g, ' '),
  };
}

function pickFlavorText(ability: Ability, lang: 'en'|'fr'|'jp') {
  const map: Record<'en'|'fr'|'jp', string> = { en: 'en', fr: 'fr', jp: 'ja' } as any;
  const want = map[lang] || 'en';
  const list = ability?.flavor_text_entries as any[] | undefined;
  if (!list) return undefined;
  const all = list.filter(e => e.language?.name === want);
  const latest = all[all.length - 1] || list[list.length - 1];
  return latest?.flavor_text?.replace(/[\n\f]/g, ' ');
}

export default function AbilityDetail(props: { id: number }) {
  const [data] = createResource(() => ({ id: props.id, loc: getLocale() }), (key) => loadItemById('ability' as ResourceName, key.id));

  const ability = createMemo(() => data() as Ability | undefined);
  const locale = () => getLocale() as 'en' | 'fr' | 'jp';
  const effects = createMemo(() => pickEffectText(ability(), locale()));
  const flavor = createMemo(() => pickFlavorText(ability(), locale()));
  const [showAllPokemon, setShowAllPokemon] = createSignal(false);
  const abilityPokemon = createMemo(() => ability()?.pokemon || []);
  const filteredPokemon = createMemo(() => {
    const list = abilityPokemon();
    if (!list.length) return list;
    const seenBase = new Set<string>();
    const entries: any[] = [];
    for (const entry of list) {
      const name = entry?.name || entry?.pokemon?.name || '';
      const baseMatch = name.match(/^(.*?)-gmax$/i);
      const baseSlug = baseMatch ? baseMatch[1] : name;
      if (seenBase.has(baseSlug)) continue;
      if (baseMatch) {
        const merged = entry?.pokemon ? { ...entry, pokemon: { ...entry.pokemon, name: baseSlug } } : { ...entry, name: baseSlug };
        entries.push(merged);
      } else {
        entries.push(entry);
      }
      seenBase.add(baseSlug);
    }
    return entries;
  });
  const visiblePokemon = createMemo(() => {
    const list = filteredPokemon();
    return showAllPokemon() ? list : list.slice(0, 36);
  });

  function translateOr(key: string, fallback: string) {
    const value = t(key as any) as string;
    if (!value || value === key) return fallback;
    return value;
  }

  const localizedName = createMemo(() => {
    return ability()?.name ? String(ability()?.name) : '—';
  });

  const generationLabel = createMemo(() => {
    const slug = ability()?.generation?.name;
    if (!slug) return '—';
    return translateOr(`move.generationName.${slug}`, formatName(slug));
  });

  return (
    <Show when={ability()} fallback={<div class="text-gray-500">{t('detail.loading')}</div>}>
      {(a) => (
        <div class="space-y-6">
          <Card class="overflow-hidden p-0">
            <div class="grid grid-cols-1 md:grid-cols-[1fr_320px]">
              <div class="p-6">
                <div class="flex flex-wrap items-center gap-3">
                  <h2 class="text-2xl font-bold tracking-tight font-jersey">{localizedName()}</h2>
                  <Badge tone={'blue'}>{generationLabel()}</Badge>
                  {a().is_main_series === false && <Badge tone={'gray'}>{t('ability.spinoff')}</Badge>}
                </div>

                <div class="mt-3 space-y-2 text-gray-700 dark:text-gray-200">
                  <Show when={effects()?.short}>
                    <p class="font-medium">{effects()!.short}</p>
                  </Show>
                  <Show when={effects()?.full}>
                    <p class="text-sm text-gray-600 dark:text-gray-300">{effects()!.full}</p>
                  </Show>
                  <Show when={flavor()}>
                    <p class="text-sm text-gray-500 dark:text-gray-400">{flavor()}</p>
                  </Show>
                </div>

                <div class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
                  <StatBox label={t('ability.introducedIn')} value={generationLabel()} />
                  <StatBox label={t('ability.mainSeries')} value={a().is_main_series ? t('common.yes') : t('common.no')} />
                </div>
              </div>

              <div class="relative flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-6 text-center text-sm text-gray-500 dark:from-gray-800 dark:to-gray-900 dark:text-gray-400">
                <div>
                  <div class="text-lg font-semibold">{localizedName()}</div>
                  <div class="mt-1">{generationLabel()}</div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 class="mb-3 text-sm font-semibold tracking-wide text-gray-500">{t('ability.withAbility')}</h3>
            <div class="flex flex-wrap gap-2">
              <For each={visiblePokemon()}>{(p: any) => {
                const id = (typeof p?.id === 'number' ? p.id : idFromUrl(p?.pokemon?.url));
                const map = pokemonNameMap();
                const display = id != null && map[String(id)] ? map[String(id)] : (p?.name || p?.pokemon?.name || '—');
                return (
                  <a href={id ? `/pokemon/${id}` : '#'} class="rounded-full border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                    {display}{p.is_hidden ? ` (${t('ability.hidden')})` : ''}
                  </a>
                );
              }}</For>
              <Show when={!showAllPokemon() && (abilityPokemon()?.length || 0) > 36}>
                <button type="button" class="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50" onClick={() => setShowAllPokemon(true)}>
                  +{(abilityPokemon().length - 36)} {t('common.more')}
                </button>
              </Show>
            </div>
          </Card>
        </div>
      )}
    </Show>
  );
}

function StatBox(props: { label: string; value: any }) {
  return (
    <div class="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
      <div class="text-gray-500 dark:text-gray-400">{props.label}</div>
      <div class="text-lg font-semibold">{props.value}</div>
    </div>
  );
}
  // Localized Pokémon names for carriers (robust even if ability JSON had fallback names)
  const [pokemonList] = createResource(() => getLocale(), () => loadList('pokemon' as any));
  const pokemonNameMap = createMemo(() => {
    const list = pokemonList() || [];
    const map: Record<string, string> = {};
    for (const p of list) map[String(p.id)] = p.name;
    return map;
  });
