import { A, useLocation } from '@solidjs/router';
import { For, Show, createMemo, createResource, createSignal } from 'solid-js';
import Card from '../components/Card';
import Input from '../components/Input';
import { formatName, loadList, resourceLabel, type ResourceName, loadAliases } from '../services/data';
import { t } from '../i18n';
import ResourceTabs from '../components/ResourceTabs';

export default function ResourceList(props: { resource: ResourceName }) {
  const [items] = createResource(() => props.resource, loadList);
  const [aliases] = createResource(() => props.resource, async (r) => (['pokemon','move','ability','type'].includes(r) ? loadAliases(r as any) : {}));
  const [q, setQ] = createSignal('');
  function normalize(s: string) {
    return s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  const filtered = createMemo(() => {
    const term = normalize(q());
    const list = items() || [];
    if (!term) return list;
    const map = aliases() || {};
    const out: typeof list = [] as any;
    for (const it of list) {
      const idStr = String((it as any).id);
      const nameMatch = normalize(it.name).includes(term);
      const aliasMatch = Array.isArray((map as any)[idStr]) && (map as any)[idStr].some((a: string) => normalize(a).includes(term));
      if (nameMatch || aliasMatch) out.push(it);
    }
    return out;
  });

  return (
    <div class="space-y-4">
      <ResourceTabs current={props.resource} />
      <div class="flex items-end justify-between gap-4">
        <h2 class="text-xl font-semibold">{resourceLabel(props.resource)}</h2>
        <div class="w-72">
          <Input id="filter" placeholder={t('list.filter', { name: resourceLabel(props.resource) })} value={q()} onInput={(e) => setQ(e.currentTarget.value)} />
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
