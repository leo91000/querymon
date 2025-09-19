import Card from '../components/Card';
import { A } from '@solidjs/router';
import { createResource, For } from 'solid-js';
import { resourceLabel } from '../services/data';

const RESOURCES = ['pokemon','pokemon-species','move','ability','type','evolution-chain'] as const;

async function loadCounts() {
  const res = await fetch('/data/pokeapi/search-index.json');
  const all = await res.json();
  const counts = Object.fromEntries(RESOURCES.map((r) => [r, 0]));
  for (const e of all) counts[e.resource]++;
  return counts as Record<(typeof RESOURCES)[number], number>;
}

export default function Home() {
  const [counts] = createResource(loadCounts);
  return (
    <div class="space-y-6">
      <h2 class="text-xl font-semibold">Browse Resources</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <For each={RESOURCES as unknown as string[]}>
          {(r) => (
            <A href={`/${r}`}>
              <Card class="flex items-center justify-between p-5 hover:shadow-md">
                <div>
                  <div class="text-sm text-gray-500">{resourceLabel(r as any)}</div>
                  <div class="text-2xl font-bold">{counts()?.[r as any] ?? '…'}</div>
                </div>
                <span class="text-gray-400">→</span>
              </Card>
            </A>
          )}
        </For>
      </div>
    </div>
  );
}

