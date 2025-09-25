import type { Locale } from '../i18n';

// Map app Locale codes to PokeAPI language codes
// App: 'en' | 'fr' | 'jp' → PokeAPI: 'en' | 'fr' | 'ja'
export const LOCALE_TO_POKEAPI: Record<Locale, 'en' | 'fr' | 'ja'> = {
    en: 'en',
    fr: 'fr',
    jp: 'ja',
};
