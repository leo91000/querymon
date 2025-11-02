import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

// Union DB type to satisfy both drivers
export type DB = NodePgDatabase | NeonHttpDatabase;

export interface Context {
    db: DB;
    rootDb: DB;
    session?: {
        user: { id: string; email?: string | null };
    } | null;
}
