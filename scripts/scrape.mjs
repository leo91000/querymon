#!/usr/bin/env node
/*
  QueryMon — Single Scraper (new layout)

  Emits ONLY the per-page, per-locale JSON files you requested:

  - pokemons.<loc>.json
  - pokemon.<id>.<loc>.json
  - moves.<loc>.json
  - move.<id>.<loc>.json
  - abilities.<loc>.json
  - ability.<id>.<loc>.json
  - types.<loc>.json
  - type.<id>.<loc>.json

  Locales: en, fr, jp (jp maps to ja/ja-Hrkt in PokeAPI)

  Behavior:
  - By default, tries to reuse existing aggregated dumps under apps/web/public/data/pokeapi
    if present; otherwise fetches live from PokeAPI.
  - Writes into apps/web/public/data/pokeapi.
  - Pass --clean to delete all existing files in that folder before writing.
  - Pass --limit=N to restrict processed Pokémon (useful for dev), moves/abilities/types are
    still processed fully unless --limitResources is also passed.

  Examples:
    node scripts/scrape.mjs --clean
    node scripts/scrape.mjs --locales=en,fr --limit=151 --concurrency=8
*/

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const OUT_DIR = path.resolve(process.cwd(), 'apps/web/public/data/pokeapi');
const BASE = 'https://pokeapi.co/api/v2';

// CLI options
const argv = new Map(
    process.argv.slice(2).map((a) => {
        const [k, v] = a.split('=');
        return [k.replace(/^--/, ''), v === undefined ? 'true' : v];
    }),
);

const LOCALES = (argv.get('locales') || 'en,fr,jp').split(',').map(s => s.trim()).filter(Boolean);
const LANG_MAP = { en: 'en', fr: 'fr', jp: 'ja' };
const CONCURRENCY = Number(argv.get('concurrency') || 6);
const DELAY = Number(argv.get('delay') || 0);
const LIMIT = argv.has('limit') ? Number(argv.get('limit')) : undefined; // limit Pokémon processing
const LIMIT_RES = argv.has('limitResources') ? Number(argv.get('limitResources')) : undefined; // limit list() pagination for all resources
const CLEAN = argv.get('clean') === 'true';
const SOURCE = (argv.get('source') || 'auto');

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function ensureDir(dir) {
    await mkdir(dir, { recursive: true });
}
async function writeJSON(file, data) {
    await ensureDir(path.dirname(file));
    await writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}
async function readJSON(file) {
    const txt = await readFile(file, 'utf8');
    return JSON.parse(txt);
}

async function filesIn(dir) {
    try {
        return await readdir(dir);
    }
    catch {
        return [];
    }
}

function idFromUrl(url) {
    const m = String(url || '').match(/\/(\d+)\/?$/);
    return m ? Number(m[1]) : undefined;
}

function capFirst(s) {
    const text = String(s || '');
    return text.charAt(0).toUpperCase() + text.slice(1);
}

async function fetchJSON(url, attempt = 1) {
    const max = 5;
    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'QueryMon/1.0 (scrape)' } });
        if (res.status === 429) {
            const ra = Number(res.headers.get('Retry-After')) || Math.min(2 ** attempt * 250, 5000);
            await sleep(ra);
            if (attempt < max)
                return fetchJSON(url, attempt + 1);
            throw new Error(`429 Too Many Requests (after ${attempt} tries)`);
        }
        if (!res.ok)
            throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
    }
    catch (err) {
        if (attempt >= max)
            throw err;
        await sleep(Math.min(2 ** attempt * 250, 4000));
        return fetchJSON(url, attempt + 1);
    }
}

async function listAll(resource) {
    const url = `${BASE}/${resource}?limit=${LIMIT_RES ?? 100000}&offset=0`;
    const data = await fetchJSON(url);
    return data.results ?? [];
}

async function mapWithConcurrency(items, mapper, concurrency) {
    const results = Array.from({ length: items.length });
    let index = 0;
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (true) {
            const i = index++;
            if (i >= items.length)
                break;
            results[i] = await mapper(items[i], i);
            if (DELAY)
                await sleep(DELAY);
        }
    });
    await Promise.all(workers);
    return results;
}

