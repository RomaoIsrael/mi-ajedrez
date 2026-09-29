/**
 * Revisión de partida con motor (ChessExplanationEngine completo, docs/03-arquitectura.md §4):
 *
 *   POSICIÓN → STOCKFISH (evaluación y variantes) → HECHOS TÁCTICOS → CLASIFICACIÓN
 *   → EXPLICACIÓN SEGÚN NIVEL
 *
 * La función es pura: recibe las evaluaciones ya calculadas (una por posición) para poder
 * probarla sin motor y reutilizarla en el servidor.
 */
import { localizeSan, moveToSan, parseMove, type Color, type PlayedMove, type Position } from '@kavalo/chess-core';
import { inBook } from '@kavalo/content';
import { classify, describeEval, formatEval, type MoveClass } from '@kavalo/engine';
import { analyzeMove, type Fact, type Severity } from './analyze.js';
import { moveEffects } from './coach.js';
import { explain, type Explanation, type Level, type Locale } from './explain.js';
import { hangingPieces } from './material.js';

/** Evaluación de una posición desde el bando que mueve. */
export interface PositionEval {
  cp: number;
  mate?: number;
  /** Mejor jugada (UCI) y variante principal. */
  best: string | null;
  pv: string[];
}

export interface ReviewedMove {
  ply: number;
  color: Color;
  san: string;
  uci: string;
  moveClass: MoveClass;
  winLoss: number;
  accuracy: number;
  bestUci: string | null;
  bestSan: string | null;
  /** Evaluaciones desde el punto de vista de quien movió. */
  bestCp: number;
  playedCp: number;
  /** Variante sugerida tras la mejor jugada (SAN localizado, máx. 5 medias jugadas). */
  bestLine: string[];
  concept: string | null;
  facts: Fact[];
  explanation: Explanation;
}

export interface GameReview {
  moves: ReviewedMove[];
  accuracy: { w: number | null; b: number | null };
}

export const CLASS_SYMBOL: Record<MoveClass, string> = {
  brilliant: '!!', best: '✓', excellent: '✓', good: '👍', book: '📖',
  inaccuracy: '?!', mistake: '?', blunder: '??', 'missed-win': '✗',
};

export const CLASS_LABEL: Record<Locale, Record<MoveClass, string>> = {
  es: {
    brilliant: 'Brillante', best: 'Mejor jugada', excellent: 'Excelente', good: 'Buena', book: 'Libro',
    inaccuracy: 'Imprecisión', mistake: 'Error', blunder: 'Error grave', 'missed-win': 'Victoria perdida',
  },
  en: {
    brilliant: 'Brilliant', best: 'Best', excellent: 'Excellent', good: 'Good', book: 'Book',
    inaccuracy: 'Inaccuracy', mistake: 'Mistake', blunder: 'Blunder', 'missed-win': 'Missed win',
  },
};

const SEVERITY_OF: Record<MoveClass, Severity> = {
  brilliant: 'excellent', best: 'excellent', excellent: 'good', good: 'good', book: 'ok',
  inaccuracy: 'inaccuracy', mistake: 'mistake', blunder: 'blunder', 'missed-win': 'blunder',
};

const BAD_FACTS = new Set(['hanging-piece', 'ignored-threat', 'allows-mate', 'missed-mate', 'missed-capture']);

/** Convierte una variante UCI a SAN localizado desde `pos`. */
export function pvToSan(pos: Position, pv: string[], max: number, locale: Locale = 'es'): string[] {
  const out: string[] = [];
  let p = pos;
  for (const uci of pv.slice(0, max)) {
    const m = parseMove(p, uci);
    if (!m) break;
    out.push(localizeSan(moveToSan(p, m), locale));
    p = p.play(m);
  }
  return out;
}

/** ¿La jugada entrega material (la pieza movida queda capturable con ganancia)? */
export function isSacrifice(before: Position, move: PlayedMove['move']): boolean {
  const after = before.play(move);
  return hangingPieces(after, move.color).some((h) => h.square === move.to && h.gain >= 2);
}

