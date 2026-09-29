/**
 * Bots humanizados del prototipo (niveles 1–6, Elo aprox. 250–1450).
 *
 * No juegan al azar: calculan con alfa‑beta y luego aplican sesgos humanos según el nivel
 * (ceguera ante respuestas del rival, elección con temperatura) y una personalidad.
 * En la Fase 6 los niveles altos (7–10) usarán Stockfish; esta interfaz se mantiene.
 */
import { opposite, type Color, type Move, type Position } from '@kavalo/chess-core';
import { PIECE_VALUE } from '@kavalo/tactics';

export type Personality = 'nova' | 'leo' | 'sofia' | 'max' | 'arthur';

export interface BotLevel {
  level: number;
  name: { es: string; en: string };
  elo: number;
  /** Profundidad de búsqueda en plies. */
  depth: number;
  /** Búsqueda de capturas al final de la línea (evita errores de horizonte groseros). */
  quiescence: boolean;
  /** Probabilidad de evaluar una jugada sin mirar la respuesta rival (cuelga piezas). */
  pBlind: number;
  /** Temperatura en centipeones para la elección softmax. */
  temperature: number;
}

export const BOT_LEVELS: readonly BotLevel[] = [
  { level: 1, name: { es: 'Primera partida', en: 'First game' }, elo: 250, depth: 1, quiescence: false, pBlind: 0.6, temperature: 140 },
  { level: 2, name: { es: 'Aprendiz', en: 'Apprentice' }, elo: 450, depth: 1, quiescence: false, pBlind: 0.4, temperature: 90 },
  { level: 3, name: { es: 'Principiante', en: 'Beginner' }, elo: 700, depth: 2, quiescence: false, pBlind: 0.25, temperature: 55 },
  { level: 4, name: { es: 'Club inicial', en: 'Club novice' }, elo: 950, depth: 2, quiescence: true, pBlind: 0.12, temperature: 30 },
  { level: 5, name: { es: 'Club', en: 'Club' }, elo: 1200, depth: 3, quiescence: true, pBlind: 0.05, temperature: 15 },
  { level: 6, name: { es: 'Intermedio', en: 'Intermediate' }, elo: 1450, depth: 3, quiescence: true, pBlind: 0, temperature: 4 },
];

export const PERSONALITIES: Record<Personality, { name: string; style: { es: string; en: string } }> = {
  nova: { name: 'Nova', style: { es: 'Universal · equilibrada', en: 'Universal · balanced' } },
  leo: { name: 'Leo', style: { es: 'Atacante · busca al rey', en: 'Attacker · goes for the king' } },
  sofia: { name: 'Sofía', style: { es: 'Posicional · pequeñas ventajas', en: 'Positional · small edges' } },
  max: { name: 'Max', style: { es: 'Táctico · complicaciones', en: 'Tactician · complications' } },
  arthur: { name: 'Arthur', style: { es: 'Defensivo · difícil de atacar', en: 'Defensive · hard to attack' } },
};

const MATE = 100_000;

// Tablas de posición (desde el punto de vista de las blancas, a1 = índice 0), en centipeones.
const CENTER_BONUS = (sq: number) => {
  const f = sq & 7; const r = sq >> 3;
  const d = Math.max(Math.abs(3.5 - f), Math.abs(3.5 - r));
  return Math.round((3.5 - d) * 8);
};

function evaluate(pos: Position, perspective: Color): number {
  let score = 0;
  let minorsAndMajors = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = pos.board[sq];
    if (!p) continue;
    if (p.type !== 'p' && p.type !== 'k') minorsAndMajors++;
  }
  const endgame = minorsAndMajors <= 4;
  for (let sq = 0; sq < 64; sq++) {
    const p = pos.board[sq];
    if (!p) continue;
    const sign = p.color === perspective ? 1 : -1;
    const relRank = p.color === 'w' ? sq >> 3 : 7 - (sq >> 3);
    let v = PIECE_VALUE[p.type] * 100;
    switch (p.type) {
      case 'p': v += relRank * (endgame ? 12 : 5) + ((sq & 7) >= 2 && (sq & 7) <= 5 ? CENTER_BONUS(sq) / 2 : 0); break;
      case 'n': v += CENTER_BONUS(sq) * 2 - (relRank === 0 ? 15 : 0); break;
      case 'b': v += CENTER_BONUS(sq) - (relRank === 0 ? 12 : 0); break;
      case 'q': v += CENTER_BONUS(sq) / 2; break;
      case 'k': v += endgame ? CENTER_BONUS(sq) * 2 : (relRank === 0 && ((sq & 7) <= 2 || (sq & 7) >= 6) ? 25 : -CENTER_BONUS(sq)); break;
    }
    score += sign * v;
  }
  return score;
}

function ordered(pos: Position): Move[] {
  return pos.legalMoves().sort((a, b) => score(b) - score(a));
  function score(m: Move) {
    return (m.captured ? PIECE_VALUE[m.captured] * 10 - PIECE_VALUE[m.piece] : 0) + (m.promotion ? 80 : 0);
  }
}

