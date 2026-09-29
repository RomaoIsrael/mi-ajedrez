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

const PIECE_WORDS: Record<string, string> = {
  caballo: 'N', alfil: 'B', torre: 'R', dama: 'Q', reina: 'Q', rey: 'K', peon: '', 'peón': '',
  knight: 'N', bishop: 'B', rook: 'R', queen: 'Q', king: 'K', pawn: '',
};
const ES_TO_EN: Record<string, string> = { C: 'N', A: 'B', T: 'R', D: 'Q', R: 'K' };

function normalizeSpaces(text: string): string {
  return text.trim().replace(/[–—]/g, '-').replace(/\s+/g, ' ');
}

/** Candidatos SAN en inglés a partir de lo que escribe (o dicta) el usuario. */
function candidates(text: string, locale: string): string[] {
  let t = normalizeSpaces(text);
  const out: string[] = [];
  // UCI con guion o espacio: "e2-e4", "e2 e4", "e7e8=q"
  const uci = /^([a-h][1-8])\s*[-x ]?\s*([a-h][1-8])\s*=?\s*([qrbnQRBNdtacDTAC])?$/.exec(t);
  if (uci) {
    const promo = uci[3] ? ({ d: 'q', t: 'r', a: 'b', c: 'n' } as Record<string, string>)[uci[3].toLowerCase()] ?? uci[3].toLowerCase() : '';
    out.push(`${uci[1]}${uci[2]}${promo}`);
  }
  // Palabras: "caballo f3", "caballo por e5", "caballo g1 f3", "dama x d8"
  const words = t.toLowerCase().split(' ');
  if (words[0] && words[0] in PIECE_WORDS) {
    const letter = PIECE_WORDS[words[0]]!;
    const rest = words.slice(1).filter((w) => w !== 'a' && w !== 'to' && w !== 'en').join('')
      .replace(/^(por|captura|takes)/, 'x').replace(/(por|captura|takes)/, 'x');
    out.push(`${letter}${rest}`);
  }
  t = t.replace(/ /g, '');
  // Orden de preferencia: letras españolas en mayúscula → texto tal cual (así "cxd4" es el
  // peón c, nunca el caballo) → letras en minúscula como pieza → SAN inglés capitalizado.
  if (locale === 'es') {
    out.push(t.replace(/^[CATDR](?=[a-h1-8x])/, (l) => ES_TO_EN[l]!).replace(/=([CATD])/, (_, l: string) => `=${ES_TO_EN[l]}`));
  }
  out.push(t);
  if (locale === 'es') {
    out.push(t.replace(/^[catdr](?=[a-h]?[1-8]?x?[a-h][1-8])/, (l) => ES_TO_EN[l.toUpperCase()]!).replace(/=([catd])/i, (_, l: string) => `=${ES_TO_EN[l.toUpperCase()]}`));
  }
  out.push(t.replace(/^[nbrqk](?=[a-h1-8x])/, (l) => l.toUpperCase()));
  return [...new Set(out)];
}

/**
 * Interpreta una jugada escrita por el usuario: SAN español ("Cf3", "Axe5+", "e8=D"),
 * SAN inglés, UCI ("g1f3", "e2-e4"), enroques ("0-0") o palabras ("caballo f3").
 */
export function parseUserMove(pos: Position, text: string, locale = 'es'): Move | null {
  for (const c of candidates(text, locale)) {
    const m = parseMove(pos, c);
    if (m) return m;
  }
  return null;
}
