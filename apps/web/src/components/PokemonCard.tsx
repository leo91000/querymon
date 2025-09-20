import Badge from './Badge';
import TypeBox from './TypeBox';
import Card from './Card';
import type { Pokemon, PokemonType } from '../types/pokemon';

const TYPE_TONE: Record<PokemonType, NonNullable<Parameters<typeof Badge>[0]['tone']>> = {
  Normal: 'gray',
  Fire: 'orange',
  Water: 'blue',
  Electric: 'yellow',
  Grass: 'green',
  Ice: 'sky',
  Fighting: 'rose',
  Poison: 'purple',
  Ground: 'amber',
  Flying: 'indigo',
  Psychic: 'pink',
  Bug: 'lime',
  Rock: 'stone' as any, // fallback handled below
  Ghost: 'violet',
  Dragon: 'fuchsia',
  Dark: 'neutral' as any,
  Steel: 'gray',
  Fairy: 'pink',
};

function typeTone(t: PokemonType): NonNullable<Parameters<typeof Badge>[0]['tone']> {
  const candidate = TYPE_TONE[t];
  const allowed = new Set([
    'gray','red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose'
  ]);
  return allowed.has(candidate as any) ? (candidate as any) : 'gray';
}

export default function PokemonCard(props: { pokemon: Pokemon }) {
  const p = props.pokemon;
  return (
    <Card class="group flex h-full items-center gap-4 p-4">
      <img
        src={p.sprite}
        alt={p.name}
        width={64}
        height={64}
        class="h-16 w-16 shrink-0 rounded-lg bg-gray-100 object-contain ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
        loading="lazy"
      />
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between">
          <h3 class="truncate text-base font-semibold text-gray-900 dark:text-gray-100">#{p.id.toString().padStart(3, '0')} {p.name}</h3>
        </div>
        <p class="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{p.description}</p>
        <div class="mt-2 flex flex-wrap gap-2">
          {p.types.map((t) => (
            <TypeBox name={t} size="sm" link />
          ))}
        </div>
      </div>
    </Card>
  );
}
