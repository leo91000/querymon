#!/usr/bin/env node
/*
  Build page-optimized JSON files from aggregated PokeAPI dumps.

  Output layout under apps/web/public/data/pokeapi:
  - pokemon/list.json                                 → minimal grid list (id, name, types[], sprite)
  - pokemon/<id>.json                                 → merged detail (pokemon + species trimmed)
  - move/<id>.json, ability/<id>.json, type/<id>.json → trimmed details used by pages

  This script assumes aggregated files already exist (produced by scrape-pokeapi.mjs),
  and complements scripts/build-index.mjs (names, search-index, aliases, legacy lists).
*/

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.resolve(process.cwd(), 'apps/web/public/data/pokeapi');

async function ensureDir(dir) { await mkdir(dir, { recursive: true }); }
async function readJSON(file) { return JSON.parse(await readFile(file, 'utf8')); }
async function writeJSON(file, data) { await ensureDir(path.dirname(file)); await writeFile(file, JSON.stringify(data, null, 2), 'utf8'); }

async function readAggregated(resource) {
  const manifestFile = path.join(OUT_DIR, `${resource}.manifest.json`);
  try {
    const m = await readJSON(manifestFile);
    const out = [];
    for (const rel of m.files) {
      const fp = path.join(OUT_DIR, rel);
      const arr = await readJSON(fp);
      for (const it of arr) out.push(it);
    }
    return out;
  } catch {
    // single-file fallback
    return readJSON(path.join(OUT_DIR, `${resource}.json`));
  }
}

function idFromUrl(url) {
  const m = String(url || '').match(/\/(\d+)\/?$/);
  return m ? Number(m[1]) : undefined;
}

function capFirst(s) { return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1); }

function simplifyTypes(pokemon) {
  const out = [];
  const arr = (pokemon?.types || []);
  for (const t of arr) {
    const name = t?.type?.name;
    const id = idFromUrl(t?.type?.url);
    if (!name) continue;
    out.push({ id, name });
  }
  return out;
}

function simplifyAbilities(pokemon) {
  const out = [];
  const arr = (pokemon?.abilities || []);
  for (const a of arr) {
    const id = idFromUrl(a?.ability?.url);
    const name = a?.ability?.name;
    const hidden = Boolean(a?.is_hidden);
    if (!name) continue;
    out.push({ id, name, hidden });
  }
  return out;
}

function simplifyStats(pokemon) {
  const out = [];
  const arr = (pokemon?.stats || []);
  for (const s of arr) {
    out.push({ name: s?.stat?.name, base: s?.base_stat, effort: s?.effort });
  }
  return out;
}

function officialArt(pokemon) {
  return (
    pokemon?.sprites?.other?.['official-artwork']?.front_default ||
    pokemon?.sprites?.front_default ||
    ''
  );
}

function trimEntriesByLang(list, langs = ['en', 'fr', 'ja', 'ja-Hrkt']) {
  if (!Array.isArray(list)) return [];
  const set = new Set(langs);
  const out = [];
  for (const e of list) {
    const ln = e?.language?.name;
    if (!ln || !set.has(ln)) continue;
    // normalize line breaks for UI
    const copy = { ...e };
    if (typeof copy.flavor_text === 'string') copy.flavor_text = copy.flavor_text.replace(/[\n\f]/g, ' ');
    if (typeof copy.short_effect === 'string') copy.short_effect = copy.short_effect.replace(/[\n\f]/g, ' ');
    if (typeof copy.effect === 'string') copy.effect = copy.effect.replace(/[\n\f]/g, ' ');
    out.push(copy);
  }
  return out;
}

function trimGenera(list) {
  if (!Array.isArray(list)) return [];
  const langs = new Set(['en', 'fr', 'ja', 'ja-Hrkt']);
  const out = [];
  for (const g of list) {
    const ln = g?.language?.name;
    if (!ln || !langs.has(ln)) continue;
    out.push({ language: { name: ln }, genus: g?.genus });
  }
  return out;
}

