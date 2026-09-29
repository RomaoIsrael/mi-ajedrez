import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newCard, schedule } from '@kavalo/pedagogy';
import {
  ACHIEVEMENTS, DAY, checklistStatus, learningStreak, dailyMissions, dailyPlan, lessonCardId, newAchievements,
  recommend, recommendations, reportToMarkdown, threatWarningsNeeded, weeklyReport,
} from '../dist/index.js';

const NOW = new Date(2026, 8, 29, 18, 0).getTime();

function state(over = {}) {
  return {
    goal: 'learn', dailyMinutes: 20, gameRating: 500, puzzleRating: 500,
    completedLessons: [], mastery: {}, reviews: [], games: [], mistakes: [], activity: [], ratingHistory: [], achievements: {},
    ...over,
  };
}
const FUNDAMENTALS = ['board', 'rook', 'bishop', 'queen-king', 'knight', 'pawn', 'checkmate', 'special'];
const games = (n, t0 = NOW - n * DAY) => Array.from({ length: n }, (_, i) => ({ id: `g${i}`, at: t0 + i * DAY, userResult: 'loss', hintsUsed: 0 }));
const mistake = (gameId, kind, at = NOW) => ({ at, gameId, kind, concept: 'x', severity: 'blunder' });

test('principiante absoluto: empezar por la primera lección', () => {
  const r = recommend(state(), NOW);
  assert.deepEqual(r.action, { type: 'lesson', lessonId: 'board' });
  assert.match(r.reason, /Empezamos por lo esencial/);
});

test('un repaso vencido de lección tiene prioridad y se explica', () => {
  const card = { ...newCard('fundamentals.knight', lessonCardId('knight'), NOW - 3 * DAY) };
  const r = recommend(state({ completedLessons: ['board', 'knight'], reviews: [card] }), NOW);
  assert.deepEqual(r.action, { type: 'review', lessonId: 'knight' });
  assert.match(r.reason, /un día después/);
  assert.ok(r.factors.some((f) => /retraso/.test(f)));
});

test('sistema de confianza: un error en UNA sola partida no cambia el plan', () => {
  const s = state({ completedLessons: FUNDAMENTALS, games: games(3), mistakes: [mistake('g2', 'hanging-piece'), mistake('g2', 'hanging-piece')] });
  assert.ok(!recommendations(s, NOW).some((r) => r.id.startsWith('weakness:')));
});

test('jugador A (cuelga piezas en varias partidas): se trabaja esa debilidad antes que aperturas', () => {
  const done = [...FUNDAMENTALS, 'undefended', 'threats', 'fork', 'pin', 'skewer', 'discovered'];
  const s = state({
    completedLessons: done, games: games(6),
    mistakes: ['g1', 'g3', 'g4', 'g5'].map((g) => mistake(g, 'hanging-piece')),
  });
  const recs = recommendations(s, NOW);
  assert.equal(recs[0].id, 'weakness:hanging-piece');
  assert.match(recs[0].reason, /4 de tus últimas 6 partidas/);
  assert.deepEqual(recs[0].action, { type: 'puzzles', concept: 'vision.undefended-pieces' });
  const opening = recs.find((r) => r.id === 'lesson:center');
  assert.ok(opening.factors.some((f) => /no recomendamos estudiar aperturas/.test(f)), 'aperturas penalizadas');
});

test('jugador B (objetivo finales) y jugador C (objetivo táctica) reciben rutas distintas', () => {
  const base = { completedLessons: [...FUNDAMENTALS, 'undefended'] };
  const endgames = recommend(state({ ...base, goal: 'endgames' }), NOW);
  const tactics = recommend(state({ ...base, goal: 'tactics' }), NOW);
  assert.deepEqual(endgames.action, { type: 'lesson', lessonId: 'kq-vs-k' });
  assert.equal(tactics.action.type, 'lesson');
  assert.notEqual(tactics.action.lessonId, endgames.action.lessonId);
});

