/**
 * ¿Qué debería aprender ahora? (docs/06-inteligencia.md §3.2)
 *
 * Cada candidato recibe una puntuación con componentes explicables; el primero es la
 * recomendación y los siguientes se ofrecen como alternativas. Los pesos son iniciales y
 * se ajustarán con datos reales (reducción de errores y retención).
 */
import { conceptById, LESSONS, SECTIONS, type Lesson } from '@kavalo/content';
import { dueCards } from '@kavalo/pedagogy';
import { KIND_CONCEPT, KIND_TOPIC, mistakeStats } from './stats.js';
import { DAY, dayKey, type CoachState } from './types.js';

export type CoachAction =
  | { type: 'lesson'; lessonId: string }
  | { type: 'review'; lessonId: string }
  | { type: 'puzzles'; concept?: string }
  | { type: 'play' };

export interface Recommendation {
  id: string;
  title: string;
  /** Motivo principal, en lenguaje natural (botón «¿Por qué esto?»). */
  reason: string;
  /** Ajustes aplicados a la puntuación (transparencia). */
  factors: string[];
  score: number;
  concept?: string;
  action: CoachAction;
}

export function isLessonDone(state: CoachState, conceptId: string): boolean {
  const lesson = LESSONS.find((l) => l.conceptId === conceptId);
  return !!lesson && state.completedLessons.includes(lesson.id);
}

/** Un nodo se desbloquea cuando sus prerrequisitos con lección están completados. */
export function isUnlocked(state: CoachState, conceptId: string): boolean {
  const c = conceptById(conceptId);
  if (!c) return false;
  return c.prerequisites.every((p) => (LESSONS.some((l) => l.conceptId === p) ? isLessonDone(state, p) : isUnlocked(state, p)));
}

/** Lecciones disponibles y aún no completadas, en el orden del mapa. */
export function availableLessons(state: CoachState): Lesson[] {
  const out: Lesson[] = [];
  for (const s of SECTIONS) for (const n of s.nodes) {
    if (n.lessonId && !state.completedLessons.includes(n.lessonId) && isUnlocked(state, n.id)) {
      out.push(LESSONS.find((l) => l.id === n.lessonId)!);
    }
  }
  return out;
}

const GOAL_SECTIONS: Record<string, string[]> = {
  learn: ['fundamentals', 'vision'],
  friends: ['fundamentals', 'openings'],
  rating: ['tactics', 'vision'],
  tactics: ['tactics', 'vision'],
  endgames: ['endgame'],
  tournaments: ['openings', 'tactics', 'endgame'],
};

