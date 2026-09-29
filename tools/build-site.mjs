/**
 * Copia en una carpeta solo lo que necesita la web publicada (docs/18-publicacion.md §2):
 * index.html raíz, la app, el JS compilado de los paquetes, los recursos y Stockfish con su
 * licencia. Uso: npm run build && node tools/build-site.mjs _site
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const OUT = resolve(ROOT, process.argv[2] ?? '_site');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const copy = (rel, filter) => cpSync(join(ROOT, rel), join(OUT, rel), { recursive: true, filter });

copy('index.html');
copy('apps/web-prototype', (src) => !/[\\/](src|test)([\\/]|$)/.test(src) && !src.endsWith('tsconfig.json') && !src.endsWith('.tsbuildinfo'));
for (const p of readdirSync(join(ROOT, 'packages'))) {
  if (existsSync(join(ROOT, 'packages', p, 'dist'))) copy(`packages/${p}/dist`, (src) => !src.endsWith('.d.ts') && !src.endsWith('.map'));
}
copy('assets');
copy('vendor/stockfish');
for (const f of ['NOTICE.md', 'PRIVACY.md', 'README.md']) if (existsSync(join(ROOT, f))) copy(f);
// GitHub Pages: sin procesado Jekyll (respeta carpetas y archivos tal cual).
writeFileSync(join(OUT, '.nojekyll'), '');
console.log(`Sitio listo en ${OUT}`);
