// test whether Vite can import JSON from ../public via import.meta.glob
// This module is not used in the app; it serves to validate bundling during build.
const G = import.meta.glob('../public/data/pokeapi/*.json', { eager: true, import: 'default' }) as Record<string, any>;
export const hasType = Boolean(G['../public/data/pokeapi/type.json']);
export type __GlobTest = typeof G;

