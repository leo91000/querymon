import Card from '../components/Card';
import Badge from '../components/Badge';
import { For, Show, createMemo, createResource, createSignal } from 'solid-js';
import { formatName, loadItemById, type ResourceName } from '../services/data';
import { t } from '../i18n';

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

function idFromUrl(url?: string | null) { const m = url?.match(/\/(\d+)\/?$/); return m ? Number(m[1]) : undefined; }

function pickEffectText(move: Move, lang: 'en'|'fr'|'jp') {
  const map: Record<'en'|'fr'|'jp', string> = { en: 'en', fr: 'fr', jp: 'ja' } as any;
  const want = map[lang] || 'en';
  const list = move?.effect_entries as any[] | undefined;
  if (!list) return undefined;
  const found = list.find(e => e.language?.name === want) || list.find(e => e.language?.name === 'en');
  let txt = found?.short_effect || found?.effect;
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
  const [data] = createResource(() => props.id, (id) => loadItemById('move' as ResourceName, id));

  const move = createMemo(() => data() as Move | undefined);
  const typeName = createMemo(() => move()?.type?.name);
  const damageClass = createMemo(() => move()?.damage_class?.name);
  const effectText = createMemo(() => pickEffectText(move(), (localStorage.getItem('locale') as any) || 'en'));
  const flavorText = createMemo(() => pickFlavorText(move(), (localStorage.getItem('locale') as any) || 'en'));
  const [showAllLearners, setShowAllLearners] = createSignal(false);
  const learners = createMemo(() => move()?.learned_by_pokemon || []);
  const visibleLearners = createMemo(() => showAllLearners() ? learners() : learners().slice(0, 24));

  return (
    <Show when={move()} fallback={<div class="text-gray-500">{t('detail.loading')}</div>}>
      {(m) => (
        <div class="space-y-6">
          <Card class="overflow-hidden p-0">
            <div class="grid grid-cols-1 md:grid-cols-[1fr_320px]">
              <div class="p-6">
                <div class="flex flex-wrap items-center gap-3">
                  <h2 class="text-2xl font-bold tracking-tight font-jersey">{formatName(m().name)}</h2>
                  <Badge tone={toneForType(typeName())}>{formatName(typeName() || 'Unknown')}</Badge>
                  {damageClass() && (
                    <Badge tone={CLASS_TONE[damageClass()!] || 'gray'}>{formatName(damageClass()!)}</Badge>
                  )}
                </div>

                <p class="mt-3 max-w-prose text-gray-600 dark:text-gray-300">
                  {effectText() || flavorText()}
                </p>

                <div class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
                  <StatBox label="Power" value={m().power ?? '—'} />
                  <StatBox label="Accuracy" value={m().accuracy != null ? `${m().accuracy}%` : '—'} />
                  <StatBox label="PP" value={m().pp ?? '—'} />
                  <StatBox label="Priority" value={m().priority ?? 0} />
                  <StatBox label="Target" value={formatName(m().target?.name || '—')} />
                  <StatBox label="Generation" value={formatName(m().generation?.name || '—')} />
                </div>
              </div>

              <div class="relative flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-6 dark:from-gray-800 dark:to-gray-900">
                <div class="text-center text-sm text-gray-500 dark:text-gray-400">
                  <div class="text-lg font-semibold">{formatName(typeName() || 'Move')}</div>
                  <div class="mt-1">{formatName(damageClass() || '—')}</div>
                </div>
              </div>
            </div>
          </Card>

          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <h3 class="mb-3 text-sm font-semibold tracking-wide text-gray-500">Meta</h3>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <MetaRow label="Ailment" value={formatName(m().meta?.ailment?.name || '—')} />
                <MetaRow label="Crit rate" value={m().meta?.crit_rate ?? 0} />
                <MetaRow label="Drain" value={m().meta?.drain ? `${m().meta.drain}%` : '0%'} />
                <MetaRow label="Healing" value={m().meta?.healing ? `${m().meta.healing}%` : '0%'} />
                <MetaRow label="Flinch chance" value={(m().meta?.flinch_chance ?? 0) + '%'} />
                <MetaRow label="Effect chance" value={(m().effect_chance ?? 0) + '%'} />
                <MetaRow label="Hits" value={m().meta?.min_hits ? `${m().meta.min_hits}-${m().meta?.max_hits ?? m().meta?.min_hits}` : '—'} />
                <MetaRow label="Turns" value={m().meta?.min_turns ? `${m().meta.min_turns}-${m().meta?.max_turns ?? m().meta?.min_turns}` : '—'} />
              </div>
              <Show when={(m().stat_changes?.length || 0) > 0}>
                <div class="mt-4">
                  <div class="mb-1 text-sm font-semibold tracking-wide text-gray-500">Stat changes</div>
                  <ul class="text-sm">
                    <For each={m().stat_changes}>{(sc: any) => (
                      <li class="flex items-center justify-between border-b border-gray-100 py-1 text-gray-700 last:border-none dark:border-gray-700 dark:text-gray-200">
                        <span class="capitalize">{formatName(sc.stat?.name)}</span>
                        <span class="font-mono">{sc.change > 0 ? '+' : ''}{sc.change}</span>
                      </li>
                    )}</For>
                  </ul>
                </div>
              </Show>
            </Card>

            <Card>
              <h3 class="mb-3 text-sm font-semibold tracking-wide text-gray-500">Learned By</h3>
              <div class="flex flex-wrap gap-2">
                <For each={visibleLearners()}>{(p: any) => {
                  const id = idFromUrl(p.url);
                  return (
                    <a href={id ? `/pokemon/${id}` : '#'} class="rounded-full border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                      {formatName(p.name)}
                    </a>
                  );
                }}</For>
                <Show when={!showAllLearners() && (learners()?.length || 0) > 24}>
                  <button type="button" class="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50" onClick={() => setShowAllLearners(true)}>
                    +{(learners().length - 24)} more
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
