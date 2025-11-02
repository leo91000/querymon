import process from 'node:process';
import { loadEnv } from '@querymon/trpc';
import { defineHandler, handleCors } from 'nitro/h3';
import { parseURL } from 'ufo';

const ALLOWED_DEV_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];

export default defineHandler((event) => {
    const env = loadEnv();
    const isProduction = env.NODE_ENV === 'production' || process.env.VERCEL === '1';

    const corsResult = handleCors(event, {
        origin(origin) {
            // Allow localhost origins in development
            if (!isProduction && ALLOWED_DEV_ORIGINS.includes(origin))
                return origin;

            // Allow configured web origin
            if (env.WEB_ORIGIN && origin === env.WEB_ORIGIN)
                return origin;

            // Allow Vercel preview deployments
            const { host } = parseURL(origin);
            if (process.env.VERCEL === '1' && host?.endsWith('.vercel.app'))
                return origin;

            return false;
        },
        credentials: true,
    });

    // If handleCors returned a response (OPTIONS preflight), return it
    if (corsResult) {
        return corsResult;
    }
});
