import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '@kavalo/chess-core';
import { scoreToCp } from '@kavalo/engine';
import { reviewGame } from '@kavalo/tactics';
import { compareDna, computeDna, describeDna, dnaAdvice, extractFeatures, suggestOpenings } from '../dist/index.js';
import { createNodeEngine } from '../../../tools/stockfish-node.mjs';

const S = (mean, n) => ({ sum: mean * n, n });
/** Partida sintética con rasgos controlados. */
function game(p = {}) {
  return {
    moves: 30, accuracy: S(p.acc ?? 75, 30), quiet: S(p.quiet ?? 75, 15), forced: S(p.forced ?? 75, 10),
    chances: p.chances ?? 3, chancesTaken: p.taken ?? 2, defense: S(p.defense ?? 65, 5), advantage: S(p.advantage ?? 70, 6),
    endgame: S(p.endgame ?? 65, 6), attackMoves: p.attack ?? 6, sacrifices: p.sac ?? 0, soundSacrifices: p.soundSac ?? 0,
    trades: p.trades ?? 3, openMoves: p.open ?? 12, fast: S(p.fast ?? 75, 15), slow: S(p.slow ?? 75, 15),
    pressure: S(65, 5), avgMoveMs: 8000, timeTroubleMoves: p.tt ?? 0, maxAdvantage: p.maxAdv ?? 200,
    result: p.result ?? 'win', castledByMove: p.castled ?? 8,
  };
}
const attacker = (i) => game({ attack: 13 + (i % 3), taken: 3, chances: 3, endgame: 38 + (i % 5), advantage: 52, maxAdv: 450, result: i % 2 ? 'draw' : 'loss', sac: 1, soundSac: 1, open: 24 });

test('perfil en construcción con menos de 5 partidas', () => {
  const dna = computeDna([game(), game()]);
  assert.equal(dna.confidence, 'building');
  assert.match(describeDna(dna)[0], /Perfil en construcción/);
  assert.deepEqual(dnaAdvice(dna), []);
});

test('atacante táctico con finales débiles: el ADN lo refleja y cambia el entrenamiento', () => {
  const dna = computeDna(Array.from({ length: 12 }, (_, i) => attacker(i)));
  const v = Object.fromEntries(dna.dims.map((d) => [d.key, d.value]));
  assert.ok(v.attack >= 60, `ataque ${v.attack}`);
  assert.ok(v.tactics >= 90, `táctica ${v.tactics}`);
  assert.ok(v.endgame < 50, `finales ${v.endgame}`);
  const advice = dnaAdvice(dna);
  assert.equal(advice[0].id, 'endgames');
  assert.match(advice[0].message, /pierdes parte de tus ventajas al llegar al final/);
  assert.ok(dna.style.dynamic >= 55, `dinámico ${dna.style.dynamic}`);
  assert.match(describeDna(dna).join(' '), /tiendes a/);
});

test('intervalos: más partidas = más confianza; cada dimensión tiene intervalo', () => {
  const varied = (i) => game({ quiet: 55 + ((i * 17) % 40), forced: 50 + ((i * 11) % 45) });
  const few = computeDna(Array.from({ length: 6 }, (_, i) => varied(i)));
  const many = computeDna(Array.from({ length: 30 }, (_, i) => varied(i)));
  const width = (d) => d.dims.find((x) => x.key === 'strategy').high - d.dims.find((x) => x.key === 'strategy').low;
  assert.ok(width(many) < width(few), `ancho con 30: ${width(many)} · con 6: ${width(few)}`);
  assert.equal(many.confidence, 'high');
  for (const d of many.dims) if (d.value !== null) assert.ok(d.low <= d.value && d.value <= d.high, d.key);
});

test('evolución antes → ahora: detecta mejoras reales y no celebra el ruido', () => {
  const before = computeDna(Array.from({ length: 20 }, (_, i) => game({ defense: 40 + (i % 4) })));
  const after = computeDna(Array.from({ length: 20 }, (_, i) => game({ defense: 70 + (i % 4) })));
  const same = computeDna(Array.from({ length: 20 }, (_, i) => game({ defense: 41 + (i % 4) })));
  const change = compareDna(before, after).find((c) => c.key === 'defense');
  assert.ok(change.significant && change.delta >= 25);
  assert.ok(!compareDna(before, same).find((c) => c.key === 'defense').significant);
});

test('aperturas compatibles: estilo dinámico → Siciliana; estilo sólido → Caro-Kann', () => {
  const dynamic = computeDna(Array.from({ length: 10 }, (_, i) => attacker(i)));
  const solid = computeDna(Array.from({ length: 10 }, () => game({ attack: 2, open: 3, trades: 7, sac: 0 })));
  const vsE4 = (dna) => suggestOpenings(dna, { level: 'advanced', color: 'b', against: '1.e4' }).map((s) => s.opening.id);
  assert.equal(vsE4(dynamic)[0], 'sicilian');
  assert.equal(vsE4(solid)[0], 'caro-kann');
  const beginner = suggestOpenings(solid, { level: 'beginner', color: 'w' });
  assert.ok(beginner.every((s) => s.opening.minLevel === 'beginner'));
  assert.match(beginner[0].reason, /Puede resultarte interesante/);
});

test('rasgos extraídos de una partida real analizada con Stockfish', async () => {
  const engine = createNodeEngine();
  after(() => engine.quit());
  const g = Game.fromPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 Nxe4 8. O-O Nxc3 9. bxc3 Bxc3 10. Qb3 d5 11. Bxd5 O-O 12. Bxf7+ Rxf7 13. Qxc3');
  const positions = [g.history[0].before, ...g.history.map((p) => p.after)];
  const evals = [];
  for (const pos of positions) {
    const a = await engine.analyse(pos.toFen(), { depth: 10 });
    evals.push({ cp: scoreToCp(a.lines[0]), best: a.bestmove, pv: a.lines[0].pv });
  }
  const review = reviewGame(g.history, evals, { level: 'intermediate' });
  const f = extractFeatures(review, g.history, { userColor: 'w', result: 'win', moveTimes: Array.from({ length: 13 }, (_, i) => 2000 + i * 500) });
  assert.ok(f.moves >= 7 && f.moves <= 13, `jugadas analizadas ${f.moves}`);
  assert.equal(f.castledByMove, 8);
  assert.equal(f.attackMoves, 1, 'Axf7+ es la única jugada de ataque blanca');
  assert.ok(f.accuracy.n === f.moves && f.fast.n + f.slow.n === f.moves);
  assert.ok(f.avgMoveMs > 0);
});
