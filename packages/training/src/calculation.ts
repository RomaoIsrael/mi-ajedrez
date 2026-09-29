/**
 * Entrenamiento de cálculo (brief §52): se muestra la posición SIN permitir mover; el usuario
 * propone candidatas y escribe la línea (jugada, respuesta rival, siguiente jugada). Después se
 * compara con la línea correcta y se mide profundidad, precisión, candidatas y errores.
 */
import { moveToUci, parseUserMove, Position } from '@kavalo/chess-core';
import { PUZZLES } from '@kavalo/content';

export interface CalcExercise {
  id: string;
  fen: string;
  prompt: string;
  /** Línea de referencia (UCI). Si viene del motor, puede tener otras respuestas válidas. */
  line: string[];
  /** Primeras jugadas igual de buenas (todas cuentan como correctas en la jugada 1). */
  accept: string[];
  concept: string;
  rating: number;
}

/** Ejercicios fijos: los mates en 2 (línea forzada y verificada con Stockfish en los tests). */
export const CALC_EXERCISES: CalcExercise[] = PUZZLES.filter((p) => p.line && p.line.length >= 3).map((p) => ({
  id: `calc-${p.id}`, fen: p.fen, prompt: p.prompt, line: p.line!, accept: p.accept, concept: 'calculation.candidates', rating: p.rating,
}));

export interface CalcAnswer {
  /** Candidatas que el usuario consideró (texto libre: «Dxh7», «Cf7+», «e2e4»…). */
  candidates: string[];
  /** Línea que calculó (jugada, respuesta, siguiente…). */
  line: string[];
}

export interface CalcResult {
  /** Medias jugadas correctas desde el principio (0–línea completa). */
  depth: number;
  /** Proporción de medias jugadas correctas. */
  accuracy: number;
  /** ¿Estaba la jugada correcta entre las candidatas? */
  bestAmongCandidates: boolean;
  candidates: number;
  /** Jugadas ilegales o que no se entienden. */
  illegal: number;
  /** Primera media jugada equivocada (índice) o null. */
  firstError: number | null;
  /** Línea del usuario en UCI (null donde no se pudo interpretar). */
  parsed: (string | null)[];
}

/** Interpreta una línea escrita a partir de la posición (acepta SAN en español o inglés y UCI). */
export function parseLine(fen: string, moves: readonly string[], locale = 'es'): (string | null)[] {
  let pos: Position | null = Position.fromFen(fen);
  return moves.map((text) => {
    if (!pos) return null;
    const m = parseUserMove(pos, text.trim(), locale);
    if (!m) { pos = null; return null; }
    pos = pos.play(m);
    return moveToUci(m);
  });
}

/**
 * Compara la respuesta con la referencia. En la primera jugada vale cualquiera de `accept`;
 * si el usuario elige otra primera jugada aceptada, el resto de la línea no se puede comparar
 * con la de referencia y solo cuenta esa jugada.
 */
export function scoreCalculation(ex: CalcExercise, answer: CalcAnswer, locale = 'es'): CalcResult {
  const parsed = parseLine(ex.fen, answer.line, locale);
  const candidates = answer.candidates.map((c) => parseLine(ex.fen, [c], locale)[0]).filter((c): c is string => !!c);
  let depth = 0;
  let firstError: number | null = null;
  for (let i = 0; i < ex.line.length; i++) {
    const ok = i === 0 ? !!parsed[0] && ex.accept.includes(parsed[0]) : parsed[i] === ex.line[i] && parsed[0] === ex.line[0];
    if (!ok) { firstError = i; break; }
    depth++;
  }
  return {
    depth, accuracy: depth / ex.line.length,
    bestAmongCandidates: candidates.some((c) => ex.accept.includes(c)),
    candidates: new Set(candidates).size,
    illegal: parsed.filter((p) => p === null).length,
    firstError, parsed,
  };
}