function engineExplanation(r: Omit<ReviewedMove, 'explanation' | 'concept' | 'facts'>, before: Position, level: Level, locale: Locale): Explanation {
  const es = locale === 'es';
  const numbers = level !== 'beginner';
  const evalText = (cp: number) => (numbers ? `${describeEval(cp, locale)} (${formatEval({ cp })})` : describeEval(cp, locale));
  const best = r.bestUci ? parseMove(before, r.bestUci) : null;
  const why = best ? moveEffects(before, best, locale).map((e) => e.text.replace(/\.$/, '').toLowerCase()).slice(0, 2) : [];
  const line = r.bestLine.length ? r.bestLine.join(' ') : '';
  const base = { severity: SEVERITY_OF[r.moveClass], concept: 'calculation.candidates', arrows: [], highlights: [] };
  if (r.moveClass === 'brilliant') {
    return { ...base, severity: 'excellent', title: es ? '¡Jugada brillante!' : 'Brilliant move!',
      why: es ? 'Entregas material, pero el motor confirma que es la mejor jugada: la compensación vale más.' : 'You give up material, but the engine confirms it is the best move.' };
  }
  if (r.moveClass === 'missed-win') {
    return {
      ...base, title: es ? 'Se escapó una victoria' : 'A win slipped away',
      whatWentWrong: es ? `Con ${r.bestSan} tenías ${evalText(r.bestCp)}; tras ${r.san} queda ${evalText(r.playedCp)}.` : `With ${r.bestSan} you had ${evalText(r.bestCp)}; after ${r.san} it is ${evalText(r.playedCp)}.`,
      consequence: line ? (es ? `Línea ganadora: ${line}` : `Winning line: ${line}`) : undefined,
      whatToNotice: es ? 'Cuando vas ganando, busca primero las jugadas forzantes: jaques, capturas y amenazas.' : 'When winning, look for forcing moves first: checks, captures, threats.',
      howToAvoid: es ? 'Rutina mental, pregunta 15: «¿Mi posición queda mejor después de esta jugada?»' : 'Thinking routine, question 15.',
      question: es ? '¿Qué jugada forzante había?' : 'Which forcing move was there?',
    };
  }
  if (r.moveClass === 'inaccuracy' || r.moveClass === 'mistake' || r.moveClass === 'blunder') {
    return {
      ...base,
      title: es ? (r.moveClass === 'inaccuracy' ? 'Había una jugada más precisa' : 'Había una jugada mejor') : 'There was a better move',
      whatWentWrong: es ? `Con ${r.san} la posición pasa de ${evalText(r.bestCp)} a ${evalText(r.playedCp)}.` : `After ${r.san} the position goes from ${evalText(r.bestCp)} to ${evalText(r.playedCp)}.`,
      why: r.bestSan ? (es ? `Mejor era ${r.bestSan}${why.length ? `: ${why.join(' y ')}` : ''}.` : `Better was ${r.bestSan}${why.length ? `: ${why.join(' and ')}` : ''}.`) : undefined,
      consequence: line ? (es ? `Por ejemplo: ${line}` : `For example: ${line}`) : undefined,
      whatToNotice: es ? 'Antes de decidir, compara al menos dos jugadas candidatas.' : 'Before deciding, compare at least two candidate moves.',
      howToAvoid: es ? 'Rutina mental, preguntas 11 y 15: «¿Cuál es mi plan?» y «¿Mi posición queda mejor?»' : 'Thinking routine, questions 11 and 15.',
      question: es ? '¿Qué otra jugada candidata tenías?' : 'Which other candidate move did you have?',
    };
  }
  return { ...base, title: es ? CLASS_LABEL.es[r.moveClass] : CLASS_LABEL.en[r.moveClass] };
}

/**
 * Revisa todas las jugadas de una partida. `evals[i]` es la evaluación de la posición antes de
 * la jugada i (y `evals[n]` la final), siempre desde el bando que mueve en esa posición.
 */
export function reviewGame(
  history: readonly PlayedMove[],
  evals: readonly PositionEval[],
  opts: { level?: Level; locale?: Locale; fromStart?: boolean } = {},
): GameReview {
  const level = opts.level ?? 'beginner';
  const locale = opts.locale ?? 'es';
  const sans: string[] = [];
  const moves: ReviewedMove[] = history.map((played, ply) => {
    sans.push(played.san);
    const before = played.before;
    const e0 = evals[ply]!;
    const e1 = evals[ply + 1]!;
    const bestCp = e0.cp;
    const playedCp = -e1.cp;
    const isBest = e0.best === played.uci || playedCp >= bestCp;
    const book = (opts.fromStart ?? true) && ply < 16 && inBook(sans);
    const { moveClass, winLoss, accuracy } = classify({
      bestCp, playedCp: Math.min(playedCp, bestCp), isBest, inBook: book, level,
      sacrifice: isSacrifice(before, played.move),
    });
    const bestMove = e0.best ? parseMove(before, e0.best) : null;
    const partial = {
      ply, color: played.move.color, san: localizeSan(played.san, locale), uci: played.uci, moveClass, winLoss, accuracy,
      bestUci: e0.best, bestSan: bestMove ? localizeSan(moveToSan(before, bestMove), locale) : null,
      bestCp, playedCp, bestLine: pvToSan(before, e0.pv.length ? e0.pv : e0.best ? [e0.best] : [], level === 'advanced' ? 8 : 5, locale),
    };
    const tactical = analyzeMove(before, played.move);
    const bad = moveClass === 'inaccuracy' || moveClass === 'mistake' || moveClass === 'blunder' || moveClass === 'missed-win';
    let explanation: Explanation;
    let concept: string | null = null;
    if (bad && tactical.primary && BAD_FACTS.has(tactical.primary.kind)) {
      // El motor confirma el error y conocemos su causa táctica: explicación concreta.
      explanation = { ...explain(tactical, { level, locale }), severity: SEVERITY_OF[moveClass] };
      concept = tactical.concept;
    } else {
      explanation = engineExplanation(partial, before, level, locale);
      concept = bad ? 'calculation.candidates' : tactical.concept;
    }
    if (bestMove && bad) explanation.arrows = [...explanation.arrows, { from: bestMove.from, to: bestMove.to, color: 'good' }];
    return { ...partial, concept, facts: tactical.facts, explanation };
  });
  const acc = (c: Color) => {
    const xs = moves.filter((m) => m.color === c && m.moveClass !== 'book').map((m) => m.accuracy);
    if (!xs.length) return null;
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const harmonic = xs.length / xs.reduce((a, b) => a + 1 / Math.max(1, b), 0);
    return Math.round(((mean + harmonic) / 2) * 10) / 10;
  };
  return { moves, accuracy: { w: acc('w'), b: acc('b') } };
}
