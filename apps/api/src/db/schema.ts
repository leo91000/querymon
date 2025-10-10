import { sql } from 'drizzle-orm';
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

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
    // custom increment delta for shiny hunt tracker
    shinyCustomDelta: integer('shiny_custom_delta'),
    updatedAt: timestamp('updated_at', { mode: 'date' })
        .notNull()
        .default(sql`now()`),
});

// Include Better Auth tables
export * from '../auth/schema';
