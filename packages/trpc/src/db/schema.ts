import { sql } from 'drizzle-orm';
import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Single JSON blob per user for app state (lang/theme/favorites/shinyHunts/etc.)
export const userData = pgTable('user_data', {
    userId: text('user_id').primaryKey(),
    // All user preferences and data as a single JSON blob
    data: jsonb('data').notNull().default('{}'),
    updatedAt: timestamp('updated_at', { mode: 'date' })
        .notNull()
        .default(sql`now()`),
});

// Include Better Auth tables
export * from './auth-schema';
