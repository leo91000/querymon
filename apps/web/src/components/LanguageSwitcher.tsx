import type { Locale } from '../i18n';
import { createMemo } from 'solid-js';
import { changeLocale, getLocale, t } from '../i18n';
import DropdownSelect from './DropdownSelect';

const baseOptions: Array<{ value: Locale; labelKey: string; icon: string }> = [
    { value: 'en', labelKey: 'lang.en', icon: 'icon-[circle-flags--us]' },
    { value: 'fr', labelKey: 'lang.fr', icon: 'icon-[circle-flags--fr]' },
    { value: 'jp', labelKey: 'lang.jp', icon: 'icon-[circle-flags--jp]' },
];

export default function LanguageSwitcher(props: { iconOnly?: boolean } = {}) {
    const current = createMemo(() => getLocale());
    const options = createMemo(() =>
        baseOptions.map(opt => ({ value: opt.value, label: t(opt.labelKey), icon: opt.icon })),
    );

    return (
        <DropdownSelect
            id="lang-switcher"
            value={current()}
            options={options()}
            srLabel={t('lang.select')}
            align="left"
            iconOnly={props.iconOnly}
            onChange={next => changeLocale(next as Locale)}
        />
    );
}
