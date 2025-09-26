import type { Pokemon } from '../types/pokemon';
import { For, Show } from 'solid-js';
import Badge from './Badge';
import Card from './Card';
import Tooltip from './Tooltip';
import TypeBox from './TypeBox';

interface CardProps { pokemon: Pokemon; isFavorited?: boolean; onToggleFavorite?: (id: number) => void }

export default function PokemonCard(props: CardProps) {
    const p = () => props.pokemon;
    return (
        <Card class="group relative flex h-full min-h-[120px] items-center gap-4 p-4 transition duration-150 hover:-translate-y-0.5 hover:shadow-md">
            <img
                src={p().sprite}
                alt={p().name}
                width={64}
                height={64}
                class="h-16 w-16 shrink-0 rounded-lg bg-gray-100 object-contain ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
                loading="lazy"
            />
            <div class="min-w-0 flex-1">
                <h3 class="truncate text-base font-semibold text-gray-900 dark:text-gray-100">{p().name}</h3>
                <p class="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{p().description}</p>
                <div class="mt-2 flex flex-wrap gap-2">
                    <For each={p().types}>
                        {t => (
                            <TypeBox name={t} size="sm" />
                        )}
                    </For>
                </div>
            </div>
            <span class="pointer-events-none absolute left-1 top-0">
                <Badge tone="gray" class="px-2 py-[1px] text-[11px]">
                    #
                    {p().id.toString().padStart(3, '0')}
                </Badge>
            </span>
            <Show when={typeof props.onToggleFavorite === 'function'}>
                <div class="absolute right-1 top-1 z-0 md:right-2 md:top-2">
                    <Tooltip content={props.isFavorited ? 'Remove favorite' : 'Add favorite'}>
                        <button
                            type="button"
                            class={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-lg transition hover:bg-gray-100 dark:hover:bg-gray-700/60 cursor-pointer ${props.isFavorited ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500 dark:text-gray-300'}`}
                            aria-pressed={!!props.isFavorited}
                            aria-label={props.isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                props.onToggleFavorite?.(p().id);
                            }}
                        >
                            <span class={`${props.isFavorited ? 'icon-[ph--heart-fill]' : 'icon-[ph--heart]'} text-xl`} />
                        </button>
                    </Tooltip>
                </div>
            </Show>
        </Card>
    );
}
