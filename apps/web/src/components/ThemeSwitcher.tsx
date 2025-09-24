import { createMemo } from 'solid-js';
import DropdownSelect from './DropdownSelect';
import type { Theme } from '../theme';
import { getTheme, setTheme } from '../theme';
import { t } from '../i18n';

const baseOptions: Array<{ value: Theme; labelKey: string; icon: string }> = [
  { value: 'system', labelKey: 'theme.system', icon: 'icon-[ph--monitor-duotone]' },
  { value: 'light', labelKey: 'theme.light', icon: 'icon-[ph--sun-duotone]' },
  { value: 'dark', labelKey: 'theme.dark', icon: 'icon-[ph--moon-stars-duotone]' }
];

export default function ThemeSwitcher() {
  const current = createMemo(() => getTheme());
  const options = createMemo(() =>
    baseOptions.map((opt) => ({ value: opt.value, label: t(opt.labelKey), icon: opt.icon }))
  );

  return (
    <DropdownSelect
      id="theme-switcher"
      value={current()}
      options={options()}
      srLabel={t('theme.mode')}
      onChange={(next) => setTheme(next as Theme)}
    />
  );
}
