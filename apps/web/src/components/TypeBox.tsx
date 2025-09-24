import { A } from '@solidjs/router';
import { Show, createMemo, createSignal, onCleanup, onMount, createResource } from 'solid-js';
import { getLocale } from '../i18n';
import { loadList } from '../services/data';

type Props = {
  id?: number;
  name?: string; // english slug from API (e.g., 'fire')
  size?: 'sm' | 'md' | 'lg';
  class?: string;
  link?: boolean; // wrap in <A> to /type/:id
  showLabel?: boolean;
};

const TYPE_SLUG_BY_ID: Record<number, string> = {
  1: 'normal', 2: 'fighting', 3: 'flying', 4: 'poison', 5: 'ground', 6: 'rock', 7: 'bug', 8: 'ghost', 9: 'steel',
  10: 'fire', 11: 'water', 12: 'grass', 13: 'electric', 14: 'psychic', 15: 'ice', 16: 'dragon', 17: 'dark', 18: 'fairy',
};
const SLUG_TO_ID: Record<string, number> = Object.fromEntries(Object.entries(TYPE_SLUG_BY_ID).map(([id, slug]) => [slug, Number(id)]));

export default function TypeBox(props: Props) {
  // Localized type labels from new layout
  const [types] = createResource(() => getLocale(), () => loadList('type' as any));
  const locale = () => getLocale() as 'en'|'fr'|'jp';

  // Per-type light/dark tones (tailwind v4 class-based dark)
  // Vibrant dark-mode palette: stronger bg, lighter text, tinted border
  const TONE: Record<string, string> = {
    normal: 'border-stone-200 bg-stone-100 text-stone-800 dark:border-stone-500/60 dark:bg-stone-700/60 dark:text-stone-100',
    fire: 'border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-500/60 dark:bg-orange-700/60 dark:text-white',
    water: 'border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-500/60 dark:bg-blue-700/60 dark:text-white',
    electric: 'border-yellow-200 bg-yellow-100 text-yellow-800 dark:border-yellow-400/80 dark:bg-yellow-500/90 dark:text-white',
    grass: 'border-green-200 bg-green-100 text-green-800 dark:border-green-500/60 dark:bg-green-700/60 dark:text-white',
    ice: 'border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-400/70 dark:bg-sky-700/60 dark:text-white',
    fighting: 'border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-500/60 dark:bg-rose-700/60 dark:text-white',
    poison: 'border-purple-200 bg-purple-100 text-purple-800 dark:border-purple-500/60 dark:bg-purple-700/60 dark:text-white',
    ground: 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-600/60 dark:bg-amber-700/70 dark:text-white',
    flying: 'border-indigo-200 bg-indigo-100 text-indigo-800 dark:border-indigo-500/60 dark:bg-indigo-700/60 dark:text-white',
    psychic: 'border-pink-200 bg-pink-100 text-pink-800 dark:border-pink-500/60 dark:bg-pink-700/60 dark:text-white',
    bug: 'border-lime-200 bg-lime-100 text-lime-800 dark:border-lime-500/60 dark:bg-lime-600/70 dark:text-white',
    rock: 'border-stone-300 bg-stone-100 text-stone-800 dark:border-stone-500/60 dark:bg-stone-700/60 dark:text-stone-100',
    ghost: 'border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-500/60 dark:bg-violet-700/60 dark:text-white',
    dragon: 'border-fuchsia-200 bg-fuchsia-100 text-fuchsia-800 dark:border-fuchsia-500/60 dark:bg-fuchsia-700/60 dark:text-white',
    dark: 'border-neutral-300 bg-neutral-100 text-neutral-800 dark:border-neutral-500/60 dark:bg-neutral-700/60 dark:text-neutral-100',
    steel: 'border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-500/60 dark:bg-slate-700/60 dark:text-slate-100',
    fairy: 'border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-500/60 dark:bg-rose-700/60 dark:text-white',
    stellar: 'border-teal-200 bg-teal-100 text-teal-800 dark:border-teal-500/60 dark:bg-teal-700/60 dark:text-white',
  };

  const slug = createMemo(() => {
    if (props.id && TYPE_SLUG_BY_ID[props.id]) return TYPE_SLUG_BY_ID[props.id];
    return String(props.name || 'unknown').toLowerCase();
  });

  const effectiveId = createMemo(() => props.id ?? SLUG_TO_ID[slug()]);

  const entry = createMemo(() => {
    const list = types() || [];
    const id = effectiveId();
    if (id) return list.find((t: any) => t.id === id);
    return undefined;
  });

  const toneClass = createMemo(() => TONE[slug()] || 'border-gray-200 bg-white text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200');

  // Track effective theme via data-theme attribute set by theme/init
  const [theme, setTheme] = createSignal<string>(typeof document !== 'undefined' ? (document.documentElement.getAttribute('data-theme') || 'light') : 'light');
  onMount(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setTheme(el.getAttribute('data-theme') || 'light'));
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    onCleanup(() => obs.disconnect());
  });

  const iconSrc = createMemo(() => {
    const base = theme() === 'light' ? '/assets/types/bulba-dark' : '/assets/types/bulba';
    return `${base}/${slug()}.png`;
  });

  const label = createMemo(() => {
    const e = entry();
    if (e && e.name) return String(e.name);
    const base = String(props.name || slug());
    return base.charAt(0).toUpperCase() + base.slice(1);
  });

  const size = props.size || 'md';
  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const padX = size === 'sm' ? 'px-2' : size === 'lg' ? 'px-3' : 'px-2.5';
  const padY = size === 'sm' ? 'py-0.5' : 'py-1';

  const content = (
    <span class={`inline-flex items-center gap-2 rounded-full border ${padX} ${padY} ${textSize} ${toneClass()} ${props.class || ''}`}>
      <img src={iconSrc()} alt={label()} class={`${iconSize}`} loading="lazy" width={24} height={24} />
      <Show when={props.showLabel !== false}>
        <span class="leading-none">{label()}</span>
      </Show>
    </span>
  );

  if (props.link && (effectiveId() != null)) {
    return <A href={`/type/${effectiveId()}`}>{content}</A>;
  }
  return content;
}
