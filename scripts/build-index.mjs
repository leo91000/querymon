#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.resolve(process.cwd(), 'apps/web/public/data/pokeapi');
const OVERRIDES_DIR = path.resolve(process.cwd(), 'scripts/overrides');
const RESOURCES = ['pokemon', 'pokemon-species', 'move', 'ability', 'type', 'pokemon-habitat', 'growth-rate', 'egg-group', 'pokemon-shape', 'pokemon-color'];
const LOCALES = ['en', 'fr', 'jp'];
const LANG_MAP = { en: 'en', fr: 'fr', jp: 'ja' };
const EXCLUDE_FROM_SEARCH = new Set(['pokemon', 'pokemon-habitat', 'growth-rate', 'egg-group', 'pokemon-shape', 'pokemon-color']);
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

let OVR = {};

async function build() {
  // load overrides if present per locale
  OVR = {};
  for (const loc of LOCALES) {
    try {
      const raw = await readFile(path.join(OVERRIDES_DIR, `overrides.${loc}.json`), 'utf8');
      OVR[loc] = JSON.parse(raw);
    } catch { OVR[loc] = {}; }
  }
  const index = [];
  const localizedIndex = Object.fromEntries(LOCALES.map(l => [l, []]));
  const localizedLists = {}; // { `${resource}.${loc}`: [ {id,name} ] }
  const localizedNameMaps = {}; // { `${resource}.${loc}`: {id:name} }
  const aliasSets = {}; // { routeRes: { id: Set(names across locales) } }
  const aliasMaps = {}; // { routeRes: { id: Set } }
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
          // collect aliases
          if (!aliasSets[routeRes]) aliasSets[routeRes] = {};
          if (!aliasSets[routeRes][id]) aliasSets[routeRes][id] = new Set();
          if (locName) aliasSets[routeRes][id].add(String(locName));

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
    const lidx = localizedIndex[loc].map((e) => ({
      ...e,
      aliases: Array.from((aliasSets[e.resource]?.[e.id] || new Set())).filter(Boolean),
    }));
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

  // Write alias maps (id -> [all locale names]) for resources we browse
  for (const routeRes of Object.keys(aliasSets)) {
    if (['pokemon', 'move', 'ability', 'type'].includes(routeRes)) {
      const out = {};
      for (const idStr of Object.keys(aliasSets[routeRes])) {
        out[idStr] = Array.from(aliasSets[routeRes][idStr]).filter(Boolean);
      }
      await writeFile(path.join(OUT_DIR, `aliases.${routeRes}.json`), JSON.stringify(out, null, 2));
    }
  }
}

build().catch((e) => { console.error(e); process.exit(1); });

function localizedNameFor(resource, item, loc) {
  const lang = LANG_MAP[loc] || 'en';
  const id = item.id;
  const ov = OVR?.[loc]?.[resource]?.[id];
  if (ov) return ov;
  // resources with names[]
  if (resource === 'pokemon-species' || resource === 'move' || resource === 'ability' || resource === 'type' || resource === 'pokemon-habitat' || resource === 'egg-group' || resource === 'pokemon-shape' || resource === 'pokemon-color') {
    const names = item.names || [];
    // prefer ja, then ja-Hrkt for Japanese
    if (lang === 'ja') {
      const ja = names.find((n) => n.language?.name === 'ja');
      if (ja?.name) return ja.name;
      const jaHrkt = names.find((n) => n.language?.name === 'ja-Hrkt');
      if (jaHrkt?.name) return jaHrkt.name;
    }
    const found = names.find((n) => n.language?.name === lang);
    if (found?.name) return found.name;
  }
  // growth-rate: use descriptions[] as the localized label
  if (resource === 'growth-rate') {
    const descs = item.descriptions || [];
    if (lang === 'ja') {
      const ja = descs.find((d) => d.language?.name === 'ja');
      if (ja?.description) return ja.description;
      const jaHrkt = descs.find((d) => d.language?.name === 'ja-Hrkt');
      if (jaHrkt?.description) return jaHrkt.description;
    }
    const desc = descs.find((d) => d.language?.name === lang);
    if (desc?.description) return desc.description;
  }
  return item.name || String(item.id);
}
