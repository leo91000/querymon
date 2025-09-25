import { t, getLocale, type Locale } from '../i18n';
import type { ListItem } from '../types/pokeapi';
import { queryClient } from '../queryClient';

export type ResourceName = 'pokemon' | 'pokemon-species' | 'move' | 'ability' | 'type' | 'evolution-chain';

const BASE = '/data/pokeapi';

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
  const ct = res.headers.get('Content-Type') || '';
  if (!/application\/json|\+json/i.test(ct)) {
    // Vite's SPA fallback often returns index.html (text/html; 200) for unknown files.
    // Provide a clearer error than a JSON parse SyntaxError.
    const text = await res.text();
    throw new Error(`Expected JSON at ${url} but got '${ct || 'unknown'}' (length ${text.length}).`);
  }
  return (await res.json()) as T;
}

function ensure<T>(key: any[], fn: () => Promise<T>): Promise<T> {
  return queryClient.ensureQueryData({ queryKey: key, queryFn: fn });
}

export async function loadList(resource: ResourceName): Promise<ListItem[]> {
  const loc = getLocale();
  // New single-file lists per locale
  const NEW_MAP: Record<string, string | undefined> = {
    pokemon: 'pokemons',
    move: 'moves',
    ability: 'abilities',
    type: 'types',
  };
  const mapped = NEW_MAP[resource];
  if (mapped) {
    const url = `${BASE}/${mapped}.${loc}.json`;
    try { return await ensure(['list', resource, loc, 'v1'], () => fetchJSON<ListItem[]>(url)); } catch {}
  }

  // Try new per-folder legacy (if present)
  const candidates: string[] = [];
  candidates.push(`${BASE}/${resource}/list.${loc}.json`);
  candidates.push(`${BASE}/${resource}/list.json`);
  // Legacy root lists
  candidates.push(`${BASE}/${resource}.list.${loc}.json`);
  candidates.push(`${BASE}/${resource}.list.json`);
  for (const url of candidates) {
    try { return await ensure(['listLegacy', resource, loc, url], () => fetchJSON<ListItem[]>(url)); } catch { /* try next */ }
  }
  // If everything fails, return empty to keep UI resilient
  return [];
}

export async function loadIdMap(resource: ResourceName): Promise<Record<string, string>> {
  // Legacy use only; still exposed for tools
  return fetchJSON(`${BASE}/${resource}.idmap.json`);
}

export async function loadItemById<T = any>(resource: ResourceName, id: number): Promise<T | undefined> {
  const loc = getLocale() as Locale;
  // New per-locale layout first: <resource>.<id>.<loc>.json
  // Applies to primary pages: pokemon, move, ability, type
  if (['pokemon', 'move', 'ability', 'type'].includes(resource)) {
    const perLocale = `${BASE}/${resource}.${id}.${loc}.json`;
    try { return await ensure(['item', resource, id, loc, 'v1'], () => fetchJSON<T>(perLocale)); } catch {}
  }

  // New per-item layout next: <resource>/<id>.json
  const direct = `${BASE}/${resource}/${id}.json`;
  try {
    const item = await fetchJSON<T>(direct);
    // Old trimmed pokemon payloads did not include moves; we used to fallback.
    // Keep backward-compat: if it's a trimmed payload with no learnsets/moves, keep searching.
    if (
      resource === 'pokemon' &&
      item && typeof item === 'object' &&
      !('moves' in (item as any)) && !('learnsets' in (item as any))
    ) {
      throw new Error('trimmed pokemon payload');
    }
    return item;
  } catch {}

  // Legacy aggregated fallback: use idmap -> shard -> scan
  try {
    const idmap = await ensure(['idmap', resource], () => fetchJSON<Record<string, string>>(`${BASE}/${resource}.idmap.json`));
    const file = idmap[String(id)];
    if (file) {
      const arr = await ensure(['shard', resource, file], () => fetchJSON<T[]>(`${BASE}/${file}`));
      for (const item of arr) {
        if ((item as any).id === id) return item;
      }
    }
  } catch {}

  // No more legacy species fallback in the new layout.
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
    default: return resource;
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
  try { return await ensure(['aliases', resource, 'v1'], () => fetchJSON(`${BASE}/aliases.${resource}.json`)); } catch { return {} as any; }
}

