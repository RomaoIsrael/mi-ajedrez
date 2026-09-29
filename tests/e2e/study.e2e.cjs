/**
 * Prueba E2E de aperturas (brief §13) y partidas históricas (brief §54).
 * Requisitos: `npm start` en otra terminal. Uso: node tests/e2e/study.e2e.cjs
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:5173/apps/web-prototype/';
const idx = (n) => (n.charCodeAt(1) - 49) * 8 + n.charCodeAt(0) - 97;
const sq = (n) => `.sq[data-sq="${idx(n)}"]`;
const move = async (p, a, b) => { await p.click(sq(a)); await p.click(sq(b)); };

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
  await p.evaluate(() => localStorage.setItem('kavalo.profile.v1', JSON.stringify({ onboarded: true, name: 'Ana', settings: { reduceMotion: true } })));
  await p.goto(BASE + '#/openings');
  await p.reload();
  const text = await p.locator('main').innerText();
  check(/Con blancas/.test(text) && /contra 1\.e4/.test(text) && /contra 1\.d4/.test(text), 'aperturas agrupadas: blancas, negras contra 1.e4 y contra 1.d4');
  check(await p.locator('.opening-list li').count() === 13, 'las 13 aperturas del brief');

  // Italiana: los 5 pasos en orden
  await p.click('a[href="#/openings/italian"]');
  const steps = await p.locator('.stepper li').allInnerTexts();
  check(steps.join('|') === '1. Principios|2. Estructura|3. Planes|4. Jugadas típicas|5. Variantes', 'orden PRINCIPIOS → ESTRUCTURAS → PLANES → JUGADAS TÍPICAS → VARIANTES');
  await p.click('text=SIGUIENTE: ESTRUCTURA');
  check(await p.locator('.sq.hl-zone').count() === 4, 'estructura: casillas importantes resaltadas');
  await p.click('text=SIGUIENTE: PLANES');
  check(/Rupturas/.test(await p.locator('main').innerText()), 'planes y rupturas');
  await p.click('text=SIGUIENTE: JUGADAS TÍPICAS');
  check(/Errores frecuentes/.test(await p.locator('main').innerText()) && /Trampas/.test(await p.locator('main').innerText()), 'errores frecuentes y trampas');
  await p.click('text=SIGUIENTE: VARIANTES');
  await p.click('text=PRACTICAR LA LÍNEA');

  // Práctica: un desvío y la línea completa
  await move(p, 'd2', 'd4');
  await p.waitForSelector('text=no es la jugada de la línea principal');
  check(true, 'al desviarse, primero se recuerda el objetivo (no la jugada)');
  const line = [['e2', 'e4'], ['g1', 'f3'], ['f1', 'c4'], ['c2', 'c3'], ['d2', 'd3'], ['e1', 'g1']];
  for (const [a, b] of line) {
    await p.waitForFunction(() => document.querySelector('.board .sq img') && !document.querySelector('.promo'), null);
    await p.waitForTimeout(450);
    await move(p, a, b);
  }
  await p.waitForSelector('text=Línea completada', { timeout: 5000 });
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('kavalo.profile.v1')).training.openings.italian);
  check(st.practiced === 1 && st.clean === 0, 'la práctica se registra (con 1 desvío)');
  await p.click('text=JUGAR DESDE AQUÍ');
  await p.waitForSelector('.mode-card.on[data-mode="opening"]', { timeout: 5000 });
  check(true, '«Jugar desde aquí» abre la partida en modo «Desde apertura»');

  // Partida histórica: la trampa de Légal
  await p.goto(BASE + '#/library');
  check(await p.locator('a.card-link[href^="#/library/"]').count() >= 5, 'biblioteca con 5 partidas históricas');
  await p.click('a[href="#/library/legal-1750"]');
  await p.click('text=EMPEZAR');
  await p.waitForSelector('text=¿Qué jugarías?');
  await move(p, 'f3', 'e5');
  await p.waitForSelector("text=¡Eso es lo que se jugó!");
  check(true, 'momento 1: Cxe5 reconocido');
  await p.click('button:text("Continuar")');
  await p.waitForSelector('text=¿Qué jugarías?');
  await move(p, 'c4', 'f7');
  await p.waitForSelector("text=¡Eso es lo que se jugó!");
  await p.click('button:text("Continuar")');
  await p.waitForSelector('text=¿Qué jugarías?');
  await p.click('button:text("Ver la jugada")');
  await p.waitForSelector('text=En la partida se jugó');
  check(/Cd5/.test(await p.locator('.coach').last().innerText()), 'si no se encuentra, se muestra la jugada y la explicación');
  await p.click('button:text("Continuar")');
  await p.waitForSelector('text=Momentos acertados: 2/3');
  check(/Lección:/.test(await p.locator('main').innerText()), 'al final: lección de la partida');
  const lib = await p.evaluate(() => JSON.parse(localStorage.getItem('kavalo.profile.v1')).training.library['legal-1750']);
  check(lib.found === 2 && lib.total === 3, 'el resultado se guarda');

  check(errors.length === 0, `sin errores de JavaScript${errors.length ? `: ${errors.join('; ')}` : ''}`);
  await browser.close();
})().catch((e) => {
  console.error(`  ✗ ${e.message}`);
  process.exit(1);
});
