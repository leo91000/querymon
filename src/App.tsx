import type { Component } from 'solid-js';
import { Route } from '@solidjs/router';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ResourceList from './pages/ResourceList';
import ResourceDetail from './pages/ResourceDetail';

const App: Component = () => {
  return (
    <div class="min-h-dvh bg-gray-50 text-gray-900">
      <Navbar />
      <main class="mx-auto max-w-6xl px-4 py-6">
          <Route path="/" component={Home} />
          <Route path="/pokemon" component={() => <ResourceList resource="pokemon" />} />
          <Route path="/pokemon/:id" component={() => <ResourceDetail resource="pokemon" />} />
          <Route path="/pokemon-species" component={() => <ResourceList resource="pokemon-species" />} />
          <Route path="/pokemon-species/:id" component={() => <ResourceDetail resource="pokemon-species" />} />
          <Route path="/move" component={() => <ResourceList resource="move" />} />
          <Route path="/move/:id" component={() => <ResourceDetail resource="move" />} />
          <Route path="/ability" component={() => <ResourceList resource="ability" />} />
          <Route path="/ability/:id" component={() => <ResourceDetail resource="ability" />} />
          <Route path="/type" component={() => <ResourceList resource="type" />} />
          <Route path="/type/:id" component={() => <ResourceDetail resource="type" />} />
          <Route path="/evolution-chain" component={() => <ResourceList resource="evolution-chain" />} />
          <Route path="/evolution-chain/:id" component={() => <ResourceDetail resource="evolution-chain" />} />
      </main>
      <Footer />
    </div>
  );
};

export default App;
