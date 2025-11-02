import type { Context } from '../context';
import { TRPCError } from '@trpc/server';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { userData } from '../db/schema';
import { procedure, router } from '../init';

export interface SpritePref { gen: string; variant: string }

export interface ShinyHuntEntry {
    id: string;
    pokemonId: number;
    startDate: string;
    encounterCount: number;
    status: 'active' | 'completed';
    selectedSpriteId?: string | null;
    completedAt?: string;
    caughtEncounters?: number;
    spriteUrl?: string | null;
    selectedGeneration?: string | null;
    selectedVariantKey?: string | null;
    oddsNumerator?: number;
    oddsDenominator?: number;
    note?: string;
}

export interface UserData {
    lang: 'en' | 'fr' | 'jp';
    theme: 'system' | 'light' | 'dark';
    favorites: number[];
    sprite?: SpritePref;
    shinyCustomDelta?: number;
    shinyHunts?: ShinyHuntEntry[];
}

const DefaultData: UserData = { lang: 'en', theme: 'system', favorites: [] };

const shinyHuntEntrySchema = z.object({
    id: z.string(),
    pokemonId: z.number().int().positive(),
    startDate: z.string(),
    encounterCount: z.number().int().nonnegative(),
    status: z.enum(['active', 'completed']),
    selectedSpriteId: z.string().nullable().optional(),
    completedAt: z.string().optional(),
    caughtEncounters: z.number().int().nonnegative().optional(),
    spriteUrl: z.string().nullable().optional(),
    selectedGeneration: z.string().nullable().optional(),
    selectedVariantKey: z.string().nullable().optional(),
    oddsNumerator: z.number().int().positive().optional(),
    oddsDenominator: z.number().int().positive().optional(),
    note: z.string().optional(),
});

const userDataSchema = z.object({
    lang: z.enum(['en', 'fr', 'jp']),
    theme: z.enum(['system', 'light', 'dark']),
    favorites: z.array(z.number().int().positive()),
    sprite: z.object({ gen: z.string(), variant: z.string() }).optional(),
    shinyCustomDelta: z.number().int().positive().optional(),
    shinyHunts: z.array(shinyHuntEntrySchema).optional(),
});

export const userDataRouter = router({
    get: procedure.query(async ({ ctx }) => {
        const uid = requireUser(ctx);
        const row = (await ctx.rootDb.select().from(userData).where(eq(userData.userId, uid)).limit(1))[0];
        if (!row)
            return DefaultData;
        // Parse JSON blob
        const data = (row.data as any) || {};
        return normalizeData(data);
    }),

    set: procedure
        .input(userDataSchema)
        .mutation(async ({ ctx, input }) => {
            const uid = requireUser(ctx);
            const payload: UserData = {
                lang: input.lang,
                theme: input.theme,
                favorites: input.favorites,
                sprite: input.sprite,
                shinyCustomDelta: input.shinyCustomDelta,
                shinyHunts: input.shinyHunts,
            };
            // Upsert: store entire payload as JSON
            await ctx.rootDb
                .insert(userData)
                .values({ userId: uid, data: payload as any })
                .onConflictDoUpdate({
                    target: userData.userId,
                    set: {
                        data: payload as any,
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

function normalizeData(data: any): UserData {
    // Validate with Zod - throw on invalid data
    const result = userDataSchema.safeParse(data);
    if (!result.success) {
        console.error('[userData] Invalid data from DB:', result.error);
        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Invalid user data in database',
        });
    }
    return result.data;
}
