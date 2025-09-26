import type { Client as LibsqlClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { loadEnv } from '../env.js';

// Choose driver: Turso via libsql when env vars are present; otherwise local better-sqlite3 file.

export type DB = ReturnType<typeof drizzle>;

let dbInstance: DB | null = null;

export function getDb(): DB {
    if (dbInstance)
        return dbInstance;
    const env = loadEnv();

    const localDbPath = fileURLToPath(new URL('../../var/dev.db', import.meta.url));
    const url = env.TURSO_DATABASE_URL ?? `file:${localDbPath}`;
    if (!env.TURSO_DATABASE_URL) {
        fs.mkdirSync(path.dirname(localDbPath), { recursive: true });
    }
    const client: LibsqlClient = createClient({ url, authToken: env.TURSO_AUTH_TOKEN });
    // Schema is managed by Drizzle migrations; no manual ensure here.
    dbInstance = drizzle(client);
    return dbInstance;
}

export const getRootDb = getDb;
