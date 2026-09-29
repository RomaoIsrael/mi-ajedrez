/**
 * Prueba E2E de la Fase 5 (tablero): teclado, jugada escrita, navegación ◀ ▶, flechas y
 * círculos del usuario, promoción, temas de tablero y tamaño de texto.
 * Requisitos: `npm start` en otra terminal. Uso: node tests/e2e/board.e2e.cjs
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
  const botDone = () => p.waitForFunction(() => !document.body.innerText.includes('está pensando'), null, { timeout: 15000 });
  const pieceAt = async (n) => (await p.locator(`${sq(n)} img`).count()) === 1;

  await p.goto(BASE);
  const allButPromo = ['p-free-bishop', 'p-back-rank', 'p-queen-rank', 'p-king-queen', 'p-smothered', 'p-knight-fork', 'p-pawn-fork', 'p-skewer', 'p-double-attack'];
  await p.evaluate((solved) => localStorage.setItem('kavalo.profile.v1', JSON.stringify({ onboarded: true, name: 'Ana', solvedPuzzles: solved })), allButPromo);

  // 1. Teclado: e2 → e4 solo con flechas y Enter
  await p.goto(BASE + '#/play');
  await p.reload();
  await p.click('.seg-btn:text-is("1")');
  await p.click('text=JUGAR');
  await p.waitForSelector('.board-grid');
  await p.focus('.board-grid');
  await p.keyboard.press('Enter'); // el cursor empieza en e2
  await p.keyboard.press('ArrowUp');
  await p.keyboard.press('ArrowUp');
  await p.keyboard.press('Enter');
  await botDone();
  check(await pieceAt('e4') && !(await pieceAt('e2')), 'jugar e2-e4 solo con teclado');

  // 2. Jugada escrita en notación española
  await p.click('text=⌨ Escribir jugada');
  await p.fill('.move-input', 'Cf3');
  await p.keyboard.press('Enter');
  await botDone();
  check(await pieceAt('f3') && !(await pieceAt('g1')), 'jugada escrita «Cf3»');
  await p.fill('.move-input', 'Dxh8');
  await p.keyboard.press('Enter');
  check((await p.locator('.move-input-msg').innerText()).includes('No entiendo'), 'una jugada ilegal escrita se explica sin romper nada');

  // 3. Navegación ◀ ▶
  await p.click('[aria-label="Jugada anterior"]');
  await p.click('[aria-label="Jugada anterior"]');
  check(await p.locator('.review-banner').isVisible(), 'al revisar aparece el aviso «revisando una jugada anterior»');
  check(!(await pieceAt('f3')) && await pieceAt('g1'), '◀ muestra la posición anterior');
  await p.click(sq('b1')); await p.click(sq('c3'));
  check(await pieceAt('b1'), 'en modo revisión no se puede mover');
  await p.click('[aria-label="Ir a la posición actual"]');
  check(await pieceAt('f3') && !(await p.locator('.review-banner').isVisible()), '⏭ vuelve a la posición actual');

  // 4. Flechas y círculos del usuario (clic derecho)
  const center = async (n) => { const b = await p.locator(sq(n)).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  let [x1, y1] = await center('d2'); const [x2, y2] = await center('d4');
  await p.mouse.move(x1, y1); await p.mouse.down({ button: 'right' }); await p.mouse.move(x2, y2, { steps: 4 }); await p.mouse.up({ button: 'right' });
  [x1, y1] = await center('d5');
  await p.mouse.click(x1, y1, { button: 'right' });
  check(await p.locator('line.arrow-user-drawn').count() === 1 && await p.locator('circle.user-circle').count() === 1, 'flecha y círculo dibujados con clic derecho');
  await p.click(sq('a3'));
  check(await p.locator('line.arrow-user-drawn').count() === 0, 'un clic normal borra las anotaciones');
  await p.click('text=✏ Dibujar');
  [x1, y1] = await center('c2');
  const [x3, y3] = await center('c4');
  await p.mouse.move(x1, y1); await p.mouse.down(); await p.mouse.move(x3, y3, { steps: 4 }); await p.mouse.up();
  check(await p.locator('line.arrow-user-drawn').count() === 1 && await pieceAt('c2'), 'modo dibujo (táctil): arrastrar dibuja en vez de mover');

  // 5. Promoción con selector de pieza (puzzle de coronación con mate)
  await p.goto(BASE + '#/puzzles');
  await p.waitForSelector('.puzzle-prompt');
  await p.click(sq('c7')); await p.click(sq('c8'));
  await p.waitForSelector('.promo');
  check(await p.locator('.promo-btn').count() === 4, 'el selector de promoción ofrece 4 piezas');
  await p.click('[aria-label="Coronar en dama"]');
  await p.waitForSelector('text=SIGUIENTE');
  check(await p.locator(`${sq('c8')} img[src$="wQ.svg"]`).count() === 1, 'corona en dama y resuelve el puzzle con mate');

  // 6. Temas de tablero, daltonismo y tamaño de texto
  await p.goto(BASE + '#/settings');
  await p.selectOption('select[aria-label="Tema del tablero"]', 'walnut');
  const light = await p.evaluate(() => getComputedStyle(document.querySelector('.sq.light')).backgroundColor);
  check(light === 'rgb(232, 210, 176)', `tema «Nogal» aplicado (${light})`);
  await p.selectOption('select[aria-label="Colores para daltonismo"]', 'deutan');
  check(await p.evaluate(() => document.documentElement.dataset.cb === 'deutan'), 'paleta para daltonismo activada');
  await p.selectOption('select[aria-label="Tamaño del texto"]', '150');
  const fs = await p.evaluate(() => getComputedStyle(document.documentElement).fontSize);
  check(fs === '24px', `texto al 150 % (${fs})`);
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('kavalo.profile.v1')).settings);
  check(saved.boardTheme === 'walnut' && saved.textScale === 150 && saved.coordinates === true, 'ajustes guardados sin perder los existentes');

  check(errors.length === 0, `sin errores de JavaScript${errors.length ? `: ${errors.join('; ')}` : ''}`);
  await browser.close();
})().catch((e) => {
  console.error(`  ✗ ${e.message}`);
  process.exit(1);
});
