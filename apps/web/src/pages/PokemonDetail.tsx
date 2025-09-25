import Card from '../components/Card';
import Badge from '../components/Badge';
import TypeBox from '../components/TypeBox';
import PokemonLearnset from '../components/PokemonLearnset';
import { Show, For, createMemo, createResource, createSignal } from 'solid-js';
import { formatName, loadItemById, loadGrowthRatesLite, loadList } from '../services/data';
import type { ResourceName } from '../services/data';
import type { PokemonDetailData, PokemonTypeRef, PokemonAbilityRef, SpeciesNamesEntry, NamedRef } from '../types/pokeapi';
import { t, getLocale, type Locale } from '../i18n';
import { pick } from 'lodash-es';
import { LOCALE_TO_POKEAPI } from '../constants/locale';
import Skeleton from '../components/Skeleton';
import PokemonSpriteViewer from '../components/PokemonSpriteViewer';
import { addLocalFavorite } from '../services/favorites';
import { authClient } from '../services/authClient';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../api/src/trpc/router';

type Species = PokemonDetailData['species'];
type PageData = PokemonDetailData;

const TYPE_TONE: Record<string, NonNullable<Parameters<typeof Badge>[0]['tone']>> = {
  normal: 'gray', fire: 'orange', water: 'blue', electric: 'yellow', grass: 'green', ice: 'sky', fighting: 'rose',
  poison: 'purple', ground: 'amber', flying: 'indigo', psychic: 'pink', bug: 'lime', rock: 'gray', ghost: 'violet',
  dragon: 'fuchsia', dark: 'gray', steel: 'gray', fairy: 'pink',
};

function toneForType(name?: string) {
  const k = (name || '').toLowerCase();
  return TYPE_TONE[k] ?? 'gray';
}

function kg(weightHectograms: number) { return (weightHectograms / 10).toFixed(1); }
function m(heightDecimeters: number) { return (heightDecimeters / 10).toFixed(1); }
function idFromUrl(url?: string | null) { const m = url?.match(/\/(\d+)\/?$/); return m ? Number(m[1]) : undefined; }

function findLocalFlavor(species: Species, lang: Locale): { text?: string; hasWanted: boolean } {
  const list = species?.flavor_text_entries;
  if (!list) return { text: undefined, hasWanted: false };
  const wanted = lang === 'jp' ? ['ja', 'ja-Hrkt'] : [lang];
  const foundWanted = list.find((e) => wanted.includes(e?.language?.name || ''));
  if (foundWanted?.flavor_text) return { text: String(foundWanted.flavor_text).replace(/[\n\f]/g, ' '), hasWanted: true };
  const en = list.find((e) => e?.language?.name === 'en');
  return { text: en?.flavor_text ? String(en.flavor_text).replace(/[\n\f]/g, ' ') : undefined, hasWanted: false };
}

