/**
 * Prueba E2E de importar y exportar (brief §74–75): PGN pegado y subido, FEN, errores claros,
 * descarga de PGN, imagen PNG, estadísticas CSV y plan de entrenamiento.
 * Requisitos: `npm start` en otra terminal. Uso: node tests/e2e/import.e2e.cjs
 */
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE = process.env.BASE_URL ?? 'http://localhost:5173/apps/web-prototype/';

function check(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log(`  ✓ ${msg}`);
}

const PGN = `[Event "Torneo del club"]
[White "Ana"]
[Black "Rival"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 {Italiana} Nd4?! (3... Bc5 4. c3) 4. Nxe5 Qg5 5. Nxf7 Qxg2 6. Rf1 Qxe4+ 7. Be2 Nf3# 0-1`;

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = await browser.newContext({ viewport: { width: 420, height: 1300 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(BASE);
  await p.evaluate(() => localStorage.setItem('kavalo.profile.v1', JSON.stringify({ onboarded: true, name: 'Ana', settings: { reduceMotion: true } })));
  await p.goto(BASE + '#/progress');
  await p.reload();
  await p.click('text=Importar partida (PGN)');

  // Error claro
  await p.fill('textarea', '1. e4 e5 2. Ke3');
  await p.click('text=COMPROBAR');
  check(/Jugada ilegal o no reconocida en el PGN: Ke3/.test(await p.locator('.msg-bad').innerText()), 'un PGN ilegal muestra un error claro');

  // FEN
  await p.fill('textarea', '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1');
  await p.click('text=COMPROBAR');
  check(/Posición válida · juegan blancas/.test(await p.locator('main').innerText()), 'una FEN se reconoce y se muestra');
  const [img] = await Promise.all([p.waitForEvent('download'), p.click('text=Descargar imagen (PNG)')]);
  const imgPath = path.join(os.tmpdir(), 'kavalo-pos.png');
  await img.saveAs(imgPath);
  const head = fs.readFileSync(imgPath).subarray(0, 8).toString('hex');
  check(head === '89504e470d0a1a0a' && fs.statSync(imgPath).size > 5000, 'la posición se exporta como imagen PNG');
  await p.click('text=JUGAR DESDE AQUÍ CONTRA LA IA');
  await p.waitForSelector('text=Empezarás desde la posición importada');
  await p.click('text=JUGAR');
  await p.waitForSelector('.board');
  check(await p.locator('.board img.piece').count() === 3, 'se juega desde la FEN importada');

  // PGN subido como archivo (con variantes, comentarios y anotaciones)
  await p.goto(BASE + '#/import');
  const pgnPath = path.join(os.tmpdir(), 'kavalo-test.pgn');
  fs.writeFileSync(pgnPath, PGN);
  await p.setInputFiles('input[type=file]', pgnPath);
  await p.waitForSelector('text=Partida válida');
  check(/14 medias jugadas/.test(await p.locator('main').innerText()), 'PGN con variantes y comentarios: se lee la línea principal');
  check(await p.locator('.seg-btn.on:text("Blancas (Ana)")').count() === 1, 'detecta el color del usuario por su nombre');
  await p.click('text=IMPORTAR Y ANALIZAR');
  await p.waitForURL(/#\/analysis\//);
  await p.waitForSelector('h1.screen-title');
  const title = await p.locator('h1.screen-title').innerText();
  check(/Derrota/.test(title), `la partida importada se analiza (${title.split('·')[0].trim()})`);
  const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('kavalo.profile.v1')));
  check(stored.games.length === 1 && stored.games[0].mode === 'import' && stored.games[0].result === '0-1' && stored.gameRating === 400, 'se guarda como importada (el resultado del tablero manda sobre la etiqueta) y no cambia el rating');

  // Exportar desde el análisis
  await p.click('summary:text("Exportar")');
  const [pgnDl] = await Promise.all([p.waitForEvent('download'), p.click('text=Descargar PGN')]);
  const out = fs.readFileSync(await pgnDl.path(), 'utf8');
  check(/\[White "Ana"\]/.test(out) && /Nf3#/.test(out), 'el PGN se descarga');
  await p.click('text=Copiar FEN de la posición mostrada');
  check(/FEN: \S+\/\S+ [wb] /.test(await p.locator('.fen-note').innerText()), 'la FEN de la posición mostrada se exporta');

  // Estadísticas y plan
  await p.goto(BASE + '#/progress');
  const [csv] = await Promise.all([p.waitForEvent('download'), p.click('text=Exportar estadísticas (CSV)')]);
  const csvText = fs.readFileSync(await csv.path(), 'utf8');
  check(csvText.startsWith('fecha,modo,color') && csvText.trim().split('\n').length === 2, 'estadísticas en CSV (una fila por partida)');
  const [plan] = await Promise.all([p.waitForEvent('download'), p.click('text=Exportar plan de entrenamiento (.md)')]);
  check(/^# Plan de entrenamiento de Ana/.test(fs.readFileSync(await plan.path(), 'utf8')), 'plan de entrenamiento en Markdown');

  check(errors.length === 0, `sin errores de JavaScript${errors.length ? `: ${errors.join('; ')}` : ''}`);
  await browser.close();
})().catch((e) => {
  console.error(`  ✗ ${e.message}`);
  process.exit(1);
});
