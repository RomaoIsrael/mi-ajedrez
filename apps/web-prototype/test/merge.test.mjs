import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeProfiles } from '../dist/state/merge.js';

const base = (over = {}) => ({
  version: 1, onboarded: true, name: 'Ana', settings: { theme: 'system', locale: 'es' }, xp: 0,
  streak: { current: 0, best: 0, lastDay: null }, gameRating: 400, puzzleRating: 400, completedLessons: [], mastery: {}, reviews: [],
  mistakes: [], games: [], personalPuzzles: [], solvedPuzzles: [], activity: [], ratingHistory: [], achievements: {}, missionsClaimed: {},
  dnaSnapshots: [], updatedAt: 0, ...over,
});

test('fusión: no se pierde nada de ningún dispositivo', () => {
  const a = base({ updatedAt: 10, xp: 100, completedLessons: ['board'], games: [{ id: 'g1', at: 1, pgn: '', evals: [1] }],
    activity: [{ at: 1, kind: 'lesson', ms: 0, ref: 'board' }], achievements: { first: 5 }, ratingHistory: [{ at: 1, kind: 'game', rating: 420 }] });
  const b = base({ updatedAt: 20, xp: 80, name: 'Ana M.', completedLessons: ['rook'], games: [{ id: 'g1', at: 1, pgn: '' }, { id: 'g2', at: 2, pgn: '' }],
    activity: [{ at: 2, kind: 'puzzle', ms: 0, ref: 'p1' }], achievements: { first: 3, streak3: 9 }, ratingHistory: [{ at: 2, kind: 'game', rating: 450 }] });
  const m = mergeProfiles(a, b);
  assert.deepEqual(m.completedLessons.sort(), ['board', 'rook']);
  assert.deepEqual(m.games.map((g) => g.id), ['g1', 'g2']);
  assert.deepEqual(m.games[0].evals, [1], 'conserva el análisis hecho en otro dispositivo');
  assert.equal(m.activity.length, 2);
  assert.deepEqual(m.achievements, { first: 3, streak3: 9 }, 'logros: la fecha más antigua');
  assert.equal(m.xp, 100);
  assert.equal(m.gameRating, 450, 'rating: el último registrado');
  assert.equal(m.name, 'Ana M.', 'datos de un solo valor: la copia más reciente');
});

test('fusión: dominio con más evidencias y tarjeta de repaso más avanzada', () => {
  const a = base({ updatedAt: 30, mastery: { x: { conceptId: 'x', attempts: 5, pKnown: 0.8 } }, reviews: [{ itemId: 'r', step: 3, dueAt: 50 }] });
  const b = base({ updatedAt: 10, mastery: { x: { conceptId: 'x', attempts: 2, pKnown: 0.3 }, y: { conceptId: 'y', attempts: 1 } }, reviews: [{ itemId: 'r', step: 1, dueAt: 90 }] });
  const m = mergeProfiles(a, b);
  assert.equal(m.mastery.x.attempts, 5);
  assert.ok(m.mastery.y);
  assert.equal(m.reviews[0].step, 3);
});

test('fusión: es simétrica en los datos acumulados', () => {
  const a = base({ updatedAt: 1, solvedPuzzles: ['p1'], mistakes: [{ at: 1, gameId: 'g', fen: 'f', uci: 'e2e4' }] });
  const b = base({ updatedAt: 2, solvedPuzzles: ['p2'], mistakes: [{ at: 1, gameId: 'g', fen: 'f', uci: 'e2e4' }, { at: 2, gameId: 'g', fen: 'f2', uci: 'd2d4' }] });
  const ab = mergeProfiles(a, b);
  const ba = mergeProfiles(b, a);
  assert.deepEqual(ab.solvedPuzzles.sort(), ba.solvedPuzzles.sort());
  assert.equal(ab.mistakes.length, 2);
  assert.equal(ba.mistakes.length, 2);
});
