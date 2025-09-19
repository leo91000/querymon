import { createMemo } from 'solid-js';
import type { Theme } from '../theme';
import { getTheme, setTheme } from '../theme';
import { t } from '../i18n';

const options: { value: Theme; labelKey: string }[] = [
  { value: 'system', labelKey: 'theme.system' },
  { value: 'light', labelKey: 'theme.light' },
  { value: 'dark', labelKey: 'theme.dark' }
];

export default function ThemeSwitcher() {
  const current = createMemo(() => getTheme());
  return (
    <label class="flex items-center gap-2 text-sm">
      <span class="sr-only">{t('theme.mode')}</span>
      <select
        class="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        value={current()}
        onChange={(e) => setTheme(e.currentTarget.value as Theme)}
      >
        {options.map((o) => (
          <option value={o.value}>{t(o.labelKey)}</option>
        ))}
      </select>
    </label>
  );
}

