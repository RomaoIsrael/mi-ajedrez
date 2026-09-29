/**
 * ADN Ajedrecístico (brief §17–21, docs/06-inteligencia.md §1): tendencias ACTUALES del
 * jugador, con intervalo de confianza, evolución «antes → ahora», uso pedagógico y
 * compatibilidad con aperturas. Nunca es una etiqueta permanente.
 */
import { OPENINGS, type Opening } from '@kavalo/content';
import type { GameFeatures, Sample } from './features.js';

export type DnaKey = 'attack' | 'defense' | 'tactics' | 'strategy' | 'calculation' | 'intuition' | 'endgame' | 'technique';

export const DNA_LABEL: Record<DnaKey, string> = {
  attack: 'Ataque', defense: 'Defensa', tactics: 'Táctica', strategy: 'Control posicional',
  calculation: 'Cálculo', intuition: 'Intuición', endgame: 'Finales', technique: 'Técnica (convertir ventajas)',
};

export const DNA_HELP: Record<DnaKey, string> = {
  attack: 'Frecuencia de jugadas que presionan al rey rival (jaques, piezas y peones hacia su enroque).',
  defense: 'Precisión cuando tu posición es peor.',
  tactics: 'Oportunidades tácticas aprovechadas tras un error del rival.',
  strategy: 'Precisión en posiciones tranquilas, sin capturas ni jaques obligados.',
  calculation: 'Precisión en posiciones forzadas (capturas y jaques).',
  intuition: 'Precisión en las jugadas que decides rápido.',
  endgame: 'Precisión en la fase final.',
  technique: 'Partidas ganadas tras conseguir ventaja clara, y precisión con ventaja.',
};

export interface DnaValue { key: DnaKey; label: string; value: number | null; low: number | null; high: number | null; samples: number }

export interface Dna {
  games: number;
  confidence: 'building' | 'low' | 'medium' | 'high';
  dims: DnaValue[];
  /** 0 = sólido … 100 = dinámico; 0 = paciente … 100 = agresivo. */
  style: { dynamic: number | null; aggressive: number | null };
  preferences: {
    openShare: number | null;
    sacrificesPerGame: number | null;
    tradesPerGame: number | null;
    avgMoveSec: number | null;
    timeTroublePerGame: number | null;
    castledByMove: number | null;
  };
}

export const MIN_GAMES = 5;
const MIN_SAMPLES = 6;

const merge = (samples: Sample[]): Sample => samples.reduce((a, s) => ({ sum: a.sum + s.sum, n: a.n + s.n }), { sum: 0, n: 0 });
const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

/** Valor de cada dimensión para un conjunto de partidas (null si no hay muestras suficientes). */
function measure(games: GameFeatures[], key: DnaKey): { value: number | null; samples: number } {
  const acc = (pick: (g: GameFeatures) => Sample) => {
    const s = merge(games.map(pick));
    return s.n >= MIN_SAMPLES ? { value: clamp(s.sum / s.n), samples: s.n } : { value: null, samples: s.n };
  };
  switch (key) {
    case 'defense': return acc((g) => g.defense);
    case 'strategy': return acc((g) => g.quiet);
    case 'calculation': return acc((g) => g.forced);
    case 'intuition': return acc((g) => g.fast);
    case 'endgame': return acc((g) => g.endgame);
    case 'tactics': {
      const chances = games.reduce((a, g) => a + g.chances, 0);
      const taken = games.reduce((a, g) => a + g.chancesTaken, 0);
      return chances >= 4 ? { value: clamp((taken / chances) * 100), samples: chances } : { value: null, samples: chances };
    }
    case 'attack': {
      const moves = games.reduce((a, g) => a + g.moves, 0);
      const attack = games.reduce((a, g) => a + g.attackMoves, 0);
      const sound = games.reduce((a, g) => a + g.soundSacrifices, 0);
      // ~40 % de jugadas de ataque ya es un estilo muy atacante.
      return moves >= 20 ? { value: clamp((attack / moves) * 220 + (sound / games.length) * 8), samples: moves } : { value: null, samples: moves };
    }
    case 'technique': {
      const withAdv = games.filter((g) => g.maxAdvantage >= 300);
      const s = merge(games.map((g) => g.advantage));
      if (withAdv.length < 2 && s.n < MIN_SAMPLES) return { value: null, samples: withAdv.length };
      const conv = withAdv.length >= 2 ? (withAdv.filter((g) => g.result === 'win').length / withAdv.length) * 100 : null;
      const accAdv = s.n >= MIN_SAMPLES ? s.sum / s.n : null;
      const parts = [conv, accAdv].filter((x): x is number => x !== null);
      return { value: clamp(parts.reduce((a, b) => a + b, 0) / parts.length), samples: withAdv.length + s.n };
    }
  }
}

/** Generador pseudoaleatorio determinista (mismo ADN para los mismos datos). */
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
}

const KEYS: DnaKey[] = ['attack', 'defense', 'tactics', 'strategy', 'calculation', 'intuition', 'endgame', 'technique'];