async function readAggregated(resource) {
    // Try manifest first
    const manifest = path.join(OUT_DIR, `${resource}.manifest.json`);
    try {
        const m = await readJSON(manifest);
        const out = [];
        for (const rel of m.files) {
            const fp = path.join(OUT_DIR, rel);
            const arr = await readJSON(fp);
            for (const it of arr) out.push(it);
        }
        return out;
    }
    catch {}
    // Fall back to single aggregated
    try {
        return await readJSON(path.join(OUT_DIR, `${resource}.json`));
    }
    catch {
        return undefined;
    }
}

const VERSION_GROUP_TO_GENERATION = {
    'red-blue': { generation: 'generation-i', order: 1 },
    'yellow': { generation: 'generation-i', order: 2 },
    'gold-silver': { generation: 'generation-ii', order: 3 },
    'crystal': { generation: 'generation-ii', order: 4 },
    'ruby-sapphire': { generation: 'generation-iii', order: 5 },
    'emerald': { generation: 'generation-iii', order: 6 },
    'firered-leafgreen': { generation: 'generation-iii', order: 7 },
    'diamond-pearl': { generation: 'generation-iv', order: 8 },
    'platinum': { generation: 'generation-iv', order: 9 },
    'heartgold-soulsilver': { generation: 'generation-iv', order: 10 },
    'black-white': { generation: 'generation-v', order: 11 },
    'black-2-white-2': { generation: 'generation-v', order: 12 },
    'x-y': { generation: 'generation-vi', order: 13 },
    'omega-ruby-alpha-sapphire': { generation: 'generation-vi', order: 14 },
    'sun-moon': { generation: 'generation-vii', order: 15 },
    'ultra-sun-ultra-moon': { generation: 'generation-vii', order: 16 },
    'lets-go-pikachu-lets-go-eevee': { generation: 'generation-vii', order: 17 },
    'sword-shield': { generation: 'generation-viii', order: 18 },
    'brilliant-diamond-and-shining-pearl': { generation: 'generation-viii', order: 19 },
    'legends-arceus': { generation: 'generation-viii', order: 20 },
    'scarlet-violet': { generation: 'generation-ix', order: 21 },
};

function localizedNameFrom(item, loc) {
    const lang = LANG_MAP[loc] || 'en';
    const names = item?.names || [];
    if (lang === 'ja') {
        const ja = names.find(n => n.language?.name === 'ja')?.name;
        if (ja)
            return ja;
        const jaHrkt = names.find(n => n.language?.name === 'ja-Hrkt')?.name;
        if (jaHrkt)
            return jaHrkt;
    }
    return names.find(n => n.language?.name === lang)?.name || item?.name || '';
}

function trimEffectEntries(list, locs) {
    if (!Array.isArray(list))
        return [];
    const langs = new Set(locs.map(l => (LANG_MAP[l] || 'en')));
    const out = [];
    for (const e of list) {
        const ln = e?.language?.name;
        if (!ln || (!langs.has(ln) && ln !== 'en'))
            continue;
        const copy = { ...e };
        if (typeof copy.flavor_text === 'string')
            copy.flavor_text = copy.flavor_text.replace(/[\n\f]/g, ' ');
        if (typeof copy.short_effect === 'string')
            copy.short_effect = copy.short_effect.replace(/[\n\f]/g, ' ');
        if (typeof copy.effect === 'string')
            copy.effect = copy.effect.replace(/[\n\f]/g, ' ');
        out.push(copy);
    }
    return out;
}

function flavorTextFor(species, loc) {
    const list = species?.flavor_text_entries || [];
    const want = LANG_MAP[loc] || 'en';
    if (want === 'ja') {
        const ja = list.find(e => e?.language?.name === 'ja')?.flavor_text;
        if (ja)
            return String(ja).replace(/[\n\f]/g, ' ');
        const jaHrkt = list.find(e => e?.language?.name === 'ja-Hrkt')?.flavor_text;
        if (jaHrkt)
            return String(jaHrkt).replace(/[\n\f]/g, ' ');
    }
    const found = list.find(e => e?.language?.name === want)?.flavor_text;
    return found ? String(found).replace(/[\n\f]/g, ' ') : undefined;
}

