/**
 * Coach del prototipo: estadísticas de errores, ERR, ADN básico, recomendación y plan diario.
 * Reglas explicables (docs/06-inteligencia.md §3.2) sobre el historial local.
 */
import { conceptById, LESSONS, SECTIONS } from '@kavalo/content';
import { dueCards } from '@kavalo/pedagogy';
import { profile, mastery, type MistakeRecord } from './store.js';

export const KIND_LABEL: Record<string, string> = {
  'hanging-piece': 'Piezas colgadas',
  'ignored-threat': 'No detectar amenazas',
  'allows-mate': 'Permitir mate',
  'missed-mate': 'Mates no vistos',
  'missed-capture': 'Capturas no vistas',
};

/** Tema de entrenamiento en positivo para cada tipo de error. */
export const KIND_TOPIC: Record<string, string> = {
  'hanging-piece': 'proteger tus piezas',
  'ignored-threat': 'detectar las amenazas del rival',
  'allows-mate': 'la seguridad de tu rey',
  'missed-mate': 'encontrar mates',
  'missed-capture': 'ver piezas rivales indefensas',
};

export function recentGames(n = 30) {
  return profile.games.slice(-n);
}

export interface MistakeStat { kind: string; label: string; count: number; perGame: number; }

export function mistakeStats(gameIds?: string[]): MistakeStat[] {
  const ids = new Set(gameIds ?? recentGames(10).map((g) => g.id));
  const games = Math.max(1, ids.size);
  const counts = new Map<string, number>();
  for (const m of profile.mistakes) if (ids.has(m.gameId)) counts.set(m.kind, (counts.get(m.kind) ?? 0) + 1);
  return [...counts].map(([kind, count]) => ({ kind, label: KIND_LABEL[kind] ?? kind, count, perGame: count / games }))
    .sort((a, b) => b.count - a.count);
}

/** Error Reduction Rate: primera mitad vs segunda mitad del historial (≥5 partidas por ventana). */
export function errorReduction(): { kind: string; label: string; before: number; now: number; rate: number }[] | null {
  const games = profile.games;
  if (games.length < 10) return null;
  const half = Math.floor(games.length / 2);
  const early = mistakeStats(games.slice(0, half).map((g) => g.id));
  const late = mistakeStats(games.slice(half).map((g) => g.id));
  return early.filter((e) => e.perGame > 0).map((e) => {
    const now = late.find((l) => l.kind === e.kind)?.perGame ?? 0;
    return { kind: e.kind, label: e.label, before: e.perGame, now, rate: 1 - now / e.perGame };
  });
}

export function gamesWithMistakeKind(kind: string, n = 10): { with: number; total: number } {
  const games = recentGames(n);
  const ids = new Set(profile.mistakes.filter((m) => m.kind === kind).map((m) => m.gameId));
  return { with: games.filter((g) => ids.has(g.id)).length, total: games.length };
}

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

export function isLessonDone(conceptId: string): boolean {
  const lesson = LESSONS.find((l) => l.conceptId === conceptId);
  return !!lesson && profile.completedLessons.includes(lesson.id);
}

/** Un nodo se desbloquea cuando sus prerrequisitos con lección están completados. */
export function isUnlocked(conceptId: string): boolean {
  const c = conceptById(conceptId);
  if (!c) return false;
  return c.prerequisites.every((p) => (LESSONS.some((l) => l.conceptId === p) ? isLessonDone(p) : isUnlocked(p)));
}

export function nextLesson() {
  for (const s of SECTIONS) for (const n of s.nodes) {
    if (n.lessonId && !profile.completedLessons.includes(n.lessonId) && isUnlocked(n.id)) return LESSONS.find((l) => l.id === n.lessonId)!;
  }
  return null;
}

export interface Recommendation { title: string; reason: string; href: string; cta: string; }

/** ¿Qué debería aprender ahora? */
export function recommend(): Recommendation {
  const due = dueCards(profile.reviews, Date.now());
  if (due.length) {
    return { title: `Repasar ${due.length} ${due.length === 1 ? 'posición' : 'posiciones'}`, reason: 'Vienen de tus propias partidas y hoy toca repasarlas para fijar lo aprendido.', href: '#/puzzles', cta: 'Continuar entrenamiento' };
  }
  const top = mistakeStats()[0];
  const gw = top ? gamesWithMistakeKind(top.kind) : null;
  // Sistema de confianza: no se cambia el plan por una sola partida.
  if (top && gw && gw.with >= 2) {
    const concept = top.kind === 'missed-mate' ? 'tactics.mate-in-1' : top.kind === 'ignored-threat' || top.kind === 'allows-mate' ? 'vision.threats' : 'vision.undefended-pieces';
    const lesson = LESSONS.find((l) => l.conceptId === concept);
    const learned = lesson && profile.completedLessons.includes(lesson.id);
    return {
      title: `Hoy trabajamos: ${KIND_TOPIC[top.kind] ?? top.label.toLowerCase()}`,
      reason: `Fue tu error más frecuente: aparece en ${gw.with} de tus últimas ${gw.total} partidas.`,
      href: lesson && !learned ? `#/lesson/${lesson.id}` : '#/puzzles',
      cta: 'Continuar entrenamiento',
    };
  }
  const lesson = nextLesson();
  if (lesson) {
    return { title: lesson.title, reason: profile.completedLessons.length ? 'Es el siguiente paso de tu mapa de aprendizaje.' : 'Empezamos por lo esencial: en pocos minutos estarás moviendo piezas.', href: `#/lesson/${lesson.id}`, cta: 'Continuar entrenamiento' };
  }
  return { title: 'Partida con el coach', reason: 'Aplica lo aprendido en una partida real; después revisaremos juntos los momentos clave.', href: '#/play', cta: 'Continuar entrenamiento' };
}

export interface PlanBlock { minutes: number; label: string; href: string; why: string; }

export function dailyPlan(minutes = profile.dailyMinutes): PlanBlock[] {
  const rec = recommend();
  const reviews: PlanBlock = { minutes: 0, label: 'Repasos y puzzles', href: '#/puzzles', why: 'Recuperar de memoria fija los patrones.' };
  const concept: PlanBlock = { minutes: 0, label: rec.title, href: rec.href, why: rec.reason };
  const game: PlanBlock = { minutes: 0, label: 'Partida con el coach', href: '#/play', why: 'Aplicar el concepto en una situación real.' };
  const review: PlanBlock = { minutes: 0, label: 'Revisar tu última partida', href: profile.games.length ? `#/analysis/${profile.games.at(-1)!.id}` : '#/progress', why: 'Los 3 momentos más importantes.' };
  const split: Record<number, [number, number, number, number]> = {
    5: [5, 0, 0, 0], 10: [5, 5, 0, 0], 20: [5, 5, 5, 5], 30: [10, 10, 10, 0], 45: [10, 10, 20, 5], 60: [10, 15, 25, 10],
  };
  const [a, b, c, d] = split[minutes] ?? split[20]!;
  return [
    { ...reviews, minutes: a }, { ...concept, minutes: b }, { ...game, minutes: c }, { ...review, minutes: d },
  ].filter((x) => x.minutes > 0);
}

export function conceptProgress() {
  return SECTIONS.map((s) => ({ section: s, nodes: s.nodes.map((n) => ({ node: n, state: mastery(n.id).state })) }));
}
