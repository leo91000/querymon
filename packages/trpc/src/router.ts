import { procedure, router } from './init';
import { userDataRouter } from './routers/userData';

export const appRouter = router({
    health: procedure.query(() => ({ ok: true } as const)),
    userData: userDataRouter,
});

export type AppRouter = typeof appRouter;
