import { Show, For, createEffect, createMemo, createSignal, onMount } from 'solid-js';
import DropdownSelect from './DropdownSelect';
import { t } from '../i18n';

type Props = {
  sprites: any | undefined;
  name: string;
};

type GenerationSlug =
  | 'modern'
  | 'generation-i'
  | 'generation-ii'
  | 'generation-iii'
  | 'generation-iv'
  | 'generation-v'
  | 'generation-vi'
  | 'generation-vii'
  | 'generation-viii'
  | 'generation-ix';

const GEN_ORDER: GenerationSlug[] = [
  'generation-i',
  'generation-ii',
  'generation-iii',
  'generation-iv',
  'generation-v',
  'generation-vi',
  'generation-vii',
  'generation-viii',
  'generation-ix',
];

const GEN_ROMAN: Record<Exclude<GenerationSlug, 'modern'>, string> = {
  'generation-i': 'I',
  'generation-ii': 'II',
  'generation-iii': 'III',
  'generation-iv': 'IV',
  'generation-v': 'V',
  'generation-vi': 'VI',
  'generation-vii': 'VII',
  'generation-viii': 'VIII',
  'generation-ix': 'IX',
};

function genLabel(slug: GenerationSlug) {
  if (slug === 'modern') return 'Modern';
  const roman = GEN_ROMAN[slug as Exclude<GenerationSlug, 'modern'>];
  const tmpl = t('learnset.genShort' as any) as unknown as string;
  return typeof tmpl === 'string' && tmpl.includes('{roman}') ? tmpl.replace('{roman}', roman) : `Gen ${roman}`;
}

type Variant = { key: string; label: string; url: string };

const STORAGE_KEY = 'sprite.selection';

