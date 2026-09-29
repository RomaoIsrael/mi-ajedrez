/**
 * Prueba E2E de la Fase 9 (ADN): las partidas sin analizar se revisan en segundo plano con
 * Stockfish, se miden sus rasgos y el ADN deja de estar «en construcción»; radar antes → ahora,
 * intervalos, estilo, aperturas sugeridas y reporte mensual.
 * Requisitos: `npm start` en otra terminal. Uso: node tests/e2e/dna.e2e.cjs
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:5173/apps/web-prototype/';

function check(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log(`  ✓ ${msg}`);
}

(async () => {
  // Seis partidas reales (robots de niveles distintos) para alimentar el ADN.
  const { Game } = await import('../../packages/chess-core/dist/index.js');
  const { chooseMove } = await import('../../packages/bots/dist/index.js');
  const now = Date.now();
  const games = Array.from({ length: 6 }, (_, i) => {
    const g = new Game();
    let seed = i + 1;
    const random = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
    for (let ply = 0; ply < 36 && !g.status().over; ply++) {
      const { move: m } = chooseMove(g.position, { level: ply % 2 === 0 ? 4 : 2, personality: 'nova', random });
      g.move({ from: m.from, to: m.to, promotion: m.promotion });
    }
    return {
      id: `g${i}`, at: now - (6 - i) * 86_400_000, pgn: g.pgn({ White: 'Ana', Black: 'Nova' }), userColor: 'w',
      bot: { personality: 'nova', level: 2 }, result: '*', userResult: i % 3 ? 'win' : 'draw', timeControl: '10+0', hintsUsed: 0,
      moveTimes: Array.from({ length: 18 }, (_, k) => 2000 + ((k * 7919 + i) % 9) * 1500),
      clockFractions: Array.from({ length: 18 }, (_, k) => 1 - k * 0.03),
    };
  });

  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await browser.newPage({ viewport: { width: 420, height: 1400 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(BASE);
  await p.evaluate(({ games }) => localStorage.setItem('kavalo.profile.v1', JSON.stringify({
    onboarded: true, name: 'Ana', settings: { reduceMotion: true },
    completedLessons: ['board', 'rook', 'bishop', 'queen-king', 'knight', 'pawn', 'checkmate', 'special'], games,
  })), { games });
  await p.goto(BASE + '#/dna');
  await p.reload();
  check((await p.locator('main').innerText()).includes('Perfil en construcción'), 'sin partidas analizadas, el ADN está en construcción (con ejemplo)');
  check(await p.locator('.badge:text("Ejemplo")').isVisible(), 'el ejemplo se marca como tal');

  await p.waitForFunction(() => JSON.parse(localStorage.getItem('kavalo.profile.v1')).games.every((g) => g.features),
    null, { timeout: 240000, polling: 2000 });
  const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('kavalo.profile.v1')));
  check(stored.games.every((g) => g.evals && g.engineRecorded), 'las 6 partidas se analizan en segundo plano con Stockfish');
  check(stored.games[0].features.avgMoveMs > 0, 'los rasgos incluyen el tiempo por jugada');
  check(stored.dnaSnapshots.length === 1, 'se guarda la primera instantánea del ADN');

  // Instantánea antigua para ver la evolución «antes → ahora».
  await p.evaluate(() => {
    const prof = JSON.parse(localStorage.getItem('kavalo.profile.v1'));
    const old = JSON.parse(JSON.stringify(prof.dnaSnapshots[0]));
    old.at = Date.now() - 28 * 86_400_000;
    old.dims = old.dims.map((d) => d.value === null ? d : { ...d, value: Math.max(0, d.value - 30), low: Math.max(0, d.value - 34), high: Math.max(0, d.value - 26) });
    prof.dnaSnapshots.unshift(old);
    localStorage.setItem('kavalo.profile.v1', JSON.stringify(prof));
  });
  await p.reload();
  const text = await p.locator('main').innerText();
  check(/Basado en tus últimas 6 partidas analizadas con Stockfish/.test(text), 'el ADN indica cuántas partidas analizadas usa');
  check(await p.locator('.radar-before').count() === 1 && /Hace 4 semanas/.test(text), 'el radar compara ahora con hace 4 semanas');
  check(await p.locator('.bars-ci li').count() === 8, 'las 8 dimensiones muestran barra con intervalo');
  check(/Evolución/.test(text) && /▲/.test(text), 'la evolución significativa se muestra');
  check(/Tipo de posiciones/.test(text) && /Actitud/.test(text), 'estilo: escalas sólido–dinámico y paciente–agresivo');
  check(await p.locator('.opening-sugg').count() >= 2, 'sugiere aperturas compatibles con el estilo');

  // Reporte mensual con la evolución del ADN
  await p.goto(BASE + '#/report/month');
  const report = await p.locator('main').innerText();
  check(/Tu mes/.test(report) && /mes anterior/.test(report), 'el reporte mensual compara con el mes anterior');
  check(/Evolución de tu ADN/.test(report), 'el reporte mensual incluye la evolución del ADN');
  await p.click('a.seg-btn:text("Semana")');
  await p.waitForSelector('h1:text("Tu semana")', { timeout: 5000 });
  check(true, 'se puede cambiar a la vista semanal');

  check(errors.length === 0, `sin errores de JavaScript${errors.length ? `: ${errors.join('; ')}` : ''}`);
  await browser.close();
})().catch((e) => {
  console.error(`  ✗ ${e.message}`);
  process.exit(1);
});
