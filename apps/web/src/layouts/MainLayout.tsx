import type { JSX } from 'solid-js';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function MainLayout(props: { children: JSX.Element }) {
  return (
    <div class="min-h-dvh bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <Navbar />
      <main class="mx-auto max-w-6xl px-4 py-6">{props.children}</main>
      <Footer />
    </div>
  );
}
