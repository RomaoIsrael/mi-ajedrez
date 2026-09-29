/**
 * Ayudas del coach: escalera de 5 pistas, aviso de amenazas y botón «¿Por qué?».
 * Las pistas enseñan a pensar: pregunta → zona → pieza → candidatas → respuesta.
 */
import {
  fileOf, localizeSan, moveToSan, opposite, rankOf, squareName,
  type Move, type Position, type Square,
} from '@kavalo/chess-core';
import { asTurn, hangingPieces, matesInOne, PIECE_VALUE } from './material.js';
import { pieceName, type Arrow, type Locale } from './explain.js';

export interface Hint {
  level: 1 | 2 | 3 | 4 | 5;
  text: string;
  highlights: Square[];
  arrows: Arrow[];
}

export interface HintLadder {
  concept: string;
  move: Move;
  steps: Hint[];
}

const CENTER: readonly Square[] = [27, 28, 35, 36]; // d4 e4 d5 e5

function zoneName(sq: Square, pos: Position, l: Locale): string {
  const f = fileOf(sq);
  const own = pos.turn === 'w' ? rankOf(sq) < 4 : rankOf(sq) > 3;
  const flank = f <= 2 ? (l === 'es' ? 'el flanco de dama' : 'the queenside') : f >= 5 ? (l === 'es' ? 'el flanco de rey' : 'the kingside') : (l === 'es' ? 'el centro' : 'the centre');
  const side = own ? (l === 'es' ? 'de tu campo' : 'on your side') : (l === 'es' ? 'del campo rival' : 'on the opponent side');
  return `${flank} ${side}`;
}

function zoneSquares(sq: Square): Square[] {
  const f = fileOf(sq);
  const r = rankOf(sq);
  const out: Square[] = [];
  for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
    const nf = f + df; const nr = r + dr;
    if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) out.push(nr * 8 + nf);
  }
  return out;
}

/**
 * Construye la escalera de pistas para el bando que mueve.
 * `fallback` es la jugada sugerida por el motor/bot cuando no hay nada táctico evidente.
 */
export function hintLadder(pos: Position, opts: { locale?: Locale; fallback?: Move } = {}): HintLadder | null {
  const l = opts.locale ?? 'es';
  const es = l === 'es';
  const us = pos.turn;
  const san = (m: Move) => localizeSan(moveToSan(pos, m), l);
  const legal = pos.legalMoves();
  if (legal.length === 0) return null;

  let concept: string;
  let move: Move;
  let q1: string;
  let why: string;

  const mate = matesInOne(pos)[0];
  const win = hangingPieces(pos, opposite(us))[0];
  const threat = hangingPieces(pos, us)[0];

  if (mate) {
    concept = 'tactics.mate-in-1'; move = mate;
    q1 = es ? 'Empieza por los jaques: ¿hay alguno que el rey rival no pueda esquivar?' : 'Start with checks: is there one the enemy king cannot escape?';
    why = es ? 'es jaque mate: el rey no tiene escapatoria.' : 'it is checkmate: the king has no escape.';
  } else if (win && win.gain >= 1) {
    concept = 'vision.undefended-pieces'; move = win.capture;
    q1 = es ? '¿Tu rival tiene alguna pieza sin defensa suficiente?' : 'Does your opponent have a piece that is not defended enough?';
    why = es ? `ganas ${the(win.type, l)} (${win.gain} ${win.gain === 1 ? 'punto' : 'puntos'}).` : `you win the ${pieceName(win.type, l)} (${win.gain} point${win.gain === 1 ? '' : 's'}).`;
  } else if (threat) {
    concept = 'vision.threats';
    const rescues = legal.filter((m) => {
      const after = pos.play(m);
      const worst = hangingPieces(after, us)[0];
      return !worst || worst.gain < threat.gain;
    });
    const rescue = rescues.find((m) => m.from === threat.square) ?? rescues[0];
    if (!rescue) return null;
    move = rescue;
    q1 = es ? '¿Qué amenaza tu rival con su última jugada?' : 'What is your opponent threatening with the last move?';
    why = es ? `pone a salvo ${the(threat.type, l)} de ${squareName(threat.square)}.` : `it saves the ${pieceName(threat.type, l)} on ${squareName(threat.square)}.`;
  } else if (opts.fallback) {
    concept = 'strategy.piece-activity'; move = opts.fallback;
    q1 = es ? 'No hay nada urgente. ¿Cuál es tu pieza peor colocada y cómo puedes mejorarla?' : 'Nothing urgent. Which is your worst piece and how can you improve it?';
    why = es ? 'mejora la actividad de tus piezas.' : 'it improves your piece activity.';
  } else {
    return null;
  }

  const piece = pos.get(move.from)!;
  const alt = legal.find((m) => m !== move && (m.captured || pos.play(m).inCheck())) ?? legal.find((m) => m !== move && m.piece !== move.piece);
  const candidates = [move, ...(alt ? [alt] : [])].sort((a, b) => san(a).localeCompare(san(b)));

  const steps: Hint[] = [
    { level: 1, text: q1, highlights: [], arrows: [] },
    { level: 2, text: es ? `Mira ${zoneName(move.to, pos, l)}.` : `Look at ${zoneName(move.to, pos, l)}.`, highlights: zoneSquares(move.to), arrows: [] },
    { level: 3, text: es ? `Tu ${pieceName(piece.type, l)} de ${squareName(move.from)} puede hacer algo interesante.` : `Your ${pieceName(piece.type, l)} on ${squareName(move.from)} can do something interesting.`, highlights: [move.from], arrows: [] },
    { level: 4, text: es ? `Considera: ${candidates.map(san).join(' o ')}.` : `Consider: ${candidates.map(san).join(' or ')}.`, highlights: candidates.map((m) => m.from), arrows: [] },
    { level: 5, text: `${san(move)}: ${why}`, highlights: [move.from, move.to], arrows: [{ from: move.from, to: move.to, color: 'good' }] },
  ];
  return { concept, move, steps };
}

