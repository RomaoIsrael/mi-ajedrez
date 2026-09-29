/**
 * Estado local del prototipo (perfil, progreso, partidas, errores), guardado en localStorage.
 * Es la versión mínima del modelo `UserChessProfile` (docs/07-datos.md). En producción esto
 * será la cola de eventos + snapshot sincronizado con el servidor.
 */
import {
  initialMastery, newCard, schedule, updateMastery,
  type ConceptMastery, type EvidenceContext, type Grade, type ReviewCard,
} from '@kavalo/pedagogy';
import { dailyMissions, dayKey, lessonCardId, newAchievements, type ActivityEvent, type Achievement, type Mission } from '@kavalo/coach';
import { LESSONS } from '@kavalo/content';
import type { PositionEval } from '@kavalo/tactics';
import type { DnaValue, GameFeatures } from '@kavalo/dna';
import { detectLocale, type Locale } from '../i18n.js';

export type Experience = 'never' | 'rules' | 'occasional' | 'frequent' | 'club' | 'competitive';
export type CoachStyle = 'mentor' | 'master' | 'friend' | 'tactician' | 'motivator';
export type HelpLevel = 'auto' | 'beginner' | 'intermediate' | 'advanced';
export type BoardTheme = 'slate' | 'walnut' | 'marble' | 'ocean' | 'forest' | 'contrast';

export interface MistakeRecord {
  at: number;
  gameId: string;
  kind: string;
  concept: string;
  severity: string;
  fen: string;
  uci: string;
}

export interface GameRecord {
  id: string;
  at: number;
  pgn: string;
  userColor: 'w' | 'b';
  bot: { personality: string; level: number };
  result: string;
  reason?: string;
  userResult: 'win' | 'loss' | 'draw';
  timeControl: string;
  hintsUsed: number;
  /** Evaluaciones de Stockfish por posición (se calculan una vez y se guardan). */
  evals?: PositionEval[];
  /** Ya se registraron los errores y ejercicios detectados por el motor. */
  engineRecorded?: boolean;
  /** Milisegundos que el usuario tardó en cada una de sus jugadas (null: jugada previa, sin medir). */
  moveTimes?: (number | null)[];
  /** Fracción del reloj que le quedaba al usuario en cada jugada (si había reloj). */
  clockFractions?: (number | null)[];
  /** Modo de partida (brief §60). */
  mode?: string;
  /** Rasgos medidos con Stockfish (materia prima del ADN, docs/15-adn.md). */
  features?: GameFeatures;
}

export interface PersonalPuzzle {
  id: string;
  fen: string;
  accept: string[];
  concept: string;
  createdAt: number;
  gameId: string;
  goal: 'mate' | 'material';
}

export interface Profile {
  version: 1;
  onboarded: boolean;
  name: string;
  experience: Experience;
  goal: string;
  dailyMinutes: number;
  coachStyle: CoachStyle;
  settings: {
    theme: 'system' | 'light' | 'dark';
    coordinates: boolean;
    reduceMotion: boolean;
    helpLevel: HelpLevel;
    sound: boolean;
    vibration: boolean;
    boardTheme: BoardTheme;
    colorblind: 'none' | 'deutan' | 'tritan';
    textScale: number;
    evalBar: boolean;
    /** Idioma de la interfaz (brief §71). */
    locale: Locale;
    /** Experiencia adulto o niños (brief §46–47). */
    mode: 'adult' | 'kids';
    /** Set de piezas (brief §34). */
    pieceSet: string;
  };
  xp: number;
  streak: { current: number; best: number; lastDay: string | null };
  gameRating: number;
  puzzleRating: number;
  completedLessons: string[];
  mastery: Record<string, ConceptMastery>;
  reviews: ReviewCard[];
  mistakes: MistakeRecord[];
  games: GameRecord[];
  personalPuzzles: PersonalPuzzle[];
  solvedPuzzles: string[];
  /** Eventos de aprendizaje: fuente de misiones, logros y reportes (docs/07-datos.md). */
  activity: ActivityEvent[];
  ratingHistory: { at: number; kind: 'game' | 'puzzle'; rating: number }[];
  /** Logros conseguidos: id → fecha. */
  achievements: Record<string, number>;
  /** Misiones cuya XP ya se cobró: día → ids. */
  missionsClaimed: Record<string, string[]>;
  /** Instantáneas semanales del ADN para mostrar la evolución «antes → ahora». */
  dnaSnapshots: { at: number; games: number; dims: DnaValue[] }[];
  /** Resultados de los entrenamientos de coordenadas, visión y cálculo (brief §51–53). */
  training: TrainingStats;
  /** Test inicial (brief §81). */
  assessment: { at: number; score: number; total: number; byArea: Record<string, { correct: number; total: number }>; rating: number } | null;
  /** Ratings internos por área (brief §50), además de partidas y puzzles. */
  skillRatings: Record<SkillArea, number>;
  /** Última modificación (la usa la fusión al sincronizar). */
  updatedAt: number;
  /** Sincronización opcional: desactivada hasta que el usuario da su consentimiento. */
  sync: { enabled: boolean; server: string; token: string | null; version: number; lastSync: number | null; consentAt: number | null };
}

