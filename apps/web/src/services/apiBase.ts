const SLASH_TRIMMER = /\/+$/;

function normalize(url: string): string {
    return url.replace(SLASH_TRIMMER, '');
}

function inferDevBase(): string {
    if (typeof window === 'undefined')
        return '';
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
    const host = window.location.hostname || 'localhost';
    const portEnv = import.meta.env.VITE_API_DEV_PORT;
    const port = (typeof portEnv === 'string' && portEnv.trim()) ? portEnv.trim() : '8787';
    return `${protocol}://${host}:${port}`;
}

function inferDefaultBase(): string {
    const rawEnvBase = import.meta.env.VITE_API_BASE;
    if (typeof rawEnvBase === 'string' && rawEnvBase.trim())
        return rawEnvBase;
    if (import.meta.env.DEV)
        return inferDevBase();
    if (typeof window !== 'undefined')
        return window.location.origin;
    return '';
}

export function getApiBase(): string {
    const base = inferDefaultBase();
    return base ? normalize(base) : '';
}
