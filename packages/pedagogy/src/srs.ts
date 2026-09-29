/**
 * Repetición espaciada: escalera fija 1 → 3 → 7 → 14 → 30 días y, después, intervalos
 * multiplicados por la facilidad (esquema tipo SM‑2). Ver docs/05-pedagogia.md §6.
 */

export const LADDER = [1, 3, 7, 14, 30] as const;
const DAY = 86_400_000;

export type Grade = 'fail' | 'hard' | 'good' | 'easy';

export interface ReviewCard {
  conceptId: string;
  itemId: string;
  step: number;
  ease: number;
  intervalDays: number;
  dueAt: number; // epoch ms
  lapses: number;
}

export function newCard(conceptId: string, itemId: string, now: number): ReviewCard {
  return { conceptId, itemId, step: 0, ease: 2.3, intervalDays: LADDER[0], dueAt: now + LADDER[0] * DAY, lapses: 0 };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function schedule(card: ReviewCard, grade: Grade, now: number): ReviewCard {
  if (grade === 'fail') {
    return { ...card, step: 0, lapses: card.lapses + 1, ease: Math.max(1.3, card.ease - 0.2), intervalDays: 1, dueAt: now + DAY };
  }
  const step = card.step + (grade === 'easy' ? 2 : 1);
  const base = step < LADDER.length ? LADDER[step]! : Math.round(card.intervalDays * card.ease);
  const factor = grade === 'hard' ? 0.7 : 1;
  const ease = clamp(card.ease + (grade === 'easy' ? 0.15 : grade === 'hard' ? -0.15 : 0), 1.3, 2.8);
  const intervalDays = Math.max(1, Math.round(base * factor));
  return { ...card, step, ease, intervalDays, dueAt: now + intervalDays * DAY };
}

/** Deriva la nota a partir del intento: acierto, pistas usadas y tiempo relativo a la mediana. */
export function gradeAttempt(a: { correct: boolean; hints: number; sawSolution?: boolean; ms: number; medianMs: number }): Grade {
  if (!a.correct || a.sawSolution) return 'fail';
  if (a.hints >= 2 || a.ms > 2 * a.medianMs) return 'hard';
  if (a.hints === 0 && a.ms < 0.6 * a.medianMs) return 'easy';
  return 'good';
}

export const dueCards = (cards: readonly ReviewCard[], now: number) =>
  cards.filter((c) => c.dueAt <= now).sort((a, b) => a.dueAt - b.dueAt);
