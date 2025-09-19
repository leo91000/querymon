#!/usr/bin/env node
// Fetch type icons (PNG) from Bulbapedia Types box
// Source page: https://bulbapedia.bulbagarden.net/wiki/%3F%3F%3F_(type)
// Output: apps/web/public/assets/types/bulba/<type>.png (lowercase)

import fs from 'node:fs/promises';
import path from 'node:path';

const PAGE = 'https://bulbapedia.bulbagarden.net/wiki/%3F%3F%3F_(type)';
const OUT_DIR = path.resolve('apps/web/public/assets/types/bulba');

function toOriginal(url) {
  // Convert /media/upload/thumb/<hash>/Name_icon.png/20px-Name_icon.png -> /media/upload/<hash>/Name_icon.png
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    const i = parts.indexOf('thumb');
    if (i !== -1) {
      parts.splice(i, 1); // remove 'thumb'
      parts.pop(); // remove size segment like '20px-Name_icon.png'
      u.pathname = parts.join('/');
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}

function typeSlugFromFilename(url) {
  const m = url.match(/\/([A-Za-z%]+)_icon\.png/i);
  if (!m) return null;
  return decodeURIComponent(m[1]).toLowerCase();
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const res = await fetch(PAGE, { headers: { 'User-Agent': 'QueryMon/1.0 (+github.com/leo91000/querymon)' } });
  if (!res.ok) throw new Error(`Failed to fetch page: ${res.status}`);
  const html = await res.text();
  const imgRe = /<img\s+[^>]*src="(https:\/\/archives\.bulbagarden\.net\/media\/upload\/thumb\/[^\"]+?_(?:icon|Icon)\.png\/[^\"]+)"/gi;
  const urls = new Set();
  let m;
  while ((m = imgRe.exec(html))) {
    urls.add(m[1]);
  }
  if (urls.size === 0) {
    console.error('No icons found in page.');
    process.exit(1);
  }
  const tasks = [];
  for (const u of urls) {
    const orig = toOriginal(u);
    const slug = typeSlugFromFilename(orig) || 'unknown';
    // Map special cases
    const nameMap = { none: 'unknown' };
    const outName = (nameMap[slug] || slug) + '.png';
    const outPath = path.join(OUT_DIR, outName);
    tasks.push(download(orig, outPath));
  }
  await Promise.all(tasks);
  console.log(`Downloaded ${tasks.length} icons to ${path.relative(process.cwd(), OUT_DIR)}`);
}

async function download(url, outPath) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'QueryMon/1.0 (+github.com/leo91000/querymon)' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    await fs.writeFile(outPath, buf);
    console.log('Saved', path.basename(outPath));
  } catch (e) {
    console.warn('Skip', url, '->', path.basename(outPath), ':', e.message || e);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

