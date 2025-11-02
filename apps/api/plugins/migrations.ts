import { getRootDb, loadEnv, migrate } from '@querymon/trpc';
import { defineNitroPlugin } from 'nitro/runtime';

export default defineNitroPlugin(async () => {
    const env = loadEnv();

    if (!env.MIGRATE_ON_BOOT) {
        console.warn('[api] migrations: skipped (MIGRATE_ON_BOOT=false)');
        return;
    }

    try {
        const db = getRootDb();
        await migrate(db);
    }
    catch (e) {
        console.error('[api] migration error', e);
    }
});
