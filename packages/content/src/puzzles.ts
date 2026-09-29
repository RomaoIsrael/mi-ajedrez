/**
 * Puzzles originales del prototipo. Cada uno se verifica automáticamente en los tests:
 * - `mate`: toda jugada aceptada da jaque mate.
 * - `material`: la jugada gana material y es claramente mejor que cualquier alternativa.
 */

export interface Puzzle {
  id: string;
  fen: string;
  /** Primeras jugadas aceptadas (UCI). */
  accept: string[];
  goal: 'mate' | 'material';
  concept: string;
  rating: number;
  prompt: string;
  explanation: string;
}

export const PUZZLES: Puzzle[] = [
  { id: 'p-free-bishop', fen: '4k3/8/8/3b4/8/8/8/3QK3 w - - 0 1', accept: ['d1d5'], goal: 'material', concept: 'vision.undefended-pieces', rating: 400,
    prompt: 'Juegan blancas. Gana material.', explanation: 'El alfil de d5 no tiene defensa: la dama lo captura gratis por la columna d.' },
  { id: 'p-back-rank', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', accept: ['d1d8'], goal: 'mate', concept: 'tactics.mate-in-1', rating: 550,
    prompt: 'Juegan blancas. Mate en 1.', explanation: 'Td8#: los peones negros encierran a su propio rey. Es el mate del pasillo.' },
  { id: 'p-queen-rank', fen: '7k/6pp/8/8/8/8/1Q6/K7 w - - 0 1', accept: ['b2b8'], goal: 'mate', concept: 'tactics.mate-in-1', rating: 600,
    prompt: 'Juegan blancas. Mate en 1.', explanation: 'Db8#: la dama controla toda la octava fila y el rey no tiene casillas libres.' },
  { id: 'p-king-queen', fen: 'k7/8/1K6/8/8/8/7Q/8 w - - 0 1', accept: ['h2h8'], goal: 'mate', concept: 'tactics.mate-in-1', rating: 650,
    prompt: 'Juegan blancas. Mate en 1.', explanation: 'Dh8#: el rey blanco quita a7 y b7, y la dama controla la octava fila.' },
  { id: 'p-smothered', fen: '6rk/6pp/8/6N1/8/8/8/7K w - - 0 1', accept: ['g5f7'], goal: 'mate', concept: 'tactics.mate-in-1', rating: 800,
    prompt: 'Juegan blancas. Mate en 1.', explanation: 'Cf7#: el rey está rodeado por sus propias piezas. Es el «mate de la coz».' },
  { id: 'p-promo-mate', fen: 'k7/2P5/1K6/8/8/8/8/8 w - - 0 1', accept: ['c7c8q', 'c7c8r'], goal: 'mate', concept: 'tactics.mate-in-1', rating: 700,
    prompt: 'Juegan blancas. Mate en 1.', explanation: 'c8=D# (o c8=T#): el peón corona dando mate en la octava fila.' },
  { id: 'p-knight-fork', fen: '3q3k/8/8/4N3/8/8/8/6K1 w - - 0 1', accept: ['e5f7'], goal: 'material', concept: 'tactics.fork', rating: 750,
    prompt: 'Juegan blancas. Gana material.', explanation: 'Cf7+: horquilla. El caballo ataca a la vez al rey y a la dama; tras mover el rey, capturas la dama.' },
  { id: 'p-pawn-fork', fen: 'k7/8/2r1r3/8/3P4/6P1/5PKP/8 w - - 0 1', accept: ['d4d5'], goal: 'material', concept: 'tactics.fork', rating: 700,
    prompt: 'Juegan blancas. Gana material.', explanation: 'd5: el peón ataca las dos torres a la vez. Solo una puede salvarse.' },
  { id: 'p-skewer', fen: '6q1/8/8/3k4/8/8/8/3BK3 w - - 0 1', accept: ['d1b3'], goal: 'material', concept: 'tactics.skewer', rating: 900,
    prompt: 'Juegan blancas. Gana material.', explanation: 'Ab3+: ensartada. El rey debe apartarse de la diagonal y el alfil captura la dama que estaba detrás.' },
  { id: 'p-double-attack', fen: 'r5k1/6pp/8/8/8/8/5PPP/3Q2K1 w - - 0 1', accept: ['d1d5'], goal: 'material', concept: 'tactics.double-attack', rating: 950,
    prompt: 'Juegan blancas. Gana material.', explanation: 'Dd5+: ataque doble. La dama da jaque al rey y a la vez ataca la torre de a8 por la otra diagonal.' },
];

/** Selector adaptativo simple: prioriza conceptos débiles y dificultad cercana al rating. */
export function pickPuzzle(opts: { rating: number; weakConcepts?: string[]; exclude?: string[] }): Puzzle | undefined {
  const pool = PUZZLES.filter((p) => !opts.exclude?.includes(p.id));
  const score = (p: Puzzle) =>
    Math.abs(p.rating - (opts.rating + 50)) - (opts.weakConcepts?.includes(p.concept) ? 250 : 0);
  return pool.sort((a, b) => score(a) - score(b))[0];
}
