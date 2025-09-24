import { QueryClient } from '@tanstack/solid-query';
import { persistQueryClient, type PersistedClient, type Persister } from '@tanstack/query-persist-client-core';
import { get, set, del } from 'idb-keyval';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
      refetchOnWindowFocus: false,
      retry: false,
      networkMode: 'always',
    },
  },
});

export async function initQueryPersistence(buster: string) {
  try {
    const persister: Persister = {
      persistClient: async (client: PersistedClient) => set('tanstack-query', client),
      restoreClient: async () => (await get<PersistedClient>('tanstack-query')) || undefined,
      removeClient: async () => del('tanstack-query'),
    };
    persistQueryClient({ queryClient, persister, buster });
  } catch (err) {
    // IndexedDB may be unavailable in some constrained contexts; fall back to memory-only.
    console.warn('[QueryMon] Persist disabled:', err);
  }
}

export async function clearQueryCacheAndStorage() {
  try {
    await del('tanstack-query');
  } catch {}
  queryClient.clear();
}
