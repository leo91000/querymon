import type { Context } from '@querymon/trpc';
import type { H3Event } from 'nitro/h3';
import { getRootDb } from '@querymon/trpc';
import { getAuth } from '../auth';

export async function createContext(event: H3Event): Promise<Context> {
    // Get session from Better Auth
    const auth = getAuth();
    const sessionRes = await auth.api.getSession({ headers: event.headers });
    const session = sessionRes ? { user: { id: sessionRes.user.id, email: sessionRes.user.email } } : null;

    // Global root DB (for metadata, provisioning)
    const rootDb = getRootDb();

    return { db: rootDb, rootDb, session };
}
