import type { JSX } from 'solid-js';

export default function Card(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const { class: className, ...rest } = props;
  const cls = `rounded-xl border border-gray-200 bg-white p-4 shadow-sm${className ? ` ${className}` : ''}`;
  return <div class={cls} {...rest} />;
}

