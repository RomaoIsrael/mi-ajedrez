import type { Position } from './position.js';

/** Cuenta nodos hoja a profundidad `depth`: prueba estándar de corrección del generador. */
export function perft(pos: Position, depth: number): number {
  if (depth === 0) return 1;
  const moves = pos.legalMoves();
  if (depth === 1) return moves.length;
  let nodes = 0;
  for (const m of moves) nodes += perft(pos.play(m), depth - 1);
  return nodes;
}
