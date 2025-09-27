import type { MigrationConfig } from 'drizzle-orm/migrator';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { loadEnv } from '../src/env.js';
import 'dotenv/config';

async function main() {
    const env = loadEnv();
    const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));

    // Optional overrides
    const migrationsTable = process.env.MIGRATIONS_TABLE;
    const migrationsSchema = process.env.MIGRATIONS_SCHEMA;

    if (env.DB_DRIVER === 'neon') {
        const { neon } = await import('@neondatabase/serverless');
        const { drizzle } = await import('drizzle-orm/neon-http');
        const { migrate } = await import('drizzle-orm/neon-http/migrator');

        const sql = neon(env.DATABASE_URL);
        const db = drizzle(sql);
        const cfg: MigrationConfig = {
            migrationsFolder,
            ...(migrationsTable ? { migrationsTable } : {}),
            ...(migrationsSchema ? { migrationsSchema } : {}),
        };
        await migrate(db, cfg);
        return;
    }

    // Default: node-postgres
    const { Pool } = await import('pg');
    const { drizzle } = await import('drizzle-orm/node-postgres');
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');

    const pool = new Pool({ connectionString: env.DATABASE_URL });
    try {
        const db = drizzle(pool);
        const cfg: MigrationConfig = {
            migrationsFolder,
            ...(migrationsTable ? { migrationsTable } : {}),
            ...(migrationsSchema ? { migrationsSchema } : {}),
        };
        await migrate(db, cfg);
    }
    finally {
        await pool.end().catch(() => {});
    }
}

main().catch((err) => {
    console.error('[migrate] error', err);
    process.exitCode = 1;
});
