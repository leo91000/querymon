import { createSignal, For, Show } from 'solid-js';

type NodeProps = { keyName?: string; value: any; level?: number };

function isObject(x: any) { return x && typeof x === 'object' && !Array.isArray(x); }

function Toggle({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      class="inline-flex h-5 w-5 items-center justify-center rounded border border-gray-300 text-xs text-gray-600 hover:bg-gray-50"
      aria-label={open ? 'Collapse' : 'Expand'}
    >
      {open ? '−' : '+'}
    </button>
  );
}

function Node(props: NodeProps) {
  const level = props.level ?? 0;
  const pad = `pl-${Math.min(6, level) * 2}`; // cap indentation
  const [open, setOpen] = createSignal(true);
  const v = () => props.value;
  const k = () => props.keyName;

  if (Array.isArray(v())) {
    return (
      <div class={`border-l border-gray-200 ${pad}`}>
        {k() && <div class="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-700"><Toggle open={open()} onClick={() => setOpen(!open())} />{k()}</div>}
        <Show when={open()}>
          <ul class="space-y-1">
            <For each={v()}>{(item, i) => (
              <li>
                <Node value={item} level={(level + 1)} keyName={`[${i()}]`} />
              </li>
            )}</For>
          </ul>
        </Show>
      </div>
    );
  }

  if (isObject(v())) {
    const entries = Object.entries(v() as Record<string, any>);
    return (
      <div class={`border-l border-gray-200 ${pad}`}>
        {k() && <div class="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-700"><Toggle open={open()} onClick={() => setOpen(!open())} />{k()}</div>}
        <Show when={open()}>
          <div class="space-y-1">
            <For each={entries}>{([key, val]) => (
              <div>
                <Node value={val} level={(level + 1)} keyName={key} />
              </div>
            )}</For>
          </div>
        </Show>
      </div>
    );
  }

  return (
    <div class={`grid grid-cols-[12rem_1fr] gap-3 ${pad}`}>
      {k() && <div class="truncate text-xs font-medium uppercase tracking-wide text-gray-500">{k()}</div>}
      <div class="overflow-x-auto rounded bg-gray-50 px-2 py-1 font-mono text-xs text-gray-800">{String(v())}</div>
    </div>
  );
}

export default function JsonViewer(props: { value: any }) {
  return (
    <div class="space-y-2">
      <Node value={props.value} />
    </div>
  );
}

