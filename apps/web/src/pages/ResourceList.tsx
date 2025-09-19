import { A, useLocation } from '@solidjs/router';
import { For, Show, createMemo, createResource, createSignal } from 'solid-js';
import Card from '../components/Card';
import Input from '../components/Input';
import { formatName, loadList, resourceLabel, type ResourceName } from '../services/data';
import ResourceTabs from '../components/ResourceTabs';

export default function ResourceList(props: { resource: ResourceName }) {
  const [items] = createResource(() => props.resource, loadList);
  const [q, setQ] = createSignal('');
  const filtered = createMemo(() => {
    const term = q().trim().toLowerCase();
    const list = items() || [];
    if (!term) return list;
    const out = [] as typeof list;
    for (const it of list) {
      if (it.name.toLowerCase().includes(term)) out.push(it);
    }
    return out;
  });

  return (
    <div class="space-y-4">
      <ResourceTabs current={props.resource} />
      <div class="flex items-end justify-between gap-4">
        <h2 class="text-xl font-semibold">{resourceLabel(props.resource)}</h2>
        <div class="w-72">
          <Input id="filter" placeholder={`Filter ${resourceLabel(props.resource)}…`} value={q()} onInput={(e) => setQ(e.currentTarget.value)} />
        </div>
      </div>
      <Card>
        <ul class="divide-y divide-gray-100">
          <For each={filtered()}>
            {(it) => (
              <li>
                <A href={`/${props.resource}/${it.id}`} class="flex items-center justify-between px-3 py-2 hover:bg-gray-50">
                  <span class="truncate"><span class="font-medium">{formatName(it.name)}</span> <span class="text-gray-500">#{it.id}</span></span>
                  <span class="text-gray-300">→</span>
                </A>
              </li>
            )}
          </For>
        </ul>
      </Card>
    </div>
  );
}
