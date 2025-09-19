export default function Footer() {
  return (
    <footer class="mt-8 border-t border-gray-200 bg-white/60 dark:border-gray-800 dark:bg-gray-900/60">
      <div class="mx-auto max-w-6xl px-4 py-6 text-xs text-gray-500 dark:text-gray-400">
        <p>
          © {new Date().getFullYear()} QueryMon. Pokémon and Pokémon character names are
          trademarks of Nintendo.
        </p>
      </div>
    </footer>
  );
}
