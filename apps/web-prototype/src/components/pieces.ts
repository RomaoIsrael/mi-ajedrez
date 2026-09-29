/** Sets de piezas (brief §33–34): la URL de cada pieza según el set elegido en Ajustes. */
import type { Color, PieceType } from '@kavalo/chess-core';

const BASE = new URL('../../../../assets/pieces/', import.meta.url).href;
let current = 'royal-modern';

/** Sets disponibles (assets/pieces/sets.json, generados con tools/gen-piece-sets.mjs). */
export const PIECE_SETS = [
  { id: 'royal-modern', name: 'Royal Modern' }, { id: 'classic-elite', name: 'Classic Elite' }, { id: 'natural-wood', name: 'Natural Wood' },
  { id: 'crystal', name: 'Crystal' }, { id: 'cyber', name: 'Cyber' }, { id: 'medieval', name: 'Medieval' }, { id: 'fantasy', name: 'Fantasy' },
  { id: 'kids', name: 'Kids' }, { id: 'minimal', name: 'Minimal' }, { id: 'dark', name: 'Dark' }, { id: 'neon', name: 'Neon' },
  { id: 'tournament', name: 'Tournament' },
] as const;

export function setPieceSet(id: string): void {
  current = PIECE_SETS.some((s) => s.id === id) ? id : 'royal-modern';
}

export const pieceSet = () => current;

export function pieceUrl(color: Color, type: PieceType, set = current): string {
  return `${BASE}${set}/${color}${type.toUpperCase()}.svg`;
}
