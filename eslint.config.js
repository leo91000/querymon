import antfu from '@antfu/eslint-config';

export default antfu({
    typescript: true,
    solid: true,
    stylistic: {
        // Project preference: 4 spaces and semicolons
        indent: 4,
        semi: true,
    },
    ignores: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        'apps/web/public/**',
        'apps/desktop/src-tauri/target/**',
        'var/**',
        'pnpm-workspace.yaml',
        '**/*.json',
    ],
});
