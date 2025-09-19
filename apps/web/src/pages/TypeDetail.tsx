import Card from '../components/Card';
import Badge from '../components/Badge';
import { For, Show, createMemo, createResource, createSignal } from 'solid-js';
import { formatName, loadItemById, type ResourceName, loadNameMap } from '../services/data';
import { t, getLocale } from '../i18n';

type TypeData = any;

const TYPE_TONE: Record<string, NonNullable<Parameters<typeof Badge>[0]['tone']>> = {
  normal: 'gray', fire: 'orange', water: 'blue', electric: 'yellow', grass: 'green', ice: 'sky', fighting: 'rose',
  poison: 'purple', ground: 'amber', flying: 'indigo', psychic: 'pink', bug: 'lime', rock: 'gray', ghost: 'violet',
  dragon: 'fuchsia', dark: 'gray', steel: 'gray', fairy: 'pink',
};

function toneForType(name?: string) {
  const k = name?.toLowerCase() || '';
  return TYPE_TONE[k] ?? 'gray';
}

function idFromUrl(url?: string | null) { const m = url?.match(/\/(\d+)\/?$/); return m ? Number(m[1]) : undefined; }

export default function TypeDetail(props: { id: number }) {
  const [data] = createResource(() => props.id, (id) => loadItemById('type' as ResourceName, id));
  const [allTypes] = createResource(async () => await fetch('/data/pokeapi/type.json', { cache: 'no-store' }).then(r=>r.json()));
  function localizeType(typeId?: number, fallback?: string) {
    const loc = getLocale() as 'en'|'fr'|'jp';
    const lang = { en:'en', fr:'fr', jp:'ja' }[loc] || 'en';
    const entry = (allTypes()||[]).find((t:any)=>t.id===typeId);
    const names = entry?.names || [];
    if (lang==='ja') {
      const ja = names.find((n:any)=>n.language?.name==='ja')?.name;
      if (ja) return ja;
      const jaHrkt = names.find((n:any)=>n.language?.name==='ja-Hrkt')?.name;
      if (jaHrkt) return jaHrkt;
    }
    return names.find((n:any)=>n.language?.name===lang)?.name || fallback || '';
  }
  const type = createMemo(() => data() as TypeData | undefined);
  const dmg = createMemo(() => type()?.damage_relations || {});
  const localizedTypeName = createMemo(() => {
    const names = type()?.names || [];
    const map = { en: 'en', fr: 'fr', jp: 'ja' } as const;
    const loc = (getLocale() as 'en'|'fr'|'jp');
    const want = map[loc] || 'en';
    if (want === 'ja') {
      const ja = names.find((n: any) => n.language?.name === 'ja')?.name;
      if (ja) return ja;
      const jaHrkt = names.find((n: any) => n.language?.name === 'ja-Hrkt')?.name;
      if (jaHrkt) return jaHrkt;
    }
    return names.find((n: any) => n.language?.name === want)?.name || type()?.name;
  });

  const offense = createMemo(() => ({
    super: (dmg().double_damage_to || []).map((x: any) => x.type || x),
    not: (dmg().half_damage_to || []).map((x: any) => x.type || x),
    none: (dmg().no_damage_to || []).map((x: any) => x.type || x),
  }));
  const defense = createMemo(() => ({
    weak: (dmg().double_damage_from || []).map((x: any) => x.type || x),
    resist: (dmg().half_damage_from || []).map((x: any) => x.type || x),
    immune: (dmg().no_damage_from || []).map((x: any) => x.type || x),
  }));

  const [showAllMoves, setShowAllMoves] = createSignal(false);
  const [showAllPokemon, setShowAllPokemon] = createSignal(false);
  const movesList = createMemo(() => type()?.moves || []);
  const pokemonList = createMemo(() => type()?.pokemon || []);
  const visibleMoves = createMemo(() => showAllMoves() ? movesList() : movesList().slice(0, 48));
  const visiblePokemon = createMemo(() => showAllPokemon() ? pokemonList() : pokemonList().slice(0, 48));

  return (
    <Show when={type()} fallback={<div class="text-gray-500">{t('detail.loading')}</div>}>
      {(td) => (
        <div class="space-y-6">
          <Card class="overflow-hidden p-0">
            <div class="grid grid-cols-1 md:grid-cols-[1fr_320px]">
              <div class="p-6">
                <div class="flex flex-wrap items-center gap-3">
                  <h2 class="text-2xl font-bold tracking-tight font-jersey">{localizedTypeName()}</h2>
                  <Badge tone={toneForType(td().name)}>{formatName(td().name)}</Badge>
                </div>

                <div class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <h3 class="mb-2 text-sm font-semibold tracking-wide text-gray-500">{t('type.offense')}</h3>
                    <RelRow label={t('type.superEffectiveVs')} list={offense().super} />
                    <RelRow label={t('type.notVeryEffectiveVs')} list={offense().not} />
                    <RelRow label={t('type.noEffectVs')} list={offense().none} />
                  </div>
                  <div>
                    <h3 class="mb-2 text-sm font-semibold tracking-wide text-gray-500">{t('type.defense')}</h3>
                    <RelRow label={t('type.weakTo')} list={defense().weak} />
                    <RelRow label={t('type.resists')} list={defense().resist} />
                    <RelRow label={t('type.immuneTo')} list={defense().immune} />
                  </div>
                </div>
              </div>
              <div class="relative flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-6 text-center text-sm text-gray-500 dark:from-gray-800 dark:to-gray-900 dark:text-gray-400">
                <div>
                  <div class="text-lg font-semibold">Type</div>
                  <div class="mt-1">{formatName(td().name)}</div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 class="mb-3 text-sm font-semibold tracking-wide text-gray-500">{t('type.moves')}</h3>
            <div class="flex flex-wrap gap-2">
              <For each={visibleMoves()}>{(m: any) => {
                const id = idFromUrl(m.url);
                return (
                  <a href={id ? `/move/${id}` : '#'} class="rounded-full border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                    <MoveName id={id} fallback={formatName(m.name)} />
                  </a>
                );
              }}</For>
              <Show when={!showAllMoves() && (movesList()?.length || 0) > 48}>
                <button type="button" class="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50" onClick={() => setShowAllMoves(true)}>
                  +{(movesList().length - 48)} {t('common.more')}
                </button>
              </Show>
            </div>
          </Card>

          <Card>
            <h3 class="mb-3 text-sm font-semibold tracking-wide text-gray-500">{t('type.pokemon')}</h3>
            <div class="flex flex-wrap gap-2">
              <For each={visiblePokemon()}>{(p: any) => {
                const id = idFromUrl(p.pokemon?.url);
                return (
                  <a href={id ? `/pokemon/${id}` : '#'} class="rounded-full border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                    <PokemonName id={id} fallback={formatName(p.pokemon?.name)} />
                  </a>
                );
              }}</For>
              <Show when={!showAllPokemon() && (pokemonList()?.length || 0) > 48}>
                <button type="button" class="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50" onClick={() => setShowAllPokemon(true)}>
                  +{(pokemonList().length - 48)} {t('common.more')}
                </button>
              </Show>
            </div>
          </Card>
        </div>
      )}
    </Show>
  );
}

