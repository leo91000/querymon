#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.resolve(process.cwd(), 'apps/web/public/data/pokeapi');
const RESOURCES = ['pokemon', 'pokemon-species', 'move', 'ability', 'type', 'evolution-chain'];
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
        if (!EXCLUDE_FROM_SEARCH.has(resource)) {
          const r = (RENAME_IN_SEARCH[resource] || resource);
          index.push({ resource: r, id, name, path: `/${r}/${id ?? name}` });
        }
      }
    }
    await writeFile(path.join(OUT_DIR, `${resource}.idmap.json`), JSON.stringify(idmap, null, 2));
    await writeFile(path.join(OUT_DIR, `${resource}.list.json`), JSON.stringify(list, null, 2));
    console.log(`Indexed ${resource}: ${list.length} items`);
  }
  await writeFile(path.join(OUT_DIR, `search-index.json`), JSON.stringify(index, null, 2));
  console.log(`search-index.json entries: ${index.length}`);
}

build().catch((e) => { console.error(e); process.exit(1); });
