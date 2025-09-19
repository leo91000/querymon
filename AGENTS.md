# AGENTS.md — QueryMon

This file guides agents and contributors working in this repository. It applies to the entire repo unless a more deeply nested `AGENTS.md` overrides specific points.

## Scope & Principles
- Keep changes minimal, focused, and consistent with the existing style.
- Fix root causes over superficial patches.
- Prefer clarity over cleverness; small, composable components win.

## Tech Stack
- SolidJS (TypeScript) + Vite 7
- Tailwind CSS v4 via `@tailwindcss/vite`
- Node 18+ recommended

## Dev Workflow
- Install: `pnpm install`
- Develop: `pnpm dev` then open http://localhost:3000
- Build: `pnpm build`
- Preview: `pnpm serve`

## Project Structure
- `src/components`: UI primitives and composite components
- `src/data`: Seed data and lightweight fixtures
- `src/types`: Shared TypeScript types
- `src/index.tsx`: App bootstrap
- `src/App.tsx`: Home page with search/filter

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
- Types in `src/types/pokemon.ts`.
- Seed data in `src/data/pokemon.ts` (sprites from public PokeAPI repository).
- If integrating live PokeAPI:
  - Create `src/services/pokeapi.ts` with typed fetch helpers.
  - Add basic caching and error handling; avoid exceeding rate limits.

## Performance
- Use `<For>` for larger lists and avoid expensive derived computations in render.
- Use `loading="lazy"` for images and keep sprites small.

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
- Locale files live at `apps/web/public/locales/<locale>/common.json`.
  - Current locales: `en`, `fr`, `jp` (mapped to HTML lang `ja`).
- Initialization: `initI18n()` runs in `apps/web/src/index.tsx`.
  - Order: localStorage `locale` → navigator language (`fr*` → `fr`, `ja*` → `jp`) → fallback `en`.
  - Persists selection in localStorage and updates `<html lang>`.
- Usage in code:
  - Import `t` from `apps/web/src/i18n`: `import { t } from '../i18n'` (adjust path).
  - Replace UI literals with `t('key')` or templated `t('list.filter', { name: 'Pokémon' })`.
  - Resource labels use `t` via `resourceLabel()` in `apps/web/src/services/data.ts`.
- Language switcher:
  - Component: `apps/web/src/components/LanguageSwitcher.tsx` (in Navbar on desktop).
  - To add a new language, add `public/locales/<code>/common.json` and extend the switcher’s options.
- Keys & style:
  - Dot‑separated keys: `section.subsection.name` (e.g., `nav.pokemon`, `search.placeholder`).
  - Keep values plain strings; use `{placeholder}` for template variables.
  - Avoid embedding HTML in translations; compose UI elements around translated strings instead.
- Localized data (future):
  - PokeAPI exposes localized `names`/`flavor_text_entries` per language. Extend the scraper to build per‑locale search indices (`search-index.<locale>.json`) and prefer localized fields when available.

## Trademark Notice
Pokémon and Pokémon character names are trademarks of Nintendo. This project is a fan-made database for educational/demo purposes.
