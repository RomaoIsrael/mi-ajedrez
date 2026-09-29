/**
 * Revisión de partidas con Stockfish, compartida por el análisis y el final de partida:
 * evalúa cada posición (una sola vez, se guarda), registra lo que solo el motor detecta,
 * mide los rasgos de la partida y toma instantáneas semanales del ADN (docs/15-adn.md).
 */
import { Game } from '@kavalo/chess-core';
import { computeDna, extractFeatures } from '@kavalo/dna';
import { scoreToCp } from '@kavalo/engine';
import { reviewGame, type GameReview, type PositionEval } from '@kavalo/tactics';
import { evaluate, getEngine } from '../engine.js';
import { addReview, explanationLevel, profile, save, uid, type GameRecord } from './store.js';

const WEEK = 7 * 86_400_000;
const MAX_SNAPSHOTS = 60;

/** Evalúa todas las posiciones de la partida con Stockfish (con progreso). */
export async function computeEvals(game: Game, onProgress?: (done: number, total: number) => void, depth = 11): Promise<PositionEval[] | null> {
  const positions = [game.history[0]?.before ?? game.position, ...game.history.map((p) => p.after)];
  const out: PositionEval[] = [];
  for (let i = 0; i < positions.length; i++) {
    const e = await evaluate(positions[i]!, { depth });
    if (!e) return null;
    out.push({ ...e, pv: e.pv.slice(0, 8) });
    onProgress?.(i + 1, positions.length);
  }
  return out;
}

export function reviewRecord(record: GameRecord, game = Game.fromPgn(record.pgn)): GameReview {
  return reviewGame(game.history, record.evals!, { level: explanationLevel(), fromStart: !/\[FEN /.test(record.pgn) });
}

/**
 * Registra una vez los errores que solo el motor detecta (posicionales, victorias perdidas) y
 * convierte los momentos decisivos con solución única en ejercicios personales (brief §44).
 */
export async function recordEngineFindings(record: GameRecord, game: Game, review: GameReview): Promise<number> {
  if (record.engineRecorded) return 0;
  record.engineRecorded = true;
  let created = 0;
  for (const m of review.moves) {
    if (m.color !== record.userColor) continue;
    if (m.moveClass !== 'mistake' && m.moveClass !== 'blunder' && m.moveClass !== 'missed-win') continue;
    const fen = game.history[m.ply]!.before.toFen();
    const tactical = profile.mistakes.some((x) => x.gameId === record.id && x.fen === fen);
    if (!tactical) {
      profile.mistakes.push({
        at: record.at, gameId: record.id, kind: m.moveClass === 'missed-win' ? 'missed-win' : 'positional',
        concept: 'calculation.candidates', severity: m.moveClass, fen, uci: m.uci,
      });
    }
    if (!m.bestUci || profile.personalPuzzles.some((p) => p.fen === fen)) continue;
    // Solo se crea el ejercicio si la mejor jugada es claramente única (MultiPV 2).
    const engine = await getEngine();
    if (!engine) break;
    const a = await engine.analyse(fen, { depth: 12, multipv: 2 });
    const [first, second] = a.lines;
    if (!first || first.pv[0] !== m.bestUci) continue;
    const gap = second ? scoreToCp(first) - scoreToCp(second) : Infinity;
    if (gap < 150 || scoreToCp(first) < 100) continue;
    const id = `pp-${uid()}`;
    const concept = m.concept ?? 'calculation.candidates';
    profile.personalPuzzles.push({
      id, fen, accept: [m.bestUci], concept, createdAt: Date.now(), gameId: record.id,
      goal: first.mate !== undefined && first.mate > 0 ? 'mate' : 'material',
    });
    addReview(concept, id);
    created++;
  }
  save();
  return created;
}

/** Rasgos medidos de todas las partidas analizadas (orden cronológico). */
export const analysedFeatures = () => profile.games.map((g) => g.features).filter((f): f is NonNullable<typeof f> => !!f);

/** Guarda una instantánea del ADN si la última tiene más de una semana. */
export function snapshotDna(now = Date.now()): void {
  const dna = computeDna(analysedFeatures());
  if (dna.confidence === 'building') return;
  const last = profile.dnaSnapshots.at(-1);
  if (last && now - last.at < WEEK) return;
  profile.dnaSnapshots.push({ at: now, games: dna.games, dims: dna.dims });
  if (profile.dnaSnapshots.length > MAX_SNAPSHOTS) profile.dnaSnapshots.splice(0, profile.dnaSnapshots.length - MAX_SNAPSHOTS);
}

export interface ReviewOutcome { review: GameReview; created: number }

/**
 * Deja la partida completamente revisada: evaluaciones, hallazgos del motor, rasgos y ADN.
 * Devuelve null si Stockfish no está disponible (la app sigue con el análisis táctico).
 */
export async function ensureReviewed(record: GameRecord, onProgress?: (done: number, total: number) => void): Promise<ReviewOutcome | null> {
  const game = Game.fromPgn(record.pgn);
  const total = game.history.length + 1;
  if (!record.evals || record.evals.length !== total) {
    if (!(await getEngine())) return null;
    const evals = await computeEvals(game, onProgress);
    if (!evals) return null;
    record.evals = evals;
    save();
  }
  const review = reviewRecord(record, game);
  const created = await recordEngineFindings(record, game, review);
  if (!record.features) {
    record.features = extractFeatures(review, game.history, {
      userColor: record.userColor, result: record.userResult, moveTimes: record.moveTimes, clockFractions: record.clockFractions,
    });
    snapshotDna();
    save();
  }
  return { review, created };
}

let queue: Promise<unknown> = Promise.resolve();

/** Revisa en segundo plano (en serie, para no competir por el motor con la partida). */
export function reviewInBackground(record: GameRecord): Promise<ReviewOutcome | null> {
  const job = queue.then(() => ensureReviewed(record)).catch(() => null);
  queue = job;
  return job;
}
