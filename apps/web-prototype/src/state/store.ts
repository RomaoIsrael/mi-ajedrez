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
}

const KEY = 'kavalo.profile.v1';

function defaults(): Profile {
  return {
    version: 1, onboarded: false, name: '', experience: 'never', goal: 'learn', dailyMinutes: 20, coachStyle: 'mentor',
    settings: {
      theme: 'system', coordinates: true, reduceMotion: false, helpLevel: 'auto', sound: false, vibration: false,
      boardTheme: 'slate', colorblind: 'none', textScale: 100, evalBar: false,
    },
    xp: 0, streak: { current: 0, best: 0, lastDay: null }, gameRating: 400, puzzleRating: 400,
    completedLessons: [], mastery: {}, reviews: [], mistakes: [], games: [], personalPuzzles: [], solvedPuzzles: [],
    activity: [], ratingHistory: [], achievements: {}, missionsClaimed: {},
  };
}

function load(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const stored = JSON.parse(raw) as Partial<Profile>;
      const base = defaults();
      // Fusión profunda de ajustes: los perfiles antiguos reciben los ajustes nuevos por defecto.
      return { ...base, ...stored, settings: { ...base.settings, ...(stored.settings ?? {}) } } as Profile;
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
  return profile.gameRating < 1000 ? 'beginner' : profile.gameRating < 1750 ? 'intermediate' : 'advanced';
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