function the(type: Parameters<typeof pieceName>[0], l: Locale): string {
  const fem = type === 'r' || type === 'q';
  return l === 'es' ? `${fem ? 'la' : 'el'} ${pieceName(type, l)}` : `the ${pieceName(type, l)}`;
}

export interface ThreatWarning { text: string; highlights: Square[]; arrows: Arrow[] }

/** Aviso proactivo tras la jugada rival (modo principiante). null si no hay amenaza clara. */
export function threatWarning(pos: Position, locale: Locale = 'es'): ThreatWarning | null {
  const es = locale === 'es';
  const us = pos.turn;
  const them = asTurn(pos, opposite(us));
  const mate = them ? matesInOne(them)[0] : undefined;
  if (mate) {
    return {
      text: es ? '¡Cuidado! Tu rival amenaza jaque mate. ¿Cómo lo evitas?' : 'Careful! Your opponent threatens checkmate. How do you stop it?',
      highlights: [mate.to], arrows: [{ from: mate.from, to: mate.to, color: 'danger' }],
    };
  }
  const h = hangingPieces(pos, us)[0];
  if (h) {
    return {
      text: es ? `Tu rival amenaza ${the(h.type, locale)} de ${squareName(h.square)}.` : `Your opponent threatens the ${pieceName(h.type, locale)} on ${squareName(h.square)}.`,
      highlights: [h.square], arrows: [{ from: h.capture.from, to: h.square, color: 'danger' }],
    };
  }
  return null;
}

/** Efectos verificables de una jugada, para el botón «¿Por qué?». */
export function moveEffects(before: Position, move: Move, locale: Locale = 'es'): { text: string; arrows: Arrow[] }[] {
  const es = locale === 'es';
  const us = move.color;
  const them = opposite(us);
  const after = before.play(move);
  const out: { text: string; arrows: Arrow[] }[] = [];

  if (after.isCheckmate()) out.push({ text: es ? 'Da jaque mate.' : 'It is checkmate.', arrows: [] });
  else if (after.inCheck()) out.push({ text: es ? 'Da jaque: tu rival está obligado a responder.' : 'It gives check: your opponent must respond.', arrows: [] });
  if (move.captured) out.push({ text: es ? `Captura ${the(move.captured, locale)}.` : `Captures the ${pieceName(move.captured, locale)}.`, arrows: [] });
  if (move.promotion) out.push({ text: es ? `Corona el peón en ${pieceName(move.promotion, locale)}.` : `Promotes the pawn to a ${pieceName(move.promotion, locale)}.`, arrows: [] });
  if (move.castle) out.push({ text: es ? 'Enroca: tu rey queda protegido y la torre entra en juego.' : 'Castles: your king is safer and the rook joins the game.', arrows: [] });

  const backRank = us === 'w' ? 0 : 7;
  if ((move.piece === 'n' || move.piece === 'b') && rankOf(move.from) === backRank) {
    out.push({ text: es ? `Desarrolla ${the(move.piece, locale)}.` : `Develops the ${pieceName(move.piece, locale)}.`, arrows: [] });
  }

  const controlled = CENTER.filter(
    (sq) => after.attackers(sq, us).includes(move.to) && !before.attackers(sq, us).includes(move.from),
  );
  const occupied = CENTER.includes(move.to) && move.piece === 'p';
  if (controlled.length || occupied) {
    const names = controlled.map(squareName).join(', ');
    out.push({
      text: es ? `${occupied ? `Ocupa ${squareName(move.to)}` : 'Lucha por el centro'}${names ? ` y controla ${names}` : ''}.`
               : `${occupied ? `Occupies ${squareName(move.to)}` : 'Fights for the centre'}${names ? ` and controls ${names}` : ''}.`,
      arrows: controlled.map((sq) => ({ from: move.to, to: sq, color: 'info' as const })),
    });
  }

  const kingSide = us === 'w' ? before.castling.K : before.castling.k;
  const home = us === 'w' ? 4 : 60;
  const clearNow = !after.get(home + 1) && !after.get(home + 2);
  const clearBefore = !before.get(home + 1) && !before.get(home + 2);
  if (kingSide && clearNow && !clearBefore && !move.castle) {
    out.push({ text: es ? 'Prepara el enroque corto.' : 'Prepares kingside castling.', arrows: [] });
  }

  const threatened = hangingPieces(after, them).filter((h) => h.attackers.includes(move.to));
  for (const h of threatened.slice(0, 1)) {
    out.push({
      text: es ? `Ataca ${the(h.type, locale)} de ${squareName(h.square)}.` : `Attacks the ${pieceName(h.type, locale)} on ${squareName(h.square)}.`,
      arrows: [{ from: move.to, to: h.square, color: 'danger' }],
    });
  }

  const savedBefore = hangingPieces(before, us);
  const stillAfter = new Set(hangingPieces(after, us).map((h) => h.square));
  const saved = savedBefore.find((h) => !stillAfter.has(h.square === move.from ? move.to : h.square));
  if (saved && PIECE_VALUE[saved.type] >= 3) {
    out.push({ text: es ? `Pone a salvo ${the(saved.type, locale)}.` : `Saves the ${pieceName(saved.type, locale)}.`, arrows: [] });
  }
  return out;
}
