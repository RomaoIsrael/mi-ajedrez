/** Sets de piezas (brief §33–34): la URL de cada pieza según el set elegido en Ajustes. */
import type { Color, PieceType } from '@kavalo/chess-core';

const BASE = new URL('../../../../assets/pieces/', import.meta.url).href;
let current = 'royal-modern';

export function setPieceSet(id: string): void {
  current = id;
}

export const pieceSet = () => current;

export function pieceUrl(color: Color, type: PieceType, set = current): string {
  return `${BASE}${set}/${color}${type.toUpperCase()}.svg`;
}
