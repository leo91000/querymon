import type { Context } from '../../trpc/context.js';
import { TRPCError } from '@trpc/server';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { userData } from '../../db/schema.js';
import { procedure, router } from '../init.js';

export interface SpritePref { gen: string; variant: string }
export interface UserData {
    lang: 'en' | 'fr' | 'jp';
    theme: 'system' | 'light' | 'dark';
    favorites: number[];
    sprite?: SpritePref;
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
            sprite: z.object({ gen: z.string(), variant: z.string() }).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const uid = requireUser(ctx);
            const payload: UserData = { lang: input.lang, theme: input.theme, favorites: input.favorites, sprite: input.sprite };
            // upsert via Drizzle
            await ctx.rootDb
                .insert(userData)
                .values({ userId: uid, lang: payload.lang, theme: payload.theme, favorites: JSON.stringify(payload.favorites), spritePref: payload.sprite ? JSON.stringify(payload.sprite) : null })
                .onConflictDoUpdate({
                    target: userData.userId,
                    set: {
                        lang: payload.lang,
                        theme: payload.theme,
                        favorites: JSON.stringify(payload.favorites),
                        spritePref: payload.sprite ? JSON.stringify(payload.sprite) : null,
                        updatedAt: sql`now()`,
                    },
                });
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

function normalizeRow(row: { lang: string | null; theme: string | null; favorites: string | null; spritePref?: string | null } & { [k: string]: any }): UserData {
    let fav: number[] = [];
    try {
        fav = row.favorites ? JSON.parse(row.favorites) : [];
    }
    catch {
        fav = [];
    }
    let sprite: SpritePref | undefined;
    try {
        const raw = row.spritePref;
        if (raw) {
            const obj = JSON.parse(raw);
            if (obj && typeof obj.gen === 'string' && typeof obj.variant === 'string')
                sprite = { gen: obj.gen, variant: obj.variant };
        }
    }
    catch {}
    const lang = (row.lang === 'en' || row.lang === 'fr' || row.lang === 'jp') ? row.lang : 'en';
    const theme = (row.theme === 'system' || row.theme === 'light' || row.theme === 'dark') ? row.theme : 'system';
    return { lang, theme, favorites: Array.isArray(fav) ? fav.filter(n => Number.isInteger(n) && n > 0) : [], sprite };
}
