/**
 * Entrenamiento de visión (brief §51): piezas atacadas, defendidas e indefensas, rutas de
 * caballo, diagonales y columnas, jaques, capturas y amenazas. Las respuestas se calculan con
 * las reglas (no se escriben a mano), así que cualquier posición legal sirve de ejercicio.
 */
import {
  fileOf, makeSquare, moveToUci, onBoard, opposite, Position, rankOf, squareName,
  type Color, type PieceType, type Square,
} from '@kavalo/chess-core';
import { PUZZLES, START_POSITIONS } from '@kavalo/content';
import { knightSquares, type Random } from './coordinates.js';

export type VisionKind = 'attacked' | 'defended' | 'undefended' | 'knight-route' | 'lines' | 'checks' | 'captures' | 'threats';

export const VISION_LABEL: Record<VisionKind, string> = {
  attacked: 'Piezas atacadas', defended: 'Piezas defendidas', undefended: 'Piezas indefensas',
  'knight-route': 'Rutas de caballo', lines: 'Diagonales y columnas', checks: 'Jaques', captures: 'Capturas', threats: 'Amenazas',
};

export interface VisionExercise {
  kind: VisionKind;
  fen: string;
  prompt: string;
  /** Qué debe seleccionar el usuario. */
  select: 'squares' | 'moves' | 'number';
  /** Casillas (nombres), jugadas (UCI) o un número (como texto). */
  answer: string[];
  /** Casillas que se resaltan como dato del ejercicio (p. ej. origen y destino del caballo). */
  marks: string[];
  /** Opciones para las preguntas numéricas. */
  options?: string[];
  concept: string;
}

const VALUE: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const NAME: Record<PieceType, string> = { p: 'peón', n: 'caballo', b: 'alfil', r: 'torre', q: 'dama', k: 'rey' };
const colorName = (c: Color, plural = false) => (c === 'w' ? (plural ? 'blancas' : 'blanco') : (plural ? 'negras' : 'negro'));

function pieces(pos: Position, color: Color, withKing = false): Square[] {
  const out: Square[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = pos.get(sq);
    if (p && p.color === color && (withKing || p.type !== 'k')) out.push(sq);
  }
  return out;
}

export const attackedPieces = (pos: Position, color: Color) => pieces(pos, color).filter((sq) => pos.isAttacked(sq, opposite(color)));
export const defendedPieces = (pos: Position, color: Color) => pieces(pos, color).filter((sq) => pos.attackers(sq, color).length > 0);
export const undefendedPieces = (pos: Position, color: Color) => pieces(pos, color).filter((sq) => pos.attackers(sq, color).length === 0);

/** Piezas de `color` amenazadas: atacadas sin defensa, o atacadas por una pieza de menor valor. */
export function threatenedPieces(pos: Position, color: Color): Square[] {
  return pieces(pos, color).filter((sq) => {
    const attackers = pos.attackers(sq, opposite(color));
    if (!attackers.length) return false;
    if (pos.attackers(sq, color).length === 0) return true;
    const v = VALUE[pos.get(sq)!.type];
    return attackers.some((a) => VALUE[pos.get(a)!.type] < v);
  });
}

/** Casillas que controla una pieza de largo alcance (hasta la primera pieza, incluida). */
export function lineSquares(pos: Position, sq: Square): Square[] {
  const p = pos.get(sq);
  if (!p || (p.type !== 'b' && p.type !== 'r' && p.type !== 'q')) return [];
  const dirs = [
    ...(p.type !== 'b' ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : []),
    ...(p.type !== 'r' ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : []),
  ];
  const out: Square[] = [];
  for (const [df, dr] of dirs) {
    let f = fileOf(sq) + df!;
    let r = rankOf(sq) + dr!;
    while (onBoard(f, r)) {
      const t = makeSquare(f, r);
      out.push(t);
      if (pos.get(t)) break;
      f += df!;
      r += dr!;
    }
  }
  return out.sort((a, b) => a - b);
}

/** Número mínimo de saltos de caballo entre dos casillas (tablero vacío). */
export function knightDistance(from: Square, to: Square): number {
  const dist = new Map<Square, number>([[from, 0]]);
  const queue = [from];
  while (queue.length) {
    const s = queue.shift()!;
    if (s === to) return dist.get(s)!;
    for (const n of knightSquares(s)) if (!dist.has(n)) { dist.set(n, dist.get(s)! + 1); queue.push(n); }
  }
  return -1;
}

export const checkingMoves = (pos: Position) => pos.legalMoves().filter((m) => pos.play(m).inCheck()).map(moveToUci);
export const captureMoves = (pos: Position) => pos.legalMoves().filter((m) => m.captured).map(moveToUci);

/** Posiciones de trabajo: las de los puzzles y las de inicio (todas legales y verificadas). */
export const VISION_FENS: string[] = [...new Set([...PUZZLES.map((p) => p.fen), ...START_POSITIONS.map((p) => p.fen)])];

