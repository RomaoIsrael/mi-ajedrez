import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, Position, perft, parseSquare, localizeSan } from '../dist/index.js';

// Valores de referencia públicos (Chess Programming Wiki, "Perft Results").
const PERFT = [
  ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [20, 400, 8902, 197281]],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
  ['r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10', [46, 2079, 89890]],
];

for (const [fen, counts] of PERFT) {
  test(`perft ${fen}`, () => {
    const pos = Position.fromFen(fen);
    counts.forEach((expected, i) => assert.equal(perft(pos, i + 1), expected, `profundidad ${i + 1}`));
  });
}

test('FEN: ida y vuelta', () => {
  for (const [fen] of PERFT) assert.equal(Position.fromFen(fen).toFen(), fen);
});

test('FEN: entradas inválidas lanzan error', () => {
  const bad = [
    '', 'hola', '8/8/8/8/8/8/8/8 w - - 0 1', // sin reyes
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR x KQkq - 0 1',
    'rnbqkbnr/pppppppp/9/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    'k7/8/8/8/8/8/8/KP6 w - - 0 1'.replace('KP6', 'KP6/8'),
    'P3k3/8/8/8/8/8/8/4K3 w - - 0 1', // peón en 8.ª
    '4k3/8/8/8/8/8/8/4K2r b - - 0 1'.replace(' b ', ' b '), // blancas en jaque y mueven negras
  ];
  for (const fen of bad) assert.throws(() => Position.fromFen(fen), undefined, fen);
});

