import { A } from '@solidjs/router';
import AuthButton from './AuthButton';
import LanguageSwitcher from './LanguageSwitcher';
import GlobalSearch from './Search/GlobalSearch';
import ThemeSwitcher from './ThemeSwitcher';

export default function Navbar() {
    return (
        <header class="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
            <div class="mx-auto max-w-6xl px-4 py-3">
                <div class="flex items-center justify-between md:hidden">
                    <A href="/" class="flex items-center gap-2">
                        <span class="icon-[ph--lightning] text-2xl text-blue-600 dark:text-blue-400" />
                        <h1 class="text-lg font-semibold tracking-tight">QueryMon</h1>
                    </A>
                    <div class="flex items-center gap-2">
                        <LanguageSwitcher iconOnly />
                        <ThemeSwitcher iconOnly />
                        <AuthButton />
                    </div>
                </div>
                <div class="md:hidden mt-3">
                    <GlobalSearch />
                </div>
                <div class="hidden md:grid md:grid-cols-[auto_1fr_auto] md:items-center md:gap-3">
                    <A href="/" class="flex items-center gap-2">
                        <span class="icon-[ph--lightning] text-2xl text-blue-600 dark:text-blue-400" />
                        <h1 class="text-lg font-semibold tracking-tight">QueryMon</h1>
                    </A>
                    <GlobalSearch />
                    <div class="flex items-center gap-2">
                        <LanguageSwitcher />
                        <ThemeSwitcher />
                        <AuthButton />
                    </div>
                </div>
            </div>
        </header>
    );
}