export function formatName(name: string): string {
  return String(name || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

// Convenience loaders for common datasets used across pages
let typeEntriesPromise: Promise<any[]> | undefined;
export async function loadTypeEntries(): Promise<any[]> {
  // Deprecated in new layout; keep legacy fallback only
  if (!typeEntriesPromise) typeEntriesPromise = ensure<any[]>(['legacy', 'type.json'], () => fetchJSON<any[]>(`${BASE}/type.json`)).catch(() => []);
  return typeEntriesPromise;
}

let growthRatesPromise: Promise<any[]> | undefined;
export async function loadGrowthRates(): Promise<any[]> {
  if (!growthRatesPromise) growthRatesPromise = ensure<any[]>(['legacy', 'growth-rate.json'], () => fetchJSON<any[]>(`${BASE}/growth-rate.json`)).catch(() => []);
  return growthRatesPromise;
}

export async function loadGrowthRatesLite(loc?: Locale): Promise<Array<{ id: number; name: string; exp100: number | null }>> {
  const locale = loc || (getLocale() as Locale);
  try { return await ensure(['growth-rates', locale, 'v1'], () => fetchJSON(`${BASE}/growth-rates.${locale}.json`)); } catch { return []; }
}

export async function loadSearchIndex(loc?: Locale): Promise<any[]> {
  const locale = loc || (getLocale() as Locale);
  return ensure(['search-index', locale, 'v2'], async () => {
    const [pokemons, moves, abilities, types, aPkm, aMov, aAbi, aTyp] = await Promise.all([
      ensure(['list', 'pokemon', locale, 'v1'], () => fetchJSON<Array<{ id: number; name: string }>>(`${BASE}/pokemons.${locale}.json`)).catch(() => []),
      ensure(['list', 'move', locale, 'v1'], () => fetchJSON<Array<{ id: number; name: string }>>(`${BASE}/moves.${locale}.json`)).catch(() => []),
      ensure(['list', 'ability', locale, 'v1'], () => fetchJSON<Array<{ id: number; name: string }>>(`${BASE}/abilities.${locale}.json`)).catch(() => []),
      ensure(['list', 'type', locale, 'v1'], () => fetchJSON<Array<{ id: number; name: string }>>(`${BASE}/types.${locale}.json`)).catch(() => []),
      ensure(['aliases', 'pokemon', 'v1'], () => fetchJSON<Record<string, string[]>>(`${BASE}/aliases.pokemon.json`)).catch(() => ({} as any)),
      ensure(['aliases', 'move', 'v1'], () => fetchJSON<Record<string, string[]>>(`${BASE}/aliases.move.json`)).catch(() => ({} as any)),
      ensure(['aliases', 'ability', 'v1'], () => fetchJSON<Record<string, string[]>>(`${BASE}/aliases.ability.json`)).catch(() => ({} as any)),
      ensure(['aliases', 'type', 'v1'], () => fetchJSON<Record<string, string[]>>(`${BASE}/aliases.type.json`)).catch(() => ({} as any)),
    ]);
    const idx: any[] = [];
    for (const p of pokemons) idx.push({ resource: 'pokemon', id: p.id, name: p.name, path: `/pokemon/${p.id}`, aliases: aPkm[String(p.id)] || [] });
    for (const m of moves) idx.push({ resource: 'move', id: m.id, name: m.name, path: `/move/${m.id}`, aliases: aMov[String(m.id)] || [] });
    for (const a of abilities) idx.push({ resource: 'ability', id: a.id, name: a.name, path: `/ability/${a.id}`, aliases: aAbi[String(a.id)] || [] });
    for (const t of types) idx.push({ resource: 'type', id: t.id, name: t.name, path: `/type/${t.id}`, aliases: aTyp[String(t.id)] || [] });
    return idx;
  });
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
