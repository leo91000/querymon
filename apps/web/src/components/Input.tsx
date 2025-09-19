import type { JSX } from 'solid-js';

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label?: string;
}

export default function Input(props: InputProps) {
  const { id, label, class: className, ...rest } = props;
  const inputCls = `h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${className ?? ''}`;
  return (
    <label for={id} class="flex w-full flex-col gap-1">
      {label && <span class="text-xs font-medium text-gray-600">{label}</span>}
      <input id={id} class={inputCls} {...rest} />
    </label>
  );
}

