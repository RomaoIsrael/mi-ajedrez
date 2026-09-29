/**
 * Traducción pedagógica de las evaluaciones del motor (docs/06-inteligencia.md §2):
 * probabilidad de victoria, clasificación de jugadas, precisión y lenguaje sin números.
 */
import type { Score } from './uci.js';

export type MoveClass = 'book' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'missed-win' | 'brilliant';
export type ClassifyLevel = 'beginner' | 'intermediate' | 'advanced';

const MATE_CP = 10_000;

/** Convierte una puntuación (desde el bando que mueve) a centipeones acotados. */
export function scoreToCp(s: Score): number {
  if (s.mate !== undefined) return s.mate > 0 ? MATE_CP - s.mate * 10 : s.mate < 0 ? -MATE_CP - s.mate * 10 : -MATE_CP;
  return Math.max(-MATE_CP, Math.min(MATE_CP, s.cp ?? 0));
}

/** Probabilidad de victoria (0–1) para un bando con ventaja `cp`. */
export function winProb(cp: number): number {
  return 1 / (1 + Math.exp(-0.00368208 * cp));
}

export interface ClassifyInput {
  /** Evaluación (cp, punto de vista del que mueve) de la mejor jugada. */
  bestCp: number;
  /** Evaluación (cp, mismo punto de vista) de la jugada realizada. */
  playedCp: number;
  isBest: boolean;
  /** La jugada entrega material y el motor la aprueba. */
  sacrifice?: boolean;
  inBook?: boolean;
  level?: ClassifyLevel;
}

export interface Classification {
  moveClass: MoveClass;
  /** Pérdida de probabilidad de victoria (0–1). */
  winLoss: number;
  /** Precisión de la jugada (0–100). */
  accuracy: number;
}

/** Precisión por jugada a partir de la pérdida de probabilidad de victoria (en puntos %). */
export function moveAccuracy(winLoss: number): number {
  const pct = winLoss * 100;
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * pct) - 3.1669));
}

export function classify(input: ClassifyInput): Classification {
  const wBest = winProb(input.bestCp);
  const wPlayed = winProb(input.playedCp);
  const winLoss = Math.max(0, wBest - wPlayed);
  const accuracy = moveAccuracy(winLoss);
  // Para principiantes se relajan los umbrales: solo se señala lo que realmente podían ver.
  const k = input.level === 'beginner' ? 1.5 : 1;
  let moveClass: MoveClass;
  if (input.inBook) moveClass = 'book';
  else if (wBest >= 0.9 && wPlayed < 0.7) moveClass = 'missed-win';
  else if (input.isBest || winLoss < 0.02 * k) moveClass = input.isBest ? 'best' : 'excellent';
  else if (winLoss < 0.05 * k) moveClass = 'good';
  else if (winLoss < 0.1 * k) moveClass = 'inaccuracy';
  else if (winLoss < 0.2 * k) moveClass = 'mistake';
  else moveClass = 'blunder';
  // Brillante: excelente, con sacrificio real y sin estar ya totalmente ganado.
  if ((moveClass === 'best' || moveClass === 'excellent') && input.sacrifice && wBest < 0.9 && wPlayed > 0.45) moveClass = 'brilliant';
  return { moveClass, winLoss, accuracy };
}

/** Precisión media de una partida (0–100) a partir de las precisiones por jugada. */
export function gameAccuracy(accuracies: number[]): number | null {
  if (!accuracies.length) return null;
  // Media armónica suavizada: una sola jugada desastrosa pesa, como en la experiencia humana.
  const mean = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
  const harmonic = accuracies.length / accuracies.reduce((a, b) => a + 1 / Math.max(1, b), 0);
  return Math.round(((mean + harmonic) / 2) * 10) / 10;
}

/** Descripción sin números de una evaluación (punto de vista de quien juega). */
export function describeEval(cp: number, locale: 'es' | 'en' = 'es'): string {
  const a = Math.abs(cp);
  const good = cp > 0;
  if (a >= 9000) return locale === 'es' ? (good ? 'tienes mate' : 'te dan mate') : good ? 'you have mate' : 'you get mated';
  if (a < 40) return locale === 'es' ? 'igualdad' : 'equal';
  const size = a < 120 ? (locale === 'es' ? 'ligera ventaja' : 'slight edge') : a < 300 ? (locale === 'es' ? 'ventaja clara' : 'clear advantage') : locale === 'es' ? 'ventaja decisiva' : 'decisive advantage';
  return locale === 'es' ? `${size} ${good ? 'tuya' : 'del rival'}` : `${size} for ${good ? 'you' : 'your opponent'}`;
}

/** Texto numérico para niveles intermedio y avanzado (+1.2, M3…). */
export function formatEval(s: Score): string {
  if (s.mate !== undefined) return `M${Math.abs(s.mate)}`;
  const v = (s.cp ?? 0) / 100;
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}`;
}
