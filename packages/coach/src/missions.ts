/**
 * Misiones diarias (docs/08-gamificacion.md §5). Premian aprendizaje verificado —repasos,
 * puzzles al primer intento, lecciones nuevas, partidas limpias—, nunca abrir la app.
 */
import { conceptById } from '@kavalo/content';
import { dueCards } from '@kavalo/pedagogy';
import { availableLessons } from './recommend.js';
import { KIND_CONCEPT, mistakeStats } from './stats.js';
import { dayKey, type ActivityEvent, type CoachState } from './types.js';

export interface Mission {
  id: string;
  title: string;
  target: number;
  progress: number;
  xp: number;
  done: boolean;
}

interface Template {
  id: string;
  xp: number;
  target: number;
  title: (state: CoachState) => string;
  relevant: (state: CoachState, now: number) => boolean;
  count: (events: ActivityEvent[], state: CoachState) => number;
}

const weakConcept = (state: CoachState) => {
  const w = mistakeStats(state).find((m) => m.games >= 2);
  return w ? KIND_CONCEPT[w.kind] : undefined;
};

const TEMPLATES: Template[] = [
  {
    id: 'review', xp: 15, target: 1, title: () => 'Completa un repaso pendiente',
    relevant: (s, now) => dueCards(s.reviews, now).length > 0,
    count: (ev) => ev.filter((e) => e.kind === 'review' || (e.kind === 'puzzle' && e.ref?.startsWith('pp-'))).length,
  },
  {
    id: 'lesson', xp: 20, target: 1, title: () => 'Completa una lección nueva',
    relevant: (s) => availableLessons(s).length > 0,
    count: (ev) => ev.filter((e) => e.kind === 'lesson' && e.first).length,
  },
  {
    id: 'weak-puzzles', xp: 20, target: 2,
    title: (s) => `Resuelve 2 puzzles de «${conceptById(weakConcept(s) ?? '')?.title ?? 'tu punto débil'}»`,
    relevant: (s) => !!weakConcept(s),
    count: (ev, s) => ev.filter((e) => e.kind === 'puzzle' && e.ok && e.concept === weakConcept(s)).length,
  },
  {
    id: 'clean-puzzles', xp: 15, target: 3, title: () => 'Resuelve 3 puzzles al primer intento y sin pistas',
    relevant: () => true,
    count: (ev) => ev.filter((e) => e.kind === 'puzzle' && e.ok && !e.hints).length,
  },
  {
    id: 'clean-game', xp: 25, target: 1, title: () => 'Juega una partida sin errores graves',
    relevant: (s) => s.completedLessons.length >= 3,
    count: (ev) => ev.filter((e) => e.kind === 'game' && e.ok).length,
  },
];

/** Hasta 3 misiones para el día de `now`, elegidas según lo que el jugador necesita. */
export function dailyMissions(state: CoachState, now = Date.now()): Mission[] {
  const today = dayKey(now);
  const events = state.activity.filter((a) => dayKey(a.at) === today);
  // Rotación estable durante el día: la misma lista aunque se recargue la app.
  const seed = [...today].reduce((a, c) => a + c.charCodeAt(0), 0);
  const relevant = TEMPLATES.filter((t) => t.relevant(state, now) || events.some((e) => e.at && t.count([e], state) > 0));
  const priority = relevant.filter((t) => t.id === 'review' || t.id === 'weak-puzzles');
  const rest = relevant.filter((t) => !priority.includes(t));
  const rotated = rest.length ? [...rest.slice(seed % rest.length), ...rest.slice(0, seed % rest.length)] : [];
  return [...priority, ...rotated].slice(0, 3).map((t) => {
    const progress = Math.min(t.target, t.count(events, state));
    return { id: t.id, title: t.title(state), target: t.target, progress, xp: t.xp, done: progress >= t.target };
  });
}
