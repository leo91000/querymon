import type { Component } from 'solid-js';
import { For, createMemo, createSignal } from 'solid-js';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Input from './components/Input';
import Select from './components/Select';
import PokemonCard from './components/PokemonCard';
import Card from './components/Card';
import { POKEMON, POKEMON_TYPES } from './data/pokemon';

const App: Component = () => {
  const [query, setQuery] = createSignal('');
  const [type, setType] = createSignal<string>('');

  const filtered = createMemo(() => {
    const q = query().toLowerCase().trim();
    const t = type();
    return POKEMON.filter((p) => {
      const nameMatch = q.length === 0 || p.name.toLowerCase().includes(q);
      const typeMatch = !t || p.types.includes(t as any);
      return nameMatch && typeMatch;
    });
  });

  return (
    <div class="min-h-dvh bg-gray-50 text-gray-900">
      <Navbar />
      <main class="mx-auto max-w-6xl px-4 py-8">
        <Card class="mb-6">
          <div class="flex flex-col gap-4 md:flex-row md:items-end">
            <Input
              id="search"
              label="Search"
              placeholder="Search Pokémon by name…"
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
            />
            <Select
              id="type"
              label="Type"
              value={type()}
              onChange={(e) => setType(e.currentTarget.value)}
              options={[{ label: 'All Types', value: '' }, ...POKEMON_TYPES.map((t) => ({ label: t, value: t }))]}
            />
          </div>
        </Card>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <For each={filtered()}>{(p) => <PokemonCard pokemon={p} />}</For>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