export type SkillArea = 'tactics' | 'strategy' | 'endgame' | 'openings' | 'calculation';
export const SKILL_LABEL: Record<SkillArea, string> = {
  tactics: 'Táctica', strategy: 'Estrategia', endgame: 'Finales', openings: 'Conocimiento de aperturas', calculation: 'Cálculo',
};

/** Área de rating de un concepto del mapa de aprendizaje. */
export function skillOf(concept: string): SkillArea | null {
  if (concept.startsWith('tactics.') || concept.startsWith('vision.')) return 'tactics';
  if (concept.startsWith('strategy.') || concept.startsWith('planning.')) return 'strategy';
  if (concept.startsWith('endgame.')) return 'endgame';
  if (concept.startsWith('openings.')) return 'openings';
  if (concept.startsWith('calculation.')) return 'calculation';
  return null;
}

export interface TrainingStats {
  coords: { sessions: number; bestScore: number | null; bestMs: number | null };
  vision: Record<string, { correct: number; total: number }>;
  calc: { exercises: number; totalDepth: number; maxDepth: number; perfect: number; bestInCandidates: number; candidates: number };
  /** Aperturas estudiadas: veces practicada la línea y cuántas sin errores. */
  openings: Record<string, { practiced: number; clean: number; at: number }>;
  /** Partidas históricas: momentos clave acertados. */
  library: Record<string, { found: number; total: number; at: number }>;
}

export const emptyTraining = (): TrainingStats => ({
  coords: { sessions: 0, bestScore: null, bestMs: null }, vision: {},
  calc: { exercises: 0, totalDepth: 0, maxDepth: 0, perfect: 0, bestInCandidates: 0, candidates: 0 },
  openings: {}, library: {},
});

const KEY = 'kavalo.profile.v1';

function defaults(): Profile {
  return {
    version: 1, onboarded: false, name: '', experience: 'never', goal: 'learn', dailyMinutes: 20, coachStyle: 'mentor',
    settings: {
      theme: 'system', coordinates: true, reduceMotion: false, helpLevel: 'auto', sound: false, vibration: false,
      boardTheme: 'slate', colorblind: 'none', textScale: 100, evalBar: false,
      locale: detectLocale(), mode: 'adult', pieceSet: 'royal-modern',
    },
    xp: 0, streak: { current: 0, best: 0, lastDay: null }, gameRating: 400, puzzleRating: 400,
    completedLessons: [], mastery: {}, reviews: [], mistakes: [], games: [], personalPuzzles: [], solvedPuzzles: [],
    activity: [], ratingHistory: [], achievements: {}, missionsClaimed: {}, dnaSnapshots: [], training: emptyTraining(), assessment: null,
    skillRatings: { tactics: 400, strategy: 400, endgame: 400, openings: 400, calculation: 400 },
    updatedAt: 0,
    sync: { enabled: false, server: '', token: null, version: 0, lastSync: null, consentAt: null },
  };
}