function quiesce(pos: Position, alpha: number, beta: number, depth: number): number {
  const stand = evaluate(pos, pos.turn);
  if (depth === 0 || stand >= beta) return stand;
  if (stand > alpha) alpha = stand;
  for (const m of ordered(pos)) {
    if (!m.captured && !m.promotion) continue;
    const v = -quiesce(pos.play(m), -beta, -alpha, depth - 1);
    if (v >= beta) return v;
    if (v > alpha) alpha = v;
  }
  return alpha;
}

function negamax(pos: Position, depth: number, alpha: number, beta: number, qs: boolean, ply: number): number {
  const moves = ordered(pos);
  if (moves.length === 0) return pos.inCheck() ? -MATE + ply : 0;
  if (depth === 0) return qs ? quiesce(pos, alpha, beta, 4) : evaluate(pos, pos.turn);
  let best = -Infinity;
  for (const m of moves) {
    const v = -negamax(pos.play(m), depth - 1, -beta, -alpha, qs, ply + 1);
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

function personalityBias(pos: Position, m: Move, personality: Personality): number {
  if (personality === 'nova') return 0;
  const after = pos.play(m);
  const check = after.inCheck();
  const enemyKing = after.kingSquare(opposite(m.color));
  const dist = (a: number, b: number) => Math.max(Math.abs((a & 7) - (b & 7)), Math.abs((a >> 3) - (b >> 3)));
  const closer = dist(m.from, enemyKing) - dist(m.to, enemyKing);
  switch (personality) {
    case 'leo': return (check ? 25 : 0) + closer * 8;
    case 'max': return (check ? 20 : 0) + (m.captured ? 15 : 0);
    case 'sofia': return (m.captured ? -10 : 0) + (m.piece === 'p' ? 4 : 0) - (check ? 5 : 0);
    case 'arthur': {
      const ownKing = after.kingSquare(m.color);
      return (m.castle ? 30 : 0) + (dist(m.to, ownKing) <= 2 ? 8 : 0) - Math.max(0, closer) * 4;
    }
  }
}

export interface BotChoice {
  move: Move;
  /** Evaluación (cp) de la jugada elegida y de la mejor según la búsqueda del bot. */
  chosenScore: number;
  bestScore: number;
  bestMove: Move;
}

/**
 * Elige la jugada del bot. `random` es inyectable para tests deterministas.
 */
export function chooseMove(
  pos: Position,
  opts: { level: number; personality?: Personality; random?: () => number },
): BotChoice {
  const cfg = BOT_LEVELS.find((l) => l.level === opts.level) ?? BOT_LEVELS[0]!;
  const rnd = opts.random ?? Math.random;
  const personality = opts.personality ?? 'nova';
  const moves = ordered(pos);
  if (moves.length === 0) throw new Error('No hay jugadas legales');

  // Ventana: las jugadas muy inferiores a la mejor encontrada solo necesitan una cota
  // (su peso en el softmax es prácticamente nulo), lo que permite podar mucho.
  const WINDOW = cfg.temperature * 8 + 100;
  let bestSoFar = -Infinity;
  const scored = moves.map((m) => {
    const after = pos.play(m);
    let s: number;
    if (after.isCheckmate()) s = MATE;
    else if (rnd() < cfg.pBlind) s = -evaluate(after, after.turn); // no mira la respuesta rival
    else s = -negamax(after, cfg.depth - 1, -Infinity, -(bestSoFar - WINDOW), cfg.quiescence, 1);
    if (s > bestSoFar) bestSoFar = s;
    return { m, s, biased: s + personalityBias(pos, m, personality) };
  });

  // Los mates siempre se ven a partir del nivel 3 (a los humanos no se les escapa un mate en 1 tan fácil).
  const mate = scored.find((x) => x.s === MATE);
  if (mate && (cfg.level >= 3 || rnd() < 0.6)) {
    return { move: mate.m, chosenScore: MATE, bestScore: MATE, bestMove: mate.m };
  }

  const maxB = Math.max(...scored.map((x) => x.biased));
  const weights = scored.map((x) => Math.exp((x.biased - maxB) / cfg.temperature));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rnd() * total;
  let pick = scored[0]!;
  for (let i = 0; i < scored.length; i++) {
    r -= weights[i]!;
    if (r <= 0) { pick = scored[i]!; break; }
  }
  const best = scored.reduce((a, b) => (b.s > a.s ? b : a));
  return { move: pick.m, chosenScore: pick.s, bestScore: best.s, bestMove: best.m };
}

/** Jugada "buena" determinista para pistas del coach (sin humanización). */
export function bestMove(pos: Position, depth = 2): Move | null {
  const moves = ordered(pos);
  let best: Move | null = null;
  let bestScore = -Infinity;
  for (const m of moves) {
    const v = -negamax(pos.play(m), depth - 1, -Infinity, -bestScore, true, 1);
    if (v > bestScore) { bestScore = v; best = m; }
  }
  return best;
}

/** Puntuación de referencia (cp) de una jugada, para medir errores en tests y análisis. */
export function scoreMove(pos: Position, move: Move, depth = 2): number {
  const after = pos.play(move);
  if (after.isCheckmate()) return MATE;
  return -negamax(after, depth - 1, -Infinity, Infinity, true, 1);
}

export { evaluate };
