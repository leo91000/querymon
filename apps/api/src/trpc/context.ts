import type { DB } from '../db/client.js';

export type Context = {
  db: DB;
  rootDb: DB;
  session?: {
    user: { id: string; email?: string | null };
  } | null;
};
