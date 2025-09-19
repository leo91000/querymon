import type { JSX } from 'solid-js';

interface BadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  tone?: 'gray' | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose';
}

const TONES: Record<NonNullable<BadgeProps['tone']>, string> = {
  gray: 'bg-gray-100 text-gray-800 ring-gray-200',
  red: 'bg-red-100 text-red-800 ring-red-200',
  orange: 'bg-orange-100 text-orange-800 ring-orange-200',
  amber: 'bg-amber-100 text-amber-800 ring-amber-200',
  yellow: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
  lime: 'bg-lime-100 text-lime-800 ring-lime-200',
  green: 'bg-green-100 text-green-800 ring-green-200',
  emerald: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  teal: 'bg-teal-100 text-teal-800 ring-teal-200',
  cyan: 'bg-cyan-100 text-cyan-800 ring-cyan-200',
  sky: 'bg-sky-100 text-sky-800 ring-sky-200',
  blue: 'bg-blue-100 text-blue-800 ring-blue-200',
  indigo: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
  violet: 'bg-violet-100 text-violet-800 ring-violet-200',
  purple: 'bg-purple-100 text-purple-800 ring-purple-200',
  fuchsia: 'bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200',
  pink: 'bg-pink-100 text-pink-800 ring-pink-200',
  rose: 'bg-rose-100 text-rose-800 ring-rose-200',
};

export default function Badge(props: BadgeProps) {
  const { class: className, tone = 'gray', ...rest } = props;
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset';
  const cls = `${base} ${TONES[tone]}${className ? ` ${className}` : ''}`;
  return <span class={cls} {...rest} />;
}
