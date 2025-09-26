import type { JSX } from 'solid-js';
import { createMemo, createSignal, Show } from 'solid-js';

interface TooltipProps {
    content: string;
    placement?: 'top' | 'bottom' | 'left' | 'right';
    class?: string;
    children: JSX.Element;
}

export default function Tooltip(props: TooltipProps) {
    const [open, setOpen] = createSignal(false);
    const placement = createMemo(() => props.placement ?? 'top');
    const posCls = createMemo(() => {
        switch (placement) {
            case 'bottom': return 'left-1/2 top-full mt-2 -translate-x-1/2 origin-top';
            case 'left': return 'right-full top-1/2 -translate-y-1/2 mr-2 origin-right';
            case 'right': return 'left-full top-1/2 -translate-y-1/2 ml-2 origin-left';
            default: return 'left-1/2 bottom-full mb-2 -translate-x-1/2 origin-bottom';
        }
    })();

    return (
        <span
            class={`relative inline-flex ${props.class ?? ''}`}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
        >
            {props.children}
            <Show when={open()}>
                <span
                    role="tooltip"
                    class={`pointer-events-none absolute z-50 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 ${posCls()} transition duration-150 ease-out data-[enter=true]:animate-[fade-in_120ms_ease-out]`}
                    data-enter={open()}
                >
                    {props.content}
                    <span
                        aria-hidden="true"
                        class={`absolute block h-2 w-2 rotate-45 border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 ${placement() === 'top' ? 'left-1/2 top-full -translate-x-1/2 border-t-0 border-l-0' : ''}${placement() === 'bottom' ? 'left-1/2 bottom-full -translate-x-1/2 border-b-0 border-r-0' : ''}${placement() === 'left' ? 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2 border-l-0 border-b-0' : ''}${placement() === 'right' ? 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 border-r-0 border-t-0' : ''}`}
                    />
                </span>
            </Show>
        </span>
    );
}
