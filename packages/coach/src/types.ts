/**
 * Estado que necesita el coach. Es un subconjunto de `UserChessProfile` (docs/07-datos.md):
 * la app le pasa su perfil y el coach responde sin efectos secundarios (funciones puras).
 */
import type { ConceptMastery, ReviewCard } from '@kavalo/pedagogy';

export type ActivityKind = 'lesson' | 'review' | 'puzzle' | 'game' | 'mastery';

/** Evento de aprendizaje (append‑only). Es la fuente de misiones, logros y reportes. */
export interface ActivityEvent {
  at: number;
  kind: ActivityKind;
  /** Duración en ms (0 si no aplica). */
  ms: number;
  /** Acierto / lección superada / partida limpia. */
  ok?: boolean;
  hints?: number;
  concept?: string;
  /** Identificador de lección, puzzle o partida. */
  ref?: string;
  /** Solo `mastery`: nuevo estado del concepto. */
  state?: ConceptMastery['state'];
  /** Solo `lesson`: primera vez que se completa. */
  first?: boolean;
}

export interface CoachGame {
  id: string;
  at: number;
  userResult: 'win' | 'loss' | 'draw';
  reason?: string;
  hintsUsed: number;
}

export interface CoachMistake {
  at: number;
  gameId: string;
  kind: string;
  concept: string;
  severity: string;
}

export interface CoachState {
  goal: string;
  dailyMinutes: number;
  gameRating: number;
  puzzleRating: number;
  completedLessons: string[];
  mastery: Record<string, ConceptMastery>;
  reviews: ReviewCard[];
  games: CoachGame[];
  mistakes: CoachMistake[];
  activity: ActivityEvent[];
  ratingHistory: { at: number; kind: 'game' | 'puzzle'; rating: number }[];
  achievements: Record<string, number>;
}

export const DAY = 86_400_000;

/** Día local (AAAA-MM-DD) de una marca de tiempo. */
export function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Identificador de la tarjeta de repaso de una lección. */
export const lessonCardId = (lessonId: string) => `lesson:${lessonId}`;
