import type { DB } from '../db/client.js';
import process from 'node:process';
import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { userMeta } from '../db/schema.js';

type Session = { user: { id: string } } | null | undefined;

export async function getPerUserDb({ rootDb, session }: { rootDb: DB; session: Session }): Promise<DB> {
    if (!session?.user?.id)
        return rootDb;
    const meta = (await rootDb.select().from(userMeta).where(eq(userMeta.userId, session.user.id)).limit(1))[0];
    if (!meta?.dbUrl)
        return rootDb;
    const authToken = process.env.TURSO_GROUP_TOKEN;
    if (!authToken)
        return rootDb;
    const client = createClient({ url: meta.dbUrl, authToken });
    return drizzle(client);
}
