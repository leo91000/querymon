// Minimal types for trimmed page JSON used by the app.

export interface NamedRef { name: string; url?: string }

// Common list entry used by grid/search
export type ListItem = { id: number; name: string } & Record<string, unknown>;

// Pokemon detail
export interface PokemonStat {
    stat?: NamedRef;
    name?: string;
    base_stat?: number;
    base?: number;
    effort?: number;
}

export interface PokemonAbilityRef {
    ability?: NamedRef;
    id?: number;
    name?: string;
    is_hidden?: boolean;
    hidden?: boolean;
}

export interface PokemonTypeRef {
    id?: number;
    type?: NamedRef;
    name?: string;
}

export interface PokemonSprites {
    front_default?: string;
    front_shiny?: string;
    other?: {
        ['official-artwork']?: { front_default?: string };
        home?: { front_default?: string; front_shiny?: string };
        ['dream_world']?: { front_default?: string };
        versions?: Record<string, unknown>;
        [k: string]: unknown;
    };
    versions?: Record<string, unknown>;
}

export interface SpeciesNamesEntry { language?: NamedRef; name?: string }
export interface SpeciesGeneraEntry { language?: NamedRef; genus?: string }

export interface PokemonSpeciesSubset {
    name?: string;
    names?: SpeciesNamesEntry[];
    genus?: string;
    genera?: SpeciesGeneraEntry[];
    capture_rate?: number;
    color?: NamedRef;
    gender_rate?: number;
    flavor_text_entries?: FlavorTextEntry[];
    egg_groups?: NamedRef[];
    hatch_counter?: number;
    growth_rate?: (NamedRef & { id?: number });
}

export interface EvolutionEntry {
    id?: number;
    name: string;
    sprite: string;
    isCurrent: boolean;
    details: unknown[];
}

export interface PokemonDetailData {
    id: number;
    name: string;
    types?: PokemonTypeRef[];
    sprites?: PokemonSprites;
    abilities?: PokemonAbilityRef[];
    stats?: PokemonStat[];
    species?: PokemonSpeciesSubset;
    moves?: unknown[];
    learnsets?: Array<{
        generation: string;
        order: number;
        entries: Array<{
            method: string;
            items: Array<{
                move: { id?: number; name: string };
                type: string | null;
                category: string | null;
                power: number | null;
                accuracy: number | null;
                pp: number | null;
                level: number | null;
                versionGroups: string[];
            }>;
        }>;
    }>;
    evolutions?: EvolutionEntry[][];
    height?: number;
    weight?: number;
    base_experience?: number;
}

// Move detail
export interface MoveMeta {
    ailment?: NamedRef;
    crit_rate?: number;
    drain?: number;
    healing?: number;
    flinch_chance?: number;
    min_hits?: number;
    max_hits?: number;
    min_turns?: number;
    max_turns?: number;
    stat_chance?: number;
}
export interface EffectEntry { language?: NamedRef; short_effect?: string; effect?: string }
export interface FlavorTextEntry { language?: NamedRef; flavor_text?: string }
export interface MoveDetailData {
    id: number;
    name: string;
    type?: NamedRef;
    damage_class?: NamedRef;
    meta?: MoveMeta;
    effect_chance?: number;
    effect_entries?: EffectEntry[];
    flavor_text_entries?: FlavorTextEntry[];
    learned_by_pokemon?: Array<{ id?: number; name?: string; url?: string }>;
    target?: NamedRef;
    generation?: NamedRef;
    power?: number;
    accuracy?: number;
    pp?: number;
    priority?: number;
    stat_changes?: Array<{ stat?: NamedRef; change: number }>;
}

// Ability detail
export interface AbilityDetailData {
    id: number;
    name: string;
    is_main_series?: boolean;
    generation?: NamedRef;
    effect_entries?: EffectEntry[];
    flavor_text_entries?: FlavorTextEntry[];
    pokemon?: Array<{ id?: number; name?: string; is_hidden?: boolean; pokemon?: { name?: string; url?: string } }>;
}

// Type detail
export interface TypeDamageRelations {
    double_damage_to?: NamedRef[] | Array<{ type: NamedRef }>;
    half_damage_to?: NamedRef[] | Array<{ type: NamedRef }>;
    no_damage_to?: NamedRef[] | Array<{ type: NamedRef }>;
    double_damage_from?: NamedRef[] | Array<{ type: NamedRef }>;
    half_damage_from?: NamedRef[] | Array<{ type: NamedRef }>;
    no_damage_from?: NamedRef[] | Array<{ type: NamedRef }>;
}

export interface TypeDetailData {
    id: number;
    name: string;
    damage_relations?: TypeDamageRelations;
    moves?: Array<{ id?: number; name?: string; url?: string }>;
    pokemon?: Array<{ id?: number; name?: string; pokemon?: { name?: string; url?: string } }>;
}
