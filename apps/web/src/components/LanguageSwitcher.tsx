import { createMemo } from 'solid-js';
import type { Locale } from '../i18n';
import { changeLocale, getLocale, t } from '../i18n';

const options: { value: Locale; labelKey: string }[] = [
  { value: 'en', labelKey: 'lang.en' },
  { value: 'fr', labelKey: 'lang.fr' },
  { value: 'jp', labelKey: 'lang.jp' }
];

export default function LanguageSwitcher() {
  const current = createMemo(() => getLocale());
  return (
    <label class="flex items-center gap-2 text-sm">
      <span class="sr-only">{t('lang.select')}</span>
      <select
        class="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
        value={current()}
        onChange={(e) => changeLocale(e.currentTarget.value as Locale)}
      >
        {options.map((o) => (
          <option value={o.value}>{t(o.labelKey)}</option>
        ))}
      </select>
    </label>
  );
}

