import type { JSX } from 'solid-js';

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
  const { id, label, options, class: className, ...rest } = props;
  const selectCls = `h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${className ?? ''}`;
  return (
    <label for={id} class="flex w-full flex-col gap-1">
      {label && <span class="text-xs font-medium text-gray-600">{label}</span>}
      <select id={id} class={selectCls} {...rest}>
        {options.map((opt) => (
          <option value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}

