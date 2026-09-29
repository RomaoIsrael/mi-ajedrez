/**
 * Puente entre la app y el coach (`@kavalo/coach`): aplica sus funciones puras al perfil local
 * y traduce sus acciones a rutas. También expone el ADN medido (`@kavalo/dna`).
 */
import * as coach from '@kavalo/coach';
import { SECTIONS } from '@kavalo/content';
import { computeDna, type Dna } from '@kavalo/dna';
import { profile, mastery } from './store.js';

export { KIND_LABEL, KIND_TOPIC } from '@kavalo/coach';

export const recentGames = (n = 30) => profile.games.slice(-n);
export const mistakeStats = (gameIds?: string[]) => coach.mistakeStats(profile, gameIds);
export const errorReduction = () => coach.errorReduction(profile);
export const isUnlocked = (conceptId: string) => coach.isUnlocked(profile, conceptId);
export const nextLesson = () => coach.availableLessons(profile)[0] ?? null;

/** Ruta de la app para cada acción del coach. */
export function actionHref(a: coach.CoachAction): string {
  switch (a.type) {
    case 'lesson': return `#/lesson/${a.lessonId}`;
    case 'review': return `#/lesson/${a.lessonId}/review`;
    case 'puzzles': return a.concept ? `#/puzzles/${a.concept}` : '#/puzzles';
    case 'play': return '#/play';
  }
}

export interface Recommendation extends coach.Recommendation { href: string; cta: string }

const withHref = (r: coach.Recommendation): Recommendation => ({ ...r, href: actionHref(r.action), cta: 'Continuar entrenamiento' });

/** ¿Qué debería aprender ahora? La primera es la recomendación; el resto, alternativas. */
export const recommendations = (): Recommendation[] => coach.recommendations(profile).map(withHref);
export const recommend = (): Recommendation => recommendations()[0]!;

export interface PlanBlock { minutes: number; label: string; href: string; why: string }
export const dailyPlan = (): PlanBlock[] =>
  coach.dailyPlan(profile).map((b) => ({ minutes: b.minutes, label: b.label, why: b.why, href: actionHref(b.action) }));

/** ADN medido con Stockfish (`@kavalo/dna`) a partir de las partidas analizadas. */
export function chessDna(): Dna {
  return computeDna(profile.games.map((g) => g.features).filter((f): f is NonNullable<typeof f> => !!f));
}

export function conceptProgress() {
  return SECTIONS.map((s) => ({ section: s, nodes: s.nodes.map((n) => ({ node: n, state: mastery(n.id).state })) }));
}
