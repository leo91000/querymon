import Card from '../components/Card';
import Badge from '../components/Badge';
import TypeBox from '../components/TypeBox';
import { For, Show, createMemo, createResource, createSignal } from 'solid-js';
import { formatName, loadItemById, type ResourceName, loadList } from '../services/data';
import { t, getLocale } from '../i18n';

type Move = any;

const TYPE_TONE: Record<string, NonNullable<Parameters<typeof Badge>[0]['tone']>> = {
  normal: 'gray', fire: 'orange', water: 'blue', electric: 'yellow', grass: 'green', ice: 'sky', fighting: 'rose',
  poison: 'purple', ground: 'amber', flying: 'indigo', psychic: 'pink', bug: 'lime', rock: 'gray', ghost: 'violet',
  dragon: 'fuchsia', dark: 'gray', steel: 'gray', fairy: 'pink',
};

const CLASS_TONE: Record<string, NonNullable<Parameters<typeof Badge>[0]['tone']>> = {
  physical: 'red',
  special: 'blue',
  status: 'gray',
};

function toneForType(name?: string) {
  const k = name?.toLowerCase() || '';
  return TYPE_TONE[k] ?? 'gray';
}

const TYPE_ICON: Record<string, string> = {
  normal: 'ph--circle',
  fire: 'ph--fire',
  water: 'ph--drop',
  electric: 'ph--lightning',
  grass: 'ph--leaf',
  ice: 'ph--snowflake',
  fighting: 'ph--fist',
  poison: 'ph--skull',
  ground: 'ph--mountains',
  flying: 'ph--bird',
  psychic: 'ph--brain',
  bug: 'ph--bug',
  rock: 'ph--cube',
  ghost: 'ph--ghost',
  dragon: 'ph--dribbble-logo',
  dark: 'ph--moon',
  steel: 'ph--gear-six',
  fairy: 'ph--sparkle'
};

function typeIconClass(name?: string) {
  const k = (name || '').toLowerCase();
  return TYPE_ICON[k] || 'ph--star';
}

const TONE_BG: Record<string, string> = {
  gray: 'bg-gray-500 ring-gray-300',
  orange: 'bg-orange-500 ring-orange-300',
  blue: 'bg-blue-500 ring-blue-300',
  yellow: 'bg-yellow-500 ring-yellow-300',
  green: 'bg-green-500 ring-green-300',
  sky: 'bg-sky-500 ring-sky-300',
  rose: 'bg-rose-500 ring-rose-300',
  purple: 'bg-purple-500 ring-purple-300',
  amber: 'bg-amber-500 ring-amber-300',
  indigo: 'bg-indigo-500 ring-indigo-300',
  pink: 'bg-pink-500 ring-pink-300',
  lime: 'bg-lime-500 ring-lime-300',
  violet: 'bg-violet-500 ring-violet-300',
  fuchsia: 'bg-fuchsia-500 ring-fuchsia-300'
};

function typeToneBg(name?: string) {
  const tone = toneForType(name);
  return TONE_BG[tone] || TONE_BG.gray;
}

function idFromUrl(url?: string | null) { const m = url?.match(/\/(\d+)\/?$/); return m ? Number(m[1]) : undefined; }

function pickEffectText(move: Move, lang: 'en'|'fr'|'jp') {
  const map: Record<'en'|'fr'|'jp', string> = { en: 'en', fr: 'fr', jp: 'ja' } as any;
  const want = map[lang] || 'en';
  const list = move?.effect_entries as any[] | undefined;
  if (!list) return undefined;
  const found = list.find((e) => e.language?.name === want);
  if (!found && want !== 'en') return undefined;
  const fallback = found ?? list.find((e) => e.language?.name === 'en');
  let txt = fallback?.short_effect || fallback?.effect;
  if (!txt) return undefined;
  const ec = move?.effect_chance ?? move?.meta?.stat_chance ?? move?.meta?.flinch_chance;
  txt = txt.replaceAll('$effect_chance', String(ec ?? '')); // PokeAPI placeholder
  return txt.replace(/[\n\f]/g, ' ');
}

