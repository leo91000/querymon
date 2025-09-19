import Card from '../components/Card';
import Badge from '../components/Badge';
import TypeBox from '../components/TypeBox';
import { Show, For, createMemo, createResource } from 'solid-js';
import { formatName, loadItemById, loadActualPokemonById, TYPE_ENTRIES, GROWTH_RATES } from '../services/data';
import type { ResourceName } from '../services/data';
import { t, getLocale } from '../i18n';
import { loadNameMap } from '../services/data';

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
  const [species] = createResource(() => props.id, (id) => loadItemById('pokemon-species' as ResourceName, id));
  const [pokemon] = createResource(() => props.id, (id) => loadActualPokemonById<Pokemon>(id));

  const types = createMemo(() => (pokemon()?.types || []).map((t: any) => ({ name: t.type?.name, id: idFromUrl(t.type?.url) })));
  const officialArt = createMemo(() => pokemon()?.sprites?.other?.['official-artwork']?.front_default || pokemon()?.sprites?.front_default);
  const abilities = createMemo(() => (pokemon()?.abilities || []).map((a: any) => a.ability));
  const stats = createMemo(() => (pokemon()?.stats || []).map((s: any) => ({ name: s.stat?.name, base: s.base_stat })));
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
  const allTypes = () => TYPE_ENTRIES;

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
      const id = idFromUrl(ab.ability?.url);
      const label = (id && map[String(id)]) || formatName(ab.ability?.name);
      return { id, label, hidden: ab.is_hidden };
    });
  });
  const growthRates = () => GROWTH_RATES;

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
      <Show when={species()} fallback={<div class="text-gray-500">{t('detail.loading')}</div>}>
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
                <div class="font-medium">{(() => { const arr = (species()?.egg_groups || []) as any[]; const names = arr.map(g => { const id = idFromUrl(g.url); return (id && eggGroupNames()?.[String(id)]) || formatName(g.name); }); return names.join(', ') || '—'; })()}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.eggCycles')}</div>
                <div class="font-medium">{species()?.hatch_counter ?? '—'}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">{t('pokemon.effortPoints')}</div>
                <div class="font-medium">{(() => {
                  const eps = (pokemon()?.stats||[]).filter((s:any)=>s.effort>0).map((s:any)=>`+${s.effort} ${t(`stat.${s.stat?.name}`)}`);
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
                  const gid = idFromUrl(species()?.growth_rate?.url);
                  const g = (growthRates()||[]).find((x:any)=>x.id===gid);
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
                <div class="font-medium">{(() => { const id = idFromUrl(species()?.color?.url); return (id && colorNames()?.[String(id)]) || formatName(species()?.color?.name || '—'); })()}</div>
              </div>
              
            </div>
          </Card>
        </div>
      </Show>
    </div>
  );
}
  function fmt(tpl: string, params: Record<string, string | number>): string {
    return String(tpl).replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? String(params[k]) : `{${k}}`));
  }
