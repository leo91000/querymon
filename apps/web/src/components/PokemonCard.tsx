import type { Pokemon } from '../types/pokemon';
import { For } from 'solid-js';
import Badge from './Badge';
import Card from './Card';
import TypeBox from './TypeBox';

export default function PokemonCard(props: { pokemon: Pokemon }) {
    const p = props.pokemon;
    return (
        <Card class="group relative flex h-full items-center gap-4 p-4">
            <img
                src={p.sprite}
                alt={p.name}
                width={64}
                height={64}
                class="h-16 w-16 shrink-0 rounded-lg bg-gray-100 object-contain ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
                loading="lazy"
            />
            <div class="min-w-0 flex-1">
                <h3 class="truncate text-base font-semibold text-gray-900 dark:text-gray-100">{p.name}</h3>
                <p class="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{p.description}</p>
                <div class="mt-2 flex flex-wrap gap-2">
                    <For each={p.types}>
                        {t => (
                            <TypeBox name={t} size="sm" />
                        )}
                    </For>
                </div>
            </div>
            <span class="pointer-events-none absolute left-1 top-0">
                <Badge tone="gray" class="px-2 py-[1px] text-[11px]">
                    #
                    {p.id.toString().padStart(3, '0')}
                </Badge>
            </span>
        </Card>
    );
}
