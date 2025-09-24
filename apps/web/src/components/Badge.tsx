import type { JSX } from 'solid-js';

interface BadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  tone?: 'gray' | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose';
}

const TONES: Record<NonNullable<BadgeProps['tone']>, string> = {
  gray: 'bg-gray-100 text-gray-800 ring-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700',
  red: 'bg-red-100 text-red-800 ring-red-200 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-500/40',
  orange: 'bg-orange-100 text-orange-800 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-200 dark:ring-orange-500/40',
  amber: 'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/40',
  yellow: 'bg-yellow-100 text-yellow-800 ring-yellow-200 dark:bg-yellow-400/20 dark:text-yellow-100 dark:ring-yellow-400/40',
  lime: 'bg-lime-100 text-lime-800 ring-lime-200 dark:bg-lime-500/15 dark:text-lime-200 dark:ring-lime-500/40',
  green: 'bg-green-100 text-green-800 ring-green-200 dark:bg-green-500/15 dark:text-green-200 dark:ring-green-500/40',
  emerald: 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/40',
  teal: 'bg-teal-100 text-teal-800 ring-teal-200 dark:bg-teal-500/15 dark:text-teal-200 dark:ring-teal-500/40',
  cyan: 'bg-cyan-100 text-cyan-800 ring-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-200 dark:ring-cyan-500/40',
  sky: 'bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-500/40',
  blue: 'bg-blue-100 text-blue-800 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-500/40',
  indigo: 'bg-indigo-100 text-indigo-800 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-200 dark:ring-indigo-500/40',
  violet: 'bg-violet-100 text-violet-800 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-200 dark:ring-violet-500/40',
  purple: 'bg-purple-100 text-purple-800 ring-purple-200 dark:bg-purple-500/15 dark:text-purple-200 dark:ring-purple-500/40',
  fuchsia: 'bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200 dark:bg-fuchsia-500/15 dark:text-fuchsia-200 dark:ring-fuchsia-500/40',
  pink: 'bg-pink-100 text-pink-800 ring-pink-200 dark:bg-pink-500/15 dark:text-pink-200 dark:ring-pink-500/40',
  rose: 'bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-500/40',
};

export default function Badge(props: BadgeProps) {
  const { class: className, tone = 'gray', ...rest } = props;
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset';
  const cls = `${base} ${TONES[tone]}${className ? ` ${className}` : ''}`;
  return <span class={cls} {...rest} />;
}
