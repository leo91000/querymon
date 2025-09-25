import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
    id: string;
    label?: string;
}

export default function Input(props: InputProps) {
    const [local, others] = splitProps(props, ['id', 'label', 'class']);
    const inputCls = () =>
        `h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${local.class ?? ''
        }`;
    return (
        <label for={local.id} class="flex w-full flex-col gap-1">
            {local.label && <span class="text-xs font-medium text-gray-600">{local.label}</span>}
            <input id={local.id} class={inputCls()} {...others} />
        </label>
    );
}
