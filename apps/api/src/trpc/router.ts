import { router, procedure } from './init.js';
import { favoritesRouter } from './routers/favorites.js';

export const appRouter = router({
  health: procedure.query(() => ({ ok: true } as const)),
  favorites: favoritesRouter,
});

export type AppRouter = typeof appRouter;
