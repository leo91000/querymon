import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { procedure, router } from '../init.js';
import { favorites } from '../../db/schema.js';
import { desc, eq } from 'drizzle-orm';

export const favoritesRouter = router({
  list: procedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
    const rows = await ctx.db.select().from(favorites).orderBy(desc(favorites.createdAt));
    return rows;
  }),
  add: procedure
    .input(z.object({ pokemonId: z.number().int().positive(), nickname: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      // ensure table exists (first-time per-user DB)
      await ensureFavoritesTable(ctx.db);
      const res = await ctx.db.insert(favorites).values({ pokemonId: input.pokemonId, nickname: input.nickname }).returning();
      return res[0];
    }),
  remove: procedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      await ensureFavoritesTable(ctx.db);
      await ctx.db.delete(favorites).where(eq(favorites.id, input.id));
      return { ok: true } as const;
    }),
});

async function ensureFavoritesTable(db: unknown) {
  try {
    await (db as any).select().from(favorites).limit(1);
  } catch (e) {
    // create table if missing
    try {
      // minimal portable DDL for libsql/sqlite
      const exec = (db as { execute?: (sql: string) => Promise<unknown> }).execute;
      await exec?.(`CREATE TABLE IF NOT EXISTS favorites (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        pokemon_id integer NOT NULL,
        nickname text,
        created_at integer DEFAULT (strftime('%s','now')) NOT NULL
      );`);
    // eslint-disable-next-line no-empty
    } catch {}
  }
}