function RelRow(props: { label: string; list: any[] }) {
  return (
    <div class="mb-3">
      <div class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{props.label}</div>
      <div class="flex flex-wrap gap-2">
        <For each={props.list}>{(t: any) => {
          const id = idFromUrl(t.url);
          return (
            <a href={`/type/${id}`}>
              <Badge tone={toneForType(t.name)}>
                {localizeType(id, formatName(t.name))}
              </Badge>
            </a>
          );
        }}</For>
        <Show when={(props.list?.length || 0) === 0}>
          <span class="text-sm text-gray-400">—</span>
        </Show>
      </div>
    </div>
  );
}

function PokemonName(props: { id?: number; fallback: string }) {
  const [names] = createResource(() => getLocale(), (loc) => loadNameMap('pokemon', loc as any));
  return <>{(props.id && names()?.[String(props.id)]) || props.fallback}</>;
}

function MoveName(props: { id?: number; fallback: string }) {
  const [names] = createResource(() => getLocale(), (loc) => loadNameMap('move', loc as any));
  return <>{(props.id && names()?.[String(props.id)]) || props.fallback}</>;
}

function TypeName(props: { id?: number; fallback: string }) {
  const [names] = createResource(() => getLocale(), (loc) => loadNameMap('type', loc as any));
  return <>{(props.id && names()?.[String(props.id)]) || props.fallback}</>;
}