test('fatiga: el mismo concepto muchas veces hoy baja su prioridad', () => {
  const card = newCard('fundamentals.knight', lessonCardId('knight'), NOW - 2 * DAY);
  const tired = Array.from({ length: 3 }, (_, i) => ({ at: NOW - i * 60_000, kind: 'puzzle', ms: 1000, concept: 'fundamentals.knight' }));
  const fresh = recommendations(state({ completedLessons: ['board', 'knight'], reviews: [card] }), NOW)[0];
  const later = recommendations(state({ completedLessons: ['board', 'knight'], reviews: [card], activity: tired }), NOW).find((r) => r.id === fresh.id);
  assert.equal(fresh.score - later.score, 25);
});

test('tras 2 lecciones nuevas sin jugar, se propone aplicarlas en partida', () => {
  const activity = [{ at: NOW - 2000, kind: 'lesson', ms: 1, first: true }, { at: NOW - 1000, kind: 'lesson', ms: 1, first: true }];
  const play = recommendations(state({ completedLessons: FUNDAMENTALS, activity }), NOW).find((r) => r.id === 'play');
  assert.match(play.reason, /2 conceptos nuevos/);
  assert.equal(play.score, 55);
});

test('plan diario: bloques que suman el tiempo elegido', () => {
  for (const m of [5, 10, 20, 30, 45, 60]) {
    const blocks = dailyPlan(state({ dailyMinutes: m, completedLessons: FUNDAMENTALS }), NOW);
    assert.equal(blocks.reduce((a, b) => a + b.minutes, 0), m, `${m} min`);
  }
});

test('misiones: premian aprendizaje real y avanzan con la actividad del día', () => {
  const s = state({ completedLessons: FUNDAMENTALS });
  const before = dailyMissions(s, NOW);
  assert.ok(before.length >= 2 && before.length <= 3);
  assert.ok(before.every((m) => !m.done));
  const lessonMission = before.find((m) => m.id === 'lesson');
  assert.ok(lessonMission, 'hay una misión de lección nueva');
  const after = dailyMissions({ ...s, activity: [{ at: NOW - 1000, kind: 'lesson', ms: 1, first: true }] }, NOW);
  assert.equal(after.find((m) => m.id === 'lesson').done, true);
  // Actividad de ayer no cuenta para hoy.
  const yesterday = dailyMissions({ ...s, activity: [{ at: NOW - DAY, kind: 'lesson', ms: 1, first: true }] }, NOW);
  assert.equal(yesterday.find((m) => m.id === 'lesson').done, false);
});

test('misiones: con un repaso pendiente, el repaso es misión prioritaria', () => {
  const card = newCard('fundamentals.knight', lessonCardId('knight'), NOW - 2 * DAY);
  assert.equal(dailyMissions(state({ completedLessons: ['board', 'knight'], reviews: [card] }), NOW)[0].id, 'review');
});

test('logros: se desbloquean por aprendizaje demostrado', () => {
  assert.deepEqual(newAchievements(state()).map((a) => a.id), []);
  assert.deepEqual(newAchievements(state({ completedLessons: ['board'] })).map((a) => a.id), ['first-lesson']);
  assert.ok(newAchievements(state({ completedLessons: FUNDAMENTALS })).some((a) => a.id === 'fundamentals'));
  assert.equal(newAchievements(state({ completedLessons: ['board'], achievements: { 'first-lesson': NOW } })).length, 0, 'no se repiten');
  const puzzles = Array.from({ length: 10 }, (_, i) => ({ at: NOW - i, kind: 'puzzle', ms: 1, ok: true, hints: 0 }));
  assert.ok(newAchievements(state({ activity: puzzles })).some((a) => a.id === 'sharp-eye'));
  assert.ok(newAchievements(state({ activity: [{ at: NOW, kind: 'puzzle', ms: 1, ok: true, ref: 'p-smothered-2' }] })).some((a) => a.id === 'mate-in-2'));
  const g = games(10);
  assert.ok(newAchievements(state({ games: g })).some((a) => a.id === 'guardian'));
  assert.ok(!newAchievements(state({ games: g, mistakes: [mistake('g9', 'hanging-piece')] })).some((a) => a.id === 'guardian'));
  const days = Array.from({ length: 7 }, (_, i) => ({ at: NOW - i * DAY, kind: 'puzzle', ms: 1, ok: false }));
  assert.ok(newAchievements(state({ activity: days })).some((a) => a.id === 'streak-7'));
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
});

