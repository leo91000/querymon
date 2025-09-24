/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web';
import 'solid-devtools';
import { Router } from '@solidjs/router';
import { QueryClientProvider } from '@tanstack/solid-query';
import App from './App';
import { initI18n } from './i18n';
import { initTheme } from './theme';
import { queryClient, initQueryPersistence } from './queryClient';

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

async function bootstrap() {
  initI18n();
  initTheme();
  let buildId = 'dev';
  try {
    const res = await fetch('/data/pokeapi/build.json', { cache: 'no-store' });
    if (res.ok) {
      const m = await res.json();
      if (m?.buildId) buildId = String(m.buildId);
    }
  } catch {}
  await initQueryPersistence(buildId);

  render(() => (
    <QueryClientProvider client={queryClient}>
      <Router>
        <App />
      </Router>
    </QueryClientProvider>
  ), root!);
}

bootstrap();