test('jaque mate del pastor', () => {
  const g = new Game();
  for (const m of ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']) assert.ok(g.move(m), m);
  const s = g.status();
  assert.equal(s.over, true);
  assert.equal(s.reason, 'checkmate');
  assert.equal(s.result, '1-0');
  assert.equal(g.history.at(-1).san, 'Qxf7#');
});

test('ahogado', () => {
  const g = new Game('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  assert.equal(g.status().reason, 'stalemate');
});

test('enroque: permitido, prohibido a través de jaque y tras mover el rey', () => {
  const pos = Position.fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  const castles = pos.legalMoves().filter((m) => m.castle).map((m) => m.castle).sort();
  assert.deepEqual(castles, ['k', 'q']);
  // Alfil negro controla f1: no se puede enrocar corto.
  const attacked = Position.fromFen('r3k2r/8/8/8/8/8/6b1/R3K2R w KQkq - 0 1');
  assert.deepEqual(attacked.legalMoves().filter((m) => m.castle).map((m) => m.castle), ['q']);
  // En jaque no se enroca.
  const inCheck = Position.fromFen('r3k2r/8/8/8/8/8/4r3/R3K2R w KQkq - 0 1');
  assert.equal(inCheck.legalMoves().filter((m) => m.castle).length, 0);
  // Tras Ke2 Ke7 Ke1 Ke8 se pierden los derechos.
  const g = new Game('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  ['Ke2', 'Ke7', 'Ke1', 'Ke8'].forEach((m) => assert.ok(g.move(m), m));
  assert.equal(g.position.legalMoves().filter((m) => m.castle).length, 0);
  assert.match(g.position.toFen(), / w - - /);
});

test('enroque largo permitido aunque b1 esté atacada', () => {
  const pos = Position.fromFen('1r2k3/8/8/8/8/8/8/R3K3 w Q - 0 1');
  assert.ok(pos.legalMoves().some((m) => m.castle === 'q'));
});

test('captura al paso: solo inmediatamente', () => {
  const g = new Game('4k3/8/8/3p4/8/8/4P3/4K3 w - - 0 1');
  g.move('e4');
  g.move('Kd7');
  // Ahora ya no hay peón en d4, probamos el caso real:
  const g2 = new Game('4k3/8/8/8/3p4/8/4P3/4K3 w - - 0 1');
  g2.move('e4');
  assert.ok(g2.position.legalMoves().some((m) => m.enPassant), 'debería poder capturar al paso');
  const m = g2.move('dxe3');
  assert.ok(m);
  assert.equal(m.after.get(parseSquare('e4')), null, 'el peón capturado desaparece');
  const g3 = new Game('4k3/8/8/8/3p4/8/4P3/4K3 w - - 0 1');
  g3.move('e4'); g3.move('Kd7'); g3.move('Kf2');
  assert.ok(!g3.position.legalMoves().some((m) => m.enPassant), 'ya no se puede');
});

test('captura al paso ilegal si deja al rey en jaque (descubierta horizontal)', () => {
  const pos = Position.fromFen('8/8/8/K2pP2r/8/8/8/7k w - d6 0 1');
  assert.ok(!pos.legalMoves().some((m) => m.enPassant));
});

test('promoción: las cuatro piezas y promoción por defecto a dama desde el tablero', () => {
  const pos = Position.fromFen('8/4P3/8/8/8/8/k7/4K3 w - - 0 1');
  const promos = pos.legalMoves().filter((m) => m.promotion).map((m) => m.promotion).sort();
  assert.deepEqual(promos, ['b', 'n', 'q', 'r']);
  const g = new Game('8/4P3/8/8/8/8/k7/4K3 w - - 0 1');
  const played = g.move({ from: 'e7', to: 'e8' });
  assert.equal(played.san, 'e8=Q');
  const g2 = new Game('8/4P3/8/8/8/8/k7/4K3 w - - 0 1');
  assert.equal(g2.move({ from: 'e7', to: 'e8', promotion: 'n' }).san, 'e8=N');
});

test('material insuficiente', () => {
  const draw = ['8/8/8/4k3/8/8/8/4K3 w - - 0 1', '8/8/8/4k3/8/8/8/4KB2 w - - 0 1', '8/8/8/4k3/8/8/8/4KN2 w - - 0 1',
    '8/8/8/4k3/2b5/8/8/4KB2 w - - 0 1' /* alfiles del mismo color (c4 y f1 claras) */];
  for (const fen of draw) assert.equal(Position.fromFen(fen).isInsufficientMaterial(), true, fen);
  const notDraw = ['8/8/8/4k3/8/8/8/3NKN2 w - - 0 1', '8/8/8/4k3/3b4/8/8/4KB2 w - - 0 1', '8/8/8/4k3/8/8/4P3/4K3 w - - 0 1'];
  for (const fen of notDraw) assert.equal(Position.fromFen(fen).isInsufficientMaterial(), false, fen);
});

test('triple repetición', () => {
  const g = new Game();
  ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1'].forEach((m) => g.move(m));
  assert.equal(g.status().over, false);
  g.move('Ng8');
  assert.equal(g.status().reason, 'threefold');
});

test('regla de 50 movimientos', () => {
  const g = new Game('4k3/8/8/8/8/8/8/R3K3 w - - 99 80');
  assert.equal(g.status().over, false);
  g.move('Ra2');
  assert.equal(g.status().reason, 'fifty-move');
});

test('SAN: desambiguación', () => {
  const g = new Game('4k3/8/8/8/8/8/4K3/R6R w - - 0 1');
  assert.equal(g.move({ from: 'a1', to: 'd1' }).san, 'Rad1');
  const g2 = new Game('4k3/8/8/N7/8/8/8/N3K3 w - - 0 1');
  assert.equal(g2.move({ from: 'a1', to: 'b3' }).san, 'N1b3');
});

test('PGN: exportar e importar', () => {
  const g = new Game();
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'].forEach((m) => g.move(m));
  const pgn = g.pgn({ White: 'Lucía', Black: 'Leo' });
  assert.match(pgn, /1\. e4 e5 2\. Nf3 Nc6 3\. Bb5 a6 \*/);
  const back = Game.fromPgn(pgn);
  assert.equal(back.position.toFen(), g.position.toFen());
  assert.throws(() => Game.fromPgn('1. e4 e5 2. Ke3'));
});

test('localización de SAN al español', () => {
  assert.equal(localizeSan('Nf3', 'es'), 'Cf3');
  assert.equal(localizeSan('Bxe5+', 'es'), 'Axe5+');
  assert.equal(localizeSan('Qh5', 'es'), 'Dh5');
  assert.equal(localizeSan('Kg1', 'es'), 'Rg1');
  assert.equal(localizeSan('Rad1', 'es'), 'Tad1');
  assert.equal(localizeSan('exd8=Q#', 'es'), 'exd8=D#');
  assert.equal(localizeSan('O-O', 'es'), 'O-O');
});

test('parseUserMove: notación española, inglesa, UCI, enroques y palabras', async () => {
  const { parseUserMove, moveToSan } = await import('../dist/index.js');
  const start = Position.start();
  const san = (pos, text, locale) => { const m = parseUserMove(pos, text, locale); return m && moveToSan(pos, m); };
  assert.equal(san(start, 'Cf3'), 'Nf3');
  assert.equal(san(start, 'cf3'), 'Nf3');
  assert.equal(san(start, 'Nf3'), 'Nf3');
  assert.equal(san(start, 'e4'), 'e4');
  assert.equal(san(start, 'e2-e4'), 'e4');
  assert.equal(san(start, 'g1 f3'), 'Nf3');
  assert.equal(san(start, 'caballo f3'), 'Nf3');
  assert.equal(san(start, 'Caballo a f3'), 'Nf3');
  assert.equal(san(start, 'Knight f3', 'en'), 'Nf3');
  assert.equal(san(start, 'Cf6'), null);
  assert.equal(san(start, 'hola'), null);
  const castle = Position.fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  assert.equal(san(castle, '0-0'), 'O-O');
  assert.equal(san(castle, 'O-O-O'), 'O-O-O');
  // En español "R" es el rey; en inglés, la torre.
  const rk = Position.fromFen('4k3/8/8/8/8/8/8/R3K3 w - - 0 1');
  assert.equal(san(rk, 'Rd2', 'es'), 'Kd2');
  assert.equal(san(rk, 'Ta2', 'es'), 'Ra2');
  assert.equal(san(rk, 'Ra2', 'en'), 'Ra2');
  const promo = Position.fromFen('8/4P3/8/8/8/8/k7/4K3 w - - 0 1');
  assert.equal(san(promo, 'e8=D'), 'e8=Q');
  assert.equal(san(promo, 'e8=C'), 'e8=N');
  assert.equal(san(promo, 'e7e8q'), 'e8=Q');
  const cap = Position.fromFen('4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1');
  assert.equal(san(cap, 'Cxe5'), 'Nxe5');
  assert.equal(san(cap, 'caballo por e5'), 'Nxe5');
  // "cxd4" es el peón c aunque un caballo también pueda capturar en d4.
  const amb = Position.fromFen('4k3/8/8/8/3p4/1NP5/8/4K3 w - - 0 1');
  assert.equal(san(amb, 'cxd4'), 'cxd4');
  assert.equal(san(amb, 'Cxd4'), 'Nxd4');
});
