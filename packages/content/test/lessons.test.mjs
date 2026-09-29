/** Verificación automática de las respuestas de cada lección con el motor de reglas. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Position, parseMove, parseSquare, squareName } from '@kavalo/chess-core';
import { hangingPieces } from '@kavalo/tactics';
import { LESSONS } from '../dist/index.js';

const lesson = (id) => LESSONS.find((l) => l.id === id);
const steps = (id, kind) => lesson(id).steps.filter((s) => s.kind === kind);
const targets = (fen, from) => Position.fromFen(fen).legalMoves(parseSquare(from)).map((m) => squareName(m.to)).sort();
const sorted = (a) => [...a].sort();
const play = (fen, uci) => { const p = Position.fromFen(fen); const m = parseMove(p, uci); assert.ok(m, `${uci} ilegal`); return { before: p, move: m, after: p.play(m) }; };
const flip = (fen) => Position.fromFen(fen.replace(' w ', ' b '));
const mobility = (pos, sq) => pos.withTurn(pos.get(sq).color).legalMoves(sq).length;

test('todas las lecciones: ids únicos y cada paso tiene texto', () => {
  assert.equal(new Set(LESSONS.map((l) => l.id)).size, LESSONS.length);
  assert.ok(LESSONS.length >= 19);
  for (const l of LESSONS) for (const s of l.steps) assert.ok(s.text.length > 10, `${l.id}/${s.kind}`);
});

test('selección de casillas = jugadas legales reales de la pieza', () => {
  const cases = { rook: 'c3', bishop: 'c4', pawn: 'd4', knight: 'e4' };
  for (const [id, from] of Object.entries(cases)) {
    const s = steps(id, 'select')[0];
    assert.deepEqual(targets(s.fen, from), sorted(s.answer), id);
  }
  const [queen, king] = steps('queen-king', 'select');
  assert.deepEqual(targets(queen.fen, 'a1'), sorted(queen.answer));
  assert.deepEqual(targets(king.fen, 'd4'), sorted(king.answer));
});

test('«reach»: el objetivo se alcanza exactamente en los movimientos indicados', () => {
  for (const l of LESSONS) for (const s of l.steps.filter((x) => x.kind === 'reach')) {
    const target = parseSquare(s.target);
    let frontier = [{ pos: Position.fromFen(s.fen), sq: parseSquare(s.from) }];
    let found = -1;
    for (let d = 1; d <= s.maxMoves && found < 0; d++) {
      frontier = frontier.flatMap(({ pos, sq }) => pos.legalMoves(sq).flatMap((m) => {
        try { return [{ pos: pos.play(m).withTurn('w'), sq: m.to }]; } catch { return []; }
      }));
      if (frontier.some((f) => f.sq === target)) found = d;
    }
    assert.equal(found, s.maxMoves, `${l.id}: mínimo necesario`);
  }
});

test('reglas especiales: enroque, promoción y captura al paso', () => {
  const [castle, promo, ep] = steps('special', 'move');
  assert.equal(play(castle.fen, castle.accept[0]).move.castle, 'k');
  for (const u of promo.accept) assert.ok(play(promo.fen, u).move.promotion);
  assert.equal(play(ep.fen, ep.accept[0]).move.enPassant, true);
  assert.equal(play(steps('castling', 'move')[0].fen, 'e1g1').move.castle, 'k');
});

test('amenazas: la pieza señalada está colgada y las salidas aceptadas son todas las seguras', () => {
  const sel = steps('threats', 'select')[0];
  assert.deepEqual(hangingPieces(Position.fromFen(sel.fen), 'w').map((h) => squareName(h.square)), sel.answer);
  const mv = steps('threats', 'move')[0];
  const pos = Position.fromFen(mv.fen);
  for (const m of pos.legalMoves(parseSquare('g4'))) {
    const safe = hangingPieces(pos.play(m), 'w').length === 0;
    const uci = squareName(m.from) + squareName(m.to);
    assert.equal(mv.accept.includes(uci), safe, `${uci}: ${safe ? 'segura' : 'en peligro'}`);
  }
});

test('horquillas: la jugada ataca dos objetivos valiosos', () => {
  const [knight, pawn] = steps('fork', 'move');
  const k = play(knight.fen, knight.accept[0]);
  assert.ok(k.after.inCheck(), 'la horquilla de caballo da jaque');
  assert.ok(k.after.attackers(parseSquare('c8'), 'w').includes(k.move.to), 'y ataca la torre');
  const p = play(pawn.fen, pawn.accept[0]);
  for (const s of ['b6', 'd6']) assert.ok(p.after.attackers(parseSquare(s), 'w').includes(p.move.to), s);
});

test('clavada: la pieza señalada es la única negra sin jugadas, y Te1 clava la dama', () => {
  const sel = steps('pin', 'select')[0];
  const pos = flip(sel.fen);
  const frozen = pos.board.map((pc, sq) => ({ pc, sq }))
    .filter(({ pc, sq }) => pc && pc.color === 'b' && pc.type !== 'k' && pos.legalMoves(sq).length === 0)
    .map(({ sq }) => squareName(sq));
  assert.deepEqual(frozen, sel.answer);
  const mv = steps('pin', 'move')[0];
  const { after } = play(mv.fen, mv.accept[0]);
  const queenMoves = after.legalMoves(parseSquare('e5')).map((m) => squareName(m.to));
  assert.ok(queenMoves.every((s) => s[0] === 'e'), 'la dama solo puede moverse por la columna e');
});

test('ensartada y ataque descubierto', () => {
  for (const s of steps('skewer', 'move')) {
    const { after } = play(s.fen, s.accept[0]);
    assert.ok(after.inCheck(), 'la ensartada empieza con jaque');
  }
  const [bishop, knight] = steps('discovered', 'move');
  for (const u of bishop.accept) {
    const { after, move } = play(bishop.fen, u);
    const checkers = after.attackers(after.kingSquare('b'), 'w');
    assert.ok(checkers.some((sq) => sq !== move.to), 'jaque descubierto por la torre');
  }
  for (const u of knight.accept) {
    const { after } = play(knight.fen, u);
    assert.ok(after.inCheck());
    assert.ok(after.attackers(parseSquare('d8'), 'w').includes(parseSquare('d1')), 'la torre ataca la dama');
  }
});

test('desarrollo: las jugadas aceptadas sacan un caballo o un alfil', () => {
  const mv = steps('development', 'move')[0];
  for (const u of mv.accept) {
    const { move } = play(mv.fen, u);
    assert.ok((move.piece === 'n' || move.piece === 'b') && (move.from >> 3) === 0, u);
  }
});

test('actividad: el alfil de c1 es la pieza con menos movilidad y las jugadas aceptadas lo liberan', () => {
  const quiz = steps('activity', 'quiz')[0];
  const pos = Position.fromFen(quiz.fen);
  const mob = ['d4', 'c1', 'h1'] // mismo orden que las opciones del quiz
    .map((s) => mobility(pos, parseSquare(s)));
  assert.equal(mob[quiz.answer], Math.min(...mob));
  const mv = steps('activity', 'move')[0];
  for (const u of mv.accept) {
    const { after } = play(mv.fen, u);
    assert.ok(mobility(after, parseSquare('c1')) > 0, u);
  }
});

test('estructura de peones: doblados, aislado y pasado', () => {
  const [doubled, isolated, passed] = steps('pawn-structure', 'select');
  const pawns = (pos, color) => pos.board.map((p, sq) => ({ p, sq })).filter(({ p }) => p?.type === 'p' && p.color === color).map(({ sq }) => sq);
  const f = (sq) => sq & 7; const r = (sq) => sq >> 3;
  let pos = Position.fromFen(doubled.fen);
  let w = pawns(pos, 'w');
  assert.deepEqual(sorted(w.filter((a) => w.some((b) => b !== a && f(b) === f(a))).map(squareName)), sorted(doubled.answer));
  pos = Position.fromFen(isolated.fen);
  w = pawns(pos, 'w');
  assert.deepEqual(w.filter((a) => !w.some((b) => Math.abs(f(b) - f(a)) === 1)).map(squareName), isolated.answer);
  pos = Position.fromFen(passed.fen);
  w = pawns(pos, 'w');
  const b = pawns(pos, 'b');
  assert.deepEqual(w.filter((a) => !b.some((x) => Math.abs(f(x) - f(a)) <= 1 && r(x) > r(a))).map(squareName), passed.answer);
});

test('finales: ahogado real, oposición y regla del cuadrado', () => {
  const kq = steps('kq-vs-k', 'quiz')[0];
  assert.equal(Position.fromFen(kq.fen).isStalemate(), true);
  const practice = steps('kq-vs-k', 'play')[0];
  const start = Position.fromFen(practice.fen);
  assert.ok(!start.inCheck() && start.legalMoves().length > 0);
  const opp = steps('opposition', 'move')[0];
  const { after } = play(opp.fen, opp.accept[0]);
  const wk = after.kingSquare('w'); const bk = after.kingSquare('b');
  assert.ok((wk & 7) === (bk & 7) && Math.abs((wk >> 3) - (bk >> 3)) === 2 && after.turn === 'b', 'oposición directa, mueven negras');
  const sq = steps('opposition', 'quiz')[0];
  const pos = Position.fromFen(sq.fen);
  const pawn = pos.board.findIndex((p) => p?.type === 'p');
  const king = pos.kingSquare('b');
  const pawnMoves = 7 - (pawn >> 3);
  const kingDist = Math.max(Math.abs((king & 7) - (pawn & 7)), Math.abs((king >> 3) - 7));
  const catches = kingDist <= pawnMoves; // juegan negras
  assert.equal(sq.answer, catches ? 0 : 1);
});