test('retirada de ayudas: cada recordatorio se retira tras 5 partidas sin ese error', () => {
  assert.ok(checklistStatus(state({ games: games(3) })).every((c) => !c.retired), 'con pocas partidas no se retira nada');
  const s = state({ games: games(6), mistakes: [mistake('g0', 'hanging-piece'), mistake('g4', 'missed-capture')] });
  const st = Object.fromEntries(checklistStatus(s).map((c) => [c.item.label, c.retired]));
  assert.equal(st['Piezas indefensas'], true, 'g0 queda fuera de las últimas 5');
  assert.equal(st.Capturas, false, 'captura perdida en g4');
  assert.equal(st.Jaques, true);
  assert.equal(threatWarningsNeeded(state({ games: games(3) })), true);
  assert.equal(threatWarningsNeeded(state({ games: games(5) })), false);
});

test('reporte semanal: compara con la semana anterior sin inventar mejoras', () => {
  const empty = weeklyReport(state(), NOW);
  assert.equal(empty.activeDays, 0);
  assert.match(empty.headline, /no hubo entrenamiento/);
  assert.equal(empty.puzzles.accuracy, null);

  const prevGames = [0, 1, 2].map((i) => ({ id: `p${i}`, at: NOW - 10 * DAY + i * 3600_000, userResult: 'loss', hintsUsed: 0 }));
  const weekGames = [0, 1, 2].map((i) => ({ id: `w${i}`, at: NOW - 2 * DAY + i * 3600_000, userResult: i ? 'win' : 'draw', hintsUsed: 0 }));
  const s = state({
    games: [...prevGames, ...weekGames],
    mistakes: [...prevGames.flatMap((g) => [mistake(g.id, 'hanging-piece'), mistake(g.id, 'hanging-piece')]), mistake('w0', 'hanging-piece')],
    activity: [
      { at: NOW - DAY, kind: 'lesson', ms: 300_000, first: true },
      { at: NOW - DAY, kind: 'mastery', ms: 0, concept: 'tactics.fork', state: 'understood' },
      ...[0, 1, 2, 3].map((i) => ({ at: NOW - 2 * DAY + i, kind: 'puzzle', ms: 60_000, ok: i < 3, hints: 0 })),
    ],
    ratingHistory: [{ at: NOW - 9 * DAY, kind: 'game', rating: 500 }, { at: NOW - DAY, kind: 'game', rating: 545 }],
  });
  const r = weeklyReport(s, NOW);
  assert.equal(r.games.played, 3);
  assert.deepEqual([r.games.wins, r.games.draws, r.games.losses], [2, 1, 0]);
  assert.equal(r.rating.game, 45);
  assert.equal(r.puzzles.accuracy, 0.75);
  assert.equal(r.lessons, 1);
  assert.equal(r.minutes, 9);
  assert.deepEqual(r.newStrengths, ['Horquilla']);
  assert.equal(r.improved[0].label, 'Piezas colgadas');
  assert.match(r.headline, /de 2\.0 a 0\.3 por partida/);
  const md = reportToMarkdown(r, 'Ana');
  assert.match(md, /^# Reporte semanal de Ana/);
  assert.match(md, /Rating de partidas: \+45/);
});

test('repaso de lección: la tarjeta vuelve con la escalera 1-3-7 días', () => {
  let card = newCard('tactics.fork', lessonCardId('fork'), NOW);
  card = schedule(card, 'good', card.dueAt);
  assert.equal(card.intervalDays, 3);
});

test('racha: días seguidos con aprendizaje, viva si ayer se entrenó', () => {
  const ev = (d) => ({ at: NOW - d * DAY, kind: 'puzzle', ms: 1, ok: true });
  assert.equal(learningStreak(state(), NOW), 0);
  assert.equal(learningStreak(state({ activity: [ev(0), ev(1), ev(2)] }), NOW), 3);
  assert.equal(learningStreak(state({ activity: [ev(1), ev(2)] }), NOW), 2, 'hoy aún no, pero sigue viva');
  assert.equal(learningStreak(state({ activity: [ev(2), ev(3)] }), NOW), 0, 'se rompió ayer');
  assert.equal(learningStreak(state({ activity: [{ at: NOW, kind: 'mastery', ms: 0 }] }), NOW), 0, 'los cambios de dominio no cuentan');
});
