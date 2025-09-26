import type { Context } from '../../trpc/context.js';
import { TRPCError } from '@trpc/server';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { userData } from '../../db/schema.js';
import { emitUserUpdate } from '../../events/userStreams.js';
import { procedure, router } from '../init.js';

export interface UserData {
    lang: 'en' | 'fr' | 'jp';
    theme: 'system' | 'light' | 'dark';
    favorites: number[];
}

const DefaultData: UserData = { lang: 'en', theme: 'system', favorites: [] };

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
            // upsert via Drizzle
            await ctx.rootDb
                .insert(userData)
                .values({ userId: uid, lang: payload.lang, theme: payload.theme, favorites: JSON.stringify(payload.favorites) })
                .onConflictDoUpdate({
                    target: userData.userId,
                    set: {
                        lang: payload.lang,
                        theme: payload.theme,
                        favorites: JSON.stringify(payload.favorites),
                        updatedAt: sql`(strftime('%s','now'))`,
                    },
                });
            emitUserUpdate(uid, payload);
            return payload;
        }),

    // live subscription removed (poll from client instead)
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
