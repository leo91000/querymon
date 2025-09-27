import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Single JSON blob per user for app state (lang/theme/favorites)
export const userData = pgTable('user_data', {
    userId: text('user_id').primaryKey(),
    lang: text('lang'),
    theme: text('theme'),
    favorites: text('favorites_json'),
    spritePref: text('sprite_pref'),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().default(sql`now()`),
});

// Include Better Auth tables for Drizzle CLI (CJS) – extensionless so the loader resolves TS sources
// eslint-disable-next-line ts/ban-ts-comment
// @ts-ignore
export * from '../auth/schema';
