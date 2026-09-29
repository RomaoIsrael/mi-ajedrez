/**
 * Prueba E2E de modos de partida y controles de tiempo (brief §60–61): partida libre entre
 * dos jugadores, desde un final con objetivo, desde apertura, educativa y reloj personalizado.
 * Requisitos: `npm start` en otra terminal. Uso: node tests/e2e/modes.e2e.cjs
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
  const p = await browser.newPage({ viewport: { width: 420, height: 1200 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('dialog', (d) => d.accept());
  await p.goto(BASE);
  await p.evaluate(() => localStorage.setItem('kavalo.profile.v1', JSON.stringify({
    onboarded: true, name: 'Ana', settings: { reduceMotion: true }, gameRating: 900,
    completedLessons: ['board', 'rook', 'bishop', 'queen-king', 'knight', 'pawn', 'checkmate', 'special'],
    games: [{ id: 'old', at: Date.now() - 86400000, pgn: '1. e4 e5 *', userColor: 'w', bot: { personality: 'nova', level: 1 }, result: '*', userResult: 'draw', timeControl: 'none', hintsUsed: 0 }],
    mistakes: [{ at: Date.now() - 86400000, gameId: 'old', kind: 'ignored-threat', concept: 'vision.threats', severity: 'mistake', fen: '8/8/8/8/8/8/8/8 w - - 0 1', uci: 'e2e4' }],
  })));
  await p.goto(BASE + '#/play');
  await p.reload();
  check(await p.locator('.mode-card').count() === 10, 'los 10 modos de partida están disponibles');
  const clocks = await p.locator('fieldset:has(legend:text("Reloj")) .seg-btn').allInnerTexts();
  check(['Sin reloj', '1+0', '3+0', '3+2', '5+0', '5+3', '10+0', '15+10', '30 min', 'Personalizado'].every((c) => clocks.includes(c)), 'todos los controles de tiempo del brief');

  // Libre: dos jugadores en el mismo dispositivo
  await p.click('.mode-card[data-mode="free"]');
  check(!(await p.locator('legend:text("Rival")').count()), 'en modo libre no hay rival robot');
  await p.click('text=JUGAR');
  await p.click(sq('e2')); await p.click(sq('e4'));
  await p.click(sq('e7')); await p.click(sq('e5'));
  check(await p.locator('.movelist .mv').count() === 2, 'modo libre: ambos bandos mueven desde el mismo dispositivo');
  check(!(await p.locator('button:text("Pista")').count()), 'modo libre: sin pistas');

  // Desde final: rey en sexta, con objetivo
  await p.goto(BASE + '#/play');
  await p.click('.mode-card[data-mode="endgame"]');
  await p.selectOption('select[aria-label="Posición"]', 'eg-king-sixth');
  check(/Objetivo: Corona el peón/.test(await p.locator('main').innerText()), 'el final muestra su objetivo');
  await p.click('text=JUGAR');
  check(/🎯 Corona el peón/.test(await p.locator('.goal-banner').innerText()), 'el objetivo queda visible durante la partida');
  check(await p.locator(`${sq('e6')} img.piece`).count() === 1, 'la partida empieza desde la posición del final');

  // Desde apertura: la línea principal ya está jugada
  await p.goto(BASE + '#/play');
  await p.click('.mode-card[data-mode="opening"]');
  await p.selectOption('select[aria-label="Apertura"]', 'italian');
  await p.click('text=JUGAR');
  check(await p.locator('.movelist .mv').count() === 12, 'desde apertura: la línea principal de la Italiana está jugada');

  // Educativa: objetivo según el error más frecuente
  await p.goto(BASE + '#/play');
  await p.click('.mode-card[data-mode="educational"]');
  check(/Objetivo: termina la partida sin «no detectar amenazas»/.test(await p.locator('main').innerText()), 'educativa: objetivo basado en el error más frecuente');

  // Reloj personalizado
  await p.click('.mode-card[data-mode="training"]');
  await p.click('.seg-btn:text("Personalizado")');
  await p.fill('input[aria-label="Minutos"]', '7');
  await p.dispatchEvent('input[aria-label="Minutos"]', 'change');
  await p.fill('input[aria-label="Incremento (s)"]', '4');
  await p.dispatchEvent('input[aria-label="Incremento (s)"]', 'change');
  await p.click('.seg-btn:text-is("Blancas")');
  await p.click('text=JUGAR');
  await p.waitForFunction(() => [...document.querySelectorAll('.clock')].some((c) => /\d:\d\d/.test(c.textContent)), null, { timeout: 5000 });
  const shown = await p.locator('.clock').allInnerTexts();
  check(shown.some((t) => /^(7:00|6:5\d)$/.test(t)), `reloj personalizado de 7 minutos (${shown.join(' / ')})`);

  check(errors.length === 0, `sin errores de JavaScript${errors.length ? `: ${errors.join('; ')}` : ''}`);
  await browser.close();
})().catch((e) => {
  console.error(`  ✗ ${e.message}`);
  process.exit(1);
});