function spritePack(p) {
    const other = p?.sprites?.other || {};
    const pack = {
        'front_default': p?.sprites?.front_default || null,
        'front_shiny': p?.sprites?.front_shiny || null,
        'official-artwork': {
            front_default: other?.['official-artwork']?.front_default || null,
            front_shiny: other?.['official-artwork']?.front_shiny || null,
        },
        'home': {
            front_default: other?.home?.front_default || null,
            front_shiny: other?.home?.front_shiny || null,
            front_female: other?.home?.front_female || null,
            front_shiny_female: other?.home?.front_shiny_female || null,
            back_default: other?.home?.back_default || null,
            back_shiny: other?.home?.back_shiny || null,
            back_female: other?.home?.back_female || null,
            back_shiny_female: other?.home?.back_shiny_female || null,
        },
        'dream_world': {
            front_default: other?.dream_world?.front_default || null,
        },
        'showdown': {
            front_default: other?.showdown?.front_default || null,
            front_shiny: other?.showdown?.front_shiny || null,
            front_female: other?.showdown?.front_female || null,
            front_shiny_female: other?.showdown?.front_shiny_female || null,
            back_default: other?.showdown?.back_default || null,
            back_shiny: other?.showdown?.back_shiny || null,
            back_female: other?.showdown?.back_female || null,
            back_shiny_female: other?.showdown?.back_shiny_female || null,
        },
    };
    return pack;
}

function collapseVersions(p) {
    const out = {};
    const versions = p?.sprites?.versions || {};
    const GEN_ORDER = [
        'generation-i',
        'generation-ii',
        'generation-iii',
        'generation-iv',
        'generation-v',
        'generation-vi',
        'generation-vii',
        'generation-viii',
        'generation-ix',
    ];
    const CAT_KEYS = [
        'front_default',
        'back_default',
        'front_shiny',
        'back_shiny',
        'front_female',
        'back_female',
        'front_shiny_female',
        'back_shiny_female',
    ];
    for (const gen of GEN_ORDER) {
        const gobj = versions?.[gen];
        if (!gobj)
            continue;
        const acc = {};
        for (const key of CAT_KEYS) {
            let url = null;
            // Prefer direct (if any future scrapers place it)
            if (typeof gobj?.[key] === 'string')
                url = gobj[key];
            // Else scan version groups
            if (!url) {
                for (const vgName of Object.keys(gobj)) {
                    const group = gobj[vgName] || {};
                    const candidate = group?.[key];
                    if (typeof candidate === 'string' && candidate) {
                        url = candidate;
                        break;
                    }
                }
            }
            if (url)
                acc[key] = url;
        }
        if (Object.keys(acc).length > 0)
            out[gen] = acc;
    }
    return out;
}

function simplifyTypes(p) {
    const out = [];
    for (const t of p?.types || []) {
        out.push({ id: idFromUrl(t?.type?.url), name: t?.type?.name });
    }
    return out;
}

function simplifyAbilities(p) {
    const out = [];
    for (const a of p?.abilities || []) {
        out.push({ id: idFromUrl(a?.ability?.url), name: a?.ability?.name, hidden: !!a?.is_hidden });
    }
    return out;
}

function simplifyStats(p) {
    const out = [];
    for (const s of p?.stats || []) {
        out.push({ name: s?.stat?.name, base: s?.base_stat, effort: s?.effort });
    }
    return out;
}

