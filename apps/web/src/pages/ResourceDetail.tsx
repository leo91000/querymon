import type { ResourceName } from '../services/data';
import { useParams } from '@solidjs/router';
import { createResource, Match, Show, Switch } from 'solid-js';
import Card from '../components/Card';
import JsonViewer from '../components/JsonViewer';
import ResourceTabs from '../components/ResourceTabs';
import { t } from '../i18n';
import { formatName, loadItemById, resourceLabel } from '../services/data';
import AbilityDetail from './AbilityDetail';
import MoveDetail from './MoveDetail';
import PokemonDetail from './PokemonDetail';
import TypeDetail from './TypeDetail';

export default function ResourceDetail(props: { resource: ResourceName }) {
    const params = useParams();
    const id = () => Number(params.id);
    const [item] = createResource(async () => loadItemById(props.resource, id()));

    return (
        <div class="space-y-4">
            <ResourceTabs current={props.resource} />
            <Switch>
                <Match when={props.resource === 'pokemon'}>
                    <PokemonDetail id={id()} />
                </Match>
                <Match when={props.resource === 'move'}>
                    <MoveDetail id={id()} />
                </Match>
                <Match when={props.resource === 'ability'}>
                    <AbilityDetail id={id()} />
                </Match>
                <Match when={props.resource === 'type'}>
                    <TypeDetail id={id()} />
                </Match>
                <Match when>
                    <>
                        <h2 class="text-xl font-semibold">
                            {resourceLabel(props.resource)}
                            {' '}
                            #
                            {id()}
                        </h2>
                        <Show when={item()} fallback={<div class="text-gray-500">{t('detail.loading')}</div>}>
                            {it => (
                                <Card class="p-4">
                                    <div class="mb-4 text-lg font-semibold">
                                        {(() => {
                                            const data = it() as unknown;
                                            const name = (data && typeof data === 'object') ? (data as { name?: unknown }).name : undefined;
                                            return formatName(typeof name === 'string' ? name : `ID ${id()}`);
                                        })()}
                                    </div>
                                    <JsonViewer value={it()} />
                                </Card>
                            )}
                        </Show>
                    </>
                </Match>
            </Switch>
        </div>
    );
}
