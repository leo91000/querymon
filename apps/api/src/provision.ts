import { z } from 'zod';
import { eq } from 'drizzle-orm';
import type { DB } from './db/client.js';
import { userMeta } from './db/schema.js';

const Env = z.object({
  TURSO_API_TOKEN: z.string().optional(),
  TURSO_ORG_SLUG: z.string().optional(),
  TURSO_GROUP_NAME: z.string().optional(),
  TURSO_DB_TOKEN_TTL: z.string().optional().default('7d'),
});

export type ProvisionInfo = { dbName: string; dbUrl: string; dbHost: string; token?: string };

export async function provisionForUser(userId: string, rootDb: DB): Promise<ProvisionInfo> {
  const env = Env.parse(process.env);

  // Return existing
  const existing = (await rootDb.select().from(userMeta).where(eq(userMeta.userId, userId)).limit(1))[0];
  if (existing?.dbUrl && existing?.dbHost && existing?.dbName) {
    const token = await maybeIssueDbToken(existing.dbName, env);
    return { dbName: existing.dbName, dbUrl: existing.dbUrl, dbHost: existing.dbHost, token };
  }

  // Require management credentials to create db
  if (!env.TURSO_API_TOKEN || !env.TURSO_ORG_SLUG || !env.TURSO_GROUP_NAME) {
    throw new Error('Turso management env not set (TURSO_API_TOKEN, TURSO_ORG_SLUG, TURSO_GROUP_NAME)');
  }

  const base = String(userId).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const dbName = `u-${base}`.replace(/-+/g, '-').slice(0, 48).replace(/-+$/,'');

  // Create DB
  const createDbRes = await fetch(`https://api.turso.tech/v1/organizations/${env.TURSO_ORG_SLUG}/databases`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.TURSO_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: dbName, group: env.TURSO_GROUP_NAME }),
  });
  if (!createDbRes.ok && createDbRes.status !== 409) {
    const msg = await createDbRes.text();
    throw new Error(`turso create db failed: ${createDbRes.status} ${msg}`);
  }

  // Lookup DB host
  const listRes = await fetch(`https://api.turso.tech/v1/organizations/${env.TURSO_ORG_SLUG}/databases/${dbName}`, {
    headers: { 'Authorization': `Bearer ${env.TURSO_API_TOKEN}` },
  });
  if (!listRes.ok) {
    const msg = await listRes.text();
    throw new Error(`turso get db failed: ${listRes.status} ${msg}`);
  }
  const details: unknown = await listRes.json();
  const hostname = (() => {
    if (details && typeof details === 'object') {
      const obj = details as Record<string, unknown>;
      const db = obj.database;
      if (db && typeof db === 'object') {
        const dbo = db as Record<string, unknown>;
        const hn = dbo.Hostname ?? dbo.hostname;
        if (typeof hn === 'string') return hn;
      }
      const hn2 = (obj as Record<string, unknown>).Hostname ?? (obj as Record<string, unknown>).hostname;
      if (typeof hn2 === 'string') return hn2;
    }
    return undefined;
  })();
  if (!hostname) throw new Error('turso db hostname not found');
  const dbUrl = `libsql://${hostname}`;

  await rootDb.insert(userMeta).values({ userId, dbName, dbUrl, dbHost: hostname }).onConflictDoNothing();

  const token = await maybeIssueDbToken(dbName, env);

  // Ensure required tables exist in the per-user DB
  try {
    const authToken = process.env.TURSO_GROUP_TOKEN || token;
    if (authToken) {
      const { createClient } = await import('@libsql/client');
      const client = createClient({ url: dbUrl, authToken });
      await client.execute(`CREATE TABLE IF NOT EXISTS favorites (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        pokemon_id integer NOT NULL,
        nickname text,
        created_at integer DEFAULT (strftime('%s','now')) NOT NULL
      );`);
    }
  } catch {}

  return { dbName, dbUrl, dbHost: hostname, token };
}

async function maybeIssueDbToken(dbName: string, env: z.infer<typeof Env>): Promise<string | undefined> {
  if (!env.TURSO_API_TOKEN || !env.TURSO_ORG_SLUG) return undefined;
  const res = await fetch(`https://api.turso.tech/v1/organizations/${env.TURSO_ORG_SLUG}/databases/${dbName}/auth/tokens?expiration=${encodeURIComponent(env.TURSO_DB_TOKEN_TTL ?? '7d')}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.TURSO_API_TOKEN}` },
  });
  if (!res.ok) return undefined;
  const data: unknown = await res.json();
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    const token = o.jwt ?? o.token ?? o.authToken;
    if (typeof token === 'string') return token;
  }
  return undefined;
}
