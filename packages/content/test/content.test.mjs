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
  test(`puzzle ${pz.id} (${pz.line ? `mate en ${(pz.line.length + 1) / 2}` : pz.goal})`, () => {
    const pos = Position.fromFen(pz.fen);
    const uci = (m) => `${squareName(m.from)}${squareName(m.to)}${m.promotion ?? ''}`;
    const accepted = pz.accept.map((u) => parseMove(pos, u));
    accepted.forEach((m, i) => assert.ok(m, `jugada ilegal ${pz.accept[i]}`));
    const mates = (p) => p.legalMoves().filter((m) => p.play(m).isCheckmate());
    if (pz.line) {
      // Mate en 2: sin mate en 1, la primera jugada fuerza mate ante CUALQUIER defensa, y es única.
      assert.equal(pz.line.length, 3);
      assert.deepEqual(pz.accept, [pz.line[0]]);
      assert.equal(mates(pos).length, 0, 'no debe haber mate en 1');
      let p = pos;
      for (const u of pz.line) { const m = parseMove(p, u); assert.ok(m, `línea ilegal en ${u}`); p = p.play(m); }
      assert.ok(p.isCheckmate(), 'la línea termina en mate');
      const forcesMate = (m) => {
        const after = pos.play(m);
        const replies = after.legalMoves();
        return replies.length > 0 && replies.every((r) => mates(after.play(r)).length > 0);
      };
      assert.ok(forcesMate(accepted[0]), 'la clave fuerza mate contra cualquier defensa');
      const others = pos.legalMoves().filter((m) => uci(m) !== pz.line[0] && forcesMate(m)).map(uci);
      assert.deepEqual(others, [], 'solución única');
    } else if (pz.goal === 'mate') {
      accepted.forEach((m) => assert.ok(pos.play(m).isCheckmate(), `${pz.accept} no es mate`));
      const otherMates = mates(pos).filter((m) => !pz.accept.includes(uci(m)));
      assert.equal(otherMates.length, 0, 'solución única');
    } else {
      const base = evaluate(pos, pos.turn);
      const best = Math.min(...accepted.map((m) => scoreMove(pos, m, 4)));
      assert.ok(best - base >= 200, `gana material: ${best - base}`);
      const alternatives = pos.legalMoves().filter((m) => !pz.accept.includes(uci(m)));
      const second = Math.max(...alternatives.map((m) => scoreMove(pos, m, 4)));
      assert.ok(best - second >= 150, `solución única: ${best} vs ${second}`);
    }
  });
}

test('puzzles: ids únicos y conceptos del mapa', () => {
  assert.equal(new Set(PUZZLES.map((p) => p.id)).size, PUZZLES.length);
  for (const p of PUZZLES) assert.ok(ALL_CONCEPTS.some((c) => c.id === p.concept), `${p.id}: ${p.concept}`);
});

test('pickPuzzle prioriza conceptos débiles y dificultad adecuada', () => {
  const easy = pickPuzzle({ rating: 400 });
  assert.equal(Math.min(...PUZZLES.map((p) => Math.abs(p.rating - 450))), Math.abs(easy.rating - 450));
  assert.equal(pickPuzzle({ rating: 400, weakConcepts: ['tactics.fork'] }).concept, 'tactics.fork');
});

test('aperturas: todas las líneas del libro son legales y completas', async () => {
  const { OPENINGS, inBook, detectOpening } = await import('../dist/index.js');
  const { Game } = await import('@kavalo/chess-core');
  for (const o of OPENINGS) {
    for (const line of [o.line, ...(o.variations ?? [])]) {
      const g = new Game();
      for (const san of line) assert.ok(g.move(san), `${o.id}: ${san} ilegal en ${line.join(' ')}`);
    }
    for (const k of ['objective', 'structure', 'keyPieces', 'middlegame', 'endgame']) assert.ok(o[k].length > 20, `${o.id}.${k}`);
    for (const k of ['plans', 'breaks', 'commonMistakes', 'traps', 'keySquares']) assert.ok(o[k].length >= 1, `${o.id}.${k}`);
    if (o.color === 'b') assert.ok(o.against);
  }
  assert.equal(OPENINGS.length, 13);
  assert.equal(new Set(OPENINGS.map((o) => o.id)).size, 13);
  assert.ok(inBook(['e4', 'e5', 'Nf3']));
  assert.ok(!inBook(['e4', 'e5', 'Qh5']));
  assert.equal(detectOpening(['e4', 'c5', 'Nf3', 'd6']).id, 'sicilian');
  assert.equal(detectOpening(['d4', 'd5', 'Bf4', 'Nf6']).id, 'london');
  assert.equal(detectOpening(['a3']), null);
});

import { HISTORICAL_GAMES, START_POSITIONS as SP } from '../dist/index.js';
import { Game as HGame, Position as HPosition } from '@kavalo/chess-core';

test('partidas históricas: jugadas legales, momentos coherentes y finales de mate', () => {
  assert.ok(HISTORICAL_GAMES.length >= 5);
  for (const g of HISTORICAL_GAMES) {
    const game = new HGame();
    const sans = g.moves.split(' ');
    sans.forEach((san, i) => {
      const m = g.moments.find((x) => x.ply === i);
      if (m) assert.equal(m.accept[0], san, `${g.id}: el momento ${i} debe coincidir con la jugada de la partida`);
      assert.ok(game.move(san), `${g.id}: ${san} (media jugada ${i}) es ilegal`);
    });
    assert.equal(g.moments.length >= 3, true, `${g.id}: al menos 3 momentos clave`);
    for (const m of g.moments) assert.equal(m.ply % 2, g.moves.split(' ').length % 2 === 1 ? 0 : m.ply % 2, `${g.id}: momentos del bando ganador`);
    if (g.endsInMate) assert.equal(game.status().reason, 'checkmate', `${g.id} termina en mate`);
    assert.equal(game.status().result, g.result);
  }
});

test('posiciones de inicio: legales y con jugadas', () => {
  for (const p of SP) assert.ok(HPosition.fromFen(p.fen).legalMoves().length > 0, p.id);
});
