import { A } from '@solidjs/router';
import type { ResourceName } from '../services/data';
import { t } from '../i18n';

const RESOURCES: ResourceName[] = ['pokemon','move','ability','type'];

export default function ResourceTabs(props: { current: ResourceName }) {
  return (
    <div class="mb-3 flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800">
      {RESOURCES.map((r) => (
        <A
          href={`/${r}`}
          class={`-mb-px rounded-t px-3 py-2 text-base ${props.current === r ? 'border-b-2 border-blue-600 font-medium text-blue-700 dark:text-blue-400' : 'text-gray-600 hover:text-blue-700 dark:text-gray-300'}`}
        >
          {tabLabel(r)}
        </A>
      ))}
    </div>
  );
}

function tabLabel(r: ResourceName): string {
  switch (r) {
    case 'pokemon': return t('nav.pokemon');
    case 'pokemon-species': return t('nav.species');
    case 'move': return t('nav.moves');
    case 'ability': return t('nav.abilities');
    case 'type': return t('nav.types');
    
  }
}
