import { createMemo } from 'solid-js';
import DropdownSelect from './DropdownSelect';
import type { Locale } from '../i18n';
import { changeLocale, getLocale, t } from '../i18n';

const baseOptions: Array<{ value: Locale; labelKey: string; icon: string }> = [
  { value: 'en', labelKey: 'lang.en', icon: 'icon-[circle-flags--us]' },
  { value: 'fr', labelKey: 'lang.fr', icon: 'icon-[circle-flags--fr]' },
  { value: 'jp', labelKey: 'lang.jp', icon: 'icon-[circle-flags--jp]' }
];

export default function LanguageSwitcher() {
  const current = createMemo(() => getLocale());
  const options = createMemo(() =>
    baseOptions.map((opt) => ({ value: opt.value, label: t(opt.labelKey), icon: opt.icon }))
  );

  return (
    <DropdownSelect
      id="lang-switcher"
      value={current()}
      options={options()}
      srLabel={t('lang.select')}
      align="left"
      onChange={(next) => changeLocale(next as Locale)}
    />
  );
}
