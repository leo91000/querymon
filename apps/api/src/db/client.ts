import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { loadEnv } from '../env.js';

// Union DB type to satisfy both drivers without leaking any.
export type DB = NodePgDatabase | NeonHttpDatabase;

let dbInstance: DB | undefined;

export function getDb(): DB {
    if (dbInstance)
        return dbInstance!;
    const env = loadEnv();
    if (env.DB_DRIVER === 'neon') {
        const sql = neon(env.DATABASE_URL);
        dbInstance = drizzleNeon(sql) as DB;
        return dbInstance!;
    }
    // Default: node-postgres
    const { Pool } = pg;
    const pool = new Pool({ connectionString: env.DATABASE_URL });
    dbInstance = drizzlePg(pool) as DB;
    return dbInstance!;
}

export const getRootDb = getDb;