function buildEvolutionStages(chain, currentId) {
    if (!chain)
        return [];
    const stages = [];
    function visit(node, depth) {
        if (!node)
            return;
        if (!stages[depth])
            stages[depth] = [];
        const sid = idFromUrl(node?.species?.url);
        stages[depth].push({
            id: sid,
            sprite: sid ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${sid}.png` : null,
            details: (node?.evolution_details || []),
            isCurrent: sid === currentId,
        });
        for (const next of node?.evolves_to || []) visit(next, depth + 1);
    }
    visit(chain, 0);
    return stages;
}

function learnsetsForPokemon(p, moveById, loc) {
    // Group moves by generation, then by learn method
    const genMap = new Map(); // gen -> { order, methods: Map<method, Map<key, entry>> }
    for (const mv of p?.moves || []) {
        const moveId = idFromUrl(mv?.move?.url);
        const detail = moveById.get(moveId);
        const moveSlug = mv?.move?.name || '';
        const localizedMove = detail ? localizedNameFrom(detail, loc) : moveSlug;
        for (const vg of mv?.version_group_details || []) {
            const method = vg?.move_learn_method?.name;
            const info = VERSION_GROUP_TO_GENERATION[vg?.version_group?.name];
            if (!method || !info)
                continue;
            const g = genMap.get(info.generation) || { order: info.order, methods: new Map() };
            genMap.set(info.generation, g);
            const m = g.methods.get(method) || new Map();
            g.methods.set(method, m);
            const key = String(moveId ?? localizedMove);
            if (!m.has(key)) {
                m.set(key, {
                    move: { id: moveId, name: localizedMove },
                    type: detail?.type?.name ?? null,
                    category: detail?.damage_class?.name ?? null,
                    power: detail?.power ?? null,
                    accuracy: detail?.accuracy ?? null,
                    pp: detail?.pp ?? null,
                    level: method === 'level-up' ? (vg?.level_learned_at ?? null) : null,
                    versionGroups: vg?.version_group?.name ? [vg.version_group.name] : [],
                });
            }
            else {
                const existing = m.get(key);
                if (method === 'level-up') {
                    const lvl = vg?.level_learned_at ?? null;
                    if (lvl != null && lvl !== 0 && (existing.level == null || existing.level === 0 || lvl < existing.level))
                        existing.level = lvl;
                }
                const nm = vg?.version_group?.name;
                if (nm && !existing.versionGroups.includes(nm))
                    existing.versionGroups.push(nm);
            }
        }
    }
    const sections = [];
    for (const [gen, info] of genMap) {
        const methods = [];
        for (const [method, items] of info.methods) {
            const list = Array.from(items.values()).sort((a, b) => {
                if (method === 'level-up') {
                    const lvA = a.level ?? 0;
                    const lvB = b.level ?? 0;
                    if (lvA !== lvB)
                        return lvA - lvB;
                }
                return a.move.name.localeCompare(b.move.name);
            });
            if (list.length)
                methods.push({ method, items: list });
        }
        methods.sort((a, b) => a.method.localeCompare(b.method));
        sections.push({ generation: gen, order: info.order, entries: methods });
    }
    sections.sort((a, b) => a.order - b.order);
    return sections;
}

async function main() {
    console.log('QueryMon — scrape (single script, new layout)');
    console.log(`Locales: ${LOCALES.join(', ')}`);
    console.log(`Concurrency: ${CONCURRENCY}, Delay: ${DELAY}ms`);
    if (LIMIT != null)
        console.log(`Pokémon limit: ${LIMIT}`);
    console.log(`Source mode: ${SOURCE}`);

    // Load datasets (aggregated if available & allowed; else fetch live)
    let species = SOURCE !== 'pokeapi' ? await readAggregated('pokemon-species') : undefined;
    let pokes = SOURCE !== 'pokeapi' ? await readAggregated('pokemon') : undefined;
    let moves = SOURCE !== 'pokeapi' ? await readAggregated('move') : undefined;
    let abilities = SOURCE !== 'pokeapi' ? await readAggregated('ability') : undefined;
    let types = SOURCE !== 'pokeapi' ? await readAggregated('type') : undefined;
    let growthRates = SOURCE !== 'pokeapi' ? await readAggregated('growth-rate') : undefined;
    const evoChains = SOURCE !== 'pokeapi' ? await readAggregated('evolution-chain') : undefined;
    let colors = SOURCE !== 'pokeapi' ? await readAggregated('pokemon-color') : undefined;
    let eggGroups = SOURCE !== 'pokeapi' ? await readAggregated('egg-group') : undefined;

    const needFetch = SOURCE === 'pokeapi' || !species || !pokes || !moves || !abilities || !types || !growthRates || !colors || !eggGroups;
    if (needFetch) {
        console.log('Fetching from PokeAPI (live)...');
        const [pkList, mvList, abList, tpList] = await Promise.all([
            listAll('pokemon-species'),
            listAll('move'),
            listAll('ability'),
            listAll('type'),
        ]);
        const limitPk = LIMIT ? pkList.slice(0, LIMIT) : pkList;
        const [speciesData, pokesData, moveData, abilityData, typeData, growthData, colorData, eggGroupData] = await Promise.all([
            mapWithConcurrency(limitPk, async it => fetchJSON(it.url), CONCURRENCY),
            mapWithConcurrency(limitPk, async it => fetchJSON(`${BASE}/pokemon/${idFromUrl(it.url)}`), CONCURRENCY),
            mapWithConcurrency(mvList, async it => fetchJSON(it.url), CONCURRENCY),
            mapWithConcurrency(abList, async it => fetchJSON(it.url), CONCURRENCY),
            mapWithConcurrency(tpList, async it => fetchJSON(it.url), CONCURRENCY),
            (async () => {
                const grList = await listAll('growth-rate');
                return mapWithConcurrency(grList, async it => fetchJSON(it.url), CONCURRENCY);
            })(),
            (async () => {
                const cList = await listAll('pokemon-color');
                return mapWithConcurrency(cList, async it => fetchJSON(it.url), CONCURRENCY);
            })(),
            (async () => {
                const egList = await listAll('egg-group');
                return mapWithConcurrency(egList, async it => fetchJSON(it.url), CONCURRENCY);
            })(),
        ]);
        species = speciesData;
        pokes = pokesData;
        moves = moveData;
        abilities = abilityData;
        types = typeData;
        growthRates = growthData;
        colors = colorData;
        eggGroups = eggGroupData;
    }

    // Now that we have data in memory, apply --clean to output dir if requested
    if (CLEAN) {
        console.log(`--clean → removing ${path.relative(process.cwd(), OUT_DIR)}/*`);
        await rm(OUT_DIR, { recursive: true, force: true });
    }
    await ensureDir(OUT_DIR);

    // Maps for quick lookup
    const speciesById = new Map((species || []).map(s => [s.id, s]));
    const pokeById = new Map((pokes || []).map(p => [p.id, p]));
    const moveById = new Map((moves || []).map(m => [m.id, m]));
    // const abilityById = new Map((abilities || []).map(a => [a.id, a]));
    // const typeById = new Map((types || []).map(t => [t.id, t]));
    // Map pokemon (form) id -> species id to localize names reliably
    const pokemonToSpecies = new Map();
    for (const p of pokes || []) {
        const sid = idFromUrl(p?.species?.url);
        if (p?.id != null && sid != null)
            pokemonToSpecies.set(p.id, sid);
    }

    // Evolution chains: load on-demand (aggregated set may not be available in old dumps)
    const evoChainCache = new Map(); // id -> chain json
    const evoChainById = new Map((evoChains || []).map(c => [c?.id, c]));
    async function evolutionChainForSpeciesId(id) {
        const s = speciesById.get(id);
        const url = s?.evolution_chain?.url;
        if (!url)
            return undefined;
        const cid = idFromUrl(url);
        if (evoChainCache.has(cid))
            return evoChainCache.get(cid);
        // Prefer local aggregated chain if available
        if (evoChainById.has(cid)) {
            const data = evoChainById.get(cid);
            evoChainCache.set(cid, data);
            return data;
        }
        // Fallback: fetch live
        const data = await fetchJSON(url);
        evoChainCache.set(cid, data);
        return data;
    }

    // Emit growth-rates.<loc>.json → minimal data for "Exp at 100" + localized label
    function localizedGrowthRateName(gr, loc) {
        const want = LANG_MAP[loc] || 'en';
        const descs = Array.isArray(gr?.descriptions) ? gr.descriptions : [];
        if (want === 'ja') {
            const ja = descs.find(d => d?.language?.name === 'ja')?.description;
            if (ja)
                return ja;
            const jaHrkt = descs.find(d => d?.language?.name === 'ja-Hrkt')?.description;
            if (jaHrkt)
                return jaHrkt;
        }
        const found = descs.find(d => d?.language?.name === want)?.description;
        return found || gr?.name || '';
    }

    for (const loc of LOCALES) {
        const list = [];
        for (const gr of growthRates || []) {
            const id = gr?.id;
            if (id == null)
                continue;
            const levels = Array.isArray(gr?.levels) ? gr.levels : [];
            const lv100 = levels.find(l => Number(l?.level) === 100);
            const exp100 = lv100?.experience ?? null;
            list.push({ id, name: localizedGrowthRateName(gr, loc), exp100 });
        }
        list.sort((a, b) => a.id - b.id);
        await writeJSON(path.join(OUT_DIR, `growth-rates.${loc}.json`), list);
    }

    // Color localization helper
    const colorById = new Map((colors || []).map(c => [c?.id, c]));
    function localizedColorName(id, loc) {
        const item = colorById.get(id);
        const names = Array.isArray(item?.names) ? item.names : [];
        const want = LANG_MAP[loc] || 'en';
        if (want === 'ja') {
            const ja = names.find(n => n.language?.name === 'ja')?.name;
            if (ja)
                return ja;
            const jaHrkt = names.find(n => n.language?.name === 'ja-Hrkt')?.name;
            if (jaHrkt)
                return jaHrkt;
        }
        return names.find(n => n.language?.name === want)?.name || item?.name || '';
    }

    // Egg-group localization helper
    const eggGroupById = new Map((eggGroups || []).map(e => [e?.id, e]));
    function localizedEggGroupName(id, loc) {
        const item = eggGroupById.get(id);
        const names = Array.isArray(item?.names) ? item.names : [];
        const want = LANG_MAP[loc] || 'en';
        if (want === 'ja') {
            const ja = names.find(n => n.language?.name === 'ja')?.name;
            if (ja)
                return ja;
            const jaHrkt = names.find(n => n.language?.name === 'ja-Hrkt')?.name;
            if (jaHrkt)
                return jaHrkt;
        }
        return names.find(n => n.language?.name === want)?.name || item?.name || '';
    }

    // Emit lists (localized)
    for (const loc of LOCALES) {
    // pokemons.<loc>.json
        const pokemonList = [];
        for (const s of species) {
            const id = s.id;
            if (LIMIT != null && id > LIMIT)
                continue; // rough guard in dev mode
            const p = pokeById.get(id);
            if (!p)
                continue;
            const typesList = [];
            for (const t of p.types || []) typesList.push(capFirst(String(t?.type?.name || '')));
            const sprite = p?.sprites?.other?.['official-artwork']?.front_default || p?.sprites?.front_default || '';
            pokemonList.push({ id, name: localizedNameFrom(s, loc), types: typesList, sprite });
        }
        pokemonList.sort((a, b) => a.id - b.id);
        await writeJSON(path.join(OUT_DIR, `pokemons.${loc}.json`), pokemonList);

        // moves.<loc>.json
        const moveList = (moves || []).map(m => ({ id: m.id, name: localizedNameFrom(m, loc), type: m?.type?.name || null, category: m?.damage_class?.name || null }));
        moveList.sort((a, b) => a.id - b.id);
        await writeJSON(path.join(OUT_DIR, `moves.${loc}.json`), moveList);

        // abilities.<loc>.json
        const abilityList = (abilities || []).map(a => ({ id: a.id, name: localizedNameFrom(a, loc) }));
        abilityList.sort((a, b) => a.id - b.id);
        await writeJSON(path.join(OUT_DIR, `abilities.${loc}.json`), abilityList);

        // types.<loc>.json
        const typeList = (types || []).map(t => ({ id: t.id, name: localizedNameFrom(t, loc) }));
        typeList.sort((a, b) => a.id - b.id);
        await writeJSON(path.join(OUT_DIR, `types.${loc}.json`), typeList);
    }

    // Emit aliases.<resource>.json with names across configured locales
    function collectAliasesFromNames(item) {
        const names = Array.isArray(item?.names) ? item.names : [];
        const set = new Set();
        for (const loc of LOCALES) {
            const want = LANG_MAP[loc] || 'en';
            if (want === 'ja') {
                const ja = names.find(n => n.language?.name === 'ja')?.name;
                if (ja)
                    set.add(String(ja));
                const jaHrkt = names.find(n => n.language?.name === 'ja-Hrkt')?.name;
                if (jaHrkt)
                    set.add(String(jaHrkt));
            }
            else {
                const n = names.find(nn => nn.language?.name === want)?.name;
                if (n)
                    set.add(String(n));
            }
        }
        // Always include English fallback
        const en = names.find(n => n.language?.name === 'en')?.name;
        if (en)
            set.add(String(en));
        return Array.from(set);
    }

    // Pokemon aliases from species names
    try {
        const map = {};
        for (const s of species || []) {
            const id = s?.id;
            if (id == null)
                continue;
            map[String(id)] = collectAliasesFromNames(s);
        }
        await writeJSON(path.join(OUT_DIR, `aliases.pokemon.json`), map);
    }
    catch {}

    // Move, Ability, Type aliases from their own names[]
    for (const [res, all] of [['move', moves], ['ability', abilities], ['type', types]]) {
        try {
            const map = {};
            for (const item of all || []) {
                const id = item?.id;
                if (id == null)
                    continue;
                map[String(id)] = collectAliasesFromNames(item);
            }
            await writeJSON(path.join(OUT_DIR, `aliases.${res}.json`), map);
        }
        catch {}
    }

    // Ensure species names exist for all learners (for localized move.learned_by_pokemon)
    try {
        const learnerPokemonIds = new Set();
        for (const m of moves || []) {
            for (const pk of (m?.learned_by_pokemon || [])) {
                const id = idFromUrl(pk?.url);
                if (id != null)
                    learnerPokemonIds.add(id);
            }
        }
        const toResolve = Array.from(learnerPokemonIds).filter((pid) => {
            const sid = idFromUrl(pokeById.get(pid)?.species?.url);
            return sid == null || !speciesById.has(sid);
        });
        if (toResolve.length) {
            console.log(`→ Resolving ${toResolve.length} learner species for localization…`);
            const resolved = await mapWithConcurrency(
                toResolve,
                async (pid) => {
                    try {
                        const p = await fetchJSON(`${BASE}/pokemon/${pid}`);
                        const sid = idFromUrl(p?.species?.url);
                        if (sid != null) {
                            if (!speciesById.has(sid)) {
                                try {
                                    const s = await fetchJSON(`${BASE}/pokemon-species/${sid}`);
                                    if (s?.id != null)
                                        speciesById.set(s.id, s);
                                }
                                catch {}
                            }
                            return [pid, sid];
                        }
                    }
                    catch {}
                    return [pid, null];
                },
                Math.min(CONCURRENCY, 8),
            );
            for (const [pid, sid] of resolved) {
                if (sid != null)
                    pokemonToSpecies.set(pid, sid);
            }
        }
    }
    catch (e) {
        console.warn('Learner localization pass failed (continuing):', e?.message || e);
    }

    // Emit per-item pages (localized)
    for (const loc of LOCALES) {
    // Pokémon detail pages
        for (const s of species) {
            const id = s.id;
            if (LIMIT != null && id > LIMIT)
                continue;
            const p = pokeById.get(id);
            if (!p)
                continue;
            const chain = await evolutionChainForSpeciesId(id);
            const stagesRaw = buildEvolutionStages(chain?.chain, id);
            // Localize snapshot for this locale
            const stages = stagesRaw.map(col => col.map(e => ({
                id: e.id,
                name: (e.id != null ? localizedNameFrom(speciesById.get(e.id), loc) : undefined) || '',
                sprite: e.sprite,
                isCurrent: e.isCurrent,
                details: e.details,
            })));

            const detail = {
                id,
                name: localizedNameFrom(s, loc),
                sprites: { ...spritePack(p), versions: collapseVersions(p) },
                types: simplifyTypes(p),
                abilities: simplifyAbilities(p),
                stats: simplifyStats(p),
                weight: p?.weight ?? null,
                height: p?.height ?? null,
                base_experience: p?.base_experience ?? null,
                species: {
                    name: localizedNameFrom(s, loc),
                    capture_rate: s?.capture_rate ?? null,
                    hatch_counter: s?.hatch_counter ?? null,
                    gender_rate: s?.gender_rate ?? null,
                    growth_rate: s?.growth_rate ? { id: idFromUrl(s.growth_rate.url), name: s.growth_rate.name } : null,
                    egg_groups: Array.isArray(s?.egg_groups)
                        ? s.egg_groups.map((g) => {
                                const gid = idFromUrl(g.url);
                                return { id: gid, name: localizedEggGroupName(gid, loc) };
                            })
                        : [],
                    color: s?.color ? { id: idFromUrl(s.color.url), name: localizedColorName(idFromUrl(s.color.url), loc) } : null,
                    genus: (() => {
                        const list = s?.genera || [];
                        const want = LANG_MAP[loc] || 'en';
                        if (want === 'ja') {
                            const ja = list.find(g => g.language?.name === 'ja')?.genus;
                            if (ja)
                                return ja;
                            const jaHrkt = list.find(g => g.language?.name === 'ja-Hrkt')?.genus;
                            if (jaHrkt)
                                return jaHrkt;
                        }
                        return list.find(g => g.language?.name === want)?.genus || undefined;
                    })(),
                    flavor_text: flavorTextFor(s, loc),
                },
                evolutions: stages,
                learnsets: learnsetsForPokemon(p, moveById, loc),
            };
            await writeJSON(path.join(OUT_DIR, `pokemon.${id}.${loc}.json`), detail);
        }

        // Move detail pages
        for (const m of moves) {
            const id = m.id;
            const learnedBy = (m?.learned_by_pokemon || []).map(pk => ({ id: idFromUrl(pk.url), name: pk?.name })).filter(x => x.id != null);
            const moveData = {
                id,
                name: localizedNameFrom(m, loc),
                type: m?.type ? { id: idFromUrl(m.type.url), name: m.type.name } : null,
                damage_class: m?.damage_class ? { name: m.damage_class.name } : null,
                power: m?.power ?? null,
                accuracy: m?.accuracy ?? null,
                pp: m?.pp ?? null,
                priority: m?.priority ?? 0,
                target: m?.target ? { name: m.target.name } : null,
                generation: m?.generation ? { name: m.generation.name } : null,
                effect_entries: trimEffectEntries(m?.effect_entries || [], [loc]),
                flavor_text_entries: trimEffectEntries(m?.flavor_text_entries || [], [loc]),
                stat_changes: Array.isArray(m?.stat_changes) ? m.stat_changes : [],
                learned_by_pokemon: learnedBy.map((e) => {
                    const sid = pokemonToSpecies.get(e.id) ?? e.id;
                    return { id: e.id, name: localizedNameFrom(speciesById.get(sid), loc) || capFirst(e.name) };
                }),
            };
            await writeJSON(path.join(OUT_DIR, `move.${id}.${loc}.json`), moveData);
        }

        // Ability detail pages
        for (const a of abilities) {
            const id = a.id;
            const carriers = Array.isArray(a?.pokemon) ? a.pokemon : [];
            const abilityData = {
                id,
                name: localizedNameFrom(a, loc),
                is_main_series: a?.is_main_series ?? true,
                generation: a?.generation ? { name: a.generation.name } : null,
                effect_entries: trimEffectEntries(a?.effect_entries || [], [loc]),
                flavor_text_entries: trimEffectEntries(a?.flavor_text_entries || [], [loc]),
                pokemon: carriers.map((c) => {
                    const pid = idFromUrl(c?.pokemon?.url);
                    const sid = pid != null ? (pokemonToSpecies.get(pid) ?? pid) : pid;
                    return { id: pid, name: localizedNameFrom(speciesById.get(sid), loc) || capFirst(c?.pokemon?.name || ''), hidden: !!c?.is_hidden };
                }).filter(x => x.id != null),
            };
            await writeJSON(path.join(OUT_DIR, `ability.${id}.${loc}.json`), abilityData);
        }

        // Type detail pages
        for (const t of types) {
            const id = t.id;
            const typeData = {
                id,
                name: localizedNameFrom(t, loc),
                damage_relations: t?.damage_relations || {},
                moves: (t?.moves || []).map(m => ({ id: idFromUrl(m.url), name: localizedNameFrom(moveById.get(idFromUrl(m.url)), loc) || capFirst(m.name) })).filter(x => x.id != null),
                pokemon: (t?.pokemon || []).map(p => ({ id: idFromUrl(p?.pokemon?.url), name: localizedNameFrom(speciesById.get(idFromUrl(p?.pokemon?.url)), loc) || capFirst(p?.pokemon?.name || '') })).filter(x => x.id != null),
            };
            await writeJSON(path.join(OUT_DIR, `type.${id}.${loc}.json`), typeData);
        }
    }

    // Final note: This script intentionally does not emit legacy files.
    // Build manifest for cache-busting and diagnostics
    try {
        const manifest = {
            buildId: Date.now().toString(36),
            updatedAt: new Date().toISOString(),
            locales: LOCALES,
            counts: {
                pokemon: (species || []).length,
                moves: (moves || []).length,
                abilities: (abilities || []).length,
                types: (types || []).length,
            },
        };
        await writeJSON(path.join(OUT_DIR, 'build.json'), manifest);
    }
    catch {}

    console.log('✓ New layout JSON written.');
    const files = await filesIn(OUT_DIR);
    console.log(`Output dir now contains ${files.length} top-level entries.`);
}

main().catch((err) => {
    console.error('scrape failed:', err?.stack || err);
    process.exit(1);
});
