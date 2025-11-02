import { appRouter } from '@querymon/trpc';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { defineHandler } from 'nitro/h3';
import { createContext } from '../../utils/context';

export default defineHandler(async (event) => {
    return await fetchRequestHandler({
        req: event.req,
        router: appRouter,
        endpoint: '/trpc',
        createContext: () => createContext(event),
    });
});