const names = (sqs: Square[]) => sqs.map(squareName);

/** Crea un ejercicio del tipo pedido; null si la posición no sirve para ese tipo. */
export function visionExercise(kind: VisionKind, fen: string, random: Random): VisionExercise | null {
  const pos = Position.fromFen(fen);
  const us = pos.turn;
  const them = opposite(us);
  switch (kind) {
    case 'attacked': {
      const ans = attackedPieces(pos, us);
      return ans.length ? { kind, fen, select: 'squares', answer: names(ans), marks: [], concept: 'vision.threats',
        prompt: `Juegan ${colorName(us, true)}. Toca todas tus piezas atacadas por el rival (sin contar el rey).` } : null;
    }
    case 'defended': {
      const ans = defendedPieces(pos, us);
      return ans.length ? { kind, fen, select: 'squares', answer: names(ans), marks: [], concept: 'vision.undefended-pieces',
        prompt: `Juegan ${colorName(us, true)}. Toca todas tus piezas que están defendidas por otra pieza tuya.` } : null;
    }
    case 'undefended': {
      const ans = undefendedPieces(pos, them);
      return ans.length ? { kind, fen, select: 'squares', answer: names(ans), marks: [], concept: 'vision.undefended-pieces',
        prompt: `Toca todas las piezas ${colorName(them, true)} que no tienen ninguna defensa (sin contar el rey).` } : null;
    }
    case 'threats': {
      const moved = pos.withTurn(them);
      const ans = threatenedPieces(moved, us);
      return ans.length ? { kind, fen, select: 'squares', answer: names(ans), marks: [], concept: 'vision.threats',
        prompt: `Si ahora jugaran las ${colorName(them, true)}, ¿qué piezas tuyas estarían en peligro? (atacadas sin defensa o por una pieza de menos valor)` } : null;
    }
    case 'checks': {
      const ans = checkingMoves(pos);
      return ans.length ? { kind, fen, select: 'moves', answer: ans, marks: [], concept: 'vision.threats',
        prompt: `Juegan ${colorName(us, true)}. Encuentra TODOS los jaques posibles (haz cada jugada en el tablero).` } : null;
    }
    case 'captures': {
      const ans = captureMoves(pos);
      return ans.length ? { kind, fen, select: 'moves', answer: ans, marks: [], concept: 'vision.undefended-pieces',
        prompt: `Juegan ${colorName(us, true)}. Encuentra TODAS las capturas posibles.` } : null;
    }
    case 'lines': {
      const sliders = pieces(pos, us).filter((sq) => ['b', 'r', 'q'].includes(pos.get(sq)!.type));
      if (!sliders.length) return null;
      const sq = sliders[Math.floor(random() * sliders.length)]!;
      const p = pos.get(sq)!;
      return { kind, fen, select: 'squares', answer: names(lineSquares(pos, sq)), marks: [squareName(sq)], concept: 'fundamentals.board',
        prompt: `Toca todas las casillas que controla ${p.type === 'q' ? 'la' : p.type === 'r' ? 'la' : 'el'} ${NAME[p.type]} de ${squareName(sq)} (incluida la primera pieza que encuentra en cada dirección).` };
    }
    case 'knight-route': {
      let from = Math.floor(random() * 64);
      let to = Math.floor(random() * 64);
      if (from === to) to = (to + 17) % 64;
      const d = knightDistance(from, to);
      void them;
      return { kind, fen: `8/8/8/8/8/8/8/8 w - - 0 1`, select: 'number', answer: [String(d)], marks: [squareName(from), squareName(to)], concept: 'fundamentals.knight',
        options: ['1', '2', '3', '4', '5', '6'],
        prompt: `¿Cuántos saltos necesita un caballo para ir de ${squareName(from)} a ${squareName(to)}?` };
    }
  }
}

/** Serie mixta de ejercicios de visión. */
export function visionSet(n: number, random: Random, kinds: VisionKind[] = Object.keys(VISION_LABEL) as VisionKind[]): VisionExercise[] {
  const out: VisionExercise[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 40) {
    const kind = kinds[Math.floor(random() * kinds.length)]!;
    const fen = VISION_FENS[Math.floor(random() * VISION_FENS.length)]!;
    const ex = visionExercise(kind, fen, random);
    if (ex && !out.some((e) => e.kind === ex.kind && e.fen === ex.fen)) out.push(ex);
  }
  return out;
}

export interface SetCheck { correct: boolean; found: string[]; missed: string[]; wrong: string[] }

/** Compara la selección del usuario con la respuesta (conjuntos). */
export function checkSelection(answer: readonly string[], selected: readonly string[]): SetCheck {
  const a = new Set(answer);
  const s = new Set(selected);
  const found = [...s].filter((x) => a.has(x));
  const missed = [...a].filter((x) => !s.has(x));
  const wrong = [...s].filter((x) => !a.has(x));
  return { correct: missed.length === 0 && wrong.length === 0, found, missed, wrong };
}
