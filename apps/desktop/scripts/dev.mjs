import { spawn } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';

const env = { ...process.env };

if (process.platform === 'linux') {
    env.GIO_USE_PROXY_RESOLVER = env.GIO_USE_PROXY_RESOLVER ?? 'none';
    env.WEBKIT_DISABLE_DMABUF_RENDERER = env.WEBKIT_DISABLE_DMABUF_RENDERER ?? '1';
    const emptyDir = '/tmp/querymon-gio-empty';
    try {
        await fs.promises.mkdir(emptyDir, { recursive: true });
    }
    catch {
    // best-effort; ignore if we can't prepare the folder
    }
    env.GIO_MODULE_DIR = env.GIO_MODULE_DIR ?? emptyDir;
}

const child = spawn('tauri', ['dev'], {
    stdio: 'inherit',
    env,
    shell: true,
});

child.on('exit', (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
    }
    else {
        process.exit(code ?? 0);
    }
});
