import { Router } from '@solidjs/router';
import { QueryClientProvider } from '@tanstack/solid-query';
import { render } from 'solid-js/web';
import App from './App';
import { initI18n } from './i18n';
import { initQueryPersistence, queryClient } from './queryClient';
import { initTheme } from './theme';
/* @refresh reload */
import './index.css';
import 'solid-devtools';

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
            if (m?.buildId)
                buildId = String(m.buildId);
        }
    }
    catch { }
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
