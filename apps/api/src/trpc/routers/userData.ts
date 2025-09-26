import type { Context } from '../../trpc/context.js';
import { TRPCError } from '@trpc/server';
import { observable } from '@trpc/server/observable';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { userData } from '../../db/schema.js';
import { procedure, router } from '../init.js';

export interface UserData {
    lang: 'en' | 'fr' | 'jp';
    theme: 'system' | 'light' | 'dark';
    favorites: number[];
}

const DefaultData: UserData = { lang: 'en', theme: 'system', favorites: [] };

// Simple in-memory pubsub per userId
const listeners = new Map<string, Set<(data: UserData) => void>>();
function emitUser(userId: string, data: UserData) {
    const set = listeners.get(userId);
    if (!set)
        return;
    for (const fn of set) {
        try {
            fn(data);
        }
        catch {}
    }
}

export const userDataRouter = router({
    get: procedure.query(async ({ ctx }) => {
        const uid = requireUser(ctx);
        const row = (await ctx.rootDb.select().from(userData).where(eq(userData.userId, uid)).limit(1))[0];
        if (!row)
            return DefaultData;
        return normalizeRow(row);
    }),

    set: procedure
        .input(z.object({
            lang: z.enum(['en', 'fr', 'jp']),
            theme: z.enum(['system', 'light', 'dark']),
            favorites: z.array(z.number().int().positive()),
        }))
        .mutation(async ({ ctx, input }) => {
            const uid = requireUser(ctx);
            const payload = { lang: input.lang, theme: input.theme, favorites: input.favorites } satisfies UserData;
            const favoritesJson = JSON.stringify(payload.favorites);
            // upsert
            await ctx.rootDb.run(
                `INSERT INTO user_data (user_id, lang, theme, favorites_json, updated_at)
                 VALUES (?, ?, ?, ?, strftime('%s','now'))
                 ON CONFLICT(user_id) DO UPDATE SET lang=excluded.lang, theme=excluded.theme, favorites_json=excluded.favorites_json, updated_at=strftime('%s','now')`,
                [uid, payload.lang, payload.theme, favoritesJson],
            );
            emitUser(uid, payload);
            return payload;
        }),

    onChange: procedure.subscription(({ ctx }) => {
        const uid = requireUser(ctx);
        return observable<UserData>((emit) => {
            const fn = (data: UserData) => emit.next(data);
            let set = listeners.get(uid);
            if (!set) {
                set = new Set();
                listeners.set(uid, set);
            }
            set.add(fn);
            return () => {
                set?.delete(fn);
            };
        });
    }),
});

function requireUser(ctx: Context): string {
    const id = ctx.session?.user?.id;
    if (!id)
        throw new TRPCError({ code: 'UNAUTHORIZED' });
    return id;
}

function normalizeRow(row: { lang: string | null; theme: string | null; favorites: string | null } & { [k: string]: any }): UserData {
    let fav: number[] = [];
    try {
        fav = row.favorites ? JSON.parse(row.favorites) : [];
    }
    catch {
        fav = [];
    }
    const lang = (row.lang === 'en' || row.lang === 'fr' || row.lang === 'jp') ? row.lang : 'en';
    const theme = (row.theme === 'system' || row.theme === 'light' || row.theme === 'dark') ? row.theme : 'system';
    return { lang, theme, favorites: Array.isArray(fav) ? fav.filter(n => Number.isInteger(n) && n > 0) : [] };
}
