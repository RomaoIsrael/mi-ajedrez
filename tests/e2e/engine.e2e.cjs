/**
 * Prueba E2E de la Fase 6 (Stockfish): motor en Web Worker, robot de nivel 8, pista con el
 * motor, análisis con clasificación y gráfica, y «¿Qué pasaba si…?».
 * Requisitos: `npm start` en otra terminal. Uso: node tests/e2e/engine.e2e.cjs
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:5173/apps/web-prototype/';
const idx = (n) => (n.charCodeAt(1) - 49) * 8 + n.charCodeAt(0) - 97;
const sq = (n) => `.sq[data-sq="${idx(n)}"]`;

function check(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log(`  ✓ ${msg}`);
}

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await browser.newPage({ viewport: { width: 420, height: 1100 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(BASE);
  const now = Date.now();
  await p.evaluate((now) => localStorage.setItem('kavalo.profile.v1', JSON.stringify({
    onboarded: true, name: 'Ana', settings: { reduceMotion: true },
    completedLessons: ['board', 'rook', 'bishop', 'queen-king', 'knight', 'pawn', 'checkmate', 'special'],
    games: [{ id: 'gblunder', at: now - 3600_000, pgn: '[White "Leo"]\n[Black "Ana"]\n\n1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0', userColor: 'b', bot: { personality: 'leo', level: 3 }, result: '1-0', reason: 'checkmate', userResult: 'loss', timeControl: 'none', hintsUsed: 0 }],
  })), now);
  await p.goto(BASE + '#/settings');
  await p.reload();
  await p.waitForFunction(() => document.body.innerText.includes('Stockfish 19') && document.body.innerText.includes('listo'), null, { timeout: 30000 });
  check(true, 'Stockfish 19 carga en un Web Worker');

  // Robot de nivel 8 (Stockfish limitado por Elo)
  await p.goto(BASE + '#/play');
  await p.waitForSelector('.engine-status');
  check((await p.locator('.engine-status').innerText()).includes('niveles 1–10'), 'niveles 1–10 disponibles con el motor');
  await p.click('.seg-btn:text-is("8")');
  await p.click('text=JUGAR');
  await p.click(sq('e2')); await p.click(sq('e4'));
  await p.waitForFunction(() => !document.body.innerText.includes('está pensando'), null, { timeout: 15000 });
  const blackMoved = await p.evaluate(() => document.querySelectorAll('.movelist .mv').length);
  check(blackMoved === 2, 'el robot de nivel 8 responde con Stockfish');
  await p.click('text=Pista');
  await p.waitForSelector('.hints li');
  check((await p.locator('.hints li').count()) === 1, 'la pista 1 aparece (sugerencia respaldada por el motor)');

  // Análisis con motor
  await p.goto(BASE + '#/analysis/gblunder');
  await p.waitForSelector('.eval-chart', { timeout: 60000 });
  check(true, 'análisis con Stockfish: gráfica de la partida');
  const text = await p.locator('main').innerText();
  check(/Error grave/.test(text) || /\?\?/.test(text), 'la jugada Cf6 se clasifica como error grave');
  check(/Permites jaque mate/.test(text), 'la explicación usa la causa táctica (permitir mate)');
  const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('kavalo.profile.v1')).games[0]);
  check(stored.evals && stored.evals.length === 8 && stored.engineRecorded, 'las evaluaciones se guardan con la partida');

  // ¿Qué pasaba si…? (posición antes de 3…Cf6: probar 3…g6)
  await p.click(sq('g7')); await p.click(sq('g6'));
  await p.waitForSelector('text=¿Y si jugabas', { timeout: 20000 });
  const whatIf = await p.locator('.whatif').innerText();
  check(/Continuación probable/.test(whatIf), `«¿Qué pasaba si…?» muestra la continuación del motor`);

  // Hover de la gráfica
  const box = await p.locator('.eval-chart').boundingBox();
  await p.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
  check(!(await p.locator('.chart-tip').isHidden()), 'la gráfica muestra un tooltip al pasar el cursor');

  check(errors.length === 0, `sin errores de JavaScript${errors.length ? `: ${errors.join('; ')}` : ''}`);
  await browser.close();
})().catch((e) => {
  console.error(`  ✗ ${e.message}`);
  process.exit(1);
});
