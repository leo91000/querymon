export default function Navbar() {
  return (
    <header class="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div class="flex items-center gap-2">
          <span class="text-xl">⚡️</span>
          <h1 class="text-lg font-semibold tracking-tight">QueryMon</h1>
        </div>
        <a
          href="https://pokeapi.co/"
          target="_blank"
          rel="noreferrer"
          class="text-xs text-blue-700 hover:underline"
        >
          Powered by sample data
        </a>
      </div>
    </header>
  );
}

