import { createResource, Show } from 'solid-js';
import { clearQueryCacheAndStorage } from '../queryClient';
import Button from './Button';

async function loadBuild() {
    try {
        const res = await fetch('/data/pokeapi/build.json', { cache: 'no-store' });
        if (!res.ok)
            return undefined;
        return await res.json();
    }
    catch {
        return undefined;
    }
}

export default function Footer() {
    const [build] = createResource(loadBuild);
    async function onClear() {
        try {
            await clearQueryCacheAndStorage();
        }
        catch {}
        // Small delay to ensure storage cleared before reload
        setTimeout(() => window.location.reload(), 50);
    }
    return (
        <footer class="mt-8 border-t border-gray-200 bg-white/60 dark:border-gray-800 dark:bg-gray-900/60">
            <div class="mx-auto max-w-6xl px-4 py-6 text-xs text-gray-500 dark:text-gray-400">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p>
                        ©
                        {' '}
                        {new Date().getFullYear()}
                        {' '}
                        QueryMon. Pokémon and Pokémon character names are
                        trademarks of Nintendo.
                    </p>
                    <div class="flex items-center gap-3">
                        <Show when={build()}>
                            {b => (
                                <div class="text-[11px] text-gray-400 dark:text-gray-500">
                                    data
                                    {' '}
                                    {b().buildId}
                                    {' '}
                                    ·
                                    {new Date(b().updatedAt || Date.now()).toLocaleString()}
                                </div>
                            )}
                        </Show>
                        <Button size="sm" variant="secondary" class="!h-7 !px-2 text-[11px]" onClick={onClear}>
                            Clear cache
                        </Button>
                    </div>
                </div>
            </div>
        </footer>
    );
}
