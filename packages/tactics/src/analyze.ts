/**
 * Extracción de hechos (determinista) sobre una jugada: primera etapa del ChessExplanationEngine.
 *
 * En el prototipo los hechos se obtienen con detectores de 1–2 plies (material, piezas
 * colgadas, mates en 1). En la Fase 6 se añadirán la evaluación y las variantes de Stockfish
 * como fuente adicional; la interfaz `MoveAnalysis` se mantiene.
 */
import { opposite, type Move, type PieceType, type Position, type Square } from '@kavalo/chess-core';
import { hangingPieces, matesInOne, PIECE_VALUE } from './material.js';

export type FactKind =
  | 'mate'
  | 'allows-mate'
  | 'missed-mate'
  | 'hanging-piece'
  | 'ignored-threat'
  | 'missed-capture'
  | 'good-capture';

export interface Fact {
  kind: FactKind;
  /** Casilla principal del hecho (pieza colgada, pieza capturable…). */
  square?: Square;
  piece?: PieceType;
  /** Pieza rival implicada (atacante). */
  byPiece?: PieceType;
  bySquare?: Square;
  /** Material en juego (puntos). */
  value?: number;
  /** Jugada que demuestra el hecho (la captura rival, el mate que había…). */
  move?: Move;
  defended?: boolean;
}

export type Severity = 'excellent' | 'good' | 'ok' | 'inaccuracy' | 'mistake' | 'blunder';

export interface MoveAnalysis {
  move: Move;
  facts: Fact[];
  primary: Fact | null;
  severity: Severity;
  concept: string | null;
}

export const CONCEPT_BY_FACT: Record<FactKind, string> = {
  mate: 'tactics.mate-in-1',
  'allows-mate': 'vision.threats',
  'missed-mate': 'tactics.mate-in-1',
  'hanging-piece': 'vision.undefended-pieces',
  'ignored-threat': 'vision.threats',
  'missed-capture': 'vision.undefended-pieces',
  'good-capture': 'vision.undefended-pieces',
};

export function analyzeMove(before: Position, move: Move): MoveAnalysis {
  const us = move.color;
  const them = opposite(us);
  const after = before.play(move);
  const facts: Fact[] = [];

  if (after.isCheckmate()) {
    const fact: Fact = { kind: 'mate', square: move.to, piece: move.piece, move };
    return { move, facts: [fact], primary: fact, severity: 'excellent', concept: CONCEPT_BY_FACT.mate };
  }

  const capturedValue =
    (move.captured ? PIECE_VALUE[move.captured] : 0) + (move.promotion ? PIECE_VALUE[move.promotion] - 1 : 0);

  const missedMate = matesInOne(before)[0];
  if (missedMate) facts.push({ kind: 'missed-mate', move: missedMate, square: missedMate.to, piece: missedMate.piece });

  const oppMate = matesInOne(after)[0];
  if (oppMate) facts.push({ kind: 'allows-mate', move: oppMate, bySquare: oppMate.from, byPiece: oppMate.piece, square: oppMate.to });

  const hangingBefore = hangingPieces(before, us);
  const top = hangingPieces(after, us)[0];
  if (top && top.gain - capturedValue > 0 && !oppMate) {
    const wasHanging = top.square !== move.to && hangingBefore.some((h) => h.square === top.square);
    facts.push({
      kind: wasHanging ? 'ignored-threat' : 'hanging-piece',
      square: top.square, piece: top.type, value: top.gain - capturedValue,
      byPiece: top.capture.piece, bySquare: top.capture.from, move: top.capture,
      defended: top.defenders.length > 0,
    });
  }

  const opportunity = hangingPieces(before, them)[0];
  if (opportunity && opportunity.gain >= 2 && capturedValue < opportunity.gain && !missedMate) {
    facts.push({
      kind: 'missed-capture', square: opportunity.square, piece: opportunity.type,
      value: opportunity.gain, move: opportunity.capture, defended: opportunity.defenders.length > 0,
    });
  }

  if (capturedValue >= 2 && !facts.some((f) => f.kind === 'hanging-piece' || f.kind === 'allows-mate')) {
    facts.push({ kind: 'good-capture', square: move.to, piece: move.captured ?? 'p', value: capturedValue, move });
  }

  const primary = pickPrimary(facts);
  return {
    move, facts, primary,
    severity: primary ? severityOf(primary) : 'ok',
    concept: primary ? CONCEPT_BY_FACT[primary.kind] : null,
  };
}

const PRIORITY: FactKind[] = ['allows-mate', 'missed-mate', 'hanging-piece', 'ignored-threat', 'missed-capture', 'good-capture'];

function pickPrimary(facts: Fact[]): Fact | null {
  const sorted = [...facts].sort((a, b) => {
    const pa = PRIORITY.indexOf(a.kind);
    const pb = PRIORITY.indexOf(b.kind);
    // Una pieza colgada pequeña no debe tapar un mate perdido, pero sí una captura perdida menor.
    return pa - pb || (b.value ?? 0) - (a.value ?? 0);
  });
  return sorted[0] ?? null;
}

function severityOf(f: Fact): Severity {
  const v = f.value ?? 0;
  switch (f.kind) {
    case 'allows-mate':
    case 'missed-mate':
      return 'blunder';
    case 'hanging-piece':
    case 'ignored-threat':
      return v >= 3 ? 'blunder' : v >= 2 ? 'mistake' : 'inaccuracy';
    case 'missed-capture':
      return v >= 3 ? 'mistake' : 'inaccuracy';
    case 'good-capture':
      return 'good';
    case 'mate':
      return 'excellent';
  }
}
