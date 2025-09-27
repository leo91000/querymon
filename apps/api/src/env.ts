import process from 'node:process';
import { z } from 'zod';
import 'dotenv/config';

const EnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(8787),
    // Database
    DB_DRIVER: z.enum(['pg', 'neon']).default('pg'),
    DATABASE_URL: z.string().url(),
    MIGRATE_ON_BOOT: z.preprocess((v) => {
        if (typeof v === 'string') {
            const s = v.trim().toLowerCase();
            if (s === '1' || s === 'true' || s === 'yes' || s === 'on')
                return true;
            if (s === '0' || s === 'false' || s === 'no' || s === 'off')
                return false;
        }
        return v;
    }, z.boolean().default(false)),
    // Better Auth
    BETTER_AUTH_SECRET: z.string().optional(),
    BETTER_AUTH_URL: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    // Web app origin (production), e.g. https://querymon.vercel.app
    WEB_ORIGIN: z.string().url().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
        const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n');
        throw new Error(`Invalid environment variables:\n${issues}`);
    }
    return parsed.data;
}
