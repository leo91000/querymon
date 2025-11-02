import { defineHandler } from 'nitro/h3';
import { getAuth } from '../../../auth';

export default defineHandler(async (event) => {
    const auth = getAuth();
    return auth.handler(event.req);
});
