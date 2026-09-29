import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Position, parseMove, parseSquare, squareName } from '@kavalo/chess-core';
import { scoreMove, evaluate } from '@kavalo/bots';
import { ALL_CONCEPTS, LESSONS, PUZZLES, SECTIONS, pickPuzzle } from '../dist/index.js';

test('mapa: ids únicos y prerrequisitos existentes (sin ciclos)', () => {
  const ids = new Set(ALL_CONCEPTS.map((c) => c.id));
  assert.equal(ids.size, ALL_CONCEPTS.length);
  for (const c of ALL_CONCEPTS) for (const p of c.prerequisites) assert.ok(ids.has(p), `${c.id} → ${p}`);
  const visiting = new Set();
  const done = new Set();
  const visit = (id) => {
    assert.ok(!visiting.has(id), `ciclo en ${id}`);
    if (done.has(id)) return;
    visiting.add(id);
    ALL_CONCEPTS.find((c) => c.id === id).prerequisites.forEach(visit);
    visiting.delete(id);
    done.add(id);
  };
  ids.forEach(visit);
  assert.deepEqual(SECTIONS.map((s) => s.title), ['Fundamentos', 'Visión', 'Táctica', 'Aperturas', 'Estrategia', 'Finales', 'Cálculo', 'Planificación', 'Maestría']);
});

test('lecciones: posiciones válidas, casillas y jugadas legales', () => {
  for (const lesson of LESSONS) {
    assert.ok(ALL_CONCEPTS.some((c) => c.id === lesson.conceptId), lesson.id);
    for (const step of lesson.steps) {
      const pos = step.fen ? Position.fromFen(step.fen) : null;
      if (step.kind === 'select') step.answer.forEach((s) => parseSquare(s));
      if (step.kind === 'move') step.accept.forEach((u) => assert.ok(parseMove(pos, u), `${lesson.id}: ${u}`));
      if (step.kind === 'quiz') assert.ok(step.answer < step.options.length);
    }
  }
});

test('lección caballo: las casillas pedidas son exactamente los saltos del caballo', () => {
  const step = LESSONS.find((l) => l.id === 'knight').steps.find((s) => s.kind === 'select');
  const pos = Position.fromFen(step.fen);
  const targets = pos.legalMoves(parseSquare('e4')).map((m) => squareName(m.to)).sort();
  assert.deepEqual(targets, [...step.answer].sort());
});

test('lección caballo: el objetivo "reach" es alcanzable en los saltos indicados', () => {
  const step = LESSONS.find((l) => l.id === 'knight').steps.find((s) => s.kind === 'reach');
  const target = parseSquare(step.target);
  let frontier = [parseSquare(step.from)];
  let found = -1;
  for (let d = 1; d <= step.maxMoves && found < 0; d++) {
    frontier = frontier.flatMap((sq) => {
      const f = sq & 7; const r = sq >> 3;
      return [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]
        .map(([df, dr]) => [f + df, r + dr]).filter(([a, b]) => a >= 0 && a < 8 && b >= 0 && b < 8).map(([a, b]) => b * 8 + a);
    });
    if (frontier.includes(target)) found = d;
  }
  assert.equal(found, step.maxMoves, 'el número de saltos debe ser el mínimo necesario');
});

test('lección piezas indefensas: respuestas coherentes con el tablero', () => {
  const lesson = LESSONS.find((l) => l.id === 'undefended');
  const select = lesson.steps.find((s) => s.kind === 'select');
  const pos = Position.fromFen(select.fen);
  const undefended = pos.board
    .map((p, sq) => ({ p, sq }))
    .filter(({ p, sq }) => p && p.color === 'b' && p.type !== 'k' && pos.attackers(sq, 'b').length === 0)
    .map(({ sq }) => squareName(sq)).sort();
  assert.deepEqual(undefended, [...select.answer].sort());
  const move = lesson.steps.find((s) => s.kind === 'move');
  const mpos = Position.fromFen(move.fen);
  const good = parseMove(mpos, move.accept[0]);
  assert.ok(scoreMove(mpos, good, 2) - evaluate(mpos, 'w') >= 250);
  const trap = parseMove(mpos, 'Rxd5');
  assert.ok(scoreMove(mpos, trap, 2) < scoreMove(mpos, good, 2) - 150, 'capturar la pieza defendida debe ser peor');
});

test('lección jaque mate: el quiz de ahogado es realmente ahogado', () => {
  const quiz = LESSONS.find((l) => l.id === 'checkmate').steps.find((s) => s.kind === 'quiz');
  assert.equal(Position.fromFen(quiz.fen).isStalemate(), true);
  const mateStep = LESSONS.find((l) => l.id === 'checkmate').steps[1];
  assert.equal(Position.fromFen(mateStep.fen).isCheckmate(), true);
});

for (const pz of PUZZLES) {
  test(`puzzle ${pz.id} (${pz.goal})`, () => {
    const pos = Position.fromFen(pz.fen);
    const accepted = pz.accept.map((u) => parseMove(pos, u));
    accepted.forEach((m, i) => assert.ok(m, `jugada ilegal ${pz.accept[i]}`));
    if (pz.goal === 'mate') {
      accepted.forEach((m) => assert.ok(pos.play(m).isCheckmate(), `${pz.accept} no es mate`));
      const otherMates = pos.legalMoves().filter((m) => !accepted.includes(m) && !pz.accept.includes(`${squareName(m.from)}${squareName(m.to)}${m.promotion ?? ''}`) && pos.play(m).isCheckmate());
      assert.equal(otherMates.length, 0, 'solución única');
    } else {
      const base = evaluate(pos, pos.turn);
      const best = scoreMove(pos, accepted[0], 4);
      assert.ok(best - base >= 200, `gana material: ${best - base}`);
      const alternatives = pos.legalMoves().filter((m) => !pz.accept.includes(`${squareName(m.from)}${squareName(m.to)}${m.promotion ?? ''}`));
      const second = Math.max(...alternatives.map((m) => scoreMove(pos, m, 4)));
      assert.ok(best - second >= 150, `solución única: ${best} vs ${second}`);
    }
  });
}

test('pickPuzzle prioriza conceptos débiles y dificultad adecuada', () => {
  assert.equal(pickPuzzle({ rating: 400 }).id, 'p-free-bishop');
  assert.equal(pickPuzzle({ rating: 400, weakConcepts: ['tactics.fork'] }).concept, 'tactics.fork');
});
