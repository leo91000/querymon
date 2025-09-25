import type { DB } from '../db/client.js';

export interface Context {
    db: DB;
    rootDb: DB;
    session?: {
        user: { id: string; email?: string | null };
    } | null;
}
