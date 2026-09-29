/**
 * Prueba E2E de personalización (brief §34, §46–50, §71, §81): onboarding en inglés y modo
 * niños, test inicial de 13 ejercicios, sets de piezas, dashboard, ratings por área y radar.
 * Requisitos: `npm start` en otra terminal. Uso: node tests/e2e/personal.e2e.cjs
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
  const p = await browser.newPage({ viewport: { width: 420, height: 1300 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(BASE);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.click('.splash');
  await p.click('button.choice:text("English")');
  await p.waitForSelector('text=Who will use Kavalo?');
  check(true, 'onboarding en inglés tras elegir idioma');
  await p.click('text=A child');
  check(await p.evaluate(() => document.documentElement.dataset.mode) === 'kids', 'modo niños activado');
  await p.click('text=Juego ocasionalmente');

  // Test inicial: 13 ejercicios (se responden los 3 primeros y se termina)
  await p.waitForSelector('text=1 de 13');
  check(true, 'test inicial con 13 ejercicios progresivos');
  await p.click('button.choice:text("Sí, es jaque mate")');
  await p.waitForSelector('text=2 de 13');
  await p.click(sq('e1')); await p.click(sq('g1'));
  await p.waitForSelector('text=3 de 13');
  await p.click(sq('e5')); await p.click(sq('f6'));
  await p.waitForSelector('text=4 de 13');
  await p.click('text=Terminar la evaluación');
  await p.fill('input.input', 'Leo');
  await p.click('text=Continuar');
  await p.click('text=Aprender desde cero');
  await p.click('text=20 minutos');
  await p.locator('button.choice').first().click();
  await p.waitForSelector('.greet');
  const prof = await p.evaluate(() => JSON.parse(localStorage.getItem('kavalo.profile.v1')));
  check(prof.assessment.score === 3 && prof.assessment.total === 3 && prof.assessment.byArea.rules.correct === 3, 'resultado del test por áreas (reglas 3/3)');
  check(prof.settings.pieceSet === 'kids' && prof.settings.locale === 'en', 'modo niños con set Kids e idioma inglés');
  const greet = await p.locator('.greet').innerText();
  check(/^Good (morning|afternoon|evening), Leo/.test(greet), `inicio en inglés (${greet})`);
  check(/Kavi/.test(await p.locator('main').innerText()), 'modo niños: historia de Kavi en el inicio');
  check((await p.locator('.tab').allInnerTexts()).join('|').includes('Learn'), 'navegación traducida');

  // Ajustes: set de piezas y vuelta a adulto/español
  await p.goto(BASE + '#/settings');
  check(await p.locator('.set-card').count() === 12, 'selector con los 12 sets de piezas');
  await p.click('.set-card[data-set="neon"]');
  check((await p.locator('.board-preview img.piece').first().getAttribute('src')).includes('/neon/'), 'el tablero usa el set elegido');
  await p.selectOption('select[aria-label="Language"]', 'es');
  await p.selectOption('select[aria-label="Experiencia"]', 'adult');
  check(await p.evaluate(() => document.documentElement.dataset.mode) === 'adult' && await p.evaluate(() => document.documentElement.lang) === 'es', 'vuelta a modo adulto y español');

  // Dashboard y radar
  await p.goto(BASE + '#/progress');
  const text = await p.locator('main').innerText();
  check(/Ratings por área/.test(text) && /Conocimiento de aperturas/.test(text), 'ratings por área (brief §50)');
  check(await p.locator('.radar').count() === 1 && (await p.locator('.radar-label').count()) === 9, 'radar de habilidades con 9 ejes (brief §49)');
  check(/Precisión media/.test(text) && /Tiempo por jugada/.test(text), 'dashboard con precisión, errores, táctica, finales y tiempo (brief §48)');
  check(/Evaluación inicial/.test(text), 'el resultado del test inicial aparece en el progreso');

  // Coach (brief §100) y Finales (§78)
  await p.goto(BASE + '#/coach');
  const qs = await p.locator('.qa h2').allInnerTexts();
  check(qs.length === 9 && qs[0] === '¿Qué sabes ya?' && qs[8] === '¿Qué ayuda ya podemos retirar?', 'el coach responde a las 9 preguntas del brief §100');
  await p.goto(BASE + '#/endgames');
  check(/Rey y dama contra rey/.test(await p.locator('main').innerText()), 'pantalla de finales con lecciones y posiciones');

  check(errors.length === 0, `sin errores de JavaScript${errors.length ? `: ${errors.join('; ')}` : ''}`);
  await browser.close();
})().catch((e) => {
  console.error(`  ✗ ${e.message}`);
  process.exit(1);
});
