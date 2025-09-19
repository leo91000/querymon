import { A } from '@solidjs/router';
import { Show, createMemo, createResource, createSignal, onCleanup, onMount } from 'solid-js';
import { getLocale } from '../i18n';

type Props = {
  id?: number;
  name?: string; // english slug from API (e.g., 'fire')
  size?: 'sm' | 'md' | 'lg';
  class?: string;
  link?: boolean; // wrap in <A> to /type/:id
  showLabel?: boolean;
};

let typesCache: any[] | null = null;
async function loadTypes(): Promise<any[]> {
  if (typesCache) return typesCache;
  const res = await fetch('/data/pokeapi/type.json', { cache: 'no-store' });
  const data = await res.json();
  typesCache = data as any[];
  return typesCache;
}

export default function TypeBox(props: Props) {
  const [types] = createResource(loadTypes);
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

  const entry = createMemo(() => {
    const list = types() || [];
    if (props.id) return list.find((t: any) => t.id === props.id);
    if (props.name) return list.find((t: any) => (t.name || '').toLowerCase() === props.name!.toLowerCase());
    return undefined;
  });

  const slug = createMemo(() => {
    const e = entry();
    return (props.name || e?.name || 'unknown').toLowerCase();
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
    if (!e) return (props.name || '').charAt(0).toUpperCase() + (props.name || '').slice(1);
    const names = e.names || [];
    const want = { en: 'en', fr: 'fr', jp: 'ja' }[locale()] || 'en';
    if (want === 'ja') {
      const ja = names.find((n: any) => n.language?.name === 'ja')?.name;
      if (ja) return ja;
      const jaHrkt = names.find((n: any) => n.language?.name === 'ja-Hrkt')?.name;
      if (jaHrkt) return jaHrkt;
    }
    return names.find((n: any) => n.language?.name === want)?.name || e.name;
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

  if (props.link && props.id) {
    return <A href={`/type/${props.id}`}>{content}</A>;
  }
  return content;
}
