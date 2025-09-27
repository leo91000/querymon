import type { Context } from './trpc/context.js';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { trpcServer } from '@hono/trpc-server';
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import pg from 'pg';
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
            return '';
        if (allowlist.has(origin))
            return origin;
        // Allow Vercel preview deployments by reflecting their origin
        // so credentialed requests succeed (Access-Control-Allow-Origin cannot be '*').
        try {
            const u = new URL(origin);
            if (u.protocol === 'https:' && u.hostname.endsWith('.vercel.app'))
                return origin;
        }
        catch {}
        return '';
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

// (debug/db-ping route removed by request)

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

// Log DB driver
(() => {
    console.warn(`[api] db driver: ${env.DB_DRIVER}`);
})();

async function runMigrationsIfEnabled(): Promise<void> {
    if (!env.MIGRATE_ON_BOOT)
        return;
    try {
        const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));
        if (env.DB_DRIVER === 'neon') {
            const db = drizzleNeon(neon(env.DATABASE_URL));
            const { migrate } = await import('drizzle-orm/neon-http/migrator');
            await migrate(db, { migrationsFolder });
        }
        else {
            const { Pool } = pg;
            const pool = new Pool({ connectionString: env.DATABASE_URL });
            try {
                const db = drizzlePg(pool);
                const { migrate } = await import('drizzle-orm/node-postgres/migrator');
                await migrate(db, { migrationsFolder });
            }
            finally {
                await pool.end().catch(() => {});
            }
        }
        console.warn('[api] migrate-on-boot: completed');
    }
    catch (e) {
        console.error('[api] migration error', e);
    }
}

async function bootstrap() {
    await runMigrationsIfEnabled();
    const port = env.PORT;
    serve({ fetch: app.fetch, port });
    console.warn(`[api] listening on http://localhost:${port}`);
}

void bootstrap();

// WebSockets/subscriptions removed; clients poll periodically instead
