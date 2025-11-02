/// <reference types="vite/client" />
import type { DB } from './client';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import journal from './migrations/meta/_journal.json';

function getMigrationJournal() {
    return journal;
}

const migrations = import.meta.glob<boolean, string, string>('./migrations/*.sql', { query: '?raw', import: 'default', eager: false });

function getMigrationByTag(tag: string) {
    return migrations[`./migrations/${tag}.sql`];
}

const migrationsSchema = 'public';
const migrationsTable = '_migrations';

async function createMigrationTable(db: DB) {
    const migrationTableCreate = sql`
    CREATE TABLE IF NOT EXISTS ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `;
    await db.execute(migrationTableCreate);
}

async function insertMigration(db: DB, hash: string, createdAt: number) {
    await db.execute(
        sql`INSERT INTO ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} ("hash", "created_at")
      VALUES (${hash}, ${createdAt})`,
    );
}

async function customMigrate(db: DB) {
    const dbMigrations = await db.execute<{ id: number; hash: string; created_at: string }>(
        sql`SELECT id, hash, created_at FROM ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)}
      ORDER BY created_at DESC LIMIT 1`,
    );

    const lastDbMigration = dbMigrations.rows[0];
    const migrationJournal = getMigrationJournal();

    let migrationCount = 0;
    for (const migration of migrationJournal.entries) {
        if (!lastDbMigration || Number(lastDbMigration.created_at) < migration.when) {
            migrationCount++;
            console.warn(`[MIGRATION] Applying migration ${migration.tag}`);
            const migrationFile = getMigrationByTag(migration.tag);
            if (migrationFile) {
                const sqlStatements = await migrationFile();
                const hash = generateHash(sqlStatements);

                for (const stmt of sqlStatements.split('--> statement-breakpoint')) {
                    if (stmt.trim()) {
                        await db.execute(sql.raw(stmt));
                    }
                }

                await insertMigration(db, hash, migration.when);
            }
            else {
                console.warn(`[MIGRATION] Migration file ${migration.tag} not found.`);
            }
        }
    }

    return migrationCount;
}

function generateHash(content: string) {
    return createHash('sha256').update(content).digest('hex');
}

export async function migrate(db: DB) {
    console.warn('[MIGRATION] Starting migrations');

    // Note: neon-http driver doesn't support transactions
    // Running migrations sequentially without transaction
    await createMigrationTable(db);
    const migrationCount = await customMigrate(db);

    if (migrationCount > 0) {
        console.warn(`[MIGRATION] ${migrationCount} migrations applied`);
    }
    else {
        console.warn('[MIGRATION] No migrations applied');
    }
}
