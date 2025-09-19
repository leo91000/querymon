import { createResource } from 'solid-js';
import { t } from '../i18n';

export type ResourceName = 'pokemon' | 'pokemon-species' | 'move' | 'ability' | 'type';

export async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

function normalize(resource: ResourceName): ResourceName {
  // Alias: UI 'pokemon' uses species data under the hood
  if (resource === 'pokemon') return 'pokemon-species';
  return resource;
}

export async function loadList(resource: ResourceName): Promise<Array<{ id: number; name: string }>> {
  const r = normalize(resource);
  return fetchJSON(`/data/pokeapi/${r}.list.json`);
}

export async function loadIdMap(resource: ResourceName): Promise<Record<string, string>> {
  const r = normalize(resource);
  return fetchJSON(`/data/pokeapi/${r}.idmap.json`);
}

export async function loadItemById<T = any>(resource: ResourceName, id: number): Promise<T | undefined> {
  const r = normalize(resource);
  const idmap = await loadIdMap(r as ResourceName);
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
    case 'pokemon': return t('resources.pokemon');
    case 'pokemon-species': return t('resources.pokemon-species');
    case 'move': return t('resources.move');
    case 'ability': return t('resources.ability');
    case 'type': return t('resources.type');
  }
}

export function formatName(name: string): string {
  return String(name || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}
