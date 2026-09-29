/**
 * Verbalización determinista de hechos (plantillas). Nunca afirma nada que no esté en `facts`.
 * La Fase 2 podrá reescribir estos textos con IA generativa, validada contra los mismos hechos.
 */
import { squareName, type PieceType, type Square } from '@kavalo/chess-core';
import type { Fact, MoveAnalysis, Severity } from './analyze.js';

export type Locale = 'es' | 'en';
export type Level = 'beginner' | 'intermediate' | 'advanced';
/** Memoria pedagógica: 1 explicación completa · 2 recordatorio · 3 pregunta · 4 sin ayuda. */
export type MemoryStage = 1 | 2 | 3 | 4;

export interface Arrow { from: Square; to: Square; color: 'danger' | 'good' | 'info' }

export interface Explanation {
  severity: Severity;
  concept: string | null;
  title: string;
  whatWentWrong?: string;
  why?: string;
  consequence?: string;
  whatToNotice?: string;
  howToAvoid?: string;
  /** Pregunta socrática (memoria pedagógica ≥ 3). */
  question?: string;
  arrows: Arrow[];
  highlights: Square[];
}

const PIECES: Record<Locale, Record<PieceType, { name: string; fem: boolean }>> = {
  es: {
    p: { name: 'peón', fem: false }, n: { name: 'caballo', fem: false }, b: { name: 'alfil', fem: false },
    r: { name: 'torre', fem: true }, q: { name: 'dama', fem: true }, k: { name: 'rey', fem: false },
  },
  en: {
    p: { name: 'pawn', fem: false }, n: { name: 'knight', fem: false }, b: { name: 'bishop', fem: false },
    r: { name: 'rook', fem: false }, q: { name: 'queen', fem: false }, k: { name: 'king', fem: false },
  },
};

export function pieceName(type: PieceType, locale: Locale): string {
  return PIECES[locale][type].name;
}

const pts = (n: number, l: Locale) => (l === 'es' ? `${n} ${n === 1 ? 'punto' : 'puntos'}` : `${n} point${n === 1 ? '' : 's'}`);

/** Artículo + nombre: "el caballo", "la torre". */
function the(type: PieceType, l: Locale): string {
  const p = PIECES[l][type];
  return l === 'es' ? `${p.fem ? 'la' : 'el'} ${p.name}` : `the ${p.name}`;
}
const pron = (type: PieceType, l: Locale) => (l === 'es' ? (PIECES.es[type].fem ? 'la' : 'lo') : 'it');

export const SEVERITY_LABEL: Record<Locale, Record<Severity, string>> = {
  es: { excellent: 'Excelente', good: 'Buena', ok: 'Correcta', inaccuracy: 'Imprecisión', mistake: 'Error', blunder: 'Error grave' },
  en: { excellent: 'Excellent', good: 'Good', ok: 'OK', inaccuracy: 'Inaccuracy', mistake: 'Mistake', blunder: 'Blunder' },
};

export const SEVERITY_SYMBOL: Record<Severity, string> = {
  excellent: '✓', good: '👍', ok: '', inaccuracy: '?!', mistake: '?', blunder: '??',
};

export function explain(
  analysis: MoveAnalysis,
  opts: { locale?: Locale; level?: Level; memoryStage?: MemoryStage } = {},
): Explanation {
  const l = opts.locale ?? 'es';
  const level = opts.level ?? 'beginner';
  const stage = opts.memoryStage ?? 1;
  const f = analysis.primary;
  const base = { severity: analysis.severity, concept: analysis.concept, arrows: [] as Arrow[], highlights: [] as Square[] };
  if (!f) {
    return { ...base, title: l === 'es' ? 'Jugada correcta' : 'Solid move' };
  }
  const e = build(f, l, level);
  e.arrows = f.move ? [{ from: f.move.from, to: f.move.to, color: arrowColor(f) }] : [];
  e.highlights = f.square !== undefined ? [f.square] : [];

  if (analysis.severity === 'ok' || analysis.severity === 'good' || analysis.severity === 'excellent') {
    return { ...base, ...e };
  }
  // Memoria pedagógica: cuanto más se repite el error, menos se explica y más se pregunta.
  if (stage === 2) {
    return { ...base, ...e, why: undefined, consequence: undefined, whatToNotice: undefined,
      title: `${e.title} — ${l === 'es' ? 'otra vez este patrón' : 'this pattern again'}` };
  }
  if (stage >= 3) {
    return { ...base, arrows: [], highlights: [], title: SEVERITY_LABEL[l][analysis.severity], question: e.question };
  }
  return { ...base, ...e };
}

