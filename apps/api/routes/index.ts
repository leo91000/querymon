import { defineHandler } from 'nitro/h3';

export default defineHandler(() => {
    return { ok: true, message: 'QueryMon API' };
});