export default function PokemonSpriteViewer(props: Props) {
  const [selectedGen, setSelectedGen] = createSignal<GenerationSlug>('modern');
  const [selectedVariant, setSelectedVariant] = createSignal<string>('');

  const variantsByGen = createMemo(() => {
    const out = new Map<GenerationSlug, Variant[]>();
    const s = props.sprites || {};

    // Modern
    const modern: Variant[] = [];
    const other = s?.other || {};
    const oa = other?.['official-artwork'];
    if (oa?.front_default) modern.push({ key: 'official-artwork', label: 'Official Artwork', url: oa.front_default });
    const home = other?.home;
    if (home?.front_default) modern.push({ key: 'home_front', label: 'HOME', url: home.front_default });
    if (home?.front_shiny) modern.push({ key: 'home_front_shiny', label: 'HOME Shiny', url: home.front_shiny });
    const dw = other?.['dream_world'];
    if (dw?.front_default) modern.push({ key: 'dream_world', label: 'Dream World', url: dw.front_default });
    if (modern.length) out.set('modern', modern);

    const versions = s?.versions || {};
    const catDefs = [
      { key: 'front_default', label: 'Front' },
      { key: 'back_default', label: 'Back' },
      { key: 'front_shiny', label: 'Front Shiny' },
      { key: 'back_shiny', label: 'Back Shiny' },
      { key: 'front_female', label: 'Front Female' },
      { key: 'back_female', label: 'Back Female' },
      { key: 'front_shiny_female', label: 'Front Shiny F', },
      { key: 'back_shiny_female', label: 'Back Shiny F', },
    ] as const;

    for (const gen of GEN_ORDER) {
      const gobj = (versions as any)?.[gen];
      if (!gobj) continue;
      const list: Variant[] = [];
      // Prefer one URL per category across version groups
      for (const { key, label } of catDefs) {
        let url: string | null = null;
        for (const vgName of Object.keys(gobj)) {
          const group = gobj[vgName] || {};
          const candidate = group?.[key];
          if (typeof candidate === 'string' && candidate) { url = candidate; break; }
        }
        if (url) list.push({ key, label, url });
      }
      // Animated (Gen V Black/White)
      try {
        const bw = (gobj as any)?.['black-white']?.animated;
        if (bw) {
          const amap: Array<[string, string, string | null]> = [
            ['animated_front_default', 'Anim Front', bw.front_default || null],
            ['animated_back_default', 'Anim Back', bw.back_default || null],
            ['animated_front_shiny', 'Anim Front Shiny', bw.front_shiny || null],
            ['animated_back_shiny', 'Anim Back Shiny', bw.back_shiny || null],
          ];
          for (const [k, label, u] of amap) if (u) list.push({ key: k, label, url: u });
        }
      } catch {}
      if (list.length) out.set(gen, list);
    }
    return out;
  });

  const generationOptions = createMemo(() => {
    const arr: { value: GenerationSlug; label: string }[] = [];
    for (const [gen, vars] of variantsByGen()) {
      if (vars.length) arr.push({ value: gen, label: genLabel(gen) });
    }
    // Sort by our known order, with modern first if present
    arr.sort((a, b) => {
      if (a.value === 'modern' && b.value !== 'modern') return -1;
      if (b.value === 'modern' && a.value !== 'modern') return 1;
      return GEN_ORDER.indexOf(a.value as any) - GEN_ORDER.indexOf(b.value as any);
    });
    return arr;
  });

  function selectDefaults() {
    const map = variantsByGen();
    // Try saved
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const [gen, variant] = raw.split('::') as [GenerationSlug, string];
        if (map.has(gen)) {
          const list = map.get(gen)!;
          const match = list.find((v) => v.key === variant) || list[0];
          setSelectedGen(gen);
          setSelectedVariant(match?.key || list[0]?.key || '');
          return;
        }
      }
    } catch {}
    // Default latest available generation (descending order), else modern
    for (let i = GEN_ORDER.length - 1; i >= 0; i--) {
      const g = GEN_ORDER[i];
      if (map.has(g as any) && (map.get(g as any)?.length || 0) > 0) {
        setSelectedGen(g as GenerationSlug);
        setSelectedVariant(map.get(g as any)![0].key);
        return;
      }
    }
    if (map.has('modern')) {
      setSelectedGen('modern');
      setSelectedVariant(map.get('modern')![0]?.key || '');
    }
  }

  // Initialize defaults when sprites change
  createEffect(() => { void props.sprites; selectDefaults(); });

  // Persist on change
  createEffect(() => {
    const gen = selectedGen();
    const varKey = selectedVariant();
    if (gen && varKey) localStorage.setItem(STORAGE_KEY, `${gen}::${varKey}`);
  });

  const currentUrl = createMemo(() => {
    const list = variantsByGen().get(selectedGen());
    const v = list?.find((x) => x.key === selectedVariant()) || list?.[0];
    return v?.url || '';
  });

  return (
    <div class="flex w-full flex-col items-center gap-3">
      <div class="relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-100 via-sky-50 to-white shadow-inner dark:from-blue-500/20 dark:via-gray-800 dark:to-gray-900">
        <Show when={currentUrl()} fallback={<span class="text-sm text-gray-400">{t('detail.loading')}</span>}>
          <img src={currentUrl()} alt={props.name} class="h-full w-full object-contain" loading="lazy" />
        </Show>
      </div>

      <div class="flex flex-wrap justify-center gap-1">
        <For each={variantsByGen().get(selectedGen()) || []}>{(v) => (
          <button
            type="button"
            class={`cursor-pointer rounded-full border px-2 py-0.5 text-xs transition hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
              selectedVariant() === v.key
                ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300'
                : 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300'
            }`}
            onClick={() => setSelectedVariant(v.key)}
          >
            {v.label}
          </button>
        )}</For>
      </div>

      <div class="w-full pt-1">
        <DropdownSelect
          id="sprite-gen"
          value={selectedGen()}
          options={generationOptions()}
          srLabel="Sprite generation"
          onChange={(next) => {
            const gen = next as GenerationSlug;
            setSelectedGen(gen);
            const list = variantsByGen().get(gen) || [];
            const pick = list.find((v) => v.key === selectedVariant()) || list[0];
            setSelectedVariant(pick?.key || '');
          }}
          align="right"
        />
      </div>
    </div>
  );
}