function arrowColor(f: Fact): Arrow['color'] {
  return f.kind === 'good-capture' || f.kind === 'mate' || f.kind === 'missed-mate' || f.kind === 'missed-capture' ? 'good' : 'danger';
}

type Texts = Omit<Explanation, 'severity' | 'concept' | 'arrows' | 'highlights'> & { arrows: Arrow[]; highlights: Square[] };

function build(f: Fact, l: Locale, level: Level): Texts {
  const es = l === 'es';
  const sq = f.square !== undefined ? squareName(f.square) : '';
  const by = f.byPiece ? the(f.byPiece, l) : '';
  const bySq = f.bySquare !== undefined ? squareName(f.bySquare) : '';
  const piece = f.piece ?? 'p';
  const value = f.value ?? 0;
  const t: Texts = { title: '', arrows: [], highlights: [] };

  switch (f.kind) {
    case 'hanging-piece':
    case 'ignored-threat': {
      const ignored = f.kind === 'ignored-threat';
      t.title = es
        ? ignored ? `Tu ${pieceName(piece, l)} seguía amenazad${PIECES.es[piece].fem ? 'a' : 'o'}` : `Tu ${pieceName(piece, l)} quedó sin defensa`
        : ignored ? `Your ${pieceName(piece, l)} was still under attack` : `Your ${pieceName(piece, l)} was left hanging`;
      if (level === 'beginner' || !f.defended) {
        t.why = f.defended
          ? es ? `${cap(by)} de ${bySq} puede capturar${pron(piece, l)} y vale menos: aunque recuperes, pierdes material.`
               : `${cap(by)} on ${bySq} can take it and is worth less, so even if you recapture you lose material.`
          : es ? `${cap(by)} de ${bySq} puede capturar${pron(piece, l)} y ninguna de tus piezas ${PIECES.es[piece].fem ? 'la' : 'lo'} protege.`
               : `${cap(by)} on ${bySq} can capture it and none of your pieces defends it.`;
      } else {
        t.why = es ? `Cambio desfavorable: ${by} (${bySq}) vale menos que tu ${pieceName(piece, l)} de ${sq}.`
                   : `Unfavourable exchange: ${by} (${bySq}) is worth less than your ${pieceName(piece, l)} on ${sq}.`;
      }
      t.whatWentWrong = ignored
        ? es ? `Tu rival ya amenazaba ${the(piece, l)} de ${sq} y la jugada no lo resolvió.` : `Your opponent was already attacking the ${pieceName(piece, l)} on ${sq} and your move didn't deal with it.`
        : es ? `Después de tu jugada, ${the(piece, l)} de ${sq} puede ser capturad${PIECES.es[piece].fem ? 'a' : 'o'} con ventaja.` : `After your move, the ${pieceName(piece, l)} on ${sq} can be won.`;
      t.consequence = es ? `Pierdes ${pts(value, l)} de material.` : `You lose ${pts(value, l)} of material.`;
      t.whatToNotice = ignored
        ? es ? 'Después de cada jugada rival, pregúntate: ¿qué amenaza ahora?' : 'After every opponent move ask: what is being threatened now?'
        : es ? 'Antes de soltar la pieza, mira la casilla de destino: ¿quién la ataca y quién la defiende?' : 'Before letting go, look at the destination square: who attacks it and who defends it?';
      t.howToAvoid = es ? 'Rutina mental, pregunta 6: «¿Tengo alguna pieza indefensa?»' : 'Thinking routine, question 6: "Do I have any undefended piece?"';
      t.question = es ? `¿Qué pieza tuya puede capturar tu rival ahora?` : 'Which of your pieces can your opponent capture now?';
      break;
    }
    case 'allows-mate':
      t.title = es ? 'Permites jaque mate' : 'You allow checkmate';
      t.whatWentWrong = es ? `Tu rival puede dar mate con ${by} en ${sq}.` : `Your opponent can mate with ${by} on ${sq}.`;
      t.why = es ? 'Tu rey no tiene casillas de escape y la jugada no cubre esa amenaza.' : 'Your king has no escape squares and the move does not stop the threat.';
      t.consequence = es ? 'La partida termina inmediatamente.' : 'The game ends at once.';
      t.whatToNotice = es ? 'Cuando tu rey tiene pocas casillas libres, revisa todos los jaques del rival.' : 'When your king has few free squares, check every enemy check.';
      t.howToAvoid = es ? 'Rutina mental, preguntas 2 y 3: «¿Qué amenaza? ¿Hay jaques?»' : 'Thinking routine, questions 2 and 3: "What is threatened? Any checks?"';
      t.question = es ? '¿Qué jaque de tu rival sería mate?' : 'Which enemy check would be mate?';
      break;
    case 'missed-mate':
      t.title = es ? 'Había jaque mate' : 'There was a checkmate';
      t.whatWentWrong = es ? `Podías dar mate con ${the(piece, l)} en ${sq}.` : `You could mate with the ${pieceName(piece, l)} on ${sq}.`;
      t.why = es ? 'El rey rival no tenía casillas de escape ante ese jaque.' : 'The enemy king had no escape from that check.';
      t.consequence = es ? 'Dejaste escapar una victoria inmediata.' : 'You let an immediate win slip.';
      t.whatToNotice = es ? 'Revisa siempre primero los jaques: son las jugadas más forzantes.' : 'Always look at checks first: they are the most forcing moves.';
      t.howToAvoid = es ? 'Rutina mental, pregunta 3: «¿Hay jaques?»' : 'Thinking routine, question 3: "Any checks?"';
      t.question = es ? '¿Ves algún jaque que el rey rival no pueda esquivar?' : 'Do you see a check the enemy king cannot escape?';
      break;
    case 'missed-capture':
      t.title = es ? `Podías ganar ${the(piece, l)}` : `You could win the ${pieceName(piece, l)}`;
      t.whatWentWrong = es ? `${cap(the(piece, l))} rival de ${sq} estaba ${f.defended ? 'mal defendid' : 'sin defensa'}${f.defended ? (PIECES.es[piece].fem ? 'a' : 'o') : ''}.`
                           : `The enemy ${pieceName(piece, l)} on ${sq} was ${f.defended ? 'insufficiently defended' : 'undefended'}.`;
      t.why = es ? `Capturar${pron(piece, l)} te daba ${pts(value, l)} de ventaja.` : `Taking it would have won ${pts(value, l)}.`;
      t.consequence = es ? 'Dejaste pasar una ganancia de material.' : 'You missed a material gain.';
      t.whatToNotice = es ? 'Tras cada jugada rival, busca piezas suyas sin defensa.' : 'After each enemy move, look for undefended enemy pieces.';
      t.howToAvoid = es ? 'Rutina mental, pregunta 7: «¿Mi rival tiene alguna pieza indefensa?»' : 'Thinking routine, question 7: "Does my opponent have an undefended piece?"';
      t.question = es ? '¿Qué pieza rival está sin defensa?' : 'Which enemy piece is undefended?';
      break;
    case 'good-capture':
      t.title = es ? `¡Bien visto! Ganas ${the(piece, l)}` : `Well spotted! You win the ${pieceName(piece, l)}`;
      t.why = es ? `Ganas ${pts(value, l)} de material.` : `You gain ${pts(value, l)} of material.`;
      break;
    case 'mate':
      t.title = es ? '¡Jaque mate!' : 'Checkmate!';
      t.why = es ? 'El rey rival está en jaque y no tiene ninguna jugada para salir.' : 'The enemy king is in check and has no legal way out.';
      break;
  }
  return t;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
