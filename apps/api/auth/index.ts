import process from 'node:process';
import { accounts, getRootDb, loadEnv, sessions, users, verifications } from '@querymon/trpc';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

export function createAuth() {
    const env = loadEnv();

    const trustedOrigins: string[] = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ];
    if (env.WEB_ORIGIN)
        trustedOrigins.push(env.WEB_ORIGIN);

    return betterAuth({
        basePath: '/api/auth',
        baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
        trustedOrigins,
        secret: process.env.BETTER_AUTH_SECRET,
        cookies: {
            session: {
                // Ensure cross-site cookies work on Vercel (preview/prod)
                sameSite: (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') ? 'none' : 'lax',
                secure: (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'),
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
            provider: 'pg',
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
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
    if (!authInstance) {
        authInstance = createAuth();
    }
    return authInstance;
}
