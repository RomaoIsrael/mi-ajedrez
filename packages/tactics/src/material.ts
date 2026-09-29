import { opposite, Position, type Color, type Move, type PieceType, type Square } from '@kavalo/chess-core';

export const PIECE_VALUE: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export function materialBalance(pos: Position, color: Color): number {
  let sum = 0;
  for (const p of pos.board) if (p) sum += (p.color === color ? 1 : -1) * PIECE_VALUE[p.type];
  return sum;
}

/** Posición con el turno de `color`, o null si no es posible (p.ej. el otro bando está en jaque). */
export function asTurn(pos: Position, color: Color): Position | null {
  if (pos.turn === color) return pos;
  try {
    return pos.withTurn(color);
  } catch {
    return null;
  }
}

export interface HangingPiece {
  square: Square;
  type: PieceType;
  color: Color;
  /** Material neto que el rival gana capturándola. */
  gain: number;
  attackers: Square[];
  defenders: Square[];
  /** Mejor captura legal del rival. */
  capture: Move;
}

/**
 * Piezas de `color` que el rival puede capturar ganando material:
 * sin defensa, o atacadas por una pieza de menor valor.
 */
export function hangingPieces(pos: Position, color: Color): HangingPiece[] {
  const them = opposite(color);
  const theirTurn = asTurn(pos, them);
  if (!theirTurn) return [];
  const captures = theirTurn.legalMoves().filter((m) => m.captured && m.captured !== 'k');
  const result: HangingPiece[] = [];
  const bySquare = new Map<Square, Move[]>();
  for (const m of captures) {
    if (theirTurn.get(m.to)?.color !== color) continue; // al paso: la casilla destino está vacía
    bySquare.set(m.to, [...(bySquare.get(m.to) ?? []), m]);
  }
  for (const [square, moves] of bySquare) {
    const piece = pos.get(square)!;
    const value = PIECE_VALUE[piece.type];
    const defenders = pos.attackers(square, color);
    let best: { move: Move; gain: number } | null = null;
    for (const move of moves) {
      const attackerValue = PIECE_VALUE[move.promotion ?? move.piece];
      const gain = defenders.length === 0 ? value : value - attackerValue;
      if (!best || gain > best.gain) best = { move, gain };
    }
    if (best && best.gain > 0) {
      result.push({
        square, type: piece.type, color, gain: best.gain,
        attackers: moves.map((m) => m.from), defenders, capture: best.move,
      });
    }
  }
  return result.sort((a, b) => b.gain - a.gain);
}

/** Jugadas que dan mate inmediato para el bando que mueve. */
export function matesInOne(pos: Position): Move[] {
  return pos.legalMoves().filter((m) => pos.play(m).isCheckmate());
}
