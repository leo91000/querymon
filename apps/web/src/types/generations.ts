// Shared types and constants for Pokémon generations

export type GenerationSlug
    = | 'generation-i'
        | 'generation-ii'
        | 'generation-iii'
        | 'generation-iv'
        | 'generation-v'
        | 'generation-vi'
        | 'generation-vii'
        | 'generation-viii'
        | 'generation-ix';

export const GENERATION_ORDER: GenerationSlug[] = [
    'generation-i',
    'generation-ii',
    'generation-iii',
    'generation-iv',
    'generation-v',
    'generation-vi',
    'generation-vii',
    'generation-viii',
    'generation-ix',
];

export const GENERATION_ROMAN: Record<GenerationSlug, string> = {
    'generation-i': 'I',
    'generation-ii': 'II',
    'generation-iii': 'III',
    'generation-iv': 'IV',
    'generation-v': 'V',
    'generation-vi': 'VI',
    'generation-vii': 'VII',
    'generation-viii': 'VIII',
    'generation-ix': 'IX',
};
