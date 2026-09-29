/** Estadísticas de errores reutilizadas por recomendador, logros, reportes y retirada de ayudas. */
import type { CoachState } from './types.js';

export const KIND_LABEL: Record<string, string> = {
  'hanging-piece': 'Piezas colgadas',
  'ignored-threat': 'No detectar amenazas',
  'allows-mate': 'Permitir mate',
  'missed-mate': 'Mates no vistos',
  'missed-capture': 'Capturas no vistas',
  positional: 'Errores posicionales',
  'missed-win': 'Victorias perdidas',
};

/** Tema de entrenamiento en positivo para cada tipo de error. */
export const KIND_TOPIC: Record<string, string> = {
  'hanging-piece': 'proteger tus piezas',
  'ignored-threat': 'detectar las amenazas del rival',
  'allows-mate': 'la seguridad de tu rey',
  'missed-mate': 'encontrar mates',
  'missed-capture': 'ver piezas rivales indefensas',
  positional: 'comparar jugadas candidatas',
  'missed-win': 'rematar las partidas ganadas',
};

/** Concepto que entrena cada tipo de error. */
export const KIND_CONCEPT: Record<string, string> = {
  'hanging-piece': 'vision.undefended-pieces',
  'ignored-threat': 'vision.threats',
  'allows-mate': 'vision.threats',
  'missed-mate': 'tactics.mate-in-1',
  'missed-capture': 'vision.undefended-pieces',
  positional: 'calculation.candidates',
  'missed-win': 'calculation.candidates',
};

export interface MistakeStat { kind: string; label: string; count: number; perGame: number; games: number }

/** Errores por tipo en un conjunto de partidas (por defecto, las 10 últimas). */
export function mistakeStats(state: CoachState, gameIds?: string[]): MistakeStat[] {
  const ids = new Set(gameIds ?? state.games.slice(-10).map((g) => g.id));
  const total = Math.max(1, ids.size);
  const count = new Map<string, number>();
  const inGames = new Map<string, Set<string>>();
  for (const m of state.mistakes) {
    if (!ids.has(m.gameId)) continue;
    count.set(m.kind, (count.get(m.kind) ?? 0) + 1);
    inGames.set(m.kind, (inGames.get(m.kind) ?? new Set()).add(m.gameId));
  }
  return [...count].map(([kind, c]) => ({
    kind, label: KIND_LABEL[kind] ?? kind, count: c, perGame: c / total, games: inGames.get(kind)!.size,
  })).sort((a, b) => b.count - a.count || b.games - a.games);
}

/** ¿Hubo algún error de estos tipos en las últimas `n` partidas? (null si no hay partidas suficientes) */
export function cleanInLastGames(state: CoachState, kinds: string[], n = 5): boolean | null {
  const last = state.games.slice(-n);
  if (last.length < n) return null;
  const ids = new Set(last.map((g) => g.id));
  return !state.mistakes.some((m) => ids.has(m.gameId) && kinds.includes(m.kind));
}

/** Error Reduction Rate: primera mitad del historial frente a la segunda (≥ 5 partidas por mitad). */
export function errorReduction(state: CoachState): { kind: string; label: string; before: number; now: number; rate: number }[] | null {
  if (state.games.length < 10) return null;
  const half = Math.floor(state.games.length / 2);
  const early = mistakeStats(state, state.games.slice(0, half).map((g) => g.id));
  const late = mistakeStats(state, state.games.slice(half).map((g) => g.id));
  return early.filter((e) => e.perGame > 0).map((e) => {
    const now = late.find((l) => l.kind === e.kind)?.perGame ?? 0;
    return { kind: e.kind, label: e.label, before: e.perGame, now, rate: 1 - now / e.perGame };
  });
}
