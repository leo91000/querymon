import Card from '../components/Card';
import Badge from '../components/Badge';
import { Show, For, createMemo, createResource } from 'solid-js';
import { formatName, loadItemById } from '../services/data';
import type { ResourceName } from '../services/data';
import { t } from '../i18n';

type Species = any;
type Pokemon = any;

const TYPE_TONE: Record<string, NonNullable<Parameters<typeof Badge>[0]['tone']>> = {
  normal: 'gray', fire: 'orange', water: 'blue', electric: 'yellow', grass: 'green', ice: 'sky', fighting: 'rose',
  poison: 'purple', ground: 'amber', flying: 'indigo', psychic: 'pink', bug: 'lime', rock: 'gray', ghost: 'violet',
  dragon: 'fuchsia', dark: 'gray', steel: 'gray', fairy: 'pink',
};

function toneForType(name: string) {
  const k = name?.toLowerCase();
  return TYPE_TONE[k] ?? 'gray';
}

function kg(weightHectograms: number) { return (weightHectograms / 10).toFixed(1); }
function m(heightDecimeters: number) { return (heightDecimeters / 10).toFixed(1); }
function idFromUrl(url?: string | null) { const m = url?.match(/\/(\d+)\/?$/); return m ? Number(m[1]) : undefined; }

function pickFlavor(species: Species, lang: 'en'|'fr'|'jp') {
  const map: Record<'en'|'fr'|'jp', string> = { en: 'en', fr: 'fr', jp: 'ja' } as any;
  const wanted = map[lang] || 'en';
  const list = species?.flavor_text_entries as any[] | undefined;
  if (!list) return undefined;
  const found = list.find(e => e.language?.name === wanted) || list.find(e => e.language?.name === 'en');
  return found?.flavor_text?.replace(/[\n\f]/g, ' ');
}

export default function PokemonDetail(props: { id: number }) {
  const speciesR = createResource(() => props.id, (id) => loadItemById('pokemon' as ResourceName, id));
  const pokemonR = createResource(() => props.id, (id) => loadItemById('pokemon' as any as ResourceName, id,));
  // note: loadItemById('pokemon') is aliased to species in services, so we directly load real pokemon too:
  const actualPokemonR = createResource(async () => {
    const id = props.id;
    // manual load from pokemon dataset
    const idmap = await fetch('/data/pokeapi/pokemon.idmap.json').then(r=>r.json());
    const file = idmap[String(id)];
    if (!file) return undefined;
    const arr: Pokemon[] = await fetch(`/data/pokeapi/${file}`).then(r=>r.json());
    return arr.find(p => (p as any).id === id);
  });

  const species = createMemo(() => speciesR[0]());
  const pokemon = createMemo(() => actualPokemonR[0]() as Pokemon | undefined);

  const types = createMemo(() => (pokemon()?.types || []).map((t: any) => t.type?.name));
  const officialArt = createMemo(() => pokemon()?.sprites?.other?.['official-artwork']?.front_default || pokemon()?.sprites?.front_default);
  const abilities = createMemo(() => (pokemon()?.abilities || []).map((a: any) => a.ability));
  const stats = createMemo(() => (pokemon()?.stats || []).map((s: any) => ({ name: s.stat?.name, base: s.base_stat })));

  return (
    <div class="space-y-6">
      <Show when={species()} fallback={<div class="text-gray-500">{t('detail.loading')}</div>}>
        <Card class="overflow-hidden p-0">
          <div class="grid grid-cols-1 md:grid-cols-[1fr_320px]">
            <div class="p-6">
              <div class="flex items-center gap-3">
                <h2 class="text-2xl font-bold tracking-tight"><span class="mr-2 font-jersey text-blue-600 dark:text-blue-400">#{String(props.id).padStart(3, '0')}</span>{formatName(species()?.name)}</h2>
                <div class="flex gap-2">
                  <For each={types()}>{(tName) => <Badge tone={toneForType(tName)}>{formatName(tName)}</Badge>}</For>
                </div>
              </div>
              <p class="mt-3 max-w-prose text-gray-600 dark:text-gray-300">{pickFlavor(species(), (localStorage.getItem('locale') as any) || 'en')}</p>

              <div class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
                <div class="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400"><span class="icon-[ph--scales] text-blue-600 dark:text-blue-400"></span> {t('pokemon.weight')}</div>
                  <div class="text-lg font-semibold">{pokemon() ? kg(pokemon()!.weight) + ' kg' : '—'}</div>
                </div>
                <div class="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400"><span class="icon-[ph--ruler] text-blue-600 dark:text-blue-400"></span> {t('pokemon.height')}</div>
                  <div class="text-lg font-semibold">{pokemon() ? m(pokemon()!.height) + ' m' : '—'}</div>
                </div>
                <div class="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400"><span class="icon-[ph--target] text-blue-600 dark:text-blue-400"></span> {t('pokemon.captureRate')}</div>
                  <div class="text-lg font-semibold">{species()?.capture_rate ?? '—'}</div>
                </div>
              </div>

              <div class="mt-6">
                <h3 class="mb-2 text-sm font-semibold tracking-wide text-gray-500">{t('pokemon.abilities')}</h3>
                <div class="flex flex-wrap gap-2">
                  <For each={abilities()}>{(a) => {
                    const id = idFromUrl(a?.url);
                    return <a href={id ? `/ability/${id}` : '#'} class="rounded-full border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">{formatName(a?.name)}</a>;
                  }}</For>
                </div>
              </div>
            </div>

            <div class="relative flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-6 dark:from-gray-800 dark:to-gray-900">
              <Show when={officialArt()} fallback={<div class="h-56 w-56 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />}> 
                <img src={officialArt()!} alt={species()?.name} class="h-64 w-64 object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.25)]" loading="lazy" />
              </Show>
            </div>
          </div>
        </Card>

        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <h3 class="mb-3 text-sm font-semibold tracking-wide text-gray-500">{t('pokemon.baseStats')}</h3>
            <div class="space-y-2">
              <For each={stats()}>{(s) => (
                <div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="capitalize text-gray-600 dark:text-gray-300">{s.name.replace('-', ' ')}</span>
                    <span class="font-mono text-xs text-gray-500">{s.base}</span>
                  </div>
                  <div class="mt-1 h-2 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                    <div class="h-full rounded bg-blue-600 dark:bg-blue-500" style={{ width: `${Math.min(100, (s.base/255)*100)}%` }} />
                  </div>
                </div>
              )}</For>
            </div>
          </Card>

          <Card>
            <h3 class="mb-3 text-sm font-semibold tracking-wide text-gray-500">{t('pokemon.biology')}</h3>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.habitat')}</div>
                <div class="font-medium">{formatName(species()?.habitat?.name || 'Unknown')}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.growthRate')}</div>
                <div class="font-medium">{formatName(species()?.growth_rate?.name || '—')}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.eggGroups')}</div>
                <div class="font-medium">{(species()?.egg_groups || []).map((g: any) => formatName(g.name)).join(', ') || '—'}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.shape')}</div>
                <div class="font-medium">{formatName(species()?.shape?.name || '—')}</div>
              </div>
            </div>
          </Card>
        </div>
      </Show>
    </div>
  );
}
