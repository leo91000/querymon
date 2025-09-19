import { useParams } from '@solidjs/router';
import { Show, createResource } from 'solid-js';
import Card from '../components/Card';
import JsonViewer from '../components/JsonViewer';
import { formatName, loadItemById, resourceLabel, type ResourceName } from '../services/data';
import ResourceTabs from '../components/ResourceTabs';

export default function ResourceDetail(props: { resource: ResourceName }) {
  const params = useParams();
  const id = () => Number(params.id);
  const [item] = createResource(async () => {
    const data = await loadItemById(props.resource, id());
    return data;
  });

  return (
    <div class="space-y-4">
      <ResourceTabs current={props.resource} />
      <h2 class="text-xl font-semibold">{resourceLabel(props.resource)} #{id()}</h2>
      <Show when={item()} fallback={<div class="text-gray-500">Loading…</div>}>
        {(it) => (
          <Card class="p-4">
            <div class="mb-4 text-lg font-semibold">{formatName((it() as any).name || `ID ${id()}`)}</div>
            <JsonViewer value={it()} />
          </Card>
        )}
      </Show>
    </div>
  );
}
