/**
 * Logros (docs/08-gamificacion.md §4). Todos exigen aprendizaje demostrado; ninguno se
 * consigue por tiempo de uso.
 */
import { LESSONS, PUZZLES } from '@kavalo/content';
import { cleanInLastGames, errorReduction } from './stats.js';
import { DAY, dayKey, type CoachState } from './types.js';

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  check: (s: CoachState) => boolean;
}

const lessonsOf = (prefix: string) => LESSONS.filter((l) => l.conceptId.startsWith(prefix)).map((l) => l.id);
const allDone = (s: CoachState, ids: string[]) => ids.length > 0 && ids.every((id) => s.completedLessons.includes(id));
const mateIn2Ids = new Set(PUZZLES.filter((p) => p.line).map((p) => p.id));

function learningDaysStreak(s: CoachState, now: number): number {
  const days = new Set(s.activity.filter((a) => a.kind !== 'mastery').map((a) => dayKey(a.at)));
  let n = 0;
  for (let t = now; days.has(dayKey(t)); t -= DAY) n++;
  return n;
}

/**
 * Racha de días seguidos con aprendizaje verificado. Sigue viva si hoy aún no has entrenado
 * pero ayer sí (hay todo el día para mantenerla).
 */
export function learningStreak(s: CoachState, now = Date.now()): number {
  const today = learningDaysStreak(s, now);
  return today > 0 ? today : learningDaysStreak(s, now - DAY);
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-lesson', icon: '🎓', title: 'Primer paso', description: 'Completa tu primera lección.', check: (s) => s.completedLessons.length >= 1 },
  { id: 'fundamentals', icon: '♙', title: 'Bases sólidas', description: 'Completa todas las lecciones de Fundamentos.', check: (s) => allDone(s, lessonsOf('fundamentals.')) },
  { id: 'tactician', icon: '⚡', title: 'Ojo táctico', description: 'Completa todas las lecciones de Táctica.', check: (s) => allDone(s, lessonsOf('tactics.')) },
  { id: 'first-mate', icon: '♚', title: 'Primer mate', description: 'Gana una partida por jaque mate.', check: (s) => s.games.some((g) => g.userResult === 'win' && g.reason === 'checkmate') },
  {
    id: 'guardian', icon: '🛡', title: 'Guardián', description: '10 partidas seguidas sin dejar piezas colgadas.',
    check: (s) => cleanInLastGames(s, ['hanging-piece'], 10) === true,
  },
  {
    id: 'sharp-eye', icon: '🎯', title: 'Vista de lince', description: 'Resuelve 10 puzzles al primer intento y sin pistas.',
    check: (s) => s.activity.filter((a) => a.kind === 'puzzle' && a.ok && !a.hints).length >= 10,
  },
  {
    id: 'mate-in-2', icon: '✨', title: 'Dos jugadas por delante', description: 'Resuelve un mate en 2.',
    check: (s) => s.activity.some((a) => a.kind === 'puzzle' && a.ok && !!a.ref && mateIn2Ids.has(a.ref)),
  },
  {
    id: 'memory', icon: '🐘', title: 'Memoria de elefante', description: 'Acierta 10 repasos espaciados seguidos.',
    check: (s) => {
      const reviews = s.activity.filter((a) => a.kind === 'review');
      return reviews.length >= 10 && reviews.slice(-10).every((r) => r.ok);
    },
  },
  {
    id: 'own-mistake', icon: '🔁', title: 'Aprender del error', description: 'Resuelve un ejercicio creado a partir de un error de tus partidas.',
    check: (s) => s.activity.some((a) => a.kind === 'puzzle' && a.ok && !!a.ref?.startsWith('pp-')),
  },
  { id: 'endgame', icon: '♔', title: 'Técnica de final', description: 'Da mate con rey y dama contra rey en la práctica.', check: (s) => s.completedLessons.includes('kq-vs-k') },
  {
    id: 'streak-7', icon: '🔥', title: 'Constancia', description: 'Aprende algo 7 días seguidos.',
    check: (s) => s.activity.length > 0 && learningDaysStreak(s, Math.max(...s.activity.map((a) => a.at))) >= 7,
  },
  {
    id: 'corrector', icon: '📉', title: 'Corrector', description: 'Reduce a la mitad un tipo de error (mín. 10 partidas).',
    check: (s) => (errorReduction(s) ?? []).some((e) => e.rate >= 0.5),
  },
  {
    id: 'independent', icon: '🧭', title: 'Autodidacta', description: '5 partidas seguidas sin pistas y sin errores graves.',
    check: (s) => {
      const last = s.games.slice(-5);
      if (last.length < 5) return false;
      const ids = new Set(last.map((g) => g.id));
      return last.every((g) => g.hintsUsed === 0) && !s.mistakes.some((m) => ids.has(m.gameId));
    },
  },
];

/** Logros recién conseguidos (no presentes todavía en `state.achievements`). */
export function newAchievements(state: CoachState): Achievement[] {
  return ACHIEVEMENTS.filter((a) => !state.achievements[a.id] && a.check(state));
}
