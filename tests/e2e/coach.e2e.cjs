/**
 * Prueba E2E de la Fase 8 (coach): recomendación explicada, repaso espaciado de una lección,
 * misiones, logros con aviso, reporte semanal y retirada progresiva del checklist.
 * Requisitos: `npm start` en otra terminal. Uso: node tests/e2e/coach.e2e.cjs
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:5173/apps/web-prototype/';
const idx = (n) => (n.charCodeAt(1) - 49) * 8 + n.charCodeAt(0) - 97;
const sq = (n) => `.sq[data-sq="${idx(n)}"]`;
const DAY = 86_400_000;

function check(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log(`  ✓ ${msg}`);
}

/** Responde correctamente un paso de práctica usando los datos de la lección. */
async function solve(p, step) {
  if (step.kind === 'select') for (const s of step.answer) await p.click(sq(s));
  else if (step.kind === 'move') { await p.click(sq(step.accept[0].slice(0, 2))); await p.click(sq(step.accept[0].slice(2, 4))); }
  else if (step.kind === 'quiz') await p.locator('button.choice').nth(step.answer).click();
  else if (step.kind === 'reach') {
    const path = await p.evaluate(async (st) => {
      const { Position, parseSquare, squareName } = await import('/packages/chess-core/dist/index.js');
      let frontier = [{ pos: Position.fromFen(st.fen), sq: parseSquare(st.from), path: [] }];
      for (let d = 0; d < st.maxMoves; d++) {
        frontier = frontier.flatMap((f) => f.pos.legalMoves(f.sq).flatMap((m) => {
          try { return [{ pos: f.pos.play(m).withTurn('w'), sq: m.to, path: [...f.path, squareName(m.to)] }]; } catch { return []; }
        }));
        const hit = frontier.find((f) => f.sq === parseSquare(st.target));
        if (hit) return hit.path;
      }
      return null;
    }, step);
    let from = step.from;
    for (const to of path) { await p.click(sq(from)); await p.click(sq(to)); from = to; }
  }
  await p.click('button:text-is("Continuar")');
}

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await browser.newPage({ viewport: { width: 420, height: 1100 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(BASE);
  await p.evaluate((DAY) => {
    const now = Date.now();
    localStorage.setItem('kavalo.profile.v1', JSON.stringify({
      onboarded: true, name: 'Ana', settings: { reduceMotion: true },
      completedLessons: ['board', 'knight'],
      reviews: [{ conceptId: 'fundamentals.knight', itemId: 'lesson:knight', step: 0, ease: 2.3, intervalDays: 1, dueAt: now - 2 * DAY, lapses: 0 }],
    }));
  }, DAY);
  await p.reload();

  // Logro por lecciones ya completadas: aviso visible y guardado.
  await p.waitForSelector('.toast');
  check((await p.locator('.toast').first().innerText()).includes('Primer paso'), 'aviso de logro «Primer paso»');

  // Recomendación: el repaso vencido, con motivo y factores.
  check((await p.locator('.card-focus h2').innerText()) === 'Repaso: El caballo', 'la Home recomienda el repaso vencido');
  await p.click('text=¿Por qué esto?');
  const why = await p.locator('.why').innerText();
  check(/memoria de largo plazo/.test(why) && /Repaso vencido/.test(why) && /retraso/.test(why), '«¿Por qué esto?» explica el motivo y los factores');
  check(await p.locator('.mission').count() >= 2, 'misiones de hoy visibles');
  check((await p.locator('.mission').first().innerText()).includes('repaso'), 'la primera misión es el repaso pendiente');

  // Repaso espaciado: solo práctica, como máximo 3 pasos.
  await p.click('text=CONTINUAR ENTRENAMIENTO');
  await p.waitForSelector('.lesson-head');
  check((await p.locator('.lesson-head .eyebrow').textContent()) === 'Repaso · El caballo', 'se abre el repaso de la lección');
  const steps = await p.evaluate(async () => {
    const { LESSONS } = await import('/packages/content/dist/index.js');
    const prof = JSON.parse(localStorage.getItem('kavalo.profile.v1'));
    const card = prof.reviews.find((r) => r.itemId === 'lesson:knight');
    const practice = LESSONS.find((l) => l.id === 'knight').steps.filter((s) => ['select', 'move', 'reach', 'quiz'].includes(s.kind));
    const off = card.step + card.lapses;
    return practice.length <= 3 ? practice : [0, 1, 2].map((i) => practice[(off + i) % practice.length]);
  });
  check(steps.length === 3 && steps.every((s) => s.kind !== 'explain'), 'el repaso tiene 3 pasos de práctica y ninguna explicación');
  for (const step of steps) await solve(p, step);
  await p.waitForSelector('text=¡Repaso superado!');
  const prof = await p.evaluate(() => JSON.parse(localStorage.getItem('kavalo.profile.v1')));
  const card = prof.reviews.find((r) => r.itemId === 'lesson:knight');
  check(card.intervalDays === 3 && card.dueAt > Date.now() + 2 * DAY, 'la tarjeta pasa al siguiente intervalo (3 días)');
  check(prof.activity.some((a) => a.kind === 'review' && a.ok), 'el repaso queda registrado como actividad');
  const claimed = Object.values(prof.missionsClaimed).flat();
  check(claimed.includes('review'), 'misión de repaso cumplida y XP cobrada');
  check((await p.locator('.toast').allInnerTexts()).some((t) => t.includes('Misión cumplida')), 'aviso de misión cumplida');

  // Logros y reporte.
  await p.goto(BASE + '#/achievements');
  check((await p.locator('.achievement.got').count()) >= 1, 'la pantalla de logros muestra los conseguidos');
  await p.goto(BASE + '#/report');
  await p.waitForSelector('.card-focus h2');
  const headline = await p.locator('.card-focus h2').innerText();
  check(/día/.test(headline), `reporte semanal con titular («${headline}»)`);
  check(await p.locator('text=Exportar reporte (.md)').count() === 1, 'el reporte se puede exportar');

  // Retirada del checklist tras 5 partidas limpias.
  await p.evaluate(() => {
    const prof = JSON.parse(localStorage.getItem('kavalo.profile.v1'));
    const now = Date.now();
    prof.games = Array.from({ length: 5 }, (_, i) => ({ id: `g${i}`, at: now - (5 - i) * 3600_000, pgn: '1. e4 *', userColor: 'w', bot: { personality: 'nova', level: 1 }, result: '1-0', userResult: 'win', timeControl: 'none', hintsUsed: 0 }));
    prof.mistakes = [];
    localStorage.setItem('kavalo.profile.v1', JSON.stringify(prof));
  });
  await p.goto(BASE + '#/play');
  await p.reload();
  await p.click('text=JUGAR');
  await p.waitForSelector('.checklist');
  const checklist = await p.locator('.checklist').innerText();
  check(/Retirados porque llevas 5 partidas sin ese error/.test(checklist), 'el checklist retira los recordatorios que ya no hacen falta');

  check(errors.length === 0, `sin errores de JavaScript${errors.length ? `: ${errors.join('; ')}` : ''}`);
  await browser.close();
})().catch((e) => {
  console.error(`  ✗ ${e.message}`);
  process.exit(1);
});
