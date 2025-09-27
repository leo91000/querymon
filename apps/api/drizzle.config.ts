import process from 'node:process';
import { defineConfig } from 'drizzle-kit';

// Drizzle CLI config for PostgreSQL (supports pg and Neon drivers)
// Use DATABASE_URL; choose driver at runtime via DB_DRIVER (pg|neon)

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/querymon';

export default defineConfig({
    schema: './src/db/schema.cli.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: { url: DATABASE_URL },
    verbose: true,
});
