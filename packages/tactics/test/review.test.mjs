import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '@kavalo/chess-core';
import { scoreToCp } from '@kavalo/engine';
import { reviewGame, pvToSan } from '../dist/index.js';
import { createNodeEngine } from '../../../tools/stockfish-node.mjs';

const engine = createNodeEngine();
after(() => engine.quit());

async function evalsFor(game) {
  const positions = [game.history[0]?.before ?? game.position, ...game.history.map((p) => p.after)];
  const out = [];
  for (const pos of positions) {
    if (pos.isCheckmate()) { out.push({ cp: -10000, mate: 0, best: null, pv: [] }); continue; }
    if (pos.isStalemate()) { out.push({ cp: 0, best: null, pv: [] }); continue; }
    const a = await engine.analyse(pos.toFen(), { depth: 12 });
    const l = a.lines[0];
    out.push({ cp: scoreToCp(l), mate: l.mate, best: a.bestmove, pv: l.pv });
  }
  return out;
}

test('partida con un error grave táctico: libro, error explicado y mate final', async () => {
  const game = Game.fromPgn('1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#');
  const r = reviewGame(game.history, await evalsFor(game), { level: 'beginner' });
  assert.equal(r.moves[0].moveClass, 'book', '1.e4 es de libro');
  const nf6 = r.moves[5];
  assert.equal(nf6.san, 'Cf6');
  assert.equal(nf6.moveClass, 'blunder');
  assert.equal(nf6.explanation.title, 'Permites jaque mate', 'la explicación usa la causa táctica');
  assert.ok(nf6.bestSan, 'propone la jugada correcta');
  assert.ok(['best', 'excellent'].includes(r.moves[6].moveClass), 'Dxf7# es la mejor');
  assert.ok(r.accuracy.b < r.accuracy.w);
});

test('error posicional sin táctica: explicación con el motor y sin números para principiantes', async () => {
  const game = Game.fromPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. Ke2');
  const evals = await evalsFor(game);
  const beginner = reviewGame(game.history, evals, { level: 'beginner' }).moves[6];
  assert.ok(['inaccuracy', 'mistake', 'blunder'].includes(beginner.moveClass), beginner.moveClass);
  assert.match(beginner.explanation.whatWentWrong, /la posición pasa de/);
  assert.doesNotMatch(beginner.explanation.whatWentWrong, /[+-]\d\.\d/, 'sin números para principiantes');
  assert.match(beginner.explanation.why, /^Mejor era /);
  assert.equal(beginner.concept, 'calculation.candidates');
  const advanced = reviewGame(game.history, evals, { level: 'advanced' }).moves[6];
  assert.match(advanced.explanation.whatWentWrong, /[+-]\d\.\d/, 'con números para avanzados');
});

test('pvToSan traduce la variante del motor', () => {
  const g = new Game();
  assert.deepEqual(pvToSan(g.position, ['e2e4', 'e7e5', 'g1f3'], 5), ['e4', 'e5', 'Cf3']);
  assert.deepEqual(pvToSan(g.position, ['e2e4', 'zzzz'], 5), ['e4']);
});
