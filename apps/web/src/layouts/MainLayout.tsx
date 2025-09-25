import type { RouteSectionProps } from '@solidjs/router';
import type { JSX } from 'solid-js';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

export default function MainLayout(props: RouteSectionProps): JSX.Element {
    return (
        <div class="min-h-dvh bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
            <Navbar />
            <main class="mx-auto max-w-6xl px-4 py-6">{props.children}</main>
            <Footer />
        </div>
    );
}
