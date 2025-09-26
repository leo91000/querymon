import type { Context } from './trpc/context.js';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { trpcServer } from '@hono/trpc-server';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { auth } from './auth/index.js';
import { getRootDb } from './db/client.js';
import { loadEnv } from './env.js';
import { appRouter } from './trpc/router.js';

const env = loadEnv();

const app = new Hono<{ Variables: { ctx: Context } }>();

// CORS (allow dev origins and optional WEB_ORIGIN)
const allowlist = new Set<string>([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]);
if (env.WEB_ORIGIN)
    allowlist.add(env.WEB_ORIGIN);

app.use('*', cors({
    origin: (origin) => {
        if (!origin)
            return 'http://localhost:5173';
        return allowlist.has(origin) ? origin : '';
    },
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization', 'trpc-accept'],
}));

// attach context (db) per request
app.use('*', async (c, next) => {
    // Better Auth session
    const sessionRes = await auth.api.getSession({ headers: c.req.raw.headers });
    const session = sessionRes ? { user: { id: sessionRes.user.id, email: sessionRes.user.email } } : null;

    // Global root DB (for metadata, provisioning)
    const rootDb = getRootDb();
    c.set('ctx', { db: rootDb, rootDb, session });
    await next();
});

// health endpoint
app.get('/healthz', c => c.json({ ok: true }));

// lightweight DB ping for diagnostics (no secrets)
app.get('/debug/db-ping', async (c) => {
    try {
        const db = getRootDb();
        // Use underlying libsql client for a raw ping to avoid driver typing issues
        const client = (db as any).$client;
        if (!client) throw new Error('no libsql client');
        await client.execute('select 1');
        const tok = process.env.TURSO_AUTH_TOKEN || '';
        const fp = tok ? `${tok.slice(0, 4)}…${tok.slice(-6)}` : '(none)';
        const sha8 = tok ? createHash('sha256').update(tok).digest('hex').slice(0, 8) : '(none)';
        return c.json({ ok: true, url: env.TURSO_DATABASE_URL ?? null, token: { len: tok.length, fp, sha8 } });
    }
    catch (e: any) {
        const msg = typeof e?.message === 'string' ? e.message : String(e);
        const status = (e as any)?.cause?.status ?? null;
        const tok = process.env.TURSO_AUTH_TOKEN || '';
        const fp = tok ? `${tok.slice(0, 4)}…${tok.slice(-6)}` : '(none)';
        const sha8 = tok ? createHash('sha256').update(tok).digest('hex').slice(0, 8) : '(none)';
        return c.json({ ok: false, error: msg, status, url: env.TURSO_DATABASE_URL ?? null, token: { len: tok.length, fp, sha8 } }, 500);
    }
});

// debug helper
app.get('/debug/whoami', (c) => {
    const ctx = c.var.ctx as Context;
    return c.json({ user: ctx.session?.user ?? null });
});

// Better Auth routes (mount all methods)
app.use('/api/auth/*', c => auth.handler(c.req.raw));

// mount tRPC HTTP under /trpc
app.use('/trpc/*', trpcServer({
    router: appRouter,
    // Hono's adapter passes the Hono context as 2nd arg
    createContext: (_opts, c) => c.var.ctx,
}));

// Log DB target + masked token fingerprint
(() => {
    const url = env.TURSO_DATABASE_URL ?? '(none)';
    const tok = process.env.TURSO_AUTH_TOKEN || '';
    const fp = tok ? `${tok.slice(0, 4)}…${tok.slice(-6)}` : '(none)';
    console.warn(`[api] db target: ${url}, token: ${fp}`);
})();

// Run DB migrations once on startup (auto)
await (async () => {
    try {
        const db = getRootDb();
        const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));
        await migrate(db, { migrationsFolder });
        console.warn('[api] migrations applied');
    }
    catch (e) {
        console.error('[api] migration error', e);
    }
})();

// Start HTTP server (Hono)
const port = env.PORT;
serve({ fetch: app.fetch, port });
console.warn(`[api] listening on http://localhost:${port}`);

// WebSockets/subscriptions removed; clients poll periodically instead
