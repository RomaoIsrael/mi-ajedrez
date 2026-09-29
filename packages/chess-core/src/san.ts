/** Notación algebraica estándar (SAN) y UCI, con localización de letras de piezas. */
import type { Position } from './position.js';
import { fileOf, FILES, parseSquare, rankOf, squareName } from './square.js';
import type { Move, PieceType } from './types.js';

const LETTER: Record<PieceType, string> = { p: '', n: 'N', b: 'B', r: 'R', q: 'Q', k: 'K' };

export function moveToUci(m: Move): string {
  return `${squareName(m.from)}${squareName(m.to)}${m.promotion ?? ''}`;
}

/** SAN en inglés (formato PGN). `pos` es la posición ANTES de la jugada. */
export function moveToSan(pos: Position, m: Move): string {
  let san: string;
  if (m.castle) {
    san = m.castle === 'k' ? 'O-O' : 'O-O-O';
  } else {
    const capture = m.captured !== undefined;
    if (m.piece === 'p') {
      san = `${capture ? `${FILES[fileOf(m.from)]}x` : ''}${squareName(m.to)}`;
    } else {
      const rivals = pos
        .legalMoves()
        .filter((o) => o.piece === m.piece && o.to === m.to && o.from !== m.from);
      let disamb = '';
      if (rivals.length) {
        const sameFile = rivals.some((o) => fileOf(o.from) === fileOf(m.from));
        const sameRank = rivals.some((o) => rankOf(o.from) === rankOf(m.from));
        if (!sameFile) disamb = FILES[fileOf(m.from)]!;
        else if (!sameRank) disamb = String(rankOf(m.from) + 1);
        else disamb = squareName(m.from);
      }
      san = `${LETTER[m.piece]}${disamb}${capture ? 'x' : ''}${squareName(m.to)}`;
    }
    if (m.promotion) san += `=${LETTER[m.promotion]}`;
  }
  const next = pos.play(m);
  if (next.inCheck()) san += next.legalMoves().length === 0 ? '#' : '+';
  return san;
}

const clean = (s: string) => s.replace(/[+#!?]+$/g, '').replace(/0/g, 'O');

/** Busca la jugada legal que corresponde a un SAN o UCI. Devuelve null si no existe. */
export function parseMove(pos: Position, text: string): Move | null {
  const input = text.trim();
  const legal = pos.legalMoves();
  if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(input)) {
    const from = parseSquare(input.slice(0, 2));
    const to = parseSquare(input.slice(2, 4));
    const promo = input[4] as PieceType | undefined;
    return legal.find((m) => m.from === from && m.to === to && m.promotion === promo) ?? null;
  }
  const target = clean(input);
  return legal.find((m) => clean(moveToSan(pos, m)) === target) ?? null;
}

const LOCAL_LETTERS: Record<string, Record<string, string>> = {
  es: { N: 'C', B: 'A', R: 'T', Q: 'D', K: 'R' },
  en: {},
};

/** Convierte SAN inglés a la notación del idioma (p.ej. Nf3 → Cf3, e8=Q → e8=D). */
export function localizeSan(san: string, locale: string): string {
  const map = LOCAL_LETTERS[locale];
  if (!map || san.startsWith('O-O')) return san;
  return san.replace(/^[NBRQK]/, (l) => map[l] ?? l).replace(/=([NBRQ])/, (_, l: string) => `=${map[l] ?? l}`);
}