/**
 * ADN de las últimas partidas (máx. 30). El intervalo (percentiles 10–90) se obtiene
 * remuestreando partidas: con pocas partidas, el intervalo es ancho y se dice.
 */
export function computeDna(allGames: GameFeatures[], opts: { window?: number; resamples?: number } = {}): Dna {
  const games = allGames.slice(-(opts.window ?? 30));
  const n = games.length;
  const confidence: Dna['confidence'] = n < MIN_GAMES ? 'building' : n < 12 ? 'low' : n < 25 ? 'medium' : 'high';
  const B = opts.resamples ?? 200;
  const random = rng(n * 7919 + games.reduce((a, g) => a + g.moves, 0));
  const boots: Record<DnaKey, number[]> = Object.fromEntries(KEYS.map((k) => [k, []])) as unknown as Record<DnaKey, number[]>;
  if (n >= 2) {
    for (let b = 0; b < B; b++) {
      const sample = Array.from({ length: n }, () => games[Math.floor(random() * n)]!);
      for (const k of KEYS) {
        const v = measure(sample, k).value;
        if (v !== null) boots[k].push(v);
      }
    }
  }
  const pct = (xs: number[], q: number) => {
    const s = [...xs].sort((a, b) => a - b);
    return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))]! : null;
  };
  const dims = KEYS.map((key) => {
    const { value, samples } = measure(games, key);
    return { key, label: DNA_LABEL[key], value, low: value === null ? null : pct(boots[key], 0.1), high: value === null ? null : pct(boots[key], 0.9), samples };
  });
  const moves = games.reduce((a, g) => a + g.moves, 0);
  const attack = dims.find((d) => d.key === 'attack')!.value;
  const openShare = moves ? games.reduce((a, g) => a + g.openMoves, 0) / Math.max(1, games.reduce((a, g) => a + g.moves, 0)) : null;
  const sacrificesPerGame = n ? games.reduce((a, g) => a + g.sacrifices, 0) / n : null;
  const tradesPerGame = n ? games.reduce((a, g) => a + g.trades, 0) / n : null;
  const timed = games.filter((g) => g.avgMoveMs !== null);
  const castled = games.map((g) => g.castledByMove).filter((x): x is number => x !== null);
  return {
    games: n, confidence, dims,
    style: {
      dynamic: n >= MIN_GAMES && openShare !== null && sacrificesPerGame !== null
        ? clamp(openShare * 45 + Math.min(1, sacrificesPerGame) * 30 + (attack ?? 30) * 0.25 - Math.min(1, (tradesPerGame ?? 0) / 4) * 15 + 10) : null,
      aggressive: n >= MIN_GAMES ? attack : null,
    },
    preferences: {
      openShare: n >= MIN_GAMES ? openShare : null,
      sacrificesPerGame: n >= MIN_GAMES ? sacrificesPerGame : null,
      tradesPerGame: n >= MIN_GAMES ? tradesPerGame : null,
      avgMoveSec: timed.length ? Math.round(timed.reduce((a, g) => a + g.avgMoveMs!, 0) / timed.length / 100) / 10 : null,
      timeTroublePerGame: timed.length ? games.reduce((a, g) => a + g.timeTroubleMoves, 0) / timed.length : null,
      castledByMove: castled.length ? Math.round(castled.reduce((a, b) => a + b, 0) / castled.length) : null,
    },
  };
}

export interface DnaChange { key: DnaKey; label: string; before: number; now: number; delta: number; significant: boolean }

