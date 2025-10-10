import type { ResourceName } from '../services/data';
import { A } from '@solidjs/router';
import { createMemo, For } from 'solid-js';
import { getLocale, t } from '../i18n';

type TabKey = ResourceName | 'shiny-hunt';

const TABS: Array<{ key: TabKey; href: string }> = [
    { key: 'pokemon', href: '/pokemon' },
    { key: 'move', href: '/move' },
    { key: 'ability', href: '/ability' },
    { key: 'type', href: '/type' },
    { key: 'shiny-hunt', href: '/shiny-hunt' },
];

export default function ResourceTabs(props: { current: TabKey }) {
    const locale = createMemo(() => getLocale());
    const labelFor = (key: TabKey) => {
        locale();
        switch (key) {
            case 'pokemon': return t('nav.pokemon');
            case 'pokemon-species': return t('nav.species');
            case 'move': return t('nav.moves');
            case 'ability': return t('nav.abilities');
            case 'type': return t('nav.types');
            case 'shiny-hunt': return t('nav.shinyHunt');
            default: return key;
        }
    };
    return (
        <div class="mb-3 flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800">
            <For each={TABS}>
                {tab => (
                    <A
                        href={tab.href}
                        class={`-mb-px rounded-t px-3 py-2 text-base transition ${props.current === tab.key ? 'border-b-2 border-blue-600 font-medium text-blue-700 dark:text-blue-400' : 'text-gray-600 hover:text-blue-700 dark:text-gray-300 dark:hover:text-blue-300'}`}
                    >
                        {labelFor(tab.key)}
                    </A>
                )}
            </For>
        </div>
    );
}