export function recommendations(state: CoachState, now = Date.now()): Recommendation[] {
  const out: Recommendation[] = [];
  const today = dayKey(now);
  const todayEvents = state.activity.filter((a) => dayKey(a.at) === today);
  const practisedToday = (concept?: string) => (concept ? todayEvents.filter((a) => a.concept === concept).length : 0);
  const fatigue = (r: Recommendation) => {
    if (practisedToday(r.concept) >= 3) {
      r.score -= 25;
      r.factors.push('Ya lo trabajaste bastante hoy: conviene variar (−25).');
    }
  };

  // 1) Repasos vencidos de lecciones (repetición espaciada).
  const due = dueCards(state.reviews, now);
  for (const card of due.filter((c) => c.itemId.startsWith('lesson:'))) {
    const lessonId = card.itemId.slice('lesson:'.length);
    const lesson = LESSONS.find((l) => l.id === lessonId);
    if (!lesson) continue;
    const overdue = Math.floor((now - card.dueAt) / DAY);
    const r: Recommendation = {
      id: `review:${lessonId}`, title: `Repaso: ${lesson.title}`, concept: lesson.conceptId,
      reason: card.lapses
        ? `La última vez este concepto se te resistió. Repasarlo ahora, ${card.intervalDays === 1 ? 'un día después' : `a los ${card.intervalDays} días`}, es lo que lo fija en la memoria.`
        : `Toca repasarlo ${card.intervalDays === 1 ? 'un día después' : `a los ${card.intervalDays} días`} de aprenderlo: así pasa a la memoria de largo plazo.`,
      factors: [`Repaso vencido (+60)${overdue > 0 ? `, con ${overdue} ${overdue === 1 ? 'día' : 'días'} de retraso (+${Math.min(30, overdue * 5)})` : ''}.`],
      score: 60 + Math.min(30, overdue * 5), action: { type: 'review', lessonId },
    };
    fatigue(r);
    out.push(r);
  }

  // 2) Posiciones de tus partidas (puzzles personales) y puzzles vencidos.
  const duePuzzles = due.filter((c) => !c.itemId.startsWith('lesson:'));
  if (duePuzzles.length) {
    out.push({
      id: 'review:puzzles', title: `Repasar ${duePuzzles.length} ${duePuzzles.length === 1 ? 'posición' : 'posiciones'}`,
      reason: 'Son posiciones de tus propias partidas y puzzles que fallaste: hoy toca comprobar si ya encuentras la jugada.',
      factors: [`${duePuzzles.length} repasos de puzzles vencidos (+${55 + Math.min(15, duePuzzles.length * 3)}).`],
      score: 55 + Math.min(15, duePuzzles.length * 3), action: { type: 'puzzles' },
    });
  }

  // 3) Tu error más frecuente (solo con evidencia en ≥ 2 partidas: sistema de confianza).
  const weakness = mistakeStats(state).find((m) => m.games >= 2);
  if (weakness) {
    const concept = KIND_CONCEPT[weakness.kind] ?? 'vision.undefended-pieces';
    const lesson = LESSONS.find((l) => l.conceptId === concept);
    const learned = lesson ? state.completedLessons.includes(lesson.id) : true;
    const total = Math.min(10, state.games.length);
    const r: Recommendation = {
      id: `weakness:${weakness.kind}`, title: `Hoy trabajamos: ${KIND_TOPIC[weakness.kind] ?? weakness.label.toLowerCase()}`, concept,
      reason: `Fue tu error más frecuente: aparece en ${weakness.games} de tus últimas ${total} partidas.`,
      factors: [`Error repetido en ${weakness.games} partidas (+${Math.min(85, 40 + weakness.games * 10)}).`],
      score: Math.min(85, 40 + weakness.games * 10),
      action: lesson && !learned ? { type: 'lesson', lessonId: lesson.id } : { type: 'puzzles', concept },
    };
    fatigue(r);
    out.push(r);
  }

  // 4) Siguiente lección: se valoran todas las disponibles (orden del mapa + objetivo personal).
  const inProgress = Object.values(state.mastery).filter((m) => m.state === 'learning').length;
  const lessonCandidates = availableLessons(state).map((lesson, i) => {
    const section = lesson.conceptId.split('.')[0]!;
    const r: Recommendation = {
      id: `lesson:${lesson.id}`, title: lesson.title, concept: lesson.conceptId,
      reason: state.completedLessons.length ? 'Es el siguiente paso de tu mapa de aprendizaje.' : 'Empezamos por lo esencial: en pocos minutos estarás moviendo piezas.',
      factors: [i === 0 ? 'Siguiente lección del mapa (+50).' : `Lección disponible (+${50 - Math.min(10, i * 2)}).`],
      score: 50 - Math.min(10, i * 2), action: { type: 'lesson', lessonId: lesson.id },
    };
    if ((GOAL_SECTIONS[state.goal] ?? []).includes(section)) {
      r.score += 12;
      r.factors.push('Encaja con tu objetivo (+12).');
      if (i > 0) r.reason = 'Encaja con el objetivo que elegiste y ya tienes lo necesario para aprenderla.';
    }
    if (inProgress >= 4) {
      r.score -= 15;
      r.factors.push(`Tienes ${inProgress} conceptos a medio aprender: mejor consolidarlos antes de abrir otro (−15).`);
    }
    if (section === 'openings' && weakness) {
      r.score -= 20;
      r.factors.push('Todavía no recomendamos estudiar aperturas: tus partidas se deciden por errores tácticos (−20).');
    }
    return r;
  }).sort((a, b) => b.score - a.score);
  // Se ofrece la mejor lección y, como alternativa, la siguiente del mapa si es distinta.
  out.push(...lessonCandidates.slice(0, 2));

  // 5) Aplicar lo aprendido en una partida.
  const lastGame = state.games.at(-1)?.at ?? 0;
  const lessonsSince = state.activity.filter((a) => a.kind === 'lesson' && a.first && a.at > lastGame).length;
  const play: Recommendation = {
    id: 'play', title: 'Partida con el coach',
    reason: lessonsSince >= 2
      ? `Has aprendido ${lessonsSince} conceptos nuevos desde tu última partida: es el momento de aplicarlos.`
      : 'Aplica lo aprendido en una partida real; después revisaremos juntos los momentos clave.',
    factors: ['Aplicar en partida (+30).'], score: 30, action: { type: 'play' },
  };
  if (lessonsSince >= 2) {
    play.score += 25;
    play.factors.push(`${lessonsSince} lecciones nuevas sin aplicar (+25).`);
  }
  if (state.completedLessons.length === 0) {
    play.score -= 20;
    play.factors.push('Antes conviene conocer las piezas (−20).');
  }
  out.push(play);

  return out.sort((a, b) => b.score - a.score);
}

export function recommend(state: CoachState, now = Date.now()): Recommendation {
  return recommendations(state, now)[0]!;
}

export interface PlanBlock { minutes: number; label: string; why: string; action: CoachAction }

/** Plan diario según el tiempo disponible, rellenado con las mejores recomendaciones. */
export function dailyPlan(state: CoachState, now = Date.now()): PlanBlock[] {
  const recs = recommendations(state, now);
  const top = recs[0]!;
  const second = recs.find((r) => r.id !== top.id && r.action.type !== 'play');
  const split: Record<number, [number, number, number]> = {
    5: [5, 0, 0], 10: [5, 5, 0], 20: [8, 6, 6], 30: [10, 10, 10], 45: [15, 10, 20], 60: [20, 15, 25],
  };
  const [a, b, c] = split[state.dailyMinutes] ?? split[20]!;
  const blocks: PlanBlock[] = [{ minutes: a, label: top.title, why: top.reason, action: top.action }];
  if (b && second) blocks.push({ minutes: b, label: second.title, why: second.reason, action: second.action });
  else if (b) blocks.push({ minutes: b, label: 'Puzzles adaptativos', why: 'Elegidos según tus errores y tu nivel.', action: { type: 'puzzles' } });
  if (c && top.action.type !== 'play') blocks.push({ minutes: c, label: 'Partida con el coach', why: 'Aplicar lo trabajado en una situación real.', action: { type: 'play' } });
  return blocks;
}
