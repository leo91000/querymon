export default function Skeleton(props: { class?: string }) {
  return <div class={`animate-pulse rounded bg-gray-200/80 dark:bg-gray-700/60 ${props.class || ''}`} />;
}

