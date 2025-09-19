import type { Component } from 'solid-js';
import { Route } from '@solidjs/router';
import Home from './pages/Home';
import ResourceList from './pages/ResourceList';
import ResourceDetail from './pages/ResourceDetail';
import MainLayout from './layouts/MainLayout';

const App: Component = () => {
  return (
    <>
      <Route path="/" component={MainLayout}>
        <Route path="/" component={Home} />
        <Route path="pokemon" component={() => <ResourceList resource="pokemon" />} />
        <Route path="pokemon/:id" component={() => <ResourceDetail resource="pokemon" />} />
        {/** species routes removed; species now served under /pokemon */}
        <Route path="move" component={() => <ResourceList resource="move" />} />
        <Route path="move/:id" component={() => <ResourceDetail resource="move" />} />
        <Route path="ability" component={() => <ResourceList resource="ability" />} />
        <Route path="ability/:id" component={() => <ResourceDetail resource="ability" />} />
        <Route path="type" component={() => <ResourceList resource="type" />} />
        <Route path="type/:id" component={() => <ResourceDetail resource="type" />} />
        <Route path="evolution-chain" component={() => <ResourceList resource="evolution-chain" />} />
        <Route path="evolution-chain/:id" component={() => <ResourceDetail resource="evolution-chain" />} />
      </Route>
    </>
  );
};

export default App;
