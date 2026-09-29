/**
 * Prueba E2E del contenido (Fase 7): recorre TODAS las lecciones en el navegador respondiendo
 * cada paso con sus datos, juega un mate en 2 y comprueba la práctica contra el defensor.
 * Requisitos: `npm start` en otra terminal. Uso: node tests/e2e/content.e2e.cjs
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:5173/apps/web-prototype/';
const idx = (n) => (n.charCodeAt(1) - 49) * 8 + n.charCodeAt(0) - 97;
const sq = (n) => `.sq[data-sq="${idx(n)}"]`;
const PROMO = { q: 'dama', r: 'torre', b: 'alfil', n: 'caballo' };

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
  await p.evaluate(() => localStorage.setItem('kavalo.profile.v1', JSON.stringify({ onboarded: true, name: 'Ana', settings: { reduceMotion: true } })));
  const lessons = await p.evaluate(async () => (await import('/packages/content/dist/index.js')).LESSONS);
  const cont = () => p.click('button:text-is("Continuar")');

  for (const lesson of lessons) {
    await p.goto(`${BASE}#/lesson/${lesson.id}`);
    await p.reload();
    await p.waitForSelector('.lesson-head');
    let reachedPlay = false;
    for (const step of lesson.steps) {
      if (step.kind === 'explain') {
        await cont();
      } else if (step.kind === 'select') {
        for (const s of step.answer) await p.click(sq(s));
        await cont();
      } else if (step.kind === 'move') {
        const u = step.accept[0];
        await p.click(sq(u.slice(0, 2)));
        await p.click(sq(u.slice(2, 4)));
        if (u.length === 5) await p.click(`[aria-label="Coronar en ${PROMO[u[4]]}"]`);
        await cont();
      } else if (step.kind === 'reach') {
        // Ruta más corta calculada con el motor de reglas del propio proyecto.
        const path = await p.evaluate(async (st) => {
          const { Position, parseSquare, squareName } = await import('/packages/chess-core/dist/index.js');
          const target = parseSquare(st.target);
          let frontier = [{ pos: Position.fromFen(st.fen), sq: parseSquare(st.from), path: [] }];
          for (let d = 0; d < st.maxMoves; d++) {
            frontier = frontier.flatMap((f) => f.pos.legalMoves(f.sq).flatMap((m) => {
              try { return [{ pos: f.pos.play(m).withTurn('w'), sq: m.to, path: [...f.path, squareName(m.to)] }]; } catch { return []; }
            }));
            const hit = frontier.find((f) => f.sq === target);
            if (hit) return hit.path;
          }
          return null;
        }, step);
        let from = step.from;
        for (const to of path) { await p.click(sq(from)); await p.click(sq(to)); from = to; }
        await cont();
      } else if (step.kind === 'quiz') {
        await p.locator('button.choice').nth(step.answer).click();
        await cont();
      } else if (step.kind === 'play') {
        reachedPlay = true;
        await p.click(sq('c1')); await p.click(sq('c2'));
        await p.waitForFunction(() => document.body.innerText.includes('Jugadas: 1/25') && !document.body.innerText.includes('piensa'), null, { timeout: 10000 });
        const kingMoved = await p.evaluate(() => !document.querySelector('.sq[data-sq="35"] img'));
        check(kingMoved, `${lesson.id}: el defensor responde en la práctica`);
      }
    }
    if (!reachedPlay) {
      await p.waitForSelector('text=¡Lección completada!', { timeout: 5000 });
      console.log(`  ✓ lección «${lesson.title}» completada (${lesson.steps.length} pasos)`);
    }
  }

  // Mate en 2 con respuesta automática del rival
  await p.evaluate(async () => {
    const { PUZZLES } = await import('/packages/content/dist/index.js');
    const prof = JSON.parse(localStorage.getItem('kavalo.profile.v1'));
    prof.solvedPuzzles = PUZZLES.map((z) => z.id).filter((id) => id !== 'p-smothered-2');
    localStorage.setItem('kavalo.profile.v1', JSON.stringify(prof));
  });
  await p.goto(BASE + '#/puzzles');
  await p.reload();
  await p.waitForSelector('.puzzle-prompt');
  check((await p.locator('.puzzle-prompt').innerText()).includes('Mate en 2'), 'aparece el puzzle de mate en 2');
  await p.click(sq('c4')); await p.click(sq('g8'));
  await p.waitForSelector('text=El rival responde');
  check(await p.locator(`${sq('g8')} img[src$="bR.svg"]`).count() === 1, 'el rival responde automáticamente (Txg8)');
  await p.click(sq('h6')); await p.click(sq('f7'));
  await p.waitForSelector('text=SIGUIENTE');
  check((await p.locator('.msg-good').first().innerText()).startsWith('¡Correcto!'), 'mate en 2 resuelto (Cf7#)');

  check(errors.length === 0, `sin errores de JavaScript${errors.length ? `: ${errors.join('; ')}` : ''}`);
  await browser.close();
})().catch((e) => {
  console.error(`  ✗ ${e.message}`);
  process.exit(1);
});
