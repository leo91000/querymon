import { set, get, del, keys } from 'idb-keyval';

const PREFIX = 'fav:';

export type Favorite = { id: number; nickname?: string };

export async function addLocalFavorite(pokemonId: number, nickname?: string) {
  await set(PREFIX + pokemonId, { id: pokemonId, nickname } satisfies Favorite);
}

export async function removeLocalFavorite(pokemonId: number) {
  await del(PREFIX + pokemonId);
}

export async function listLocalFavorites(): Promise<Favorite[]> {
  const all = await keys();
  const out: Favorite[] = [];
  for (const k of all) {
    if (typeof k === 'string' && k.startsWith(PREFIX)) {
      const v = await get<Favorite>(k);
      if (v) out.push(v);
    }
  }
  return out;
}

