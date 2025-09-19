import Card from '../components/Card';
import Badge from '../components/Badge';
import { For, Show, createMemo, createResource, createSignal } from 'solid-js';
import { formatName, loadItemById, type ResourceName } from '../services/data';
import { t, getLocale } from '../i18n';

type Ability = any;

function idFromUrl(url?: string | null) { const m = url?.match(/\/(\d+)\/?$/); return m ? Number(m[1]) : undefined; }

function pickEffectText(ability: Ability, lang: 'en'|'fr'|'jp') {
  const map: Record<'en'|'fr'|'jp', string> = { en: 'en', fr: 'fr', jp: 'ja' } as any;
  const want = map[lang] || 'en';
  const list = ability?.effect_entries as any[] | undefined;
  if (!list) return { short: undefined, full: undefined };
  const found = list.find(e => e.language?.name === want) || list.find(e => e.language?.name === 'en');
  return {
    short: found?.short_effect?.replace(/[\n\f]/g, ' '),
    full: found?.effect?.replace(/[\n\f]/g, ' '),
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
  const [data] = createResource(() => props.id, (id) => loadItemById('ability' as ResourceName, id));

  const ability = createMemo(() => data() as Ability | undefined);
  const locale = () => getLocale() as 'en' | 'fr' | 'jp';
  const effects = createMemo(() => pickEffectText(ability(), locale()));
  const flavor = createMemo(() => pickFlavorText(ability(), locale()));
  const [showAllPokemon, setShowAllPokemon] = createSignal(false);
  const abilityPokemon = createMemo(() => ability()?.pokemon || []);
  const visiblePokemon = createMemo(() => showAllPokemon() ? abilityPokemon() : abilityPokemon().slice(0, 36));

  return (
    <Show when={ability()} fallback={<div class="text-gray-500">{t('detail.loading')}</div>}>
      {(a) => (
        <div class="space-y-6">
          <Card class="overflow-hidden p-0">
            <div class="grid grid-cols-1 md:grid-cols-[1fr_320px]">
              <div class="p-6">
                <div class="flex flex-wrap items-center gap-3">
                  <h2 class="text-2xl font-bold tracking-tight font-jersey">{formatName(a().name)}</h2>
                  <Badge tone={'blue'}>{formatName(a().generation?.name || '—')}</Badge>
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
                  <StatBox label={t('ability.introducedIn')} value={formatName(a().generation?.name || '—')} />
                  <StatBox label={t('ability.mainSeries')} value={a().is_main_series ? t('common.yes') : t('common.no')} />
                </div>
              </div>

              <div class="relative flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-6 text-center text-sm text-gray-500 dark:from-gray-800 dark:to-gray-900 dark:text-gray-400">
                <div>
                  <div class="text-lg font-semibold">{formatName(a().name)}</div>
                  <div class="mt-1">{formatName(a().generation?.name || '—')}</div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 class="mb-3 text-sm font-semibold tracking-wide text-gray-500">{t('ability.withAbility')}</h3>
            <div class="flex flex-wrap gap-2">
              <For each={visiblePokemon()}>{(p: any) => {
                const id = idFromUrl(p.pokemon?.url);
                return (
                  <a href={id ? `/pokemon/${id}` : '#'} class="rounded-full border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                    {formatName(p.pokemon?.name)}{p.is_hidden ? ` (${t('ability.hidden')})` : ''}
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
