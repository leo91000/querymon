/// <reference types="vite/client" />
import type { DB } from './client';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import journal from './migrations/meta/_journal.json';

type DrizzleTx = Parameters<Parameters<DB['transaction']>[0]>[0];

function getMigrationJournal() {
    return journal;
}

const migrations = import.meta.glob<boolean, string, string>('./migrations/*.sql', { query: '?raw', import: 'default', eager: false });

function getMigrationByTag(tag: string) {
    return migrations[`./migrations/${tag}.sql`];
}

const migrationsSchema = 'public';
const migrationsTable = '_migrations';

async function createMigrationTable(tx: DrizzleTx) {
    const migrationTableCreate = sql`
    CREATE TABLE IF NOT EXISTS ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `;
    await tx.execute(migrationTableCreate);
}

async function insertMigration(tx: DrizzleTx, hash: string, createdAt: number) {
    await tx.execute(
        sql`INSERT INTO ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} ("hash", "created_at")
      VALUES (${hash}, ${createdAt})`,
    );
}

async function customMigrate(tx: DrizzleTx) {
    const dbMigrations = await tx.execute<{ id: number; hash: string; created_at: string }>(
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
                        await tx.execute(sql.raw(stmt));
                    }
                }

                await insertMigration(tx, hash, migration.when);
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

    const migrationCount = await db.transaction(async (tx) => {
        await createMigrationTable(tx);
        return await customMigrate(tx);
    });

    if (migrationCount > 0) {
        console.warn(`[MIGRATION] ${migrationCount} migrations applied`);
    }
    else {
        console.warn('[MIGRATION] No migrations applied');
    }
}
