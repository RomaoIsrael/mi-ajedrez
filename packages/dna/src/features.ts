/**
 * Rasgos medibles de una partida (docs/06-inteligencia.md §1.1), calculados a partir de la
 * revisión con Stockfish. Son la materia prima del ADN: el ADN nunca se inventa, se mide.
 */
import { fileOf, rankOf, type Color, type PlayedMove, type Position } from '@kavalo/chess-core';
import { isSacrifice, PIECE_VALUE, type GameReview } from '@kavalo/tactics';

/** Media y número de muestras de una categoría de jugadas. */
export interface Sample { sum: number; n: number }

export interface GameFeatures {
  /** Jugadas propias analizadas (sin contar las de libro). */
  moves: number;
  accuracy: Sample;
  /** Precisión en posiciones tranquilas (la mejor jugada no es captura ni jaque). */
  quiet: Sample;
  /** Precisión en posiciones forzadas (la mejor jugada es captura o jaque). */
  forced: Sample;
  /** Oportunidades tácticas (el rival acaba de cometer un error) y cuántas se aprovecharon. */
  chances: number;
  chancesTaken: number;
  /** Precisión con la posición peor (≤ −1,5) y con ventaja (≥ +1,5). */
  defense: Sample;
  advantage: Sample;
  /** Precisión en la fase final. */
  endgame: Sample;
  /** Jugadas de ataque (jaques, piezas hacia el rey rival, avance de peones sobre su enroque). */
  attackMoves: number;
  sacrifices: number;
  soundSacrifices: number;
  /** Capturas que inician un cambio equilibrado. */
  trades: number;
  /** Jugadas en posiciones abiertas (≤ 12 peones en el tablero). */
  openMoves: number;
  /** Precisión en jugadas rápidas y lentas (según la mediana de tiempo de la partida). */
  fast: Sample;
  slow: Sample;
  /** Precisión bajo presión (reloj < 20 % o posición claramente peor). */
  pressure: Sample;
  avgMoveMs: number | null;
  timeTroubleMoves: number;
  /** Máxima ventaja alcanzada (cp) y resultado. */
  maxAdvantage: number;
  result: 'win' | 'loss' | 'draw';
  castledByMove: number | null;
}

const empty = (): Sample => ({ sum: 0, n: 0 });
const add = (s: Sample, v: number) => { s.sum += v; s.n++; };

function nonPawnPieces(pos: Position): number {
  return pos.board.filter((p) => p && p.type !== 'p' && p.type !== 'k').length;
}

function pawnCount(pos: Position): number {
  return pos.board.filter((p) => p?.type === 'p').length;
}

function isAttackMove(before: Position, move: PlayedMove['move']): boolean {
  const after = before.play(move);
  if (after.inCheck()) return true;
  const enemyKing = before.kingSquare(move.color === 'w' ? 'b' : 'w');
  const dist = Math.max(Math.abs(fileOf(move.to) - fileOf(enemyKing)), Math.abs(rankOf(move.to) - rankOf(enemyKing)));
  if (move.piece !== 'p' && move.piece !== 'k' && dist <= 2) return true;
  if (move.piece === 'p') {
    const advanced = move.color === 'w' ? rankOf(move.to) >= 4 : rankOf(move.to) <= 3;
    return advanced && Math.abs(fileOf(move.to) - fileOf(enemyKing)) <= 1;
  }
  return false;
}

export function extractFeatures(
  review: GameReview,
  history: readonly PlayedMove[],
  opts: { userColor: Color; result: 'win' | 'loss' | 'draw'; moveTimes?: number[]; clockFractions?: number[] },
): GameFeatures {
  const f: GameFeatures = {
    moves: 0, accuracy: empty(), quiet: empty(), forced: empty(), chances: 0, chancesTaken: 0,
    defense: empty(), advantage: empty(), endgame: empty(), attackMoves: 0, sacrifices: 0, soundSacrifices: 0,
    trades: 0, openMoves: 0, fast: empty(), slow: empty(), pressure: empty(), avgMoveMs: null, timeTroubleMoves: 0,
    maxAdvantage: -Infinity, result: opts.result, castledByMove: null,
  };
  const own = review.moves.filter((m) => m.color === opts.userColor);
  const times = opts.moveTimes ?? [];
  const sorted = [...times].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)]! : null;
  if (times.length) f.avgMoveMs = Math.round(times.reduce((a, b) => a + b, 0) / times.length);

  own.forEach((m, i) => {
    const played = history[m.ply]!;
    const before = played.before;
    f.maxAdvantage = Math.max(f.maxAdvantage, m.bestCp);
    if (played.move.castle && f.castledByMove === null) f.castledByMove = Math.floor(m.ply / 2) + 1;
    if (isAttackMove(before, played.move)) f.attackMoves++;
    if (pawnCount(before) <= 12) f.openMoves++;
    const sound = m.moveClass === 'best' || m.moveClass === 'excellent' || m.moveClass === 'good' || m.moveClass === 'brilliant';
    if (isSacrifice(before, played.move)) { f.sacrifices++; if (sound) f.soundSacrifices++; }
    if (played.move.captured && PIECE_VALUE[played.move.captured] === PIECE_VALUE[played.move.piece] && played.move.piece !== 'p') f.trades++;
    if (m.moveClass === 'book') return;
    f.moves++;
    add(f.accuracy, m.accuracy);
    const best = m.bestUci;
    const bestMove = best ? before.legalMoves().find((x) => `${'abcdefgh'[x.from & 7]}${(x.from >> 3) + 1}${'abcdefgh'[x.to & 7]}${(x.to >> 3) + 1}${x.promotion ?? ''}` === best) : undefined;
    const forced = !!bestMove && (!!bestMove.captured || before.play(bestMove).inCheck());
    add(forced ? f.forced : f.quiet, m.accuracy);
    const prev = review.moves[m.ply - 1];
    if (prev && prev.color !== opts.userColor && prev.winLoss >= 0.1) {
      f.chances++;
      if (m.winLoss < 0.05) f.chancesTaken++;
    }
    if (m.bestCp <= -150) add(f.defense, m.accuracy);
    if (m.bestCp >= 150) add(f.advantage, m.accuracy);
    if (nonPawnPieces(before) <= 4) add(f.endgame, m.accuracy);
    const t = times[i];
    if (t !== undefined && median !== null) add(t <= median ? f.fast : f.slow, m.accuracy);
    const clock = opts.clockFractions?.[i];
    if (clock !== undefined && clock < 0.1) f.timeTroubleMoves++;
    if ((clock !== undefined && clock < 0.2) || m.bestCp <= -100) add(f.pressure, m.accuracy);
  });
  if (f.maxAdvantage === -Infinity) f.maxAdvantage = 0;
  return f;
}
