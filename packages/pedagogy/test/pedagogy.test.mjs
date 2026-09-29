import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LADDER, dueCards, gradeAttempt, initialMastery, newCard, schedule, updateMastery } from '../dist/index.js';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);

test('SRS: sigue la escalera 1-3-7-14-30 con respuestas "good"', () => {
  let c = newCard('tactics.fork', 'p1', T0);
  assert.equal(c.intervalDays, 1);
  const seen = [];
  let now = T0;
  for (let i = 0; i < 4; i++) {
    now = c.dueAt;
    c = schedule(c, 'good', now);
    seen.push(c.intervalDays);
  }
  assert.deepEqual(seen, LADDER.slice(1));
  now = c.dueAt;
  c = schedule(c, 'good', now);
  assert.equal(c.intervalDays, Math.round(30 * 2.3));
});

test('SRS: un fallo vuelve a 1 día y baja la facilidad', () => {
  let c = schedule(newCard('x', 'y', T0), 'good', T0);
  c = schedule(c, 'fail', T0 + 3 * DAY);
  assert.equal(c.step, 0);
  assert.equal(c.intervalDays, 1);
  assert.equal(c.lapses, 1);
  assert.ok(c.ease < 2.3);
});

test('SRS: "easy" salta un peldaño y "hard" acorta', () => {
  assert.equal(schedule(newCard('x', 'y', T0), 'easy', T0).intervalDays, 7);
  assert.equal(schedule(newCard('x', 'y', T0), 'hard', T0).intervalDays, 2);
});

test('SRS: la facilidad se mantiene entre 1.3 y 2.8', () => {
  let c = newCard('x', 'y', T0);
  for (let i = 0; i < 20; i++) c = schedule(c, 'fail', T0);
  assert.equal(c.ease, 1.3);
  for (let i = 0; i < 20; i++) c = schedule(c, 'easy', T0);
  assert.equal(c.ease, 2.8);
});

test('gradeAttempt', () => {
  assert.equal(gradeAttempt({ correct: false, hints: 0, ms: 1, medianMs: 10 }), 'fail');
  assert.equal(gradeAttempt({ correct: true, hints: 0, sawSolution: true, ms: 1, medianMs: 10 }), 'fail');
  assert.equal(gradeAttempt({ correct: true, hints: 2, ms: 5, medianMs: 10 }), 'hard');
  assert.equal(gradeAttempt({ correct: true, hints: 0, ms: 3, medianMs: 10 }), 'easy');
  assert.equal(gradeAttempt({ correct: true, hints: 1, ms: 8, medianMs: 10 }), 'good');
});

test('dueCards ordena por vencimiento', () => {
  const a = { ...newCard('a', '1', T0), dueAt: T0 + 5 };
  const b = { ...newCard('b', '2', T0), dueAt: T0 + 1 };
  const c = { ...newCard('c', '3', T0), dueAt: T0 + DAY * 9 };
  assert.deepEqual(dueCards([a, b, c], T0 + 10).map((x) => x.conceptId), ['b', 'a']);
});

test('dominio: no se considera "comprendido" por resolverlo una vez', () => {
  let m = initialMastery('vision.undefended-pieces');
  m = updateMastery(m, { correct: true, context: 'guided', hints: 0, at: T0 }).mastery;
  assert.equal(m.state, 'learning');
});

test('dominio: comprendido requiere 5 intentos ≥80 % y un repaso otro día', () => {
  let m = initialMastery('c');
  for (let i = 0; i < 5; i++) m = updateMastery(m, { correct: true, context: 'puzzle', hints: 0, at: T0 + i }).mastery;
  assert.equal(m.state, 'learning', 'mismo día: aún no');
  m = updateMastery(m, { correct: true, context: 'review', hints: 0, at: T0 + DAY + 1 }).mastery;
  assert.equal(m.state, 'understood');
});

test('dominio: dominado exige repaso a ≥7 días y aplicación en partida y puzzle', () => {
  let m = initialMastery('c');
  for (let i = 0; i < 6; i++) m = updateMastery(m, { correct: true, context: 'puzzle', hints: 0, at: T0 + i }).mastery;
  m = updateMastery(m, { correct: true, context: 'review', hints: 0, at: T0 + 2 * DAY }).mastery;
  m = updateMastery(m, { correct: true, context: 'review', hints: 0, at: T0 + 8 * DAY }).mastery;
  assert.equal(m.state, 'understood', 'sin evidencia en partida no llega a dominado');
  m = updateMastery(m, { correct: true, context: 'game', hints: 0, at: T0 + 9 * DAY }).mastery;
  assert.equal(m.state, 'mastered');
});

test('sistema de confianza: un fallo aislado con dominio alto es un desliz', () => {
  let m = initialMastery('c');
  for (let i = 0; i < 12; i++) m = updateMastery(m, { correct: true, context: 'game', hints: 0, at: T0 + i * DAY }).mastery;
  assert.ok(m.pKnown >= 0.85);
  const before = m.state;
  const r = updateMastery(m, { correct: false, context: 'game', hints: 0, at: T0 + 20 * DAY });
  assert.equal(r.slip, true);
  assert.equal(r.reschedule, false);
  assert.equal(r.mastery.state, before);
  assert.equal(r.mastery.memoryStage, 1);
  // Un segundo fallo cercano ya no es desliz.
  const r2 = updateMastery(r.mastery, { correct: false, context: 'game', hints: 0, at: T0 + 21 * DAY });
  assert.equal(r2.slip, false);
  assert.equal(r2.reschedule, true);
});

test('memoria pedagógica: cada fallo real avanza de explicación a pregunta', () => {
  let m = initialMastery('c');
  const stages = [];
  for (let i = 0; i < 4; i++) {
    m = updateMastery(m, { correct: false, context: 'game', hints: 0, at: T0 + i }).mastery;
    stages.push(m.memoryStage);
  }
  assert.deepEqual(stages, [2, 3, 4, 4]);
});
