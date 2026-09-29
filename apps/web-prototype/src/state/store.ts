/**
 * Estado local del prototipo (perfil, progreso, partidas, errores), guardado en localStorage.
 * Es la versión mínima del modelo `UserChessProfile` (docs/07-datos.md). En producción esto
 * será la cola de eventos + snapshot sincronizado con el servidor.
 */
import {
  initialMastery, newCard, schedule, updateMastery,
  type ConceptMastery, type EvidenceContext, type Grade, type ReviewCard,
} from '@kavalo/pedagogy';

export type Experience = 'never' | 'rules' | 'occasional' | 'frequent' | 'club' | 'competitive';
export type CoachStyle = 'mentor' | 'master' | 'friend' | 'tactician' | 'motivator';
export type HelpLevel = 'auto' | 'beginner' | 'intermediate' | 'advanced';

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
  settings: { theme: 'system' | 'light' | 'dark'; coordinates: boolean; reduceMotion: boolean; helpLevel: HelpLevel; sound: boolean };
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
}

const KEY = 'kavalo.profile.v1';

function defaults(): Profile {
  return {
    version: 1, onboarded: false, name: '', experience: 'never', goal: 'learn', dailyMinutes: 20, coachStyle: 'mentor',
    settings: { theme: 'system', coordinates: true, reduceMotion: false, helpLevel: 'auto', sound: false },
    xp: 0, streak: { current: 0, best: 0, lastDay: null }, gameRating: 400, puzzleRating: 400,
    completedLessons: [], mastery: {}, reviews: [], mistakes: [], games: [], personalPuzzles: [], solvedPuzzles: [],
  };
}

function load(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaults(), ...(JSON.parse(raw) as Partial<Profile>) } as Profile;
  } catch {
    /* almacenamiento no disponible: se usa el estado en memoria */
  }
  return defaults();
}

export const profile: Profile = load();
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

const today = () => new Date().toISOString().slice(0, 10);

/** La racha cuenta días con aprendizaje verificado, no aperturas de la app. */
export function recordLearning(xp: number, reason: string): void {
  profile.xp += xp;
  const d = today();
  if (profile.streak.lastDay !== d) {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    profile.streak.current = profile.streak.lastDay === yesterday ? profile.streak.current + 1 : 1;
    profile.streak.best = Math.max(profile.streak.best, profile.streak.current);
    profile.streak.lastDay = d;
  }
  void reason;
  save();
}

export function mastery(conceptId: string): ConceptMastery {
  return profile.mastery[conceptId] ?? initialMastery(conceptId);
}

export function addEvidence(conceptId: string, correct: boolean, context: EvidenceContext, hints = 0) {
  const before = mastery(conceptId);
  const res = updateMastery(before, { correct, context, hints, at: Date.now() });
  profile.mastery[conceptId] = res.mastery;
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
