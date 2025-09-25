import type { JSX } from 'solid-js';
import { createMemo, splitProps } from 'solid-js';

export default function Card(props: JSX.HTMLAttributes<HTMLDivElement>) {
    const [local, rest] = splitProps(props, ['class']);
    const cls = createMemo(() => `rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800${local.class ? ` ${local.class}` : ''}`);
    return <div class={cls()} {...rest} />;
}
