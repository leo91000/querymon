import process from 'node:process';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getRootDb } from '../db/client.js';
import { loadEnv } from '../env.js';
import { accounts, sessions, users, verifications } from './schema.js';

// Validate env on module load
loadEnv();

export const auth = betterAuth({
    basePath: '/api/auth',
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:8787',
    trustedOrigins: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ],
    secret: process.env.BETTER_AUTH_SECRET,
    cookies: {
        session: {
            sameSite: 'lax',
            secure: false,
        },
    },
    session: {
    // Cookie session by default; works for web/tauri. Mobile can use token mode later if needed.
        expiresIn: 60 * 60 * 24 * 30, // 30 days
    },
    emailAndPassword: { enabled: false },
    socialProviders: {
    // Google OAuth setup
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
    },
    database: drizzleAdapter(getRootDb(), {
        provider: 'sqlite',
        usePlural: true,
        schema: { users, sessions, accounts, verifications },
    }),
    user: {
    // Room to add more user fields later (e.g., plan, flags)
        additionalFields: {
            // stored in our own user_meta table instead (to keep auth schema stock)
        },
    },
});
