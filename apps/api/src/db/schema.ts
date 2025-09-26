import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Single JSON blob per user for app state (lang/theme/favorites)
export const userData = sqliteTable('user_data', {
    userId: text('user_id').primaryKey(),
    // simple strings for lang/theme
    lang: text('lang'), // 'en' | 'fr' | 'jp'
    theme: text('theme'), // 'system' | 'light' | 'dark'
    // favorites as JSON string (array of numbers)
    favorites: text('favorites_json'),
    // preferred sprite selection as JSON: { gen: string, variant: string }
    spritePref: text('sprite_pref'),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(strftime('%s','now'))`),
});

// Include Better Auth tables for migrations
export * from '../auth/schema';