/** Evolución «antes → ahora». Un cambio es significativo si los intervalos no se solapan. */
export function compareDna(before: Pick<Dna, 'dims'>, now: Pick<Dna, 'dims'>): DnaChange[] {
  const out: DnaChange[] = [];
  for (const d of now.dims) {
    const p = before.dims.find((x) => x.key === d.key);
    if (!p || p.value === null || d.value === null) continue;
    const delta = d.value - p.value;
    const significant = Math.abs(delta) >= 5 && ((d.low ?? d.value) > (p.high ?? p.value) || (d.high ?? d.value) < (p.low ?? p.value));
    out.push({ key: d.key, label: d.label, before: p.value, now: d.value, delta, significant });
  }
  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/** Resumen en lenguaje de tendencia («tiendes a…», nunca «eres…»). */
export function describeDna(dna: Dna): string[] {
  if (dna.confidence === 'building') return [`Perfil en construcción: necesitamos al menos ${MIN_GAMES} partidas analizadas (llevas ${dna.games}).`];
  const known = dna.dims.filter((d) => d.value !== null).sort((a, b) => b.value! - a.value!);
  const lines: string[] = [];
  if (known.length >= 2) {
    lines.push(`Tu punto fuerte actual: ${known[0]!.label.toLowerCase()}. Donde más margen tienes: ${known.at(-1)!.label.toLowerCase()}.`);
  }
  const s = dna.style;
  if (s.dynamic !== null) lines.push(s.dynamic >= 60 ? 'Últimamente tiendes a buscar posiciones abiertas y dinámicas.' : s.dynamic <= 40 ? 'Últimamente tiendes a un juego sólido, con posiciones más cerradas y cambios.' : 'Tu estilo reciente es equilibrado entre lo dinámico y lo sólido.');
  const p = dna.preferences;
  if (p.castledByMove !== null) lines.push(p.castledByMove <= 10 ? `Enrocas pronto (hacia la jugada ${p.castledByMove}): buena costumbre.` : `Sueles enrocar tarde (hacia la jugada ${p.castledByMove}): tu rey pasa tiempo expuesto.`);
  return lines;
}

export interface DnaAdvice { id: string; message: string; concept: string; lessonId?: string }

/** Uso pedagógico del ADN (docs/06-inteligencia.md §1.4): reglas explicables. */
export function dnaAdvice(dna: Dna): DnaAdvice[] {
  if (dna.confidence === 'building') return [];
  const v = (k: DnaKey) => dna.dims.find((d) => d.key === k)?.value ?? null;
  const out: DnaAdvice[] = [];
  const tactics = v('tactics');
  const endgame = v('endgame');
  const technique = v('technique');
  const attack = v('attack');
  const defense = v('defense');
  const intuition = v('intuition');
  const calculation = v('calculation');
  const strategy = v('strategy');
  if ((tactics !== null && tactics >= 60 || attack !== null && attack >= 60) && ((endgame !== null && endgame < 55) || (technique !== null && technique < 55))) {
    out.push({ id: 'endgames', concept: 'endgame.kq-vs-k', lessonId: 'kq-vs-k',
      message: 'Tu fortaleza principal es crear ataques y encontrar tácticas. Sin embargo, pierdes parte de tus ventajas al llegar al final. Esta semana vamos a reforzar finales y conversión de ventaja.' });
  }
  if (attack !== null && attack >= 60 && defense !== null && defense < 50) {
    out.push({ id: 'defense', concept: 'vision.threats', lessonId: 'threats',
      message: 'Atacas con decisión, pero cuando la posición se complica te defiendes con menos precisión. Vamos a practicar la detección de amenazas y la defensa.' });
  }
  if (intuition !== null && calculation !== null && intuition - calculation >= 12) {
    out.push({ id: 'calculation', concept: 'calculation.candidates',
      message: 'Tu intuición es buena, pero en las posiciones forzadas fallas más. Entrenaremos el cálculo: compara candidatas antes de decidir.' });
  }
  if (strategy !== null && strategy >= 60 && tactics !== null && tactics < 45) {
    out.push({ id: 'tactics', concept: 'tactics.fork', lessonId: 'fork',
      message: 'Juegas con buen criterio posicional, pero se te escapan oportunidades tácticas. Más puzzles tácticos te harán mucho más peligroso.' });
  }
  if (dna.preferences.timeTroublePerGame !== null && dna.preferences.timeTroublePerGame >= 3) {
    out.push({ id: 'time', concept: 'calculation.candidates',
      message: 'Te quedas a menudo con poco tiempo. Prueba partidas con incremento y decide antes en las jugadas sencillas.' });
  }
  return out;
}

export interface OpeningSuggestion { opening: Opening; score: number; reason: string }

/**
 * Aperturas que encajan con el estilo actual (brief §21). Siempre como sugerencia:
 * «puede resultarte interesante…», nunca una obligación.
 */
export function suggestOpenings(dna: Dna, opts: { level: 'beginner' | 'intermediate' | 'advanced'; color: 'w' | 'b'; against?: '1.e4' | '1.d4' }): OpeningSuggestion[] {
  if (dna.style.dynamic === null) return [];
  const dyn = dna.style.dynamic / 100;
  const open = dna.preferences.openShare ?? 0.5;
  const risk = (dna.style.aggressive ?? 50) / 100;
  const order = { beginner: 0, intermediate: 1, advanced: 2 };
  const player = [dyn, open, risk];
  return OPENINGS
    .filter((o) => o.color === opts.color && (!opts.against || o.against === opts.against) && order[o.minLevel] <= order[opts.level])
    .map((o) => {
      const c = [o.character.dynamism, o.character.openness, o.character.risk];
      // Similitud por distancia (mejor que el coseno para vectores del mismo signo).
      const dist = Math.sqrt(c.reduce((a, x, i) => a + (x - player[i]!) ** 2, 0));
      const theoryPenalty = opts.level === 'beginner' ? o.character.theory * 0.3 : 0;
      const score = Math.round((1 - dist / Math.sqrt(3) - theoryPenalty) * 100);
      const kind = o.character.dynamism >= 0.6 ? 'dinámicas y con desequilibrios' : o.character.dynamism <= 0.35 ? 'sólidas y estratégicas' : 'equilibradas';
      return { opening: o, score, reason: `Puede resultarte interesante por las posiciones ${kind} que normalmente disfrutas jugar.` };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
}
