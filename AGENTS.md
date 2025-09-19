# AGENTS.md — QueryMon

This file guides agents and contributors working in this repository. It applies to the entire repo unless a more deeply nested `AGENTS.md` overrides specific points.

## Scope & Principles
- Keep changes minimal, focused, and consistent with the existing style.
- Fix root causes over superficial patches.
- Prefer clarity over cleverness; small, composable components win.

## Tech Stack
- SolidJS (TypeScript) + Vite 7
- Tailwind CSS v4 via `@tailwindcss/vite` (class-based dark mode)
- Node 18+ recommended
- Tauri v2 (apps/desktop)

## Dev Workflow (pnpm workspaces)
- Install: `pnpm install`
- Web dev: `pnpm dev:web` (http://localhost:5173)
- Desktop dev (Tauri):
  - macOS/Windows: `pnpm dev:desktop`
  - Linux/Wayland: `WEBKIT_DISABLE_DMABUF_RENDERER=1 pnpm dev:desktop`
- Web build: `pnpm build:web`
- Desktop build: `pnpm build:desktop`

## Project Structure
- `apps/web`: Solid + Vite app (public data lives here)
  - `public/data/pokeapi`: Aggregated JSON data and manifests
  - `src/components`: UI primitives and composites
  - `src/pages`: Resource list/detail pages (Pokémon, Move, Ability, Type)
  - `src/services`: Data loaders (aliasing + helpers)
  - `src/i18n`: i18n setup (`@solid-primitives/i18n`)
  - `src/theme`: theme manager (system/light/dark)
- `apps/desktop`: Tauri v2 shell (loads web dev server or dist)
- `scripts`: data scraper and index builder

## Code Style & Patterns
- Language: TypeScript with `strict` mode; avoid `any` where practical.
- Loops: Prefer `for-of` and `for-in` over `forEach` in JS/TS.
- Solid idioms:
  - State with `createSignal`; derived state with `createMemo`.
  - Prefer `<For>` for rendering lists. Use stable keys (e.g., `id`).
  - Prefer `<Show>`/`<Switch>` for conditional UI.
- Components:
  - Name files and default exports in `PascalCase` (e.g., `PokemonCard.tsx`).
  - Props must be typed; keep public surface small and predictable.
  - Accessibility first: proper labels for inputs, focus styles, `alt` text on images.
- Styling (Tailwind v4):
  - Use utility classes. Avoid runtime-generated class names like `bg-${x}-500`.
  - If variants are needed, map to static class lists (see `Badge.tsx`).
  - Co-locate small component-specific styles with the component via class lists.
- Imports: Prefer relative imports until an alias is introduced.

## UI Components
- Primitives provided: `Button`, `Card`, `Badge`, `Input`, `Select`, `Navbar`, `Footer`, `PokemonCard`.
- When adding components:
  - Keep them stateless when possible; accept controlled props.
  - Expose minimal visual variants with static class maps.
  - Ensure keyboard and screen-reader accessibility.

## Data & APIs
- Public datasets live under `apps/web/public/data/pokeapi`.
- Scraper: `scripts/scrape-pokeapi.mjs` (supports sharding) → writes aggregated files.
- Indexer: `scripts/build-index.mjs` → builds `<resource>.list.json`, `<resource>.idmap.json`, and `search-index.json`.
- Resource rules:
  - UI "Pokémon" uses species data under the hood (alias: `pokemon` → `pokemon-species`).
  - Global search excludes the old `pokemon` dataset and maps species entries to `pokemon` routes.
  - Evolution is removed from UI and search (data files may remain for reference).

## Performance
- Use `<For>` for larger lists and avoid expensive derived computations in render.
- Use `loading="lazy"` for images and keep sprites small.
- Lists with large counts expose "+N more" expanders; prefer incremental reveal instead of rendering thousands of items at once.

## Commits & PRs
- Commit message format with JIRA ticket:
  - `feat(JIRA-1234): Add this feature`
  - `fix(JIRA-1234): Fix this issue`
  - `chore(JIRA-1234): Cleanup this code`
- Multi-line commit messages: use multiple `-m` flags, e.g.
  - `git commit -m "feat(JIRA-1234): Add feature" -m "- detail 1" -m "- detail 2"`
- Pull requests:
  - Title only: `[JIRA-1234] Short description`
  - No body (with GitHub CLI: `--body ""`).
- Never include tool publicity lines in commits/PRs, e.g. “🤖 Generated with …” or `Co-Authored-By: Claude <noreply@anthropic.com>`.

## Testing (if added)
- Use Vitest + `@testing-library/solid`.
- Co-locate tests as `ComponentName.test.tsx` next to the component.

## Accessibility Checklist
- Keyboard focus visible on interactive elements.
- Inputs have associated labels (“for”/`id`).
- Images have meaningful `alt` text.
- Sufficient color contrast for text and interactive states.

## Internationalization (i18n)
- Library: `@solid-primitives/i18n` with `flatten` + `translator(resolveTemplate)`.
- Locales: `en`, `fr`, `jp` in `apps/web/public/locales/<locale>/common.json`.
- Init: `initI18n()` in `apps/web/src/index.tsx`.
  - Order: localStorage → navigator (`fr*`→`fr`, `ja*`→`jp`) → fallback `en`.
  - Updates `<html lang>`.
- Use `t('key')` everywhere for strings; templates like `t('list.filter', { name: 'Pokémon' })`.
- Language switcher: `apps/web/src/components/LanguageSwitcher.tsx`.
  - To add languages: add `public/locales/<code>/common.json` and update switcher options.
- For localized content from PokeAPI, prefer localized fields (future work in scraper/indexer).

## Theme (Light / Dark / System)
- Manager: `apps/web/src/theme/index.ts` (localStorage key `theme`).
- Default: `system`. Applies `.dark` class and `data-theme="dark|light"` on `<html>`.
- Tailwind v4 variant:
  - `apps/web/src/index.css` sets: `@variant dark (&:where(.dark, .dark *));` (class‑based dark mode).
- Theme switcher: `apps/web/src/components/ThemeSwitcher.tsx`.
- Linux/Wayland desktop users may need `WEBKIT_DISABLE_DMABUF_RENDERER=1` when running Tauri dev.

## Fonts
- Global: Google Font "Dosis" (set via `--font-sans` and `font-sans` on `<html>`).
- Accent: Google Font "Jersey 20" available via utility `.font-jersey` (use sparingly for highlights).

## Trademark Notice
Pokémon and Pokémon character names are trademarks of Nintendo. This project is a fan-made database for educational/demo purposes.
