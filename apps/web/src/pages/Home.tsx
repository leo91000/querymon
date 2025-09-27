import { A } from '@solidjs/router';
import { createResource, For } from 'solid-js';
import Card from '../components/Card';
import { t } from '../i18n';
import { loadSearchIndex, resourceLabel } from '../services/data';

const RESOURCES = ['pokemon', 'move', 'ability', 'type'] as const;

async function loadCounts() {
    const all = await loadSearchIndex();
    const counts = Object.fromEntries(RESOURCES.map(r => [r, 0]));
    for (const e of all) {
        if (e.resource in counts)
            counts[e.resource]++;
    }
    return counts as Record<(typeof RESOURCES)[number], number>;
}

export default function Home() {
    const [counts] = createResource(loadCounts);
    return (
        <div class="space-y-6">
            <h2 class="text-xl font-semibold">{t('home.browse')}</h2>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <For each={RESOURCES}>
                    {r => (
                        <A href={`/${r}`}>
                            <Card class="flex items-center justify-between p-5 hover:shadow-md">
                                <div>
                                    <div class="text-sm text-gray-500">{resourceLabel(r)}</div>
                                    <div class="text-2xl font-bold">{counts()?.[r] ?? '…'}</div>
                                </div>
                                <span class="text-gray-400">→</span>
                            </Card>
                        </A>
                    )}
                </For>
            </div>
            <A href="/shiny-hunt">
                <Card class="flex items-center justify-between gap-4 bg-gradient-to-r from-amber-100 via-orange-100 to-rose-100 p-5 transition hover:-translate-y-0.5 hover:shadow-lg dark:from-amber-900/40 dark:via-orange-900/40 dark:to-rose-900/40">
                    <div>
                        <div class="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">{t('shinyHunt.title') || 'Shiny Hunt Tracker'}</div>
                        <p class="mt-1 max-w-xl text-sm text-gray-700 dark:text-gray-200">{t('shinyHunt.subtitle') || 'Plan your shiny hunts, count encounters, and celebrate your catches.'}</p>
                    </div>
                    <span class="icon-[ph--sparkle] text-3xl text-amber-500 drop-shadow" aria-hidden="true" />
                </Card>
            </A>
        </div>
    );
}
