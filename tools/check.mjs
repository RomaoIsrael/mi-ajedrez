/**
 * Comprobaciones de calidad sin dependencias (docs/17-calidad.md §4). Uso: npm run check
 * - presupuesto de tamaño de la app (sin contar Stockfish);
 * - integridad de Stockfish (SHA-256) y presencia de su licencia GPLv3;
 * - cada paquete tiene pruebas;
 * - contenido coherente (ids únicos, conceptos existentes);
 * - ningún identificador de modelo de IA en el código ni en la documentación.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const failures = [];
const ok = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => { failures.push(msg); console.log(`  ✗ ${msg}`); };

function walk(dir, filter = () => true, out = []) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.git', 'dist'].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
}

// 1. Presupuesto de tamaño: JS compilado de la app y de los paquetes (sin el motor).
const dists = [join(ROOT, 'apps/web-prototype/dist'), ...readdirSync(join(ROOT, 'packages')).map((p) => join(ROOT, 'packages', p, 'dist'))];
let bytes = 0;
for (const d of dists) if (existsSync(d)) for (const f of walk(d, (p) => p.endsWith('.js'))) bytes += statSync(f).size;
const css = statSync(join(ROOT, 'apps/web-prototype/styles.css')).size;
const BUDGET = 1200 * 1024;
if (!bytes) fail('no hay JS compilado: ejecuta npm run build antes');
else if (bytes + css > BUDGET) fail(`la app ocupa ${Math.round((bytes + css) / 1024)} KB (presupuesto ${BUDGET / 1024} KB)`);
else ok(`tamaño de la app: ${Math.round((bytes + css) / 1024)} KB de JS+CSS sin comprimir (presupuesto ${BUDGET / 1024} KB; Stockfish aparte)`);

// 2. Stockfish: integridad y licencia.
const readme = readFileSync(join(ROOT, 'vendor/stockfish/README.md'), 'utf8');
for (const f of ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']) {
  const hash = createHash('sha256').update(readFileSync(join(ROOT, 'vendor/stockfish', f))).digest('hex');
  if (readme.includes(hash.slice(0, 16))) ok(`${f}: SHA-256 coincide con el registrado`);
  else fail(`${f}: SHA-256 ${hash.slice(0, 16)}… no coincide con vendor/stockfish/README.md`);
}
if (existsSync(join(ROOT, 'vendor/stockfish/COPYING.txt'))) ok('licencia GPLv3 de Stockfish incluida');
else fail('falta vendor/stockfish/COPYING.txt');

// 3. Cada paquete tiene pruebas.
for (const p of readdirSync(join(ROOT, 'packages'))) {
  const t = join(ROOT, 'packages', p, 'test');
  if (existsSync(t) && readdirSync(t).some((f) => f.endsWith('.test.mjs'))) ok(`packages/${p} tiene pruebas`);
  else fail(`packages/${p} no tiene pruebas`);
}

// 4. Contenido coherente.
const content = await import(join(ROOT, 'packages/content/dist/index.js'));
const conceptIds = new Set(content.SECTIONS.flatMap((s) => s.nodes.map((n) => n.id)));
const uniq = (name, ids) => (new Set(ids).size === ids.length ? ok(`${name}: ids únicos (${ids.length})`) : fail(`${name}: ids repetidos`));
uniq('lecciones', content.LESSONS.map((l) => l.id));
uniq('puzzles', content.PUZZLES.map((p) => p.id));
uniq('aperturas', content.OPENINGS.map((o) => o.id));
uniq('posiciones', content.START_POSITIONS.map((p) => p.id));
uniq('partidas históricas', content.HISTORICAL_GAMES.map((g) => g.id));
uniq('test inicial', content.ASSESSMENT.map((a) => a.id));
const refs = [...content.LESSONS.map((l) => l.conceptId), ...content.PUZZLES.map((p) => p.concept), ...content.START_POSITIONS.map((p) => p.concept),
  ...content.HISTORICAL_GAMES.flatMap((g) => g.moments.map((m) => m.concept)), ...content.ASSESSMENT.map((a) => a.concept)];
const missing = [...new Set(refs.filter((c) => !conceptIds.has(c)))];
if (missing.length) fail(`conceptos inexistentes: ${missing.join(', ')}`);
else ok(`todos los conceptos referenciados existen (${refs.length} referencias)`);

// 5. Sin identificadores de modelos de IA en código y documentación.
const pattern = /claude-(opus|sonnet|haiku|fable)|\b(opus|sonnet) [0-9]/i;
const files = walk(ROOT, (p) => /\.(ts|mjs|cjs|js|md|json|html|css|yml)$/.test(p) && !p.includes('vendor/'));
const hits = files.filter((f) => pattern.test(readFileSync(f, 'utf8'))).map((f) => relative(ROOT, f));
if (hits.length) fail(`identificadores de modelo en: ${hits.join(', ')}`);
else ok(`sin identificadores de modelo en ${files.length} archivos`);

if (failures.length) {
  console.log(`\n${failures.length} comprobaciones fallidas`);
  process.exit(1);
}
console.log('\nTodas las comprobaciones de calidad pasan.');
