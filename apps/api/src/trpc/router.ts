import { procedure, router } from './init.js';
import { userDataRouter } from './routers/userData.js';

export const appRouter = router({
    health: procedure.query(() => ({ ok: true } as const)),
    userData: userDataRouter,
});

export type AppRouter = typeof appRouter;
