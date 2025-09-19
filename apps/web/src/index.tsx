/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web';
import 'solid-devtools';
import { Router } from '@solidjs/router';
import App from './App';
import { initI18n } from './i18n';
import { initTheme } from './theme';

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

initI18n();
initTheme();

render(() => (
  <Router>
    <App />
  </Router>
), root!);
