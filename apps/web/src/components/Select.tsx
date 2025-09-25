import type { JSX } from 'solid-js';
import { createMemo, For, splitProps } from 'solid-js';

interface Option {
    label: string;
    value: string;
}

interface SelectProps extends JSX.SelectHTMLAttributes<HTMLSelectElement> {
    id: string;
    label?: string;
    options: Option[];
}

export default function Select(props: SelectProps) {
    const [local, rest] = splitProps(props, ['id', 'label', 'options', 'class']);
    const selectCls = createMemo(() => `h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${local.class ?? ''}`);
    return (
        <label for={local.id} class="flex w-full flex-col gap-1">
            {local.label && <span class="text-xs font-medium text-gray-600">{local.label}</span>}
            <select id={local.id} class={selectCls()} {...rest}>
                <For each={local.options}>
                    {opt => (
                        <option value={opt.value}>{opt.label}</option>
                    )}
                </For>
            </select>
        </label>
    );
}
