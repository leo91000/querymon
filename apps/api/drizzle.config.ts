import { defineConfig } from 'drizzle-kit';

// Drizzle CLI config for both local SQLite (file) and Turso (libSQL)
// Uses env vars when available; falls back to local file in dev.

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

// For local dev we keep DB file under apps/api/var/dev.db
const LOCAL_SQLITE_URL = 'file:./var/dev.db';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    // If turso url exists, prefer it; otherwise use local file URL
    url: TURSO_DATABASE_URL ?? LOCAL_SQLITE_URL,
    authToken: TURSO_AUTH_TOKEN,
  },
  verbose: true,
});
