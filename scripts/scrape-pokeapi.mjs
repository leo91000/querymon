#!/usr/bin/env node
/*
  PokeAPI scraper for QueryMon

  Fetches full datasets for these resources:
    - pokemon
    - pokemon-species
    - move
    - ability
    - type
    - evolution-chain

  Writes aggregated JSON under `public/data/pokeapi/<resource>.json`.
  Optionally writes per-item raw JSON under `data/pokeapi/raw/<resource>/<id>.json` with `--raw`.

  Usage examples:
    pnpm scrape                   # fetch all resources with defaults
    pnpm scrape --resources=pokemon,pokemon-species --limit=151
    pnpm scrape --concurrency=8 --delay=100 --raw

  Flags:
    --resources=csv            Comma-separated list (default: all)
    --limit=number             Limit items per resource (for testing)
    --concurrency=number       Parallel requests per resource (default: 6)
    --delay=ms                 Delay between individual requests (default: 50)
    --out=path                 Base output dir for aggregated (default: public/data/pokeapi)
    --raw                      Also write per-item files under data/pokeapi/raw
    --shard=number             Max items per aggregated JSON file (default: 250)
*/

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = 'https://pokeapi.co/api/v2';
const RESOURCES = ['pokemon', 'pokemon-species', 'move', 'ability', 'type', 'evolution-chain', 'pokemon-habitat', 'growth-rate', 'egg-group', 'pokemon-shape'];

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [k, v] = arg.slice(2).split('=');
    out[k] = v === undefined ? true : v;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const selected = (args.resources ? String(args.resources).split(',') : RESOURCES).filter(Boolean);
const LIMIT = args.limit ? Number(args.limit) : undefined;
const CONCURRENCY = args.concurrency ? Math.max(1, Number(args.concurrency)) : 6;
const DELAY = args.delay ? Math.max(0, Number(args.delay)) : 50;
const OUT_DIR = path.resolve(process.cwd(), args.out ? String(args.out) : 'apps/web/public/data/pokeapi');
const RAW = Boolean(args.raw);
const SHARD = args.shard ? Math.max(0, Number(args.shard)) : 250; // 0 disables sharding

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function idFromUrl(url) {
  const m = url.match(/\/(\d+)\/?$/);
  return m ? Number(m[1]) : null;
}

async function fetchJSON(url, attempt = 1) {
  const max = 5;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'QueryMon/1.0 (https://github.com/leo91000/querymon)' } });
    if (res.status === 429) {
      const ra = Number(res.headers.get('Retry-After')) || Math.min(2 ** attempt * 250, 5000);
      await sleep(ra);
      if (attempt < max) return fetchJSON(url, attempt + 1);
      throw new Error(`429 Too Many Requests (after ${attempt} tries)`);
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  } catch (err) {
    if (attempt >= max) throw err;
    await sleep(Math.min(2 ** attempt * 250, 4000));
    return fetchJSON(url, attempt + 1);
  }
}

async function listAll(resource) {
  const url = `${BASE}/${resource}?limit=100000&offset=0`;
  const data = await fetchJSON(url);
  return data.results ?? [];
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function mapWithConcurrency(items, mapper, concurrency) {
  const results = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = index++;
      if (i >= items.length) break;
      results[i] = await mapper(items[i], i);
      if (DELAY) await sleep(DELAY);
    }
  });
  await Promise.all(workers);
  return results;
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function writeJSON(file, data) {
  await ensureDir(path.dirname(file));
  await writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}

async function writeAggregated(resource, records) {
  if (!SHARD || records.length <= SHARD) {
    const file = path.join(OUT_DIR, `${resource}.json`);
    await writeJSON(file, records);
    return { files: [path.relative(process.cwd(), file)] };
  }
  const parts = chunk(records, SHARD);
  const files = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const file = path.join(OUT_DIR, `${resource}.${String(i + 1).padStart(3, '0')}.json`);
    await writeJSON(file, part);
    files.push(path.relative(process.cwd(), file));
  }
  const manifest = {
    resource,
    count: records.length,
    shard: SHARD,
    files: files.map((f) => path.basename(f)),
  };
  await writeJSON(path.join(OUT_DIR, `${resource}.manifest.json`), manifest);
  return { files };
}

async function scrapeResource(resource) {
  console.log(`\n→ Scraping ${resource} ...`);
  const list = await listAll(resource);
  const items = LIMIT ? list.slice(0, LIMIT) : list;
  console.log(`Found ${list.length} entries; fetching ${items.length}.`);

  const rawDir = path.resolve(process.cwd(), 'data/pokeapi/raw', resource);

  const details = await mapWithConcurrency(items, async (it) => {
    const url = it.url || `${BASE}/${resource}/${it.name}`;
    const data = await fetchJSON(url);
    const id = data.id ?? idFromUrl(url) ?? null;
    if (RAW && id != null) {
      await writeJSON(path.join(rawDir, `${id}.json`), data);
    }
    return data;
  }, CONCURRENCY);

  const { files } = await writeAggregated(resource, details);
  console.log(`Writing aggregated → ${files.join(', ')}`);
}

async function main() {
  console.log(`QueryMon PokeAPI scrape`);
  console.log(`Resources: ${selected.join(', ')}`);
  if (LIMIT) console.log(`Limit per resource: ${LIMIT}`);
  console.log(`Concurrency: ${CONCURRENCY}, Delay: ${DELAY}ms`);
  console.log(`Aggregated out: ${path.relative(process.cwd(), OUT_DIR)}`);
  if (SHARD) console.log(`Shard size: ${SHARD}`);
  if (RAW) console.log(`Raw per-item dumps: data/pokeapi/raw/<resource>/<id>.json`);

  await ensureDir(OUT_DIR);
  for (const res of selected) {
    if (!RESOURCES.includes(res)) {
      console.warn(`Skipping unknown resource: ${res}`);
      continue;
    }
    await scrapeResource(res);
  }

  console.log('\n✓ Done');
}

main().catch((err) => {
  console.error('Scrape failed:', err?.stack || err);
  process.exit(1);
});
