/** Tipos básicos del dominio de ajedrez. */

export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface Piece {
  readonly color: Color;
  readonly type: PieceType;
}

/** Índice de casilla 0..63 con a1 = 0, b1 = 1, …, h8 = 63. */
export type Square = number;

export interface CastlingRights {
  K: boolean;
  Q: boolean;
  k: boolean;
  q: boolean;
}

export interface Move {
  readonly from: Square;
  readonly to: Square;
  readonly color: Color;
  readonly piece: PieceType;
  readonly captured?: PieceType;
  readonly promotion?: PieceType;
  readonly enPassant?: boolean;
  readonly castle?: 'k' | 'q';
  readonly doublePush?: boolean;
}

/** Entrada de jugada desde la interfaz (tablero) o notación UCI. */
export interface MoveInput {
  from: Square | string;
  to: Square | string;
  promotion?: PieceType;
}

export type DrawReason = 'stalemate' | 'threefold' | 'fifty-move' | 'insufficient-material';

export interface GameStatus {
  over: boolean;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  reason?: 'checkmate' | DrawReason | 'resign' | 'timeout';
  check: boolean;
}

export const opposite = (c: Color): Color => (c === 'w' ? 'b' : 'w');
