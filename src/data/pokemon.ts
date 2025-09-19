import type { Pokemon, PokemonType } from '../types/pokemon';

export const POKEMON_TYPES: PokemonType[] = [
  'Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'
];

// Minimal seed data (using public PokeAPI sprites)
export const POKEMON: Pokemon[] = [
  { id: 1, name: 'Bulbasaur', types: ['Grass', 'Poison'], sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png', description: 'A strange seed was planted on its back at birth.' },
  { id: 4, name: 'Charmander', types: ['Fire'], sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png', description: 'Obviously prefers hot places. The flame on its tail shows its strength.' },
  { id: 7, name: 'Squirtle', types: ['Water'], sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png', description: 'Shoots water at prey while in the water.' },
  { id: 25, name: 'Pikachu', types: ['Electric'], sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png', description: 'When several of these Pokémon gather, their electricity could build and cause lightning storms.' },
  { id: 39, name: 'Jigglypuff', types: ['Normal', 'Fairy'], sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/39.png', description: 'Uses its alluring eyes to enrapture its foe.' },
  { id: 52, name: 'Meowth', types: ['Normal'], sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/52.png', description: 'Adores round objects. It wanders the streets on a nightly basis to look for dropped loose change.' },
  { id: 63, name: 'Abra', types: ['Psychic'], sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/63.png', description: 'Sleeps 18 hours a day. If it senses danger, it teleports to safety.' },
  { id: 94, name: 'Gengar', types: ['Ghost', 'Poison'], sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/94.png', description: 'On the night of a full moon, it comes out to bid people ill will.' },
  { id: 95, name: 'Onix', types: ['Rock', 'Ground'], sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/95.png', description: 'Burrows at high speed in search of food. The tunnels it leaves are used as homes by Diglett.' },
  { id: 133, name: 'Eevee', types: ['Normal'], sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png', description: 'Its genetic code is irregular. It may mutate if it is exposed to radiation from element stones.' },
  { id: 149, name: 'Dragonite', types: ['Dragon', 'Flying'], sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/149.png', description: 'An extremely rarely seen marine Pokémon. Its intelligence is said to match that of humans.' },
];

