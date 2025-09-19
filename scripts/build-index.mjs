#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.resolve(process.cwd(), 'apps/web/public/data/pokeapi');
const RESOURCES = ['pokemon', 'pokemon-species', 'move', 'ability', 'type'];
const LOCALES = ['en', 'fr', 'jp'];
const LANG_MAP = { en: 'en', fr: 'fr', jp: 'ja' };
const EXCLUDE_FROM_SEARCH = new Set(['pokemon']);
const RENAME_IN_SEARCH = { 'pokemon-species': 'pokemon' };

async function exists(p) {
  try { await readdir(path.dirname(p)); return true; } catch { return false; }
}

async function readJSON(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function displayName(resource, item) {
  if (resource === 'evolution-chain') {
    try {
      const base = item.chain?.species?.name || `chain-${item.id}`;
      return `${cap(base)} evolution chain`;
    } catch { return `chain-${item.id}`; }
  }
  return cap(item.name || String(item.id));
}

function cap(s) {
  return String(s || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

async function filesFor(resource) {
  const manifestFile = path.join(OUT_DIR, `${resource}.manifest.json`);
  try {
    const m = await readJSON(manifestFile);
    return m.files.map((f) => path.join(OUT_DIR, f));
  } catch {
    // single file fallback
    return [path.join(OUT_DIR, `${resource}.json`)];
  }
}

async function build() {
  const index = [];
  const localizedIndex = Object.fromEntries(LOCALES.map(l => [l, []]));
  const localizedLists = {}; // { `${resource}.${loc}`: [ {id,name} ] }
  const localizedNameMaps = {}; // { `${resource}.${loc}`: {id:name} }
  for (const resource of RESOURCES) {
    const files = await filesFor(resource);
    const idmap = {};
    const list = [];
    for (const f of files) {
      const data = await readJSON(f);
      for (const item of data) {
        const id = item.id;
        if (id != null && !idmap[id]) idmap[id] = path.basename(f);
        const name = item.name || (resource === 'evolution-chain' ? item.chain?.species?.name : undefined) || String(id);
        list.push({ id, name });

        // localized names
        for (const loc of LOCALES) {
          const key = `${(RENAME_IN_SEARCH[resource] || resource)}.${loc}`;
          const locName = localizedNameFor(resource, item, loc);
          if (!localizedLists[key]) localizedLists[key] = [];
          if (!localizedNameMaps[key]) localizedNameMaps[key] = {};
          // For pokemon-species, we store under route 'pokemon'
          const routeRes = (RENAME_IN_SEARCH[resource] || resource);
          if (routeRes !== 'pokemon-species') {
            localizedLists[key].push({ id, name: locName });
            localizedNameMaps[key][id] = locName;
          }
          if (!EXCLUDE_FROM_SEARCH.has(resource)) {
            localizedIndex[loc].push({ resource: routeRes, id, name: locName, path: `/${routeRes}/${id}` });
          } else if (resource === 'pokemon-species') {
            // add to search under 'pokemon'
            localizedIndex[loc].push({ resource: 'pokemon', id, name: locName, path: `/pokemon/${id}` });
          }
        }
      }
    }
    await writeFile(path.join(OUT_DIR, `${resource}.idmap.json`), JSON.stringify(idmap, null, 2));
    await writeFile(path.join(OUT_DIR, `${resource}.list.json`), JSON.stringify(list, null, 2));
    console.log(`Indexed ${resource}: ${list.length} items`);
  }
  // Write per-locale search indexes and lists / name maps
  for (const loc of LOCALES) {
    const lidx = localizedIndex[loc];
    await writeFile(path.join(OUT_DIR, `search-index.${loc}.json`), JSON.stringify(lidx, null, 2));
  }
  // Default search-index.json -> English
  await writeFile(path.join(OUT_DIR, `search-index.json`), JSON.stringify(localizedIndex['en'], null, 2));
  console.log(`search-index.<loc>.json written: en=${localizedIndex['en'].length}, fr=${localizedIndex['fr'].length}, jp=${localizedIndex['jp'].length}`);

  for (const key of Object.keys(localizedLists)) {
    const [resource, loc] = key.split('.');
    await writeFile(path.join(OUT_DIR, `${resource}.list.${loc}.json`), JSON.stringify(localizedLists[key], null, 2));
  }
  for (const key of Object.keys(localizedNameMaps)) {
    const [resource, loc] = key.split('.');
    await writeFile(path.join(OUT_DIR, `names.${loc}.${resource}.json`), JSON.stringify(localizedNameMaps[key], null, 2));
  }
}

build().catch((e) => { console.error(e); process.exit(1); });

function localizedNameFor(resource, item, loc) {
  const lang = LANG_MAP[loc] || 'en';
  // species provides localized names in item.names
  if (resource === 'pokemon-species' || resource === 'move' || resource === 'ability' || resource === 'type') {
    const names = item.names || [];
    const found = names.find((n) => n.language?.name === lang);
    if (found?.name) return found.name;
  }
  return item.name || String(item.id);
}
