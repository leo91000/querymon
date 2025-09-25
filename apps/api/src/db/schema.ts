import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const favorites = sqliteTable('favorites', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pokemonId: integer('pokemon_id').notNull(),
  // optional nickname for the favorite
  nickname: text('nickname'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
});

export type Favorite = typeof favorites.$inferSelect;
export type FavoriteInsert = typeof favorites.$inferInsert;

// Per-user metadata (DB name/url recorded after provisioning)
export const userMeta = sqliteTable('user_meta', {
  userId: text('user_id').primaryKey(),
  dbName: text('db_name'),
  dbUrl: text('db_url'),
  dbHost: text('db_host'),
  provisionedAt: integer('provisioned_at', { mode: 'timestamp' }).default(sql`(strftime('%s','now'))`),
});

// Include Better Auth tables for migrations
export * from '../auth/schema.js';
