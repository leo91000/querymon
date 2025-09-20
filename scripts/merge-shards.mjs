#!/usr/bin/env node
// Merge shard files (resource.001.json, ...) into single aggregated resource.json
// Skips resources that would exceed GitHub's 100MB limit (e.g., pokemon).
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.resolve(process.cwd(), 'apps/web/public/data/pokeapi');
const RESOURCES = ['pokemon-species','move','ability','evolution-chain'];

async function readJSON(p) { return JSON.parse(await readFile(p, 'utf8')); }
async function writeJSON(p, data) { await writeFile(p, JSON.stringify(data, null, 2), 'utf8'); }

async function mergeResource(res) {
  const manifestPath = path.join(OUT_DIR, `${res}.manifest.json`);
  let files = [];
  try {
    const manifest = await readJSON(manifestPath);
    files = manifest.files.map((f) => path.join(OUT_DIR, f));
  } catch {
    // no manifest; nothing to merge
    return false;
  }
  let merged = [];
  for (const f of files) {
    const arr = await readJSON(f);
    if (Array.isArray(arr)) merged = merged.concat(arr);
  }
  const outFile = path.join(OUT_DIR, `${res}.json`);
  await writeJSON(outFile, merged);
  console.log(`Merged ${res}: ${files.length} shards -> ${path.basename(outFile)} (${merged.length} items)`);
  return true;
}

async function main() {
  let mergedAny = false;
  for (const r of RESOURCES) {
    const ok = await mergeResource(r);
    mergedAny = mergedAny || ok;
  }
  if (!mergedAny) console.log('No shard manifests found to merge.');
}

main().catch((e) => { console.error(e); process.exit(1); });

