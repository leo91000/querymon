import type { AppRouter } from '../../../api/src/trpc/router';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { listLocalFavorites } from './favorites';

export async function syncLocalFavoritesToRemote() {
    const favs = await listLocalFavorites();
    if (!favs.length)
        return;
    const trpc = createTRPCProxyClient<AppRouter>({
        links: [httpBatchLink({ url: `${import.meta.env.VITE_API_BASE?.replace(/\/?$/, '') || 'http://localhost:8787'}/trpc`, fetch(url, opts) { return fetch(url, { ...opts, credentials: 'include' as const }); } })],
    });
    for (const f of favs) {
        try {
            await trpc.favorites.add.mutate({ pokemonId: f.id, nickname: f.nickname });
        }
        catch { }
    }
}
