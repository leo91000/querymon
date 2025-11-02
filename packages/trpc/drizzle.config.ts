import type { Config } from 'drizzle-kit';
import process from 'node:process';
import 'dotenv/config';

export default {
    schema: './src/db/schema.ts',
    out: './src/db/migrations',
    migrations: {
        table: '_migrations',
        schema: 'public',
    },
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
    verbose: true,
    strict: true,
} satisfies Config;
