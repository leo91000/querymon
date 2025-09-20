#!/usr/bin/env node
// Sync public/data/pokeapi -> src/pokeapi and regenerate pokejson.ts
import { promises as fs } from 'node:fs';
import path from 'node:path';

const PUB_DIR = path.resolve('apps/web/public/data/pokeapi');
const SRC_DIR = path.resolve('apps/web/src/pokeapi');

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith('.json')) continue;
    await fs.copyFile(path.join(src, e.name), path.join(dest, e.name));
  }
}

async function main() {
  await copyDir(PUB_DIR, SRC_DIR);
  // Regenerate pokejson.ts
  const { default: url } = await import('node:url');
  await import('./generate-pokejson.mjs' + '');
}

main().catch(err => { console.error(err); process.exit(1); });

