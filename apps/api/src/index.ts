import type { Context } from './trpc/context.js';
import { createServer } from 'node:http';
import { trpcServer } from '@hono/trpc-server';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { WebSocketServer } from 'ws';
import { auth } from './auth/index.js';
import { getRootDb } from './db/client.js';
import { loadEnv } from './env.js';
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
    c.set('ctx', { db: rootDb, rootDb, session });
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

// mount tRPC HTTP under /trpc
app.use('/trpc/*', trpcServer({
    router: appRouter,
    // Hono's adapter passes the Hono context as 2nd arg
    createContext: (_opts, c) => c.var.ctx,
}));

// Create a Node HTTP server so we can attach WebSocket upgrade handler
const port = env.PORT;
const server = createServer((req, res) => {
    // Delegate to Hono's fetch handler
    app.fetch(req).then((resp) => {
        res.statusCode = resp.status;
        resp.headers.forEach((v, k) => res.setHeader(k, v));
        (async () => {
            const ab = await resp.arrayBuffer();
            const { Buffer } = await import('node:buffer');
            const buf = Buffer.from(ab);
            res.end(buf);
        })().catch((err) => {
            res.statusCode = 500;
            res.end(String(err?.message || err));
        });
    }).catch((err) => {
        res.statusCode = 500;
        res.end(String(err?.message || err));
    });
});

// tRPC WebSocket handler on the same server
const wss = new WebSocketServer({ server });
applyWSSHandler({
    wss,
    router: appRouter,
    createContext: async ({ req }) => {
        const headers = new Headers(Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : (v ?? '')]));
        const sessionRes = await auth.api.getSession({ headers });
        const session = sessionRes ? { user: { id: sessionRes.user.id, email: sessionRes.user.email } } : null;
        const rootDb = getRootDb();
        return { db: rootDb, rootDb, session } satisfies Context;
    },
});

server.listen(port, () => {
    console.warn(`[api] listening on http://localhost:${port}`);
});
