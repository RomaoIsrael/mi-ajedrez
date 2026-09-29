import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSquare, Position } from '@kavalo/chess-core';
import {
  attackedPieces, CALC_EXERCISES, checkCoordinate, checkSelection, checkingMoves, coordinateSet, knightDistance,
  knightSquares, lineSquares, scoreCalculation, seeded, threatenedPieces, undefendedPieces, visionSet, VISION_FENS,
} from '../dist/index.js';

const sq = parseSquare;

test('coordenadas: casillas del caballo y colores', () => {
  assert.deepEqual(knightSquares(sq('a1')).map((s) => s), [sq('c2'), sq('b3')].sort((a, b) => a - b));
  assert.equal(knightSquares(sq('e4')).length, 8);
  const set = coordinateSet(40, seeded(3));
  assert.equal(set.length, 40);
  for (const ex of set) {
    if (ex.kind === 'find-square') assert.ok(checkCoordinate(ex, ex.square));
    if (ex.kind === 'square-color') assert.ok(checkCoordinate(ex, ex.answer) && !checkCoordinate(ex, ex.answer === 'light' ? 'dark' : 'light'));
    if (ex.kind === 'knight-squares') assert.ok(checkCoordinate(ex, [...ex.answer].reverse()) && !checkCoordinate(ex, ex.answer.slice(1)));
  }
  // a1 es oscura, h1 clara.
  assert.ok(checkCoordinate({ kind: 'square-color', square: sq('a1'), prompt: '', answer: 'dark' }, 'dark'));
  assert.deepEqual(coordinateSet(5, seeded(9)), coordinateSet(5, seeded(9)), 'determinista con semilla');
});

test('visión: atacadas, indefensas y amenazas en una posición conocida', () => {
  // Blancas: Rg1, Dd1, Cf3; negras: Rg8, Ab4 (indefenso) y peón e5 que ataca… nada. Alfil ataca e1? no.
  const pos = Position.fromFen('6k1/8/8/4p3/1b6/5N2/8/3Q2K1 w - - 0 1');
  assert.deepEqual(undefendedPieces(pos, 'b').map((s) => s).sort(), [sq('e5'), sq('b4')].sort((a, b) => a - b));
  assert.deepEqual(attackedPieces(pos, 'b'), [sq('e5')], 'el caballo de f3 ataca e5');
  // Si jugaran negras: el alfil de b4 no ataca nada; la dama d1 no está atacada.
  assert.deepEqual(threatenedPieces(pos.withTurn('b'), 'w'), []);
  // Dama atacada por un peón = amenazada aunque esté defendida.
  const p2 = Position.fromFen('6k1/8/8/8/4p3/3Q4/8/3R2K1 b - - 0 1');
  assert.deepEqual(threatenedPieces(p2, 'w'), [sq('d3')]);
});

test('visión: líneas, rutas de caballo y jaques', () => {
  const pos = Position.fromFen('6k1/8/8/8/8/8/1P6/R5K1 w - - 0 1');
  const rook = lineSquares(pos, sq('a1'));
  assert.ok(rook.includes(sq('a8')) && rook.includes(sq('b1')) && rook.includes(sq('g1')) && !rook.includes(sq('h1')));
  assert.equal(knightDistance(sq('a1'), sq('b3')), 1);
  assert.equal(knightDistance(sq('a1'), sq('h8')), 6);
  assert.equal(knightDistance(sq('e4'), sq('e5')), 3);
  assert.deepEqual(checkingMoves(Position.fromFen('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1')), ['d1d8']);
});

test('visión: series válidas desde las posiciones de contenido', () => {
  assert.ok(VISION_FENS.length > 20);
  const set = visionSet(30, seeded(11));
  assert.equal(set.length, 30);
  for (const ex of set) {
    assert.ok(ex.answer.length > 0, ex.kind);
    assert.ok(checkSelection(ex.answer, ex.answer).correct);
  }
  const c = checkSelection(['e4', 'd5'], ['e4', 'h1']);
  assert.deepEqual([c.correct, c.found, c.missed, c.wrong], [false, ['e4'], ['d5'], ['h1']]);
});

test('cálculo: mide profundidad, candidatas y errores', () => {
  assert.ok(CALC_EXERCISES.length >= 2, 'hay mates en 2 para calcular');
  const ex = CALC_EXERCISES[0];
  const pos = Position.fromFen(ex.fen);
  const perfect = scoreCalculation(ex, { candidates: [ex.line[0]], line: ex.line });
  assert.equal(perfect.depth, ex.line.length);
  assert.equal(perfect.accuracy, 1);
  assert.ok(perfect.bestAmongCandidates);
  const wrongReply = pos.play(pos.legalMoves().find((m) => `${'abcdefgh'[m.from & 7]}${(m.from >> 3) + 1}${'abcdefgh'[m.to & 7]}${(m.to >> 3) + 1}` === ex.line[0]));
  const other = wrongReply.legalMoves().map((m) => `${'abcdefgh'[m.from & 7]}${(m.from >> 3) + 1}${'abcdefgh'[m.to & 7]}${(m.to >> 3) + 1}${m.promotion ?? ''}`).find((u) => u !== ex.line[1]);
  if (other) {
    const r = scoreCalculation(ex, { candidates: [], line: [ex.line[0], other, ex.line[2]] });
    assert.equal(r.depth, 1);
    assert.equal(r.firstError, 1);
    assert.equal(r.bestAmongCandidates, false);
  }
  const bad = scoreCalculation(ex, { candidates: ['Zz9'], line: ['Zz9'] });
  assert.equal(bad.depth, 0);
  assert.equal(bad.illegal, 1);
});
