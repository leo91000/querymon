import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Single JSON blob per user for app state (lang/theme/favorites)
export const userData = pgTable('user_data', {
    userId: text('user_id').primaryKey(),
    // simple strings for lang/theme
    lang: text('lang'), // 'en' | 'fr' | 'jp'
    theme: text('theme'), // 'system' | 'light' | 'dark'
    // favorites as JSON string (array of numbers)
    favorites: text('favorites_json'),
    // preferred sprite selection as JSON: { gen: string, variant: string }
    spritePref: text('sprite_pref'),
    updatedAt: timestamp('updated_at', { mode: 'date' })
        .notNull()
        .default(sql`now()`),
});

// Include Better Auth tables for migrations
// eslint-disable-next-line ts/ban-ts-comment
// @ts-ignore - Extensionless import lets drizzle-kit (CJS) load TS during CLI; app runtime uses compiled JS
export * from '../auth/schema';