function load(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const stored = JSON.parse(raw) as Partial<Profile>;
      const base = defaults();
      // Fusión profunda de ajustes: los perfiles antiguos reciben los ajustes nuevos por defecto.
      // Los perfiles creados antes del multiidioma se usaban en español: lo conservan.
      return { ...base, ...stored, settings: { ...base.settings, locale: 'es', ...(stored.settings ?? {}) }, training: { ...base.training, ...(stored.training ?? {}) }, skillRatings: { ...base.skillRatings, ...(stored.skillRatings ?? {}) } } as Profile;
    }
  } catch {
    /* almacenamiento no disponible: se usa el estado en memoria */
  }
  return defaults();
}

export const profile: Profile = load();

// Migración: las lecciones completadas antes de existir el repaso espaciado reciben su tarjeta.
for (const id of profile.completedLessons) {
  const lesson = LESSONS.find((l) => l.id === id);
  if (lesson && !profile.reviews.some((r) => r.itemId === lessonCardId(id))) {
    profile.reviews.push(newCard(lesson.conceptId, lessonCardId(id), Date.now()));
  }
}
const listeners = new Set<() => void>();

export function save(): void {
  profile.updatedAt = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* modo privado o almacenamiento lleno: el prototipo sigue funcionando en memoria */
  }
  listeners.forEach((l) => l());
}

export function onChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetProfile(): void {
  Object.assign(profile, defaults());
  save();
}

/** La racha cuenta días con aprendizaje verificado, no aperturas de la app. */
export function recordLearning(xp: number, reason: string): void {
  profile.xp += xp;
  const d = dayKey(Date.now());
  if (profile.streak.lastDay !== d) {
    const yesterday = dayKey(Date.now() - 86_400_000);
    profile.streak.current = profile.streak.lastDay === yesterday ? profile.streak.current + 1 : 1;
    profile.streak.best = Math.max(profile.streak.best, profile.streak.current);
    profile.streak.lastDay = d;
  }
  void reason;
  save();
  checkRewards();
}

// ── Actividad, misiones y logros ──

export type Reward = { type: 'achievement'; achievement: Achievement } | { type: 'mission'; mission: Mission };
const rewardListeners = new Set<(r: Reward) => void>();

/** La interfaz se suscribe para mostrar avisos de logros y misiones completadas. */
export function onReward(fn: (r: Reward) => void): () => void {
  rewardListeners.add(fn);
  return () => rewardListeners.delete(fn);
}

const MAX_ACTIVITY = 3000;

export function logActivity(ev: Omit<ActivityEvent, 'at'> & { at?: number }): void {
  profile.activity.push({ at: Date.now(), ...ev });
  if (profile.activity.length > MAX_ACTIVITY) profile.activity.splice(0, profile.activity.length - MAX_ACTIVITY);
  save();
  checkRewards();
}

/** Cobra la XP de misiones terminadas y desbloquea logros nuevos (una sola vez cada uno). */
export function checkRewards(): void {
  const now = Date.now();
  const day = dayKey(now);
  const claimed = new Set(profile.missionsClaimed[day] ?? []);
  const rewards: Reward[] = [];
  for (const m of dailyMissions(profile, now)) {
    if (m.done && !claimed.has(m.id)) {
      claimed.add(m.id);
      profile.xp += m.xp;
      rewards.push({ type: 'mission', mission: m });
    }
  }
  // Solo se conservan las misiones de hoy (las anteriores ya no se pueden cobrar).
  profile.missionsClaimed = { [day]: [...claimed] };
  for (const a of newAchievements(profile)) {
    profile.achievements[a.id] = now;
    rewards.push({ type: 'achievement', achievement: a });
  }
  if (!rewards.length) return;
  save();
  rewards.forEach((r) => rewardListeners.forEach((l) => l(r)));
}

export function mastery(conceptId: string): ConceptMastery {
  return profile.mastery[conceptId] ?? initialMastery(conceptId);
}

