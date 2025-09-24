import { t, getLocale, type Locale } from '../i18n';

export type ResourceName = 'pokemon' | 'pokemon-species' | 'move' | 'ability' | 'type' | 'evolution-chain';

const BASE = '/data/pokeapi';

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
  return (await res.json()) as T;
}

export async function loadList(resource: ResourceName): Promise<Array<{ id: number; name: string } & Record<string, any>>> {
  const loc = getLocale();
  // New layout: <resource>/list[.<loc>].json
  const candidates: string[] = [];
  candidates.push(`${BASE}/${resource}/list.${loc}.json`);
  candidates.push(`${BASE}/${resource}/list.json`);
  // Legacy layout: <resource>.list[.<loc>].json at root
  candidates.push(`${BASE}/${resource}.list.${loc}.json`);
  candidates.push(`${BASE}/${resource}.list.json`);
  for (const url of candidates) {
    try { return await fetchJSON(url); } catch { /* try next */ }
  }
  throw new Error(`Missing list for ${resource}`);
}

export async function loadIdMap(resource: ResourceName): Promise<Record<string, string>> {
  // Legacy use only; still exposed for tools
  return fetchJSON(`${BASE}/${resource}.idmap.json`);
}

export async function loadItemById<T = any>(resource: ResourceName, id: number): Promise<T | undefined> {
  // New per-item layout first
  const direct = `${BASE}/${resource}/${id}.json`;
  try {
    const item = await fetchJSON<T>(direct);
    if (resource === 'pokemon' && item && typeof item === 'object' && !('moves' in (item as any))) {
      throw new Error('trimmed pokemon payload');
    }
    return item;
  } catch {}

  // Legacy aggregated fallback: use idmap -> shard -> scan
  try {
    const idmap = await fetchJSON<Record<string, string>>(`${BASE}/${resource}.idmap.json`);
    const file = idmap[String(id)];
    if (file) {
      const arr = await fetchJSON<T[]>(`${BASE}/${file}`);
      for (const item of arr) {
        if ((item as any).id === id) return item;
      }
    }
  } catch {}

  // Special-case: UI pokemon previously aliased to species; try species folder too
  if (resource === 'pokemon') {
    try { return await fetchJSON<T>(`${BASE}/pokemon-species/${id}.json`); } catch {}
  }
  return undefined;
}

// Removed: loadActualPokemonById — detail is now in /pokemon/<id>.json

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
  const url = `${BASE}/names.${locale}.${resource}.json`;
  try { return await fetchJSON(url); } catch { return {} as any; }
}

export async function loadAliases(resource: 'pokemon' | 'move' | 'ability' | 'type'): Promise<Record<string, string[]>> {
  try { return await fetchJSON(`${BASE}/aliases.${resource}.json`); } catch { return {} as any; }
}

export function formatName(name: string): string {
  return String(name || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

// Convenience loaders for common datasets used across pages
let typeEntriesPromise: Promise<any[]> | undefined;
export async function loadTypeEntries(): Promise<any[]> {
  if (!typeEntriesPromise) typeEntriesPromise = fetchJSON(`${BASE}/type.json`);
  return typeEntriesPromise;
}

let growthRatesPromise: Promise<any[]> | undefined;
export async function loadGrowthRates(): Promise<any[]> {
  if (!growthRatesPromise) growthRatesPromise = fetchJSON(`${BASE}/growth-rate.json`);
  return growthRatesPromise;
}

export async function loadSearchIndex(loc?: Locale): Promise<any[]> {
  const locale = loc || (getLocale() as Locale);
  const preferred = `${BASE}/search-index.${locale}.json`;
  try { return await fetchJSON(preferred); } catch { return fetchJSON(`${BASE}/search-index.json`); }
}

export async function loadDataset(resource: 'pokemon' | 'pokemon-species' | 'move' | 'ability' | 'type'): Promise<any[]> {
  // Try manifest (sharded) then single aggregated file
  try {
    const m = await fetchJSON<{ files: string[] }>(`${BASE}/${resource}.manifest.json`);
    const out: any[] = [];
    for (const f of (m?.files || [])) {
      const arr = await fetchJSON<any[]>(`${BASE}/${f}`);
      if (Array.isArray(arr)) out.push(...arr);
    }
    if (out.length) return out;
  } catch {}
  return fetchJSON<any[]>(`${BASE}/${resource}.json`);
}
