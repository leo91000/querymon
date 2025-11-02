import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
const allDeps = [
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.devDependencies || {}),
];

const external = [
    // Node built-ins
    /^node:.*/,
    // Each package: exact match + sub-paths
    ...allDeps.flatMap(dep => [
        dep,
        new RegExp(`^${dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\/.*`),
    ]),
];

export default defineConfig({
    plugins: [
        dts({
            include: ['src/**/*.ts'],
            outDir: 'dist',
        }),
    ],
    build: {
        lib: {
            entry: './src/index.ts',
            formats: ['es'],
            fileName: 'index',
        },
        rollupOptions: {
            external,
        },
        outDir: 'dist',
        emptyOutDir: true,
    },
});
