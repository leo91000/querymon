import { createResource } from 'solid-js';

export type ResourceName = 'pokemon' | 'pokemon-species' | 'move' | 'ability' | 'type' | 'evolution-chain';

export async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

export async function loadList(resource: ResourceName): Promise<Array<{ id: number; name: string }>> {
  return fetchJSON(`/data/pokeapi/${resource}.list.json`);
}

export async function loadIdMap(resource: ResourceName): Promise<Record<string, string>> {
  return fetchJSON(`/data/pokeapi/${resource}.idmap.json`);
}

export async function loadItemById<T = any>(resource: ResourceName, id: number): Promise<T | undefined> {
  const idmap = await loadIdMap(resource);
  const file = idmap[String(id)];
  if (!file) return undefined;
  const arr = await fetchJSON<T[]>(`/data/pokeapi/${file}`);
  for (const item of arr) {
    if ((item as any).id === id) return item;
  }
  return undefined;
}

export function resourceLabel(resource: ResourceName): string {
  switch (resource) {
    case 'pokemon': return 'Pokémon';
    case 'pokemon-species': return 'Species';
    case 'move': return 'Moves';
    case 'ability': return 'Abilities';
    case 'type': return 'Types';
    case 'evolution-chain': return 'Evolution Chains';
  }
}

export function formatName(name: string): string {
  return String(name || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

