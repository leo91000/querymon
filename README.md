## QueryMon — Solid + Tailwind scaffold

This is a minimal Pokémon database scaffold built with Solid (TypeScript), Vite, and Tailwind CSS.

### Install

```bash
npm install # or pnpm install
```

### Develop

```bash
npm run dev
# open http://localhost:3000
```

### Build

```bash
npm run build
npm run serve
```

### Structure

- `src/components`: Reusable UI primitives (Button, Card, Badge, Input, Select, Navbar, Footer, PokemonCard)
- `src/data`: Sample Pokémon seed data
- `src/types`: Shared TypeScript types

Tailwind is configured via `@tailwindcss/vite` (Tailwind v4). Global styles live in `src/index.css`.
