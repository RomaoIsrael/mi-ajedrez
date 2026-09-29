import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, Position, parseMove, parseSquare } from '@kavalo/chess-core';
import { analyzeMove, explain, hangingPieces, hintLadder, matesInOne, moveEffects, threatWarning } from '../dist/index.js';

const analyze = (fen, san) => {
  const pos = Position.fromFen(fen);
  const move = parseMove(pos, san);
  assert.ok(move, `jugada ${san} ilegal en ${fen}`);
  return analyzeMove(pos, move);
};

test('hangingPieces: pieza sin defensa y pieza atacada por otra de menor valor', () => {
  // Dama negra en d4 sin defensa (atacada por el peón e3) y caballo en g5 sin defensa (atacado por Cf3).
  const pos = Position.fromFen('4k3/8/8/6n1/3q4/4PN2/8/4K3 w - - 0 1');
  const h = hangingPieces(pos, 'b');
  assert.deepEqual(h.map((x) => [x.square, x.type, x.gain]), [[parseSquare('d4'), 'q', 9], [parseSquare('g5'), 'n', 3]]);
  // El caballo de e5 está defendido por la dama y atacado por otra pieza menor: no está colgado.
  const defended = Position.fromFen('4k3/8/8/4n3/3q4/4PN2/8/4K3 w - - 0 1');
  assert.deepEqual(hangingPieces(defended, 'b').map((x) => [x.type, x.gain]), [['q', 9]]);
});

test('una pieza defendida y atacada por otra igual no está colgada', () => {
  const pos = Position.fromFen('4k3/8/3p4/4n3/8/5N2/8/4K3 w - - 0 1');
  assert.equal(hangingPieces(pos, 'b').length, 0);
});

test('mate en 1', () => {
  const pos = Position.fromFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
  assert.deepEqual(matesInOne(pos).map((m) => m.to), [parseSquare('a8')]);
});

test('analyzeMove: dejar el caballo colgado es error grave con explicación completa', () => {
  // Blancas juegan Nd5?? y el caballo queda atacado por el peón de e6... usamos una posición sencilla:
  const a = analyze('4k3/8/4p3/8/8/2N5/8/4K3 w - - 0 1', 'Nd5');
  assert.equal(a.primary.kind, 'hanging-piece');
  assert.equal(a.severity, 'blunder');
  assert.equal(a.concept, 'vision.undefended-pieces');
  const e = explain(a, { locale: 'es', level: 'beginner' });
  assert.equal(e.title, 'Tu caballo quedó sin defensa');
  assert.match(e.why, /peón de e6/);
  assert.match(e.consequence, /3 puntos/);
  assert.ok(e.howToAvoid.includes('pregunta 6'));
  assert.deepEqual(e.highlights, [parseSquare('d5')]);
  assert.equal(e.question, undefined, 'la 1.ª vez se explica, no se pregunta');
});

test('analyzeMove: mate perdido', () => {
  const a = analyze('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', 'Kf2');
  assert.equal(a.primary.kind, 'missed-mate');
  assert.equal(a.severity, 'blunder');
  const e = explain(a, { locale: 'en' });
  assert.equal(e.title, 'There was a checkmate');
});

test('analyzeMove: dar mate es excelente', () => {
  const a = analyze('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', 'Ra8#');
  assert.equal(a.severity, 'excellent');
  assert.equal(explain(a).title, '¡Jaque mate!');
});

test('analyzeMove: ignorar una amenaza', () => {
  // La torre blanca de d4 está atacada por el peón c5; las blancas juegan h3 sin atender.
  const a = analyze('4k3/8/8/2p5/3R4/8/7P/4K3 w - - 0 1', 'h3');
  assert.equal(a.primary.kind, 'ignored-threat');
  assert.equal(a.severity, 'blunder');
  assert.equal(explain(a).title, 'Tu torre seguía amenazada');
});

test('analyzeMove: captura perdida', () => {
  const a = analyze('4k3/8/8/4n3/8/5N2/6PP/4K3 w - - 0 1', 'h3');
  assert.equal(a.primary.kind, 'missed-capture');
  assert.equal(a.severity, 'mistake');
});

test('analyzeMove: un cambio equilibrado no es error', () => {
  const a = analyze('4k3/8/3p4/4n3/8/5N2/8/4K3 w - - 0 1', 'Nxe5');
  assert.notEqual(a.severity, 'blunder');
  assert.notEqual(a.primary?.kind, 'hanging-piece');
});

test('memoria pedagógica: la 3.ª vez se pregunta en vez de explicar', () => {
  const a = analyze('4k3/8/4p3/8/8/2N5/8/4K3 w - - 0 1', 'Nd5');
  const e = explain(a, { memoryStage: 3 });
  assert.equal(e.why, undefined);
  assert.ok(e.question);
});

test('hintLadder: 5 pistas de lo general a la respuesta', () => {
  const pos = Position.fromFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
  const h = hintLadder(pos);
  assert.equal(h.steps.length, 5);
  assert.equal(h.concept, 'tactics.mate-in-1');
  assert.match(h.steps[0].text, /jaques/);
  assert.match(h.steps[2].text, /torre de a1/);
  assert.match(h.steps[4].text, /^Ta8#/);
});

test('hintLadder: rescatar una pieza amenazada', () => {
  const pos = Position.fromFen('4k3/8/8/2p5/3R4/8/7P/4K3 w - - 0 1');
  const h = hintLadder(pos);
  assert.equal(h.concept, 'vision.threats');
  const after = pos.play(h.move);
  assert.equal(hangingPieces(after, 'w').length, 0);
});

test('threatWarning tras la jugada rival', () => {
  const g = new Game('4k3/8/2p5/8/3R4/8/7P/4K3 b - - 0 1');
  g.move('c5');
  const w = threatWarning(g.position);
  assert.match(w.text, /torre de d4/);
});

test('moveEffects: ¿por qué Cf3?', () => {
  const pos = Position.start();
  const effects = moveEffects(pos, parseMove(pos, 'Nf3')).map((e) => e.text);
  assert.ok(effects.includes('Desarrolla el caballo.'));
  assert.ok(effects.some((t) => /controla d4, e5|controla e5, d4/.test(t)), effects.join(' | '));
});