export default function PokemonDetail(props: { id: number }) {
  const [data] = createResource(
    () => ({ id: props.id, loc: getLocale() }),
    (key) => loadItemById<PageData>('pokemon' as ResourceName, key.id),
  );
  const pokemon = createMemo(() => data());
  const speciesRaw = createMemo(() => data()?.species);
  const speciesData = createMemo(() => speciesRaw());

  
  const types = createMemo(() => {
    const list: PokemonTypeRef[] = pokemon()?.types ?? [];
    return list.map((t) => {
      const typeRef = t?.type || t;
      const name = typeRef?.name || t?.name || '';
      const url = (typeRef && typeof typeRef === 'object' && 'url' in (typeRef as any)) ? (typeRef as NamedRef).url : undefined;
      const id = t?.id ?? idFromUrl(url);
      return { name, id };
    });
  });

  const officialArt = createMemo(() => {
    const sprites = pokemon()?.sprites;
    if (!sprites) return undefined;
    if (sprites.official_artwork) return sprites.official_artwork;
    if (sprites.front_default) return sprites.front_default;
    const other = sprites.other;
    const getStr = (grp?: unknown, key?: string) => {
      if (!grp || typeof grp !== 'object' || !key) return undefined;
      const val = (pick(grp as object, [key]) as Record<string, unknown>)[key];
      return typeof val === 'string' ? val : undefined;
    };
    const oaFront = getStr(other?.['official-artwork'], 'front_default');
    if (oaFront) return oaFront;
    const home = other?.home;
    const homeFront = getStr(home, 'front_default');
    if (homeFront) return homeFront;
    const dw = other?.['dream_world'];
    const dwFront = getStr(dw, 'front_default');
    if (dwFront) return dwFront;
    return sprites.front_default;
  });

  const abilities = createMemo(() => (pokemon()?.abilities || []));
  const stats = createMemo(() => {
    const list = (pokemon()?.stats || []) as import('../types/pokeapi').PokemonStat[];
    return list.map((s) => ({ name: s.stat?.name ?? s.name ?? '', base: s.base_stat ?? s.base, effort: s.effort }));
  });
  const locale = () => getLocale() as 'en' | 'fr' | 'jp';
  const localFlavor = createMemo(() => findLocalFlavor(speciesData(), locale()));
  const flavorText = createMemo(() => localFlavor()?.text);
  const [adding, setAdding] = createSignal(false);
  const [added, setAdded] = createSignal(false);
  // Locale-aware number formatter (JP uses native units: 億/万)
  const nf = createMemo(() => new Intl.NumberFormat(locale() === 'jp' ? 'ja' : locale()));
  function formatJaUnits(v: number): string {
    if (!Number.isFinite(v)) return '—';
    const units: { unit: number; label: string }[] = [
      { unit: 1_0000_0000, label: '億' },
      { unit: 1_0000, label: '万' }
    ];
    let n = Math.trunc(v);
    let out = '';
    for (const { unit, label } of units) {
      if (n >= unit) {
        const q = Math.floor(n / unit);
        out += `${q}${label}`;
        n = n % unit;
      }
    }
    if (n > 0 || out === '') out += String(n);
    return out;
  }
  const num = (n: number | string | undefined | null) => {
    if (n == null) return '—';
    const v = Number(n);
    if (!Number.isFinite(v)) return '—';
    if (locale() === 'jp') return formatJaUnits(v);
    return nf().format(v);
  };
  const hasEmbedded = createMemo(() => Array.isArray(pokemon()?.learnsets));
  // Only fetch legacy name maps when we don't have embedded/new data
  // New layout: growth-rates.<loc>.json provides label and exp at 100
  const [growthRatesLite] = createResource(() => getLocale(), (loc) => loadGrowthRatesLite(loc as Locale));
  const [abilityList] = createResource(() => (hasEmbedded() ? getLocale() : null), () => loadList('ability'));
  const [typeList] = createResource(() => (hasEmbedded() ? getLocale() : null), () => loadList('type'));
  // No legacy pokemon name map in new layout

  // Skip evolution chain fetch if embedded evolutions exist in the detail payload
  const embeddedEvolutions = createMemo(() => data()?.evolutions);

  type EvolutionStageEntry = {
    id?: number;
    name: string;
    sprite: string;
    isCurrent: boolean;
    details: any[];
  };

  function buildEvolutionStages() {
    const embedded = embeddedEvolutions();
    if (Array.isArray(embedded) && embedded.length > 0) {
      return embedded as unknown as EvolutionStageEntry[][];
    }
    return [] as EvolutionStageEntry[][];
  }

  const evolutionStages = createMemo(buildEvolutionStages);
  const hasEvolution = createMemo(() => {
    const stages = evolutionStages();
    if (!stages || stages.length === 0) return false;
    if (stages.length > 1) return true;
    return (stages[0]?.length || 0) > 1;
  });

  type EvoDetail = {
    min_level?: number;
    trigger?: { name?: string };
    item?: { name?: string };
    held_item?: { name?: string };
    time_of_day?: string;
    location?: { name?: string };
    min_happiness?: number;
    min_affection?: number;
    min_beauty?: number;
    gender?: number;
    known_move?: { name?: string };
    known_move_type?: { name?: string };
    trade_species?: { name?: string };
    needs_overworld_rain?: boolean;
    turn_upside_down?: boolean;
  };
  function summarizeEvolutionDetails(details: EvoDetail[]): string[] {
    if (!Array.isArray(details) || details.length === 0) return [];
    const source = details[0] || {};
    const labels: string[] = [];
    if (source.min_level != null) {
      labels.push(fmt(t('evolution.level'), { level: source.min_level }));
    }
    if (source.trigger?.name === 'trade') {
      labels.push(t('evolution.trade'));
    }
    if (source.item?.name) {
      labels.push(fmt(t('evolution.item'), { item: formatName(source.item.name) }));
    }
    if (source.held_item?.name) {
      labels.push(fmt(t('evolution.heldItem'), { item: formatName(source.held_item.name) }));
    }
    if (source.time_of_day) {
      labels.push(fmt(t('evolution.time'), { time: formatName(source.time_of_day) }));
    }
    if (source.location?.name) {
      labels.push(fmt(t('evolution.location'), { location: formatName(source.location.name) }));
    }
    if (source.min_happiness != null) {
      labels.push(fmt(t('evolution.happiness'), { value: source.min_happiness }));
    }
    if (source.min_affection != null) {
      labels.push(fmt(t('evolution.affection'), { value: source.min_affection }));
    }
    if (source.min_beauty != null) {
      labels.push(fmt(t('evolution.beauty'), { value: source.min_beauty }));
    }
    if (source.gender === 1) labels.push(t('evolution.genderFemale'));
    if (source.gender === 2) labels.push(t('evolution.genderMale'));
    if (source.known_move?.name) {
      labels.push(fmt(t('evolution.move'), { move: formatName(source.known_move.name) }));
    }
    if (source.known_move_type?.name) {
      labels.push(fmt(t('evolution.moveType'), { type: formatName(source.known_move_type.name) }));
    }
    if (source.trade_species?.name) {
      labels.push(fmt(t('evolution.tradeFor'), { pokemon: formatName(source.trade_species.name) }));
    }
    if (source.needs_overworld_rain) {
      labels.push(t('evolution.rain'));
    }
    if (source.turn_upside_down) {
      labels.push(t('evolution.turnUpsideDown'));
    }
    return labels;
  }

  function localizeTypeName(typeId?: number, fallback?: string) {
    const list = typeList() || [];
    const name = list.find((t: any) => t.id === typeId)?.name;
    return name || fallback || '';
  }

  const localizedTypeLabels = createMemo(() => {
    const _ = locale();
    const list = types() as Array<{ id: number | undefined; name: string }>;
    return list.map((ty) => ({ id: ty.id, tone: toneForType(ty.name), label: localizeTypeName(ty.id, formatName(ty.name)) }));
  });

  const localizedAbilities = createMemo(() => {
    const list = (abilityList() || []) as Array<{ id: number; name: string }>;
    const abil: PokemonAbilityRef[] = abilities() ?? [];
    return abil.map((ab) => {
      const ref: NamedRef | undefined = ab.ability ?? (ab.name ? { name: ab.name } : undefined);
      const id = ab.id ?? idFromUrl(ref?.url);
      const name = id != null ? list.find((a) => a.id === id)?.name : undefined;
      const label = name || formatName(ref?.name || '');
      return { id, label, hidden: ab.is_hidden ?? ab.hidden };
    });
  });

  const localizedName = createMemo<string>(() => {
    const names: SpeciesNamesEntry[] = speciesData()?.names || [];
    const loc = (getLocale() as Locale);
    const want = LOCALE_TO_POKEAPI[loc] || 'en';
    if (want === 'ja') {
      const ja = names.find((n) => n.language?.name === 'ja')?.name;
      if (ja) return ja;
      const jaHrkt = names.find((n) => n.language?.name === 'ja-Hrkt')?.name;
      if (jaHrkt) return jaHrkt;
    }
    return names.find((n) => n.language?.name === want)?.name || speciesData()?.name || '—';
  });

  return (
    <div class="space-y-6">
      <Show
        when={pokemon() || speciesData()}
        fallback={
          <>
            <Card class="overflow-hidden p-0">
              <div class="grid grid-cols-1 md:grid-cols-[1fr_320px]">
                <div class="p-6">
                  <div class="flex items-center gap-3">
                    <Skeleton class="h-8 w-52" />
                    <div class="flex gap-2">
                      <Skeleton class="h-6 w-16 rounded-full" />
                      <Skeleton class="h-6 w-16 rounded-full" />
                    </div>
                  </div>
                  <div class="mt-3 space-y-2">
                    <Skeleton class="h-4 w-5/6" />
                    <Skeleton class="h-4 w-2/3" />
                    <Skeleton class="h-4 w-4/5" />
                  </div>

                  <div class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
                    <div class="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
                      <Skeleton class="mb-2 h-3 w-24" />
                      <Skeleton class="h-5 w-16" />
                    </div>
                    <div class="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
                      <Skeleton class="mb-2 h-3 w-24" />
                      <Skeleton class="h-5 w-16" />
                    </div>
                    <div class="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
                      <Skeleton class="mb-2 h-3 w-28" />
                      <Skeleton class="h-5 w-20" />
                    </div>
                  </div>

                  <div class="mt-6">
                    <Skeleton class="mb-2 h-3 w-28" />
                    <div class="flex flex-wrap gap-2">
                      <Skeleton class="h-6 w-28 rounded-full" />
                      <Skeleton class="h-6 w-24 rounded-full" />
                      <Skeleton class="h-6 w-20 rounded-full" />
                    </div>
                  </div>
                </div>

                <div class="flex items-center justify-center p-6">
                  <Skeleton class="h-40 w-40 rounded-full" />
                </div>
              </div>
            </Card>

            <Card>
              <Skeleton class="mb-3 h-4 w-40" />
              <div class="grid grid-cols-2 gap-3 text-sm">
                <For each={[...Array(8).keys()]}>{() => (
                  <div>
                    <Skeleton class="mb-1 h-3 w-24" />
                    <Skeleton class="h-4 w-32" />
                  </div>
                )}</For>
              </div>
            </Card>

            <Card>
              <Skeleton class="mb-3 h-4 w-40" />
              <div class="overflow-x-auto">
                <div class="flex min-w-[260px] items-start justify-center gap-8 pb-2">
                  <For each={[0,1,2]}>{() => (
                    <div class="flex items-center gap-6">
                      <div class="flex min-w-[180px] flex-col items-center gap-4">
                        <Skeleton class="h-3 w-20" />
                        <div class="flex flex-col items-center gap-4">
                          <div class="group relative flex w-44 flex-col items-center gap-3 rounded-2xl border border-gray-200/70 bg-white/80 p-4 shadow-sm dark:border-gray-700/70 dark:bg-gray-800/60">
                            <Skeleton class="h-28 w-28 rounded-full" />
                            <Skeleton class="h-4 w-28" />
                            <div class="flex min-h-[1.75rem] flex-wrap items-center justify-center gap-1">
                              <Skeleton class="h-4 w-16 rounded-full" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}</For>
                </div>
              </div>
            </Card>

            <Card class="p-6">
              <Skeleton class="mb-3 h-4 w-28" />
              <div class="space-y-3">
                <Skeleton class="h-8 w-64" />
                <Skeleton class="h-8 w-3/4" />
                <Skeleton class="h-8 w-5/6" />
              </div>
            </Card>
          </>
        }
      >
        <Card class="overflow-hidden p-0">
          <div class="grid grid-cols-1 md:grid-cols-[1fr_320px]">
            <div class="p-6">
              <div class="flex items-center gap-3">
                <h2 class="text-2xl font-bold tracking-tight"><span class="mr-2 font-jersey text-blue-600 dark:text-blue-400">#{String(props.id).padStart(3, '0')}</span>{localizedName()}</h2>
                <div class="flex gap-2">
                  <For each={types()}>{(t) => (
                    <TypeBox id={t.id} name={t.name} size="sm" link />
                  )}</For>
                </div>
                <button
                  class={`ml-auto rounded-full border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50 cursor-pointer ${added() ? 'opacity-70 cursor-default' : ''}`}
                  onClick={async () => {
                    if (added() || adding()) return;
                    setAdding(true);
                    try {
                      const sess = await authClient.getSession();
                      const user = (sess as any)?.user || (sess as any)?.data?.user;
                      if (!user) {
                        await addLocalFavorite(props.id);
                        setAdded(true);
                        return;
                      }
                      await fetch((import.meta.env.VITE_API_BASE?.replace(/\/?$/, '') || 'http://localhost:8787') + '/api/provision', { method: 'POST', credentials: 'include' });
                      const trpc = createTRPCProxyClient<AppRouter>({
                        links: [httpBatchLink({ url: (import.meta.env.VITE_API_BASE?.replace(/\/?$/, '') || 'http://localhost:8787') + '/trpc', fetch(url, opts){ return fetch(url, { ...opts, credentials: 'include' as const }); } })],
                      });
                      await trpc.favorites.add.mutate({ pokemonId: props.id });
                      setAdded(true);
                    } catch (e) {
                      await addLocalFavorite(props.id);
                      setAdded(true);
                    } finally {
                      setAdding(false);
                    }
                  }}
                  disabled={adding()}
                  aria-disabled={adding()}
                >
                  {added() ? 'Added' : (adding() ? 'Saving…' : '+ Favorite')}
                </button>
              </div>
              <p class="mt-3 max-w-prose text-gray-600 dark:text-gray-300">{flavorText()}</p>

              <div class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
                <div class="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400"><span class="icon-[ph--scales] text-blue-600 dark:text-blue-400"></span> {t('pokemon.weight')}</div>
                  <div class="text-lg font-semibold">{pokemon() ? kg(pokemon()?.weight ?? 0) + ' kg' : '—'}</div>
                </div>
                <div class="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400"><span class="icon-[ph--ruler] text-blue-600 dark:text-blue-400"></span> {t('pokemon.height')}</div>
                  <div class="text-lg font-semibold">{pokemon() ? m(pokemon()?.height ?? 0) + ' m' : '—'}</div>
                </div>
                <div class="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400"><span class="icon-[ph--target] text-blue-600 dark:text-blue-400"></span> {t('pokemon.captureRate')}</div>
                  <div class="text-lg font-semibold">{speciesData()?.capture_rate ?? '—'}</div>
                </div>
              </div>

              <div class="mt-6">
                <h3 class="mb-2 text-sm font-semibold tracking-wide text-gray-500">{t('pokemon.abilities')}</h3>
                <div class="flex flex-wrap gap-2">
                  <For each={localizedAbilities()}>{(ab) => (
                    <a href={ab.id ? `/ability/${ab.id}` : '#'} class="rounded-full border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                      {ab.label}{ab.hidden ? ` (${t('ability.hidden')})` : ''}
                    </a>
                  )}</For>
                </div>
              </div>
            </div>

            <div class="p-4">
              <PokemonSpriteViewer sprites={pokemon()?.sprites} name={localizedName()} />
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
                    <span class="text-gray-600 dark:text-gray-300">{t(`stat.${s.name}`)}</span>
                    <span class="font-mono text-xs text-gray-500">{s.base ?? 0}</span>
                  </div>
                  <div class="mt-1 h-2 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                    <div class="h-full rounded bg-blue-600 dark:bg-blue-500" style={{ width: `${Math.min(100, ((s.base ?? 0)/255)*100)}%` }} />
                  </div>
                </div>
              )}</For>
            </div>
          </Card>

          <Card>
            <h3 class="mb-3 text-sm font-semibold tracking-wide text-gray-500">{t('pokemon.biology')}</h3>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.category')}</div>
                <div class="font-medium">{(() => {
                  const genus = speciesData()?.genus;
                  if (genus) return genus;
                  const gens = speciesData()?.genera || [];
                  const map = { en: 'en', fr: 'fr', jp: 'ja' } as const;
                  const want = map[locale()] || 'en';
                  return gens.find((g)=>g.language?.name===want)?.genus || gens.find((g)=>g.language?.name==='en')?.genus || '—';
                })()}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.height')}</div>
                <div class="font-medium">{(() => {
                  const hdm = pokemon()?.height ?? 0; const m = (hdm/10).toFixed(1);
                  const totalIn = Math.round((hdm/10) / 0.0254);
                  const ft = Math.floor(totalIn/12); const inches = totalIn - ft*12;
                  return fmt(t('pokemon.heightWithImperial'), { m, ft, in: inches });
                })()}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.weight')}</div>
                <div class="font-medium">{(() => {
                  const hg = pokemon()?.weight ?? 0; const kg = (hg/10).toFixed(1);
                  const lb = (parseFloat(kg)*2.20462).toFixed(1);
                  return fmt(t('pokemon.weightWithImperial'), { kg, lb });
                })()}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.eggGroups')}</div>
                <div class="font-medium">{(() => { const arr = speciesData()?.egg_groups || []; const names = arr.map(g => String(g?.name || '')).filter(Boolean); return names.join(', ') || '—'; })()}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.eggCycles')}</div>
                <div class="font-medium">{speciesData()?.hatch_counter ?? '—'}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.effortPoints')}</div>
                <div class="font-medium">{(() => {
                  const eps = (stats()||[]).filter((s)=> (s as any).effort>0).map((s)=>`+${(s as any).effort} ${t(`stat.${(s as any).name}`)}`);
                  return eps.join(' , ') || '—';
                })()}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.baseExp')}</div>
                <div class="font-medium">{num(pokemon()?.base_experience)}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.expAt100')}</div>
                <div class="font-medium">{(() => {
                  const gr = speciesData()?.growth_rate;
                  if (!gr) return '—';
                  const gid = gr.id ?? idFromUrl(gr.url);
                  const slug = gr.name as string | undefined;
                  const g = (growthRatesLite() || []).find((x) => x.id === gid);
                  const e = g?.exp100;
                  const key = slug ? `growthRate.${slug}` : undefined;
                  const tr = key ? t(key) : undefined;
                  const grp = tr && tr !== key ? tr : (g?.name || slug);
                  if (e == null) return '—';
                  const val = num(e);
                  return grp ? `${val} (${grp})` : `${val}`;
                })()}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.gender')}</div>
                <div class="font-medium">{(() => { const gr = speciesData()?.gender_rate; if (gr == null) return '—'; if (gr===-1) return t('pokemon.genderless'); const female = (gr*12.5).toFixed(1); const male = (100 - gr*12.5).toFixed(1); return `${female}% ${t('pokemon.female')} ; ${male}% ${t('pokemon.male')}`; })()}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.color')}</div>
                <div class="font-medium">{speciesData()?.color?.name || '—'}</div>
              </div>
              
            </div>
          </Card>
        </div>

        <Show when={hasEvolution()}>
          <Card>
            <h3 class="mb-3 text-sm font-semibold tracking-wide text-gray-500">{t('pokemon.evolutions')}</h3>
            <div class="overflow-x-auto">
              <div class="flex min-w-[260px] items-start justify-center gap-8 pb-2">
                <For each={evolutionStages()}>
                  {(stage, idx) => (
                    <div class="flex items-center gap-6">
                      <div class="flex min-w-[180px] flex-col items-center gap-4">
                        <div class="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          {fmt(t('pokemon.evolutionStage'), { stage: idx() + 1 })}
                        </div>
                        <div class="flex flex-col items-center gap-4">
                          <For each={stage}>
                            {(entry) => {
                              const hints = createMemo(() => { const _ = getLocale(); return summarizeEvolutionDetails(entry.details); });
                              return (
                                <a
                                  href={entry.id ? `/pokemon/${entry.id}` : '#'}
                                  class={`group relative flex w-44 flex-col items-center gap-3 rounded-2xl border border-gray-200/70 bg-white/80 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-gray-700/70 dark:bg-gray-800/60 ${entry.isCurrent ? 'border-blue-400/70 ring-2 ring-blue-300/50 shadow-lg dark:ring-blue-500/40' : ''}`}
                                >
                                  <div class="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-100 via-sky-50 to-white shadow-inner dark:from-blue-500/20 dark:via-gray-800 dark:to-gray-900">
                                    <Show when={entry.sprite} fallback={<span class="text-sm text-gray-400">{t('detail.loading')}</span>}>
                                      <img src={entry.sprite} alt={entry.name} class="h-full w-full object-contain transition group-hover:scale-105" loading="lazy" />
                                    </Show>
                                  </div>
                                  <div class={`text-center text-sm font-semibold ${entry.isCurrent ? 'text-blue-600 dark:text-blue-300' : 'text-gray-800 dark:text-gray-100'}`}>
                                    {entry.name}
                                  </div>
                                  <div class="flex min-h-[1.75rem] flex-wrap items-center justify-center gap-1">
                                    <For each={hints()}>{(hint) => (
                                      <span class="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:bg-blue-500/20 dark:text-blue-200">{hint}</span>
                                    )}</For>
                                    <Show when={hints().length === 0}>
                                      <span class="invisible inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium">placeholder</span>
                                    </Show>
                                  </div>
                                </a>
                              );
                            }}
                          </For>
                        </div>
                      </div>
                      <Show when={idx() < evolutionStages().length - 1}>
                        <span class="icon-[ph--arrow-right-bold] hidden text-3xl text-gray-300 dark:text-gray-600 md:block"></span>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Card>
        </Show>

        <PokemonLearnset
          pokemonId={props.id}
          // Prefer embedded learnsets from new per-locale file; fallback to raw moves
          learnsets={pokemon()?.learnsets}
          moves={pokemon()?.moves}
          locale={locale()}
          moveNames={undefined}
        />
      </Show>
    </div>
  );
}
  function fmt(tpl: string, params: Record<string, string | number>): string {
    return String(tpl).replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? String(params[k]) : `{${k}}`));
  }
