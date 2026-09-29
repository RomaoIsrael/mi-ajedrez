import type { Square } from './types.js';

export const FILES = 'abcdefgh';

export const fileOf = (sq: Square): number => sq & 7;
export const rankOf = (sq: Square): number => sq >> 3;
export const makeSquare = (file: number, rank: number): Square => rank * 8 + file;
export const onBoard = (file: number, rank: number): boolean =>
  file >= 0 && file < 8 && rank >= 0 && rank < 8;

export function squareName(sq: Square): string {
  return `${FILES[fileOf(sq)]}${rankOf(sq) + 1}`;
}

export function parseSquare(name: string): Square {
  if (!/^[a-h][1-8]$/.test(name)) throw new Error(`Casilla inválida: ${name}`);
  return makeSquare(FILES.indexOf(name[0]!), Number(name[1]) - 1);
}

export function toSquare(sq: Square | string): Square {
  return typeof sq === 'string' ? parseSquare(sq) : sq;
}

/** true si la casilla es clara (a1 es oscura). */
export const isLightSquare = (sq: Square): boolean => (fileOf(sq) + rankOf(sq)) % 2 === 1;

export const ALL_SQUARES: readonly Square[] = Array.from({ length: 64 }, (_, i) => i);
