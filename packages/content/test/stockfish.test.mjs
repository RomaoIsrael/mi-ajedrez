/** Segunda verificación de los puzzles, independiente de nuestro motor: Stockfish 19. */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { Position } from '@kavalo/chess-core';
import { scoreToCp } from '@kavalo/engine';
import { PUZZLES } from '../dist/index.js';
import { createNodeEngine } from '../../../tools/stockfish-node.mjs';

const engine = createNodeEngine();
after(() => engine.quit());

for (const pz of PUZZLES) {
  test(`Stockfish confirma ${pz.id}`, async () => {
    const legal = Position.fromFen(pz.fen).legalMoves().length;
    const a = await engine.analyse(pz.fen, { depth: 16, multipv: Math.min(6, legal) });
    const accepted = new Set(pz.accept);
    const best = a.lines[0];
    if (pz.goal === 'mate') {
      const n = pz.line ? (pz.line.length + 1) / 2 : 1;
      assert.equal(best.mate, n, `Stockfish ve mate en ${best.mate ?? '—'} (se esperaba ${n})`);
      const matingFirstMoves = a.lines.filter((l) => l.mate === n).map((l) => l.pv[0]);
      for (const m of matingFirstMoves) assert.ok(accepted.has(m), `otra solución: ${m}`);
      if (pz.line) assert.deepEqual(best.pv.slice(0, 1), [pz.line[0]]);
    } else {
      assert.ok(accepted.has(a.bestmove), `la mejor jugada para Stockfish es ${a.bestmove}`);
      const bestAccepted = Math.max(...a.lines.filter((l) => accepted.has(l.pv[0])).map(scoreToCp));
      const others = a.lines.filter((l) => !accepted.has(l.pv[0])).map(scoreToCp);
      const second = others.length ? Math.max(...others) : -Infinity;
      assert.ok(bestAccepted - second >= 150, `margen insuficiente: ${bestAccepted} vs ${second}`);
      assert.ok(bestAccepted >= 150, `la solución debe dejar ventaja clara (${bestAccepted})`);
    }
  });
}

import { START_POSITIONS } from '../dist/index.js';

for (const sp of START_POSITIONS) {
  test(`Stockfish confirma el objetivo de la posición ${sp.id}`, async () => {
    const pos = Position.fromFen(sp.fen);
    assert.ok(pos.legalMoves().length > 0, 'la posición tiene jugadas');
    const a = await engine.analyse(sp.fen, { depth: 18 });
    const best = a.lines[0];
    const turnCp = best.mate !== undefined ? (best.mate > 0 ? 10000 : -10000) : best.cp;
    const userCp = pos.turn === sp.side ? turnCp : -turnCp;
    if (sp.goal === 'win') assert.ok(userCp >= 200, `debe ser ganadora para el usuario (${userCp})`);
    if (sp.goal === 'draw') assert.ok(Math.abs(userCp) <= 100, `debe ser tablas con buen juego (${userCp})`);
    if (sp.goal === 'play') assert.ok(Math.abs(userCp) <= 150, `debe ser equilibrada (${userCp})`);
  });
}
