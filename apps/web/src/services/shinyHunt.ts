export type ShinyHuntStatus = 'active' | 'completed';

export interface ShinyHuntEntry {
    id: string;
    pokemonId: number;
    startDate: string;
    encounterCount: number;
    status: ShinyHuntStatus;
    selectedSpriteId?: string | null;
    completedAt?: string;
    caughtEncounters?: number;
    spriteUrl?: string | null;
}

const KEY = 'shinyHunts';
const EVENT = 'shinyHuntsUpdated';

function newId() {
    const g = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `hunt-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
    return g;
}

function storageAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function getLocalStorage(): Storage | null {
    if (!storageAvailable())
        return null;
    try {
        return window.localStorage;
    }
    catch {
        return null;
    }
}

function parse(raw: unknown): ShinyHuntEntry[] {
    if (!Array.isArray(raw))
        return [];
    const out: ShinyHuntEntry[] = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object')
            continue;
        const id = typeof (item as any).id === 'string' ? (item as any).id : newId();
        const pokemonId = Number((item as any).pokemonId);
        if (!Number.isInteger(pokemonId) || pokemonId <= 0)
            continue;
        const startDate = typeof (item as any).startDate === 'string' ? (item as any).startDate : new Date().toISOString().slice(0, 10);
        const encounterCountRaw = Number((item as any).encounterCount);
        const encounterCount = Number.isFinite(encounterCountRaw) && encounterCountRaw >= 0 ? Math.floor(encounterCountRaw) : 0;
        const status = (item as any).status === 'completed' ? 'completed' : 'active';
        const selectedSpriteId = typeof (item as any).selectedSpriteId === 'string' ? (item as any).selectedSpriteId : null;
        const completedAt = typeof (item as any).completedAt === 'string' ? (item as any).completedAt : undefined;
        const caughtEncountersRaw = Number((item as any).caughtEncounters);
        const caughtEncounters = Number.isFinite(caughtEncountersRaw) && caughtEncountersRaw >= 0 ? Math.floor(caughtEncountersRaw) : undefined;
        const spriteUrl = typeof (item as any).spriteUrl === 'string' ? (item as any).spriteUrl : null;
        out.push({ id, pokemonId, startDate, encounterCount, status, selectedSpriteId, completedAt, caughtEncounters, spriteUrl });
    }
    return out;
}

export function loadHunts(): ShinyHuntEntry[] {
    const store = getLocalStorage();
    if (!store)
        return [];
    try {
        const rawStr = store.getItem(KEY);
        if (!rawStr)
            return [];
        return parse(JSON.parse(rawStr));
    }
    catch {
        return [];
    }
}

export function saveHunts(entries: ShinyHuntEntry[]): void {
    const store = getLocalStorage();
    if (!store)
        return;
    try {
        const payload = JSON.stringify(entries);
        store.setItem(KEY, payload);
        if (typeof window !== 'undefined')
            window.dispatchEvent(new CustomEvent<ShinyHuntEntry[]>(EVENT, { detail: entries } as any));
    }
    catch {
        // ignore storage quota or JSON issues
    }
}

export function onHuntsUpdate(fn: (entries: ShinyHuntEntry[]) => void): () => void {
    if (typeof window === 'undefined')
        return () => void 0;
    const handler = (e: Event) => {
        const detail = (e as CustomEvent<ShinyHuntEntry[]>).detail;
        if (Array.isArray(detail))
            fn(detail);
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
}

export function createHuntBase(pokemonId: number, spriteUrl?: string | null): ShinyHuntEntry {
    return {
        id: newId(),
        pokemonId,
        startDate: new Date().toISOString().slice(0, 10),
        encounterCount: 0,
        status: 'active',
        selectedSpriteId: null,
        spriteUrl: spriteUrl ?? null,
    };
}