async function buildPokemonPages() {
  const species = await readAggregated('pokemon-species');
  const pokes = await readAggregated('pokemon');
  const pokeById = new Map();
  for (const p of pokes) pokeById.set(p.id, p);

  // Minimal Pokémon grid list (id, name, types[capitalized], sprite)
  const list = [];
  for (const s of species) {
    const id = s?.id;
    if (id == null) continue;
    const p = pokeById.get(id);
    const types = [];
    for (const t of (p?.types || [])) {
      const name = String(t?.type?.name || '');
      if (name) types.push(capFirst(name));
    }
    const sprite = officialArt(p);
    list.push({ id, name: s?.name || String(id), types, sprite });
  }
  await writeJSON(path.join(OUT_DIR, 'pokemon', 'list.json'), list);

  // Per-Pokémon detail: merge trimmed pokemon + species bits used by the UI
  for (const s of species) {
    const id = s?.id;
    if (id == null) continue;
    const p = pokeById.get(id);
  const data = {
      id,
      name: s?.name || p?.name || String(id),
      sprites: {
        front_default: p?.sprites?.front_default || null,
        official_artwork: p?.sprites?.other?.['official-artwork']?.front_default || null,
      },
      types: simplifyTypes(p),
      abilities: simplifyAbilities(p),
      stats: simplifyStats(p),
      weight: p?.weight ?? null,
      height: p?.height ?? null,
      base_experience: p?.base_experience ?? null,
      species: {
        capture_rate: s?.capture_rate ?? null,
        hatch_counter: s?.hatch_counter ?? null,
        gender_rate: s?.gender_rate ?? null,
        growth_rate: s?.growth_rate ? { id: idFromUrl(s.growth_rate.url), name: s.growth_rate.name } : null,
        egg_groups: Array.isArray(s?.egg_groups) ? s.egg_groups.map((g) => ({ id: idFromUrl(g.url), name: g.name })) : [],
        color: s?.color ? { id: idFromUrl(s.color.url), name: s.color.name } : null,
        names: trimEntriesByLang(s?.names || [], ['en','fr','ja']),
        genera: trimGenera(s?.genera || []),
        flavor_text_entries: trimEntriesByLang(s?.flavor_text_entries || []),
      },
    };
    await writeJSON(path.join(OUT_DIR, 'pokemon', `${id}.json`), data);
  }
}

async function buildMovePages() {
  const moves = await readAggregated('move');
  for (const m of moves) {
    const id = m?.id; if (id == null) continue;
    const data = {
      id,
      name: m?.name,
      type: m?.type ? { id: idFromUrl(m.type.url), name: m.type.name } : null,
      damage_class: m?.damage_class ? { name: m.damage_class.name } : null,
      power: m?.power ?? null,
      accuracy: m?.accuracy ?? null,
      pp: m?.pp ?? null,
      priority: m?.priority ?? 0,
      target: m?.target ? { name: m.target.name } : null,
      generation: m?.generation ? { name: m.generation.name } : null,
      effect_chance: m?.effect_chance ?? null,
      effect_entries: trimEntriesByLang(m?.effect_entries || []),
      flavor_text_entries: trimEntriesByLang(m?.flavor_text_entries || []),
      stat_changes: Array.isArray(m?.stat_changes) ? m.stat_changes : [],
      learned_by_pokemon: Array.isArray(m?.learned_by_pokemon) ? m.learned_by_pokemon : [],
    };
    await writeJSON(path.join(OUT_DIR, 'move', `${id}.json`), data);
  }
}

async function buildAbilityPages() {
  const abilities = await readAggregated('ability');
  for (const a of abilities) {
    const id = a?.id; if (id == null) continue;
    const data = {
      id,
      name: a?.name,
      is_main_series: a?.is_main_series ?? true,
      generation: a?.generation ? { name: a.generation.name } : null,
      effect_entries: trimEntriesByLang(a?.effect_entries || []),
      flavor_text_entries: trimEntriesByLang(a?.flavor_text_entries || []),
      pokemon: Array.isArray(a?.pokemon) ? a.pokemon : [],
    };
    await writeJSON(path.join(OUT_DIR, 'ability', `${id}.json`), data);
  }
}

async function buildTypePages() {
  const types = await readAggregated('type');
  for (const t of types) {
    const id = t?.id; if (id == null) continue;
    const data = {
      id,
      name: t?.name,
      names: Array.isArray(t?.names) ? t.names : [],
      damage_relations: t?.damage_relations || {},
      moves: Array.isArray(t?.moves) ? t.moves : [],
      pokemon: Array.isArray(t?.pokemon) ? t.pokemon : [],
    };
    await writeJSON(path.join(OUT_DIR, 'type', `${id}.json`), data);
  }
}

async function main() {
  console.log('→ Building page JSON (pokemon list + per-item details)...');
  await ensureDir(OUT_DIR);
  await buildPokemonPages();
  await buildMovePages();
  await buildAbilityPages();
  await buildTypePages();
  console.log('✓ Page JSON written');
}

main().catch((e) => { console.error(e); process.exit(1); });
