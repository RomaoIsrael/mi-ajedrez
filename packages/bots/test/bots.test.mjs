import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, Position, moveToSan } from '@kavalo/chess-core';
import { BOT_LEVELS, bestMove, chooseMove, scoreMove } from '../dist/index.js';

// Generador pseudoaleatorio con semilla para tests reproducibles.
const seeded = (seed) => () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

test('todos los niveles devuelven una jugada legal', () => {
  const pos = Position.start();
  for (const { level } of BOT_LEVELS) {
    const { move } = chooseMove(pos, { level, random: seeded(level) });
    assert.ok(pos.legalMoves().some((m) => m.from === move.from && m.to === move.to), `nivel ${level}`);
  }
});

test('nivel 6 captura una dama gratis y ve el mate en 1', () => {
  const free = Position.fromFen('4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1');
  assert.equal(moveToSan(free, chooseMove(free, { level: 6, random: seeded(1) }).move), 'Rxd5');
  const mate = Position.fromFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
  assert.equal(moveToSan(mate, chooseMove(mate, { level: 3, random: seeded(2) }).move), 'Ra8#');
});

test('los niveles bajos cometen errores con más frecuencia que los altos', () => {
  // Medio juego con piezas atacadas y defendidas: hay muchas formas de perder material.
  const pos = Game.fromPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Bc5 5. Nc3 d6').position;
  const ref = new Map(pos.legalMoves().map((m) => [m, scoreMove(pos, m)]));
  const best = Math.max(...ref.values());
  const errors = (level) => {
    const rnd = seeded(7);
    let n = 0;
    for (let i = 0; i < 10; i++) {
      const { move } = chooseMove(pos, { level, random: rnd });
      const s = [...ref].find(([m]) => m.from === move.from && m.to === move.to)[1];
      if (best - s > 150) n++;
    }
    return n;
  };
  const low = errors(1);
  const high = errors(4);
  assert.ok(low > high, `nivel 1: ${low}, nivel 4: ${high}`);
});

test('bestMove encuentra la captura ganadora', () => {
  const pos = Position.fromFen('4k3/8/8/4n3/8/5N2/6PP/4K3 w - - 0 1');
  assert.equal(moveToSan(pos, bestMove(pos)), 'Nxe5');
});

test('rendimiento: el nivel 6 responde en tiempo razonable en el medio juego', () => {
  const g = Game.fromPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+');
  const t0 = performance.now();
  chooseMove(g.position, { level: 6, random: seeded(3) });
  const ms = performance.now() - t0;
  assert.ok(ms < 8000, `${ms.toFixed(0)} ms`);
  console.log(`  nivel 6: ${ms.toFixed(0)} ms`);
});

test('hay 10 niveles; del 7 al 10 juegan con Stockfish por Elo', async () => {
  const { BOT_LEVELS, LOCAL_LEVELS } = await import('../dist/index.js');
  assert.equal(BOT_LEVELS.length, 10);
  assert.equal(LOCAL_LEVELS, 6);
  assert.ok(BOT_LEVELS.slice(6).every((l) => !l.engine.humanize));
  assert.ok(BOT_LEVELS.slice(0, 6).every((l) => l.engine.humanize && l.engine.nodes && l.engine.multipv));
});

test('chooseMoveAsync devuelve una jugada legal sin bloquear', async () => {
  const { chooseMoveAsync } = await import('../dist/index.js');
  const pos = Position.start();
  const { move } = await chooseMoveAsync(pos, { level: 4, random: seeded(9) });
  assert.ok(pos.legalMoves().some((m) => m.from === move.from && m.to === move.to));
});

test('humanización de candidatas de Stockfish: los niveles bajos se equivocan más', async () => {
  const { chooseFromCandidates } = await import('../dist/index.js');
  const { createNodeEngine } = await import('../../../tools/stockfish-node.mjs');
  const { scoreToCp } = await import('@kavalo/engine');
  const engine = createNodeEngine();
  try {
    const pos = Game.fromPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Bc5 5. Nc3 d6').position;
    const a = await engine.analyse(pos.toFen(), { depth: 12, multipv: 8 });
    const candidates = a.lines.map((l) => ({ uci: l.pv[0], cp: scoreToCp(l) }));
    const bestCp = candidates[0].cp;
    const errors = (level) => {
      const rnd = seeded(11);
      let n = 0;
      for (let i = 0; i < 40; i++) {
        const c = chooseFromCandidates(pos, candidates, { level, random: rnd });
        const found = candidates.find((x) => x.uci === `${sq(c.move.from)}${sq(c.move.to)}`);
        if (!found || bestCp - found.cp > 80) n++;
      }
      return n;
    };
    const low = errors(1);
    const high = errors(6);
    assert.ok(low > high, `nivel 1: ${low} errores, nivel 6: ${high}`);
  } finally {
    engine.quit();
  }
});

const sq = (i) => 'abcdefgh'[i & 7] + ((i >> 3) + 1);
