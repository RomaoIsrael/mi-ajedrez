/**
 * Prueba E2E del prototipo con Playwright.
 * Requisitos: `npm start` en otra terminal (sirve en http://localhost:5173) y Playwright disponible.
 * Uso: node tests/e2e/prototype.e2e.cjs   (BASE_URL y CHROMIUM_PATH son opcionales)
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:5173/apps/web-prototype/';
const sq = (n) => `.sq[data-sq="${(n.charCodeAt(1) - 49) * 8 + n.charCodeAt(0) - 97}"]`;

function check(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log(`  ✓ ${msg}`);
}

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await browser.newPage({ viewport: { width: 420, height: 1000 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));

  // Onboarding
  await p.goto(BASE);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.click('.splash');
  await p.click('text=Nunca');
  await p.fill('input.input', 'Lucía');
  await p.click('text=Continuar');
  await p.click('text=Aprender desde cero');
  await p.click('text=20 minutos');
  await p.click('text=Mentor — Calmado y reflexivo');
  await p.waitForSelector('.greet');
  check((await p.locator('.greet').innerText()).includes('Lucía'), 'onboarding completo y saludo personalizado');

  // Lección del tablero (con un error deliberado)
  await p.click('text=CONTINUAR ENTRENAMIENTO');
  await p.click('text=Continuar'); await p.click('text=Continuar');
  await p.click(sq('d5')); await p.click('text=Continuar');
  await p.click(sq('a1'));
  check(await p.locator('.msg-bad').count() === 1, 'la lección corrige una casilla equivocada');
  await p.click(sq('b7')); await p.click('text=Continuar');
  await p.click('text=Clara'); await p.click('text=Continuar');
  await p.click('text=Continuar');
  await p.waitForSelector('text=¡Lección completada!');
  check(true, 'lección completada');

  // Partida: un error claro recibe explicación completa y se puede reintentar
  await p.goto(BASE + '#/play');
  await p.click('.seg-btn:text-is("1")');
  await p.click('text=JUGAR');
  await p.click(sq('e2')); await p.click(sq('e4'));
  await p.waitForFunction(() => !document.body.innerText.includes('está pensando'), null, { timeout: 15000 });
  await p.waitForTimeout(200);
  await p.click(sq('f1')); await p.click(sq('a6'));
  await p.waitForSelector('.exp-title');
  const exp = await p.locator('.game-coach').innerText();
  check(exp.includes('Tu alfil quedó sin defensa') && exp.includes('Por qué') && exp.includes('Cómo evitarlo'), 'explicación del error: qué, por qué, consecuencia y cómo evitarlo');
  await p.click('text=Intentar de nuevo');
  check(await p.locator(`${sq('f1')} img`).count() === 1, '«Intentar de nuevo» deshace la jugada');

  // Puzzle (se fija el del alfil gratis marcando los demás como resueltos)
  await p.evaluate(async () => {
    const { PUZZLES } = await import('/packages/content/dist/index.js');
    const prof = JSON.parse(localStorage.getItem('kavalo.profile.v1'));
    prof.solvedPuzzles = PUZZLES.map((z) => z.id).filter((id) => id !== 'p-free-bishop');
    localStorage.setItem('kavalo.profile.v1', JSON.stringify(prof));
  });
  await p.goto(BASE + '#/puzzles');
  await p.reload();
  await p.waitForSelector('.puzzle-prompt');
  await p.click(sq('e2')); await p.click(sq('b5'));
  await p.waitForSelector('text=SIGUIENTE');
  check((await p.locator('.msg-good').first().innerText()).startsWith('¡Correcto!'), 'puzzle resuelto y rating actualizado');

  for (const route of ['learn', 'progress', 'dna', 'settings', 'plan']) {
    await p.goto(`${BASE}#/${route}`);
    await p.waitForSelector('.screen');
  }
  check(errors.length === 0, `sin errores de JavaScript${errors.length ? `: ${errors.join('; ')}` : ''}`);
  await browser.close();
})().catch((e) => {
  console.error(`  ✗ ${e.message}`);
  process.exit(1);
});
