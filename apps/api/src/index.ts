import type { Context } from './trpc/context.js';
import { serve } from '@hono/node-server';
import { trpcServer } from '@hono/trpc-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { auth } from './auth/index.js';
import { getRootDb } from './db/client.js';
import { loadEnv } from './env.js';
import { getPerUserDb } from './trpc/perUserDb.js';
import { appRouter } from './trpc/router.js';

const env = loadEnv();

const app = new Hono<{ Variables: { ctx: Context } }>();

// CORS for web dev (credentials on)
app.use('*', cors({
    origin: origin => origin || 'http://localhost:5173',
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
    // Per-user DB (if provisioned) or fallback to rootDb
    const userDb = await getPerUserDb({ rootDb, session });

    c.set('ctx', { db: userDb, rootDb, session });
    await next();
});

// health endpoint
app.get('/healthz', c => c.json({ ok: true }));

// debug helper
app.get('/debug/whoami', (c) => {
    const ctx = c.var.ctx as Context;
    return c.json({ user: ctx.session?.user ?? null });
});

// Better Auth routes (mount all methods)
app.use('/api/auth/*', c => auth.handler(c.req.raw));

// Provisioning endpoint
app.post('/api/provision', async (c) => {
    const ctx = c.var.ctx as Context;
    if (!ctx.session)
        return c.json({ error: 'unauthorized' }, 401);
    const { provisionForUser } = await import('./provision.js');
    const info = await provisionForUser(ctx.session.user.id, ctx.rootDb);
    return c.json(info);
});

// mount tRPC under /trpc
app.use('/trpc/*', trpcServer({
    router: appRouter,
    // Hono's adapter passes the Hono context as 2nd arg
    createContext: (_opts, c) => c.var.ctx,
}));

const port = env.PORT;
console.warn(`[api] listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
