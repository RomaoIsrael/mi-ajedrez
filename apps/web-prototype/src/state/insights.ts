/**
 * Puente entre la app y el coach (`@kavalo/coach`): aplica sus funciones puras al perfil local
 * y traduce sus acciones a rutas. Aquí queda también el ADN básico del prototipo.
 */
import * as coach from '@kavalo/coach';
import { SECTIONS } from '@kavalo/content';
import { profile, mastery, type MistakeRecord } from './store.js';

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

export interface DnaDimension { key: string; label: string; value: number | null; }

/** ADN básico (prototipo): 5 dimensiones con datos mínimos exigidos. */
export function chessDna(): { games: number; confidence: 'building' | 'low' | 'medium'; dims: DnaDimension[] } {
  const games = recentGames(30);
  const n = games.length;
  const ids = new Set(games.map((g) => g.id));
  const ms = profile.mistakes.filter((m) => ids.has(m.gameId));
  const count = (k: string) => ms.filter((m) => m.kind === k).length;
  const clamp = (v: number) => Math.round(Math.max(5, Math.min(95, v)));
  const tacticsFound = profile.games.filter((g) => ids.has(g.id)).length ? tacticSuccess(ms, n) : null;
  const wins = games.filter((g) => g.userResult === 'win').length;
  const dims: DnaDimension[] = n === 0 ? [] : [
    { key: 'tactics', label: 'Táctica', value: tacticsFound },
    { key: 'defense', label: 'Defensa', value: clamp(90 - ((count('hanging-piece') + count('ignored-threat') + count('allows-mate') * 2) / n) * 25) },
    { key: 'vision', label: 'Visión', value: clamp(85 - ((count('missed-capture') + count('ignored-threat')) / n) * 20) },
    { key: 'attack', label: 'Ataque', value: clamp(40 + (wins / n) * 40 + (count('missed-mate') ? -10 : 5)) },
    { key: 'calm', label: 'Paciencia', value: clamp(70 - (profile.games.filter((g) => ids.has(g.id)).reduce((a, g) => a + g.hintsUsed, 0) / n) * 5) },
  ];
  return { games: n, confidence: n < 5 ? 'building' : n < 15 ? 'low' : 'medium', dims };
}

function tacticSuccess(ms: MistakeRecord[], n: number): number {
  const missed = ms.filter((m) => m.kind === 'missed-capture' || m.kind === 'missed-mate').length;
  return Math.round(Math.max(5, Math.min(95, 80 - (missed / n) * 18)));
}

export function conceptProgress() {
  return SECTIONS.map((s) => ({ section: s, nodes: s.nodes.map((n) => ({ node: n, state: mastery(n.id).state })) }));
}