export function addEvidence(conceptId: string, correct: boolean, context: EvidenceContext, hints = 0) {
  const before = mastery(conceptId);
  const res = updateMastery(before, { correct, context, hints, at: Date.now() });
  profile.mastery[conceptId] = res.mastery;
  if (res.mastery.state !== before.state) {
    profile.activity.push({ at: Date.now(), kind: 'mastery', ms: 0, concept: conceptId, state: res.mastery.state });
  }
  if (before.state !== 'understood' && res.mastery.state === 'understood') profile.xp += 50;
  if (before.state !== 'mastered' && res.mastery.state === 'mastered') profile.xp += 150;
  save();
  return res;
}

export function addReview(conceptId: string, itemId: string): void {
  if (profile.reviews.some((r) => r.itemId === itemId)) return;
  profile.reviews.push(newCard(conceptId, itemId, Date.now()));
  save();
}

export function gradeReview(itemId: string, grade: Grade): void {
  const i = profile.reviews.findIndex((r) => r.itemId === itemId);
  if (i >= 0) profile.reviews[i] = schedule(profile.reviews[i]!, grade, Date.now());
  save();
}

/** Actualización tipo Elo sencilla (Glicko‑2 en producción). */
export function updateRating(kind: 'gameRating' | 'puzzleRating', opponent: number, score: 0 | 0.5 | 1): number {
  const expected = 1 / (1 + 10 ** ((opponent - profile[kind]) / 400));
  const k = profile[kind] < 800 ? 40 : 24;
  const delta = Math.round(k * (score - expected));
  profile[kind] = Math.max(100, profile[kind] + delta);
  profile.ratingHistory.push({ at: Date.now(), kind: kind === 'gameRating' ? 'game' : 'puzzle', rating: profile[kind] });
  save();
  return delta;
}

/** Rating por área: misma fórmula tipo Elo, frente a la dificultad del ejercicio. */
export function updateSkillRating(concept: string, difficulty: number, score: number): void {
  const area = skillOf(concept);
  if (!area) return;
  const cur = profile.skillRatings[area];
  const expected = 1 / (1 + 10 ** ((difficulty - cur) / 400));
  profile.skillRatings[area] = Math.max(100, Math.round(cur + (cur < 800 ? 40 : 24) * (score - expected)));
  save();
}

/** Ratings iniciales por área a partir del test inicial. */
export function seedSkillRatings(byArea: Record<string, { correct: number; total: number }>, rating: number): void {
  const at = (a: string) => (byArea[a]?.total ? byArea[a]!.correct / byArea[a]!.total : 0.5);
  const v = (acc: number) => Math.max(150, Math.round(rating + (acc - 0.5) * 300));
  profile.skillRatings = {
    tactics: v((at('tactics') + at('vision')) / 2), strategy: v(at('strategy')), endgame: v(at('endgame')),
    openings: v(at('strategy')), calculation: v(at('calculation')),
  };
}

export const LEVELS = [
  { name: 'Novato', min: 0 }, { name: 'Aprendiz', min: 400 }, { name: 'Principiante', min: 700 },
  { name: 'Jugador', min: 1000 }, { name: 'Club', min: 1250 }, { name: 'Intermedio', min: 1500 },
  { name: 'Avanzado', min: 1750 }, { name: 'Experto', min: 2000 }, { name: 'Master Training', min: 2250 },
];

export function levelName(rating = profile.gameRating): string {
  return [...LEVELS].reverse().find((l) => rating >= l.min)!.name;
}

/** Nivel pedagógico para las explicaciones. */
export function explanationLevel(): 'beginner' | 'intermediate' | 'advanced' {
  const h = profile.settings.helpLevel;
  if (h !== 'auto') return h === 'beginner' ? 'beginner' : h;
  if (profile.settings.mode === 'kids') return 'beginner';
  return profile.gameRating < 1000 ? 'beginner' : profile.gameRating < 1750 ? 'intermediate' : 'advanced';
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
