/**
 * Modelo de dominio por concepto: Bayesian Knowledge Tracing + reglas de estado
 * (🔒 ○ ◐ ● ★ ♛). Ver docs/05-pedagogia.md §5 y el sistema de confianza (§98 del brief).
 */

export type MasteryState = 'locked' | 'introduced' | 'learning' | 'understood' | 'mastered' | 'mastery';

export const STATE_ICON: Record<MasteryState, string> = {
  locked: '🔒', introduced: '○', learning: '◐', understood: '●', mastered: '★', mastery: '♛',
};

export type EvidenceContext = 'guided' | 'puzzle' | 'personal_puzzle' | 'review' | 'game';

export interface ConceptMastery {
  conceptId: string;
  state: MasteryState;
  pKnown: number;
  attempts: number;
  correct: number;
  /** Contextos distintos en los que se ha demostrado (acierto sin pistas). */
  contexts: EvidenceContext[];
  firstCorrectAt?: number;
  lastEvidenceAt?: number;
  /** Fechas (ms) de repasos espaciados correctos. */
  spacedSuccesses: number[];
  /** Resultados recientes (true = acierto), máx. 5, para decidir reprogramaciones. */
  recent: boolean[];
  /** Memoria pedagógica ante errores: 1 explicación · 2 recordatorio · 3 pregunta · 4 sin ayuda. */
  memoryStage: 1 | 2 | 3 | 4;
}

// Parámetros BKT iniciales (se calibrarán con datos reales).
const P_INIT = 0.1;
const P_LEARN = 0.15;
const P_SLIP = 0.1;
const P_GUESS = 0.2;

/** Peso de la evidencia por contexto: una partida real vale más que un ejercicio guiado. */
const WEIGHT: Record<EvidenceContext, number> = { guided: 0.5, puzzle: 0.8, review: 1, personal_puzzle: 1, game: 1.2 };

export function initialMastery(conceptId: string, unlocked = true): ConceptMastery {
  return {
    conceptId, state: unlocked ? 'introduced' : 'locked', pKnown: P_INIT, attempts: 0, correct: 0,
    contexts: [], spacedSuccesses: [], recent: [], memoryStage: 1,
  };
}

function bkt(p: number, correct: boolean, weight: number): number {
  const slip = P_SLIP;
  const guess = P_GUESS;
  const posterior = correct
    ? (p * (1 - slip)) / (p * (1 - slip) + (1 - p) * guess)
    : (p * slip) / (p * slip + (1 - p) * (1 - guess));
  // La evidencia débil mueve menos la estimación.
  const blended = p + (posterior - p) * Math.min(1, weight);
  return Math.min(0.999, Math.max(0.001, blended + (1 - blended) * P_LEARN * (correct ? weight : 0.3)));
}

const DAY = 86_400_000;

export interface Evidence {
  correct: boolean;
  context: EvidenceContext;
  hints: number;
  at: number;
}

export interface UpdateResult {
  mastery: ConceptMastery;
  /** true si fue un fallo aislado de alguien que domina el concepto (no reprogramar). */
  slip: boolean;
  /** true si el concepto debe volver a practicarse (reprogramar lección/puzzles). */
  reschedule: boolean;
}

export function updateMastery(m: ConceptMastery, e: Evidence): UpdateResult {
  const clean = e.correct && e.hints === 0;
  const weight = WEIGHT[e.context] * (e.correct && e.hints > 0 ? 0.5 : 1);
  const pBefore = m.pKnown;
  const recent = [...m.recent, e.correct].slice(-5);
  const next: ConceptMastery = {
    ...m,
    attempts: m.attempts + 1,
    correct: m.correct + (e.correct ? 1 : 0),
    pKnown: bkt(m.pKnown, e.correct, weight),
    lastEvidenceAt: e.at,
    recent,
    contexts: clean && !m.contexts.includes(e.context) ? [...m.contexts, e.context] : m.contexts,
    firstCorrectAt: m.firstCorrectAt ?? (e.correct ? e.at : undefined),
    spacedSuccesses:
      clean && m.firstCorrectAt !== undefined && e.at - m.firstCorrectAt >= DAY ? [...m.spacedSuccesses, e.at] : m.spacedSuccesses,
  };

  const failures = recent.filter((r) => !r).length;
  const slip = !e.correct && pBefore >= 0.85 && failures < 2;
  const reschedule = !e.correct && !slip;
  if (!e.correct) next.memoryStage = Math.min(4, m.memoryStage + (slip ? 0 : 1)) as ConceptMastery['memoryStage'];
  next.state = deriveState(next, e.at, slip);
  return { mastery: next, slip, reschedule };
}

function deriveState(m: ConceptMastery, now: number, slip: boolean): MasteryState {
  if (m.state === 'locked') return 'locked';
  const accuracy = m.attempts ? m.correct / m.attempts : 0;
  const spacedAfter = (days: number) => m.firstCorrectAt !== undefined && m.spacedSuccesses.some((t) => t - m.firstCorrectAt! >= days * DAY);
  const inGameAndPuzzle = m.contexts.includes('game') && m.contexts.some((c) => c === 'puzzle' || c === 'personal_puzzle' || c === 'review');
  let state: MasteryState = m.correct > 0 ? 'learning' : 'introduced';
  if (m.attempts >= 5 && accuracy >= 0.8 && spacedAfter(1)) state = 'understood';
  if (state === 'understood' && spacedAfter(7) && inGameAndPuzzle && m.pKnown >= 0.9) state = 'mastered';
  if (state === 'mastered' && spacedAfter(30) && m.recent.every(Boolean)) state = 'mastery';
  // Sistema de confianza: un desliz no degrada el estado.
  const order: MasteryState[] = ['locked', 'introduced', 'learning', 'understood', 'mastered', 'mastery'];
  if (slip && order.indexOf(m.state) > order.indexOf(state)) return m.state;
  return state;
}
