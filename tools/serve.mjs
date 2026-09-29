/** Servidor estático mínimo (sin dependencias) para el prototipo. Uso: node tools/serve.mjs [puerto] */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 5173);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json', '.md': 'text/markdown; charset=utf-8', '.json': 'application/json', '.map': 'application/json', '.png': 'image/png',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let path = normalize(join(ROOT, decodeURIComponent(url.pathname)));
    if (!path.startsWith(ROOT)) throw Object.assign(new Error('forbidden'), { code: 403 });
    if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch (e) {
    res.writeHead(e.code === 403 ? 403 : 404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(e.code === 403 ? 'Prohibido' : 'No encontrado');
  }
}).listen(PORT, () => console.log(`Kavalo: http://localhost:${PORT}/apps/web-prototype/`));
