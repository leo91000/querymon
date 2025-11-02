import { defineHandler } from 'nitro/h3';
import { getAuth } from '../../auth';

export default defineHandler(async (event) => {
    const auth = getAuth();
    const sessionRes = await auth.api.getSession({ headers: event.headers });
    const user = sessionRes ? { id: sessionRes.user.id, email: sessionRes.user.email } : null;

    return { user };
});
