import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { classify, describeEval, formatEval, gameAccuracy, parseInfo, scoreToCp, winProb } from '../dist/index.js';
import { createNodeEngine } from '../../../tools/stockfish-node.mjs';

const engine = createNodeEngine();
after(() => engine.quit());

test('parseInfo: variantes, mates y cotas', () => {
  assert.deepEqual(parseInfo('info depth 12 seldepth 2 multipv 1 score mate 1 nodes 1 pv d1d8'), { multipv: 1, depth: 12, mate: 1, pv: ['d1d8'] });
  assert.deepEqual(parseInfo('info depth 9 multipv 2 score cp -35 nodes 9 pv e7e5 g1f3'), { multipv: 2, depth: 9, cp: -35, pv: ['e7e5', 'g1f3'] });
  assert.equal(parseInfo('info depth 9 score cp 20 lowerbound nodes 9 pv e2e4'), null);
  assert.equal(parseInfo('info string NNUE evaluation enabled'), null);
});

test('Stockfish arranca por UCI', async () => {
  const name = await engine.init();
  assert.match(name, /Stockfish 19/);
});

test('Stockfish encuentra el mate en 1 y devuelve varias variantes', async () => {
  const a = await engine.analyse('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', { depth: 10, multipv: 3 });
  assert.equal(a.bestmove, 'd1d8');
  assert.equal(a.lines[0].mate, 1);
  assert.equal(a.lines.length, 3);
});

test('las búsquedas simultáneas se encolan sin mezclarse', async () => {
  const [x, y] = await Promise.all([
    engine.analyse('4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1', { depth: 8 }),
    engine.analyse('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', { depth: 8 }),
  ]);
  assert.equal(x.bestmove, 'd1d5');
  assert.equal(y.bestmove, 'a1a8');
});

test('fuerza limitada por Elo y Skill Level se aplican', async () => {
  const a = await engine.analyse('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { movetime: 200, elo: 1400 });
  assert.ok(a.bestmove);
  const b = await engine.analyse('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { depth: 6, skill: 3 });
  assert.ok(b.bestmove);
});

test('probabilidad de victoria y clasificación por pérdida', () => {
  assert.equal(winProb(0), 0.5);
  assert.ok(winProb(300) > 0.7 && winProb(-300) < 0.3);
  assert.equal(scoreToCp({ mate: 1 }), 9990);
  assert.equal(scoreToCp({ mate: -2 }), -9980);
  const c = (bestCp, playedCp, extra = {}) => classify({ bestCp, playedCp, isBest: false, ...extra }).moveClass;
  assert.equal(classify({ bestCp: 30, playedCp: 30, isBest: true }).moveClass, 'best');
  // Pérdidas reales desde +0,3: 20→0,9 % · −10→3,7 % · −50→7,3 % · −150→16,2 % · −500→39,1 %
  assert.equal(c(30, 20), 'excellent');
  assert.equal(c(30, -10), 'good');
  assert.equal(c(30, -50), 'inaccuracy');
  assert.equal(c(30, -150), 'mistake');
  assert.equal(c(30, -500), 'blunder');
  assert.equal(c(900, 50), 'missed-win');
  assert.equal(c(30, -50, { level: 'beginner' }), 'good', 'umbrales relajados para principiantes');
  assert.equal(classify({ bestCp: 150, playedCp: 150, isBest: true, sacrifice: true }).moveClass, 'brilliant');
  assert.equal(classify({ bestCp: 1500, playedCp: 1500, isBest: true, sacrifice: true }).moveClass, 'best', 'no es brillante si ya estaba ganado');
  assert.equal(classify({ bestCp: 20, playedCp: 20, isBest: true, inBook: true }).moveClass, 'book');
});

test('precisión y lenguaje sin números', () => {
  assert.equal(Math.round(classify({ bestCp: 0, playedCp: 0, isBest: true }).accuracy), 100);
  assert.ok(gameAccuracy([100, 100, 20]) < gameAccuracy([100, 100, 90]));
  assert.equal(gameAccuracy([]), null);
  assert.equal(describeEval(10), 'igualdad');
  assert.equal(describeEval(250), 'ventaja clara tuya');
  assert.equal(describeEval(-500), 'ventaja decisiva del rival');
  assert.equal(describeEval(9990), 'tienes mate');
  assert.equal(formatEval({ cp: 123 }), '+1.2');
  assert.equal(formatEval({ mate: -3 }), 'M3');
});
