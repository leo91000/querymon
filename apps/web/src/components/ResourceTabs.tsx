import { A } from '@solidjs/router';
import type { ResourceName } from '../services/data';

const RESOURCES: ResourceName[] = ['pokemon','move','ability','type'];

export default function ResourceTabs(props: { current: ResourceName }) {
  return (
    <div class="mb-3 flex flex-wrap gap-2 border-b border-gray-200">
      {RESOURCES.map((r) => (
        <A
          href={`/${r}`}
          class={`-mb-px rounded-t px-3 py-2 text-sm ${props.current === r ? 'border-b-2 border-blue-600 font-medium text-blue-700' : 'text-gray-600 hover:text-blue-700'}`}
        >
          {tabLabel(r)}
        </A>
      ))}
    </div>
  );
}

function tabLabel(r: ResourceName): string {
  switch (r) {
    case 'pokemon': return 'Pokémon';
    case 'pokemon-species': return 'Species';
    case 'move': return 'Moves';
    case 'ability': return 'Abilities';
    case 'type': return 'Types';
    
  }
}
