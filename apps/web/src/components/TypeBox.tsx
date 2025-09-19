import { A } from '@solidjs/router';
import { Show, createMemo, createResource } from 'solid-js';
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
    <span class={`inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white ${padX} ${padY} ${textSize} dark:border-gray-700 dark:bg-gray-800 ${props.class || ''}`}>
      <img src={`/assets/types/bulba/${slug()}.png`} alt={label()} class={`${iconSize}`} loading="lazy" width={24} height={24} />
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

