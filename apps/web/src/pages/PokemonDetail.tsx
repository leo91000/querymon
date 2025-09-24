import Card from '../components/Card';
import Badge from '../components/Badge';
import TypeBox from '../components/TypeBox';
import PokemonLearnset from '../components/PokemonLearnset';
import { Show, For, createMemo, createResource, onMount } from 'solid-js';
import { formatName, loadItemById, loadTypeEntries, loadGrowthRates } from '../services/data';
import type { ResourceName } from '../services/data';
import { t, getLocale } from '../i18n';
import { loadNameMap } from '../services/data';

type Species = any;
type PageData = any;

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
  onMount(() => console.debug('[PokemonDetail] mount id', props.id));
  const [data] = createResource(() => props.id, (id) => loadItemById<PageData>('pokemon' as ResourceName, id));
  const [speciesFull] = createResource(() => props.id, (id) => loadItemById('pokemon-species' as ResourceName, id));
  const pokemon = createMemo(() => data());
  const species = createMemo(() => data()?.species);

  const types = createMemo(() => (pokemon()?.types || []).map((t: any) => ({ name: t?.name, id: t?.id })));
  const officialArt = createMemo(() => pokemon()?.sprites?.official_artwork || pokemon()?.sprites?.front_default);
  const abilities = createMemo(() => (pokemon()?.abilities || []));
  const stats = createMemo(() => (pokemon()?.stats || []).map((s: any) => ({ name: s?.name, base: s?.base })));
  const locale = () => getLocale() as 'en' | 'fr' | 'jp';
  const flavorText = createMemo(() => pickFlavor(species(), locale()));
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
  const [growthRateNames] = createResource(() => locale(), (loc) => loadNameMap('growth-rate' as any, loc as any));
  const [eggGroupNames] = createResource(() => locale(), (loc) => loadNameMap('egg-group' as any, loc as any));
  const [colorNames] = createResource(() => locale(), (loc) => loadNameMap('pokemon-color' as any, loc as any));
  const [abilityNames] = createResource(() => locale(), (loc) => loadNameMap('ability' as any, loc as any));
  const [moveNames] = createResource(() => locale(), (loc) => loadNameMap('move', loc as any));
  const [growthRatesData] = createResource(loadGrowthRates);
  const [typeEntries] = createResource(loadTypeEntries);
  const [pokemonNames] = createResource(() => locale(), (loc) => loadNameMap('pokemon', loc as any));
  const allTypes = () => typeEntries() || [];

  const chainId = createMemo(() => {
    const url = speciesFull()?.evolution_chain?.url;
    const match = typeof url === 'string' ? url.match(/\/(\d+)\/?$/) : undefined;
    return match ? Number(match[1]) : undefined;
  });

  const [evolutionChain] = createResource(chainId, (id) => (id ? loadItemById('evolution-chain' as ResourceName, id) : undefined));

  type EvolutionStageEntry = {
    id?: number;
    name: string;
    sprite: string;
    isCurrent: boolean;
    details: any[];
  };

  function buildEvolutionStages() {
    const chain = evolutionChain()?.chain;
    if (!chain) return [] as EvolutionStageEntry[][];
    const stages: EvolutionStageEntry[][] = [];
    const namesMap = pokemonNames() || {};

    const visit = (node: any, stageIndex: number) => {
      const speciesUrl = node?.species?.url as string | undefined;
      const speciesId = speciesUrl ? idFromUrl(speciesUrl) : undefined;
      const localizedName = speciesId != null && namesMap[String(speciesId)]
        ? namesMap[String(speciesId)]
        : formatName(node?.species?.name || '');

      if (!stages[stageIndex]) stages[stageIndex] = [];

      stages[stageIndex].push({
        id: speciesId,
        name: localizedName,
        sprite: speciesId ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${speciesId}.png` : '',
        isCurrent: speciesId === props.id,
        details: Array.isArray(node?.evolution_details) ? node.evolution_details : [],
      });

      for (const child of node?.evolves_to || []) {
        visit(child, stageIndex + 1);
      }
    };

    visit(chain, 0);
    return stages;
  }

  const evolutionStages = createMemo(buildEvolutionStages);
  const hasEvolution = createMemo(() => {
    const stages = evolutionStages();
    if (!stages || stages.length === 0) return false;
    if (stages.length > 1) return true;
    return (stages[0]?.length || 0) > 1;
  });

  function summarizeEvolutionDetails(details: any[]): string[] {
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
    const want = locale();
    const lang = { en: 'en', fr: 'fr', jp: 'ja' }[want as 'en'|'fr'|'jp'] || 'en';
    const entry = (allTypes() || []).find((t:any)=>t.id===typeId);
    if (!entry) return fallback || '';
    const names = entry.names || [];
    if (lang === 'ja') {
      const ja = names.find((n:any)=>n.language?.name==='ja')?.name;
      if (ja) return ja;
      const jaHrkt = names.find((n:any)=>n.language?.name==='ja-Hrkt')?.name;
      if (jaHrkt) return jaHrkt;
    }
    return names.find((n:any)=>n.language?.name===lang)?.name || fallback || '';
  }

  const localizedTypeLabels = createMemo(() => {
    const _ = locale();
    return types().map((t) => ({ id: t.id, tone: toneForType(t.name), label: localizeTypeName(t.id, formatName(t.name)) }));
  });

  const localizedAbilities = createMemo(() => {
    const _ = locale();
    const map = abilityNames() || {};
    return (pokemon()?.abilities || []).map((ab: any) => {
      const id = ab?.id;
      const label = (id && map[String(id)]) || formatName(ab?.name);
      return { id, label, hidden: ab?.hidden };
    });
  });

  const localizedName = createMemo(() => {
    const names = species()?.names || [];
    const map = { en: 'en', fr: 'fr', jp: 'ja' } as const;
    const loc = (getLocale() as 'en'|'fr'|'jp');
    const want = map[loc] || 'en';
    if (want === 'ja') {
      const ja = names.find((n: any) => n.language?.name === 'ja')?.name;
      if (ja) return ja;
      const jaHrkt = names.find((n: any) => n.language?.name === 'ja-Hrkt')?.name;
      if (jaHrkt) return jaHrkt;
    }
    return names.find((n: any) => n.language?.name === want)?.name || species()?.name;
  });

  return (
    <div class="space-y-6">
      <Show when={pokemon() || species()} fallback={<div class="text-gray-500">{t('detail.loading')}</div>}>
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
              </div>
              <p class="mt-3 max-w-prose text-gray-600 dark:text-gray-300">{flavorText()}</p>

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
                  <For each={localizedAbilities()}>{(ab) => (
                    <a href={ab.id ? `/ability/${ab.id}` : '#'} class="rounded-full border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                      {ab.label}{ab.hidden ? ` (${t('ability.hidden')})` : ''}
                    </a>
                  )}</For>
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
                    <span class="text-gray-600 dark:text-gray-300">{t(`stat.${s.name}`)}</span>
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
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.category')}</div>
                <div class="font-medium">{(() => {
                  const gens = species()?.genera || [];
                  const map = { en: 'en', fr: 'fr', jp: 'ja' } as const;
                  const want = map[locale()] || 'en';
                  return gens.find((g:any)=>g.language?.name===want)?.genus || gens.find((g:any)=>g.language?.name==='en')?.genus || '—';
                })()}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.height')}</div>
                <div class="font-medium">{(() => {
                  const hdm = pokemon()?.height ?? 0; const m = (hdm/10).toFixed(1);
                  const totalIn = Math.round((hdm/10) / 0.0254);
                  const ft = Math.floor(totalIn/12); const inches = totalIn - ft*12;
                  return fmt(t('pokemon.heightWithImperial') as unknown as string, { m, ft, in: inches });
                })()}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.weight')}</div>
                <div class="font-medium">{(() => {
                  const hg = pokemon()?.weight ?? 0; const kg = (hg/10).toFixed(1);
                  const lb = (parseFloat(kg)*2.20462).toFixed(1);
                  return fmt(t('pokemon.weightWithImperial') as unknown as string, { kg, lb });
                })()}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.eggGroups')}</div>
                <div class="font-medium">{(() => { const arr = (species()?.egg_groups || []) as any[]; const names = arr.map(g => { const id = g?.id; return (id && eggGroupNames()?.[String(id)]) || formatName(g?.name); }); return names.join(', ') || '—'; })()}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.eggCycles')}</div>
                <div class="font-medium">{species()?.hatch_counter ?? '—'}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.effortPoints')}</div>
                <div class="font-medium">{(() => {
                  const eps = (pokemon()?.stats||[]).filter((s:any)=>s.effort>0).map((s:any)=>`+${s.effort} ${t(`stat.${s.name}`)}`);
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
                  const gid = species()?.growth_rate?.id;
                  const g = (growthRatesData()||[]).find((x:any)=>x.id===gid);
                  const e = g?.levels?.find((l:any)=>l.level===100)?.experience;
                  const grp = gid ? growthRateNames()?.[String(gid)] : undefined;
                  if (e == null) return '—';
                  const val = num(e);
                  return grp ? `${val} (${grp})` : `${val}`;
                })()}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.gender')}</div>
                <div class="font-medium">{(() => { const gr = species()?.gender_rate; if (gr===-1) return t('pokemon.genderless'); const female = (gr*12.5).toFixed(1); const male = (100 - gr*12.5).toFixed(1); return `${female}% ${t('pokemon.female')} ; ${male}% ${t('pokemon.male')}`; })()}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.color')}</div>
                <div class="font-medium">{(() => { const id = species()?.color?.id; return (id && colorNames()?.[String(id)]) || formatName(species()?.color?.name || '—'); })()}</div>
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
                              const hints = summarizeEvolutionDetails(entry.details);
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
                                    <For each={hints}>{(hint) => (
                                      <span class="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:bg-blue-500/20 dark:text-blue-200">{hint}</span>
                                    )}</For>
                                    <Show when={hints.length === 0}>
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
          moves={pokemon()?.moves}
          locale={locale()}
          moveNames={moveNames()}
        />
      </Show>
    </div>
  );
}
  function fmt(tpl: string, params: Record<string, string | number>): string {
    return String(tpl).replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? String(params[k]) : `{${k}}`));
  }
