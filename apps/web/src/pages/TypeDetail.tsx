import Card from '../components/Card';
import Badge from '../components/Badge';
import { For, Show, createMemo, createResource, createSignal } from 'solid-js';
import { formatName, loadItemById, type ResourceName } from '../services/data';
import { t } from '../i18n';

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
  const type = createMemo(() => data() as TypeData | undefined);
  const dmg = createMemo(() => type()?.damage_relations || {});

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
                  <h2 class="text-2xl font-bold tracking-tight">{formatName(td().name)}</h2>
                  <Badge tone={toneForType(td().name)}>{formatName(td().name)}</Badge>
                </div>

                <div class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <h3 class="mb-2 text-sm font-semibold tracking-wide text-gray-500">Offense</h3>
                    <RelRow label="Super effective vs." list={offense().super} />
                    <RelRow label="Not very effective vs." list={offense().not} />
                    <RelRow label="No effect vs." list={offense().none} />
                  </div>
                  <div>
                    <h3 class="mb-2 text-sm font-semibold tracking-wide text-gray-500">Defense</h3>
                    <RelRow label="Weak to" list={defense().weak} />
                    <RelRow label="Resists" list={defense().resist} />
                    <RelRow label="Immune to" list={defense().immune} />
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
            <h3 class="mb-3 text-sm font-semibold tracking-wide text-gray-500">Moves</h3>
            <div class="flex flex-wrap gap-2">
              <For each={visibleMoves()}>{(m: any) => {
                const id = idFromUrl(m.url);
                return (
                  <a href={id ? `/move/${id}` : '#'} class="rounded-full border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                    {formatName(m.name)}
                  </a>
                );
              }}</For>
              <Show when={!showAllMoves() && (movesList()?.length || 0) > 48}>
                <button type="button" class="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50" onClick={() => setShowAllMoves(true)}>
                  +{(movesList().length - 48)} more
                </button>
              </Show>
            </div>
          </Card>

          <Card>
            <h3 class="mb-3 text-sm font-semibold tracking-wide text-gray-500">Pokémon</h3>
            <div class="flex flex-wrap gap-2">
              <For each={visiblePokemon()}>{(p: any) => {
                const id = idFromUrl(p.pokemon?.url);
                return (
                  <a href={id ? `/pokemon/${id}` : '#'} class="rounded-full border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                    {formatName(p.pokemon?.name)}
                  </a>
                );
              }}</For>
              <Show when={!showAllPokemon() && (pokemonList()?.length || 0) > 48}>
                <button type="button" class="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50" onClick={() => setShowAllPokemon(true)}>
                  +{(pokemonList().length - 48)} more
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
        <For each={props.list}>{(t: any) => (
          <a href={`/type/${idFromUrl(t.url)}`}>
            <Badge tone={toneForType(t.name)}>{formatName(t.name)}</Badge>
          </a>
        )}</For>
        <Show when={(props.list?.length || 0) === 0}>
          <span class="text-sm text-gray-400">—</span>
        </Show>
      </div>
    </div>
  );
}