function pickFlavorText(move: Move, lang: 'en'|'fr'|'jp') {
  const map: Record<'en'|'fr'|'jp', string> = { en: 'en', fr: 'fr', jp: 'ja' } as any;
  const want = map[lang] || 'en';
  const list = move?.flavor_text_entries as any[] | undefined;
  if (!list) return undefined;
  const all = list.filter(e => e.language?.name === want);
  const latest = all[all.length - 1] || list[list.length - 1];
  return latest?.flavor_text?.replace(/[\n\f]/g, ' ');
}

export default function MoveDetail(props: { id: number }) {
  const [data] = createResource(
    () => ({ id: props.id, loc: getLocale() }),
    (key) => loadItemById('move' as ResourceName, key.id)
  );

  const move = createMemo(() => data() as Move | undefined);
  const typeName = createMemo(() => move()?.type?.name);
  const damageClass = createMemo(() => move()?.damage_class?.name);
  const locale = () => getLocale() as 'en' | 'fr' | 'jp';
  const effectText = createMemo(() => pickEffectText(move(), locale()));
  const flavorText = createMemo(() => pickFlavorText(move(), locale()));
  const [showAllLearners, setShowAllLearners] = createSignal(false);
  const learners = createMemo(() => move()?.learned_by_pokemon || []);
  const visibleLearners = createMemo(() => showAllLearners() ? learners() : learners().slice(0, 24));
  // Localized Pokémon names for learners
  const [pokemonList] = createResource(() => getLocale(), () => loadList('pokemon' as any));
  const pokemonNameMap = createMemo(() => {
    const list = pokemonList() || [];
    const map: Record<string, string> = {};
    for (const p of list) map[String(p.id)] = p.name;
    return map;
  });

  function translateOr(key: string, fallback: string) {
    const value = t(key as any) as string;
    if (!value || value === key) return fallback;
    return value;
  }

  const localizedName = createMemo(() => move()?.name ? String(move()?.name) : '—');

  const damageClassLabel = createMemo(() => {
    const slug = damageClass()?.toLowerCase();
    if (!slug) return undefined;
    return translateOr(`move.damageClass.${slug}`, formatName(slug));
  });

  const targetLabel = createMemo(() => {
    const slug = move()?.target?.name;
    if (!slug) return '—';
    return translateOr(`move.target.${slug}`, formatName(slug));
  });

  const generationLabel = createMemo(() => {
    const slug = move()?.generation?.name;
    if (!slug) return '—';
    return translateOr(`move.generationName.${slug}`, formatName(slug));
  });

  const ailmentLabel = createMemo(() => {
    const slug = move()?.meta?.ailment?.name;
    if (!slug || slug === 'none') return '—';
    return translateOr(`move.ailmentName.${slug}`, formatName(slug));
  });

  return (
    <Show when={move()} fallback={<div class="text-gray-500">{t('detail.loading')}</div>}>
      {(m) => (
        <div class="space-y-6">
          <Card class="overflow-hidden p-0">
            <div class="grid grid-cols-1 md:grid-cols-[1fr_240px]">
              <div class="p-6">
                <div class="flex flex-wrap items-center gap-3">
                  <h2 class="text-2xl font-bold tracking-tight font-jersey">{localizedName()}</h2>
                  <TypeBox name={typeName() || undefined} size="sm" link />
                  {damageClass() && (
                    <Badge tone={CLASS_TONE[damageClass()!] || 'gray'}>{damageClassLabel()}</Badge>
                  )}
                </div>

                <p class="mt-3 max-w-prose text-gray-600 dark:text-gray-300">
                  {effectText() || flavorText()}
                </p>

                <div class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
                  <StatBox label={t('move.power')} value={m().power ?? '—'} />
                  <StatBox label={t('move.accuracy')} value={m().accuracy != null ? `${m().accuracy}%` : '—'} />
                  <StatBox label={t('move.pp')} value={m().pp ?? '—'} />
                  <StatBox label={t('move.priority')} value={m().priority ?? 0} />
                  <StatBox label={t('move.target')} value={targetLabel()} />
                  <StatBox label={t('move.generation')} value={generationLabel()} />
                </div>
              </div>

              <div class="relative flex items-center justify-center p-4">
                <div class={`flex h-20 w-20 items-center justify-center rounded-full text-white ring-4 ${typeToneBg(typeName())}`}>
                  <span class={`icon-[${typeIconClass(typeName())}] text-4xl`}></span>
                </div>
              </div>
            </div>
          </Card>

          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <h3 class="mb-3 text-sm font-semibold tracking-wide text-gray-500">{t('move.meta')}</h3>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <MetaRow label={t('move.ailment')} value={ailmentLabel()} />
                <MetaRow label={t('move.critRate')} value={m().meta?.crit_rate ?? 0} />
                <MetaRow label={t('move.drain')} value={m().meta?.drain ? `${m().meta.drain}%` : '0%'} />
                <MetaRow label={t('move.healing')} value={m().meta?.healing ? `${m().meta.healing}%` : '0%'} />
                <MetaRow label={t('move.flinchChance')} value={(m().meta?.flinch_chance ?? 0) + '%'} />
                <MetaRow label={t('move.effectChance')} value={(m().effect_chance ?? 0) + '%'} />
                <MetaRow label={t('move.hits')} value={m().meta?.min_hits ? `${m().meta.min_hits}-${m().meta?.max_hits ?? m().meta?.min_hits}` : '—'} />
                <MetaRow label={t('move.turns')} value={m().meta?.min_turns ? `${m().meta.min_turns}-${m().meta?.max_turns ?? m().meta?.min_turns}` : '—'} />
              </div>
              <Show when={(m().stat_changes?.length || 0) > 0}>
                <div class="mt-4">
                  <div class="mb-1 text-sm font-semibold tracking-wide text-gray-500">{t('move.statChanges')}</div>
                  <ul class="text-sm">
                    <For each={m().stat_changes}>{(sc: any) => (
                      <li class="flex items-center justify-between border-b border-gray-100 py-1 text-gray-700 last:border-none dark:border-gray-700 dark:text-gray-200">
                        <span>{t(`stat.${sc.stat?.name}`)}</span>
                        <span class="font-mono">{sc.change > 0 ? '+' : ''}{sc.change}</span>
                      </li>
                    )}</For>
                  </ul>
                </div>
              </Show>
            </Card>

            <Card>
              <h3 class="mb-3 text-sm font-semibold tracking-wide text-gray-500">{t('move.learnedBy')}</h3>
              <div class="flex flex-wrap gap-2">
                <For each={visibleLearners()}>{(p: any) => {
                  const id = (typeof p?.id === 'number' ? p.id : idFromUrl(p?.url));
                  const label = () => {
                    // Recompute on locale or list updates
                    const map = pokemonNameMap();
                    const fromList = id != null ? map[String(id)] : undefined;
                    const fromMove = p?.name ? String(p.name) : undefined;
                    return fromList || fromMove || '—';
                  };
                  return (
                    <a href={id ? `/pokemon/${id}` : '#'} class="rounded-full border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                      {label()}
                    </a>
                  );
                }}</For>
                <Show when={!showAllLearners() && (learners()?.length || 0) > 24}>
                  <button type="button" class="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50" onClick={() => setShowAllLearners(true)}>
                    +{(learners().length - 24)} {t('common.more')}
                  </button>
                </Show>
              </div>
            </Card>
          </div>
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

function MetaRow(props: { label: string; value: any }) {
  return (
    <div>
      <div class="text-gray-500 dark:text-gray-400">{props.label}</div>
      <div class="font-medium">{props.value}</div>
    </div>
  );
}
