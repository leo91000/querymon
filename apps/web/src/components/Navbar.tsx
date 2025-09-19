import GlobalSearch from './Search/GlobalSearch';
import { A } from '@solidjs/router';
import LanguageSwitcher from './LanguageSwitcher';
import { t } from '../i18n';

export default function Navbar() {
  return (
    <header class="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div class="mx-auto grid max-w-6xl grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[auto_1fr_auto] md:items-center">
        <A href="/" class="flex items-center gap-2">
          <span class="text-xl">⚡️</span>
          <h1 class="text-lg font-semibold tracking-tight">QueryMon</h1>
        </A>
        <GlobalSearch />
        <nav class="hidden gap-4 md:flex">
          <A href="/pokemon" class="text-sm text-gray-700 hover:text-blue-700">{t('nav.pokemon')}</A>
          <A href="/pokemon-species" class="text-sm text-gray-700 hover:text-blue-700">{t('nav.species')}</A>
          <A href="/move" class="text-sm text-gray-700 hover:text-blue-700">{t('nav.moves')}</A>
          <A href="/ability" class="text-sm text-gray-700 hover:text-blue-700">{t('nav.abilities')}</A>
          <A href="/type" class="text-sm text-gray-700 hover:text-blue-700">{t('nav.types')}</A>
          <A href="/evolution-chain" class="text-sm text-gray-700 hover:text-blue-700">{t('nav.evolution')}</A>
        </nav>
        <div class="hidden md:block"><LanguageSwitcher /></div>
      </div>
    </header>
  );
}
