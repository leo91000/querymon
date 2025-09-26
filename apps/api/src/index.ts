import type { Context } from './trpc/context.js';
import { trpcServer } from '@hono/trpc-server';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { serve } from '@hono/node-server';
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

// Start HTTP server (Hono)
const port = env.PORT;
serve({ fetch: app.fetch, port });
console.warn(`[api] listening on http://localhost:${port}`);

// Start WebSocket server on a separate port (default: PORT+1)
const wsPort = (env as any).WS_PORT ?? (port + 1);
const wss = new WebSocketServer({ port: wsPort });
applyWSSHandler({ wss, router: appRouter, createContext: async () => ({ db: getRootDb(), rootDb: getRootDb(), session: null }) });
console.warn(`[api] ws listening on ws://localhost:${wsPort}/trpc`);
