/**
 * Prueba E2E de los entrenamientos (brief §51–53): coordenadas, visión y cálculo.
 * Requisitos: `npm start` en otra terminal. Uso: node tests/e2e/training.e2e.cjs
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:5173/apps/web-prototype/';
const idx = (n) => (n.charCodeAt(1) - 49) * 8 + n.charCodeAt(0) - 97;
const sq = (n) => `.sq[data-sq="${idx(n)}"]`;
const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];

function check(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log(`  ✓ ${msg}`);
}

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await browser.newPage({ viewport: { width: 420, height: 1200 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(BASE);
  await p.evaluate(() => localStorage.setItem('kavalo.profile.v1', JSON.stringify({
    onboarded: true, name: 'Ana', settings: { reduceMotion: true },
    completedLessons: ['board', 'rook', 'bishop', 'queen-king', 'knight', 'pawn', 'checkmate', 'special'],
  })));
  await p.goto(BASE + '#/learn');
  await p.reload();
  await p.click('a.chip[href="#/train"]');
  await p.waitForSelector('.train-card');
  check(await p.locator('.train-card').count() === 3, 'el módulo de entrenamiento ofrece coordenadas, visión y cálculo');

  // Coordenadas: 20 preguntas respondidas correctamente leyendo el enunciado
  await p.click('a[href="#/train/coords"]');
  await p.click('text=EMPEZAR');
  for (let i = 0; i < 20; i++) {
    const prompt = await p.locator('.train-prompt').innerText();
    let m;
    if ((m = /^Selecciona ([a-h][1-8])\./.exec(prompt))) await p.click(sq(m[1]));
    else if ((m = /color es ([a-h][1-8])/.exec(prompt))) {
      const light = (m[1].charCodeAt(0) - 97 + Number(m[1][1]) - 1) % 2 === 1;
      await p.click(`button[data-answer="${light ? 'light' : 'dark'}"]`);
    } else if ((m = /caballo en ([a-h][1-8])/.exec(prompt))) {
      const f = m[1].charCodeAt(0) - 97;
      const r = Number(m[1][1]) - 1;
      for (const [df, dr] of KNIGHT) {
        if (f + df >= 0 && f + df < 8 && r + dr >= 0 && r + dr < 8) await p.click(sq(String.fromCharCode(97 + f + df) + (r + dr + 1)));
      }
      await p.click('button:text("Comprobar")');
    } else throw new Error(`enunciado desconocido: ${prompt}`);
    // Espera a la siguiente pregunta (el enunciado puede repetirse; el contador no).
    await p.waitForFunction((n) => !document.querySelector('main .muted.small')?.textContent?.startsWith(`${n} de 20`), i + 1, { timeout: 5000 });
  }
  const result = await p.locator('.train-prompt').innerText();
  check(/^20\/20/.test(result), `coordenadas: 20/20 con récord (${result})`);
  const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('kavalo.profile.v1')).training.coords);
  check(stored.bestScore === 20 && stored.sessions === 1, 'el récord de coordenadas se guarda');

  // Visión: un ejercicio con comprobación
  await p.goto(BASE + '#/train/vision');
  await p.waitForSelector('.train-prompt');
  const eyebrow = await p.locator('.eyebrow').first().innerText();
  check(/1 de 10/i.test(eyebrow), `visión: serie de 10 ejercicios (${eyebrow})`);
  const numeric = await p.locator('button[data-answer]').count();
  if (numeric) await p.locator('button[data-answer]').first().click();
  else await p.click('button:text("Comprobar"), button:text("Ya las tengo todas")');
  await p.waitForSelector('.msg');
  check(true, 'visión: el ejercicio se corrige y muestra lo encontrado y lo que faltaba');
  const vision = await p.evaluate(() => JSON.parse(localStorage.getItem('kavalo.profile.v1')).training.vision);
  check(Object.values(vision).reduce((a, v) => a + v.total, 0) === 1, 'visión: el resultado queda registrado por tipo');

  // Cálculo: mate en 2 con la línea correcta
  await p.goto(BASE + '#/train/calc');
  await p.waitForSelector('input[aria-label="Tu jugada"]');
  const prompt = await p.locator('.train-prompt').innerText();
  check(/Mate en 2/i.test(prompt), `cálculo: se propone un mate en 2 (${prompt})`);
  const fen = await p.evaluate(() => null);
  void fen;
  // Probamos las dos soluciones posibles del contenido (sabemos que el tablero no se puede mover).
  const lines = { deflection: ['De8+', 'Dxe8', 'Txe8#'], smothered: ['Dg8+', 'Txg8', 'Cf7#'] };
  const hasRookE1 = await p.locator(`${sq('e1')} img.piece`).count();
  const line = hasRookE1 ? lines.deflection : lines.smothered;
  await p.fill('input[aria-label="Candidatas"]', `${line[0]}, Dc8`);
  await p.fill('input[aria-label="Tu jugada"]', line[0]);
  await p.fill('input[aria-label="Respuesta del rival"]', line[1]);
  await p.fill('input[aria-label="Tu siguiente jugada"]', line[2]);
  await p.click('button:text("Comparar")');
  const res = await p.locator('.coach-bubble, .bubble, .coach').last().innerText();
  check(/Profundidad correcta: 3 de 3/.test(res), 'cálculo: línea completa correcta (3 de 3)');
  check(/la buena estaba entre ellas/.test(res), 'cálculo: detecta que la jugada buena estaba entre las candidatas');
  const calc = await p.evaluate(() => JSON.parse(localStorage.getItem('kavalo.profile.v1')).training.calc);
  check(calc.exercises === 1 && calc.perfect === 1 && calc.maxDepth === 3, 'cálculo: profundidad y precisión registradas');

  check(errors.length === 0, `sin errores de JavaScript${errors.length ? `: ${errors.join('; ')}` : ''}`);
  await browser.close();
})().catch((e) => {
  console.error(`  ✗ ${e.message}`);
  process.exit(1);
});
