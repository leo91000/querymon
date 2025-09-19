import { createResource } from 'solid-js';
import { t, getLocale, type Locale } from '../i18n';

export type ResourceName = 'pokemon' | 'pokemon-species' | 'move' | 'ability' | 'type';

// Eagerly import all JSON files from public into the bundle for instant access.
// Vite allows importing JSON; this returns the parsed object at build time.
const DATA: Record<string, any> = import.meta.glob('../public/data/pokeapi/*.json', {
  eager: true,
  import: 'default',
}) as any;

function key(file: string): string {
  return `../public/data/pokeapi/${file}`;
}

async function importJSON<T>(file: string): Promise<T> {
  const k = key(file);
  if (k in DATA) return DATA[k] as T;
  // Fallback to fetch if file not bundled for some reason
  const res = await fetch(`/data/pokeapi/${file}`);
  if (!res.ok) throw new Error(`Missing data file ${file}`);
  return (await res.json()) as T;
}

function normalize(resource: ResourceName): ResourceName {
  // Alias: UI 'pokemon' uses species data under the hood
  if (resource === 'pokemon') return 'pokemon-species';
  return resource;
}

export async function loadList(resource: ResourceName): Promise<Array<{ id: number; name: string }>> {
  const r = normalize(resource);
  const loc = getLocale();
  // Prefer localized list if available
  const localizedName = `${resource}.list.${loc}.json`;
  const fallbackName = `${r}.list.json`;
  if (key(localizedName) in DATA) return importJSON(localizedName);
  return importJSON(fallbackName);
}

export async function loadIdMap(resource: ResourceName): Promise<Record<string, string>> {
  const r = normalize(resource);
  return importJSON(`${r}.idmap.json`);
}

export async function loadItemById<T = any>(resource: ResourceName, id: number): Promise<T | undefined> {
  const r = normalize(resource);
  const idmap = await loadIdMap(r as ResourceName);
  const file = idmap[String(id)];
  if (!file) return undefined;
  const arr = await importJSON<T[]>(file);
  for (const item of arr) {
    if ((item as any).id === id) return item;
  }
  return undefined;
}

// Explicitly load the "real" Pokémon (not species), bypassing normalization
export async function loadActualPokemonById<T = any>(id: number): Promise<T | undefined> {
  const idmap = await importJSON<Record<string, string>>('pokemon.idmap.json');
  const file = idmap[String(id)];
  if (!file) return undefined;
  const arr = await importJSON<T[]>(file);
  return arr.find((p: any) => p.id === id);
}

export function resourceLabel(resource: ResourceName): string {
  switch (resource) {
    case 'pokemon': return t('resources.pokemon');
    case 'pokemon-species': return t('resources.pokemon-species');
    case 'move': return t('resources.move');
    case 'ability': return t('resources.ability');
    case 'type': return t('resources.type');
  }
}

export async function loadNameMap(
  resource: Exclude<ResourceName, 'pokemon-species'> | 'pokemon-habitat' | 'growth-rate' | 'egg-group' | 'pokemon-shape' | 'pokemon-color',
  loc?: Locale,
): Promise<Record<string, string>> {
  const locale = loc || (getLocale() as Locale);
  const fname = `names.${locale}.${resource}.json`;
  if (key(fname) in DATA) return importJSON(fname);
  return {} as any;
}

export async function loadAliases(resource: 'pokemon' | 'move' | 'ability' | 'type'): Promise<Record<string, string[]>> {
  const fname = `aliases.${resource}.json`;
  if (key(fname) in DATA) return importJSON(fname);
  return {} as any;
}

export function formatName(name: string): string {
  return String(name || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

// Convenience loaders for common datasets used across pages
export async function loadTypeEntries(): Promise<any[]> {
  return importJSON('type.json');
}

export async function loadGrowthRates(): Promise<any[]> {
  return importJSON('growth-rate.json');
}

export async function loadSearchIndex(loc?: Locale): Promise<any[]> {
  const locale = loc || (getLocale() as Locale);
  const localized = `search-index.${locale}.json`;
  if (key(localized) in DATA) return importJSON(localized);
  return importJSON('search-index.json');
}

export async function loadDataset(resource: 'pokemon' | 'pokemon-species' | 'move' | 'ability' | 'type'): Promise<any[]> {
  const out: any[] = [];
  const prefix = `${resource}.`;
  for (const [p, json] of Object.entries(DATA)) {
    const base = p.split('/').pop() || '';
    if (base.startsWith(prefix)) {
      // numeric shards only: e.g., pokemon.001.json
      const rest = base.slice(prefix.length);
      if (/^\d+\.json$/.test(rest)) {
        const arr = json as any[];
        if (Array.isArray(arr)) out.push(...arr);
      }
    }
  }
  return out;
}
