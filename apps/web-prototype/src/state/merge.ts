/**
 * Fusión de perfiles para la sincronización (brief §72, docs/07-datos.md §4). Es pura (sin DOM)
 * y conmutativa en lo esencial: nunca pierde partidas, errores, ejercicios, eventos ni logros de
 * ninguno de los dos dispositivos. Los ajustes y datos «de un solo valor» los decide la copia
 * modificada más recientemente.
 */
import type { Profile } from './store.js';

type WithUpdated = Profile & { updatedAt?: number };

function unionBy<T>(a: readonly T[], b: readonly T[], key: (x: T) => string, pick: (x: T, y: T) => T = (x) => x): T[] {
  const map = new Map<string, T>();
  for (const x of a) map.set(key(x), x);
  for (const y of b) {
    const k = key(y);
    const x = map.get(k);
    map.set(k, x ? pick(x, y) : y);
  }
  return [...map.values()];
}

const byAt = <T extends { at: number }>(xs: T[]) => xs.sort((p, q) => p.at - q.at);

export function mergeProfiles(localIn: Profile, remoteIn: Profile): Profile {
  const local = localIn as WithUpdated;
  const remote = remoteIn as WithUpdated;
  const newer = (local.updatedAt ?? 0) >= (remote.updatedAt ?? 0) ? local : remote;
  const older = newer === local ? remote : local;

  const ratingHistory = byAt(unionBy(local.ratingHistory ?? [], remote.ratingHistory ?? [], (r) => `${r.kind}:${r.at}`));
  const lastRating = (kind: 'game' | 'puzzle', fallback: number) => [...ratingHistory].reverse().find((r) => r.kind === kind)?.rating ?? fallback;

  const achievements: Record<string, number> = { ...older.achievements };
  for (const [id, at] of Object.entries(newer.achievements ?? {})) achievements[id] = Math.min(at, achievements[id] ?? Infinity);

  const missionsClaimed: Record<string, string[]> = { ...older.missionsClaimed };
  for (const [day, ids] of Object.entries(newer.missionsClaimed ?? {})) missionsClaimed[day] = [...new Set([...(missionsClaimed[day] ?? []), ...ids])];

  const mastery = { ...older.mastery };
  for (const [id, m] of Object.entries(newer.mastery ?? {})) {
    const o = mastery[id];
    // Gana la copia con más evidencias (y, a igualdad, la más reciente).
    mastery[id] = !o || m.attempts > o.attempts || (m.attempts === o.attempts && (m.lastEvidenceAt ?? 0) >= (o.lastEvidenceAt ?? 0)) ? m : o;
  }

  const streak = (local.streak?.lastDay ?? '') >= (remote.streak?.lastDay ?? '') ? local.streak : remote.streak;

  return {
    ...older,
    ...newer,
    onboarded: local.onboarded || remote.onboarded,
    xp: Math.max(local.xp ?? 0, remote.xp ?? 0),
    streak: { ...streak, best: Math.max(local.streak?.best ?? 0, remote.streak?.best ?? 0) },
    ratingHistory,
    gameRating: lastRating('game', newer.gameRating),
    puzzleRating: lastRating('puzzle', newer.puzzleRating),
    completedLessons: [...new Set([...(older.completedLessons ?? []), ...(newer.completedLessons ?? [])])],
    solvedPuzzles: [...new Set([...(older.solvedPuzzles ?? []), ...(newer.solvedPuzzles ?? [])])],
    mastery,
    // Tarjeta de repaso: la que más ha avanzado (más pasos o fecha de repaso posterior).
    reviews: unionBy(older.reviews ?? [], newer.reviews ?? [], (r) => r.itemId, (x, y) => (y.step > x.step || (y.step === x.step && y.dueAt > x.dueAt) ? y : x)),
    mistakes: byAt(unionBy(older.mistakes ?? [], newer.mistakes ?? [], (m) => `${m.gameId}:${m.fen}:${m.uci}`)),
    // Una partida puede haberse analizado solo en un dispositivo: se conserva la más completa.
    games: byAt(unionBy(older.games ?? [], newer.games ?? [], (g) => g.id, (x, y) => ({ ...x, ...y, evals: y.evals ?? x.evals, features: y.features ?? x.features, engineRecorded: x.engineRecorded || y.engineRecorded }))),
    personalPuzzles: unionBy(older.personalPuzzles ?? [], newer.personalPuzzles ?? [], (p) => p.id),
    activity: byAt(unionBy(older.activity ?? [], newer.activity ?? [], (e) => `${e.at}:${e.kind}:${e.ref ?? ''}:${e.concept ?? ''}`)).slice(-3000),
    achievements,
    missionsClaimed,
    dnaSnapshots: byAt(unionBy(older.dnaSnapshots ?? [], newer.dnaSnapshots ?? [], (s) => String(s.at))).slice(-60),
    settings: { ...older.settings, ...newer.settings },
  } as Profile;
}
