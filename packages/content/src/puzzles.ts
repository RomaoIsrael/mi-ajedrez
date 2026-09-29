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
  /**
   * Línea completa para puzzles de varias jugadas (UCI, alternando bandos, empezando por la
   * jugada del usuario). La app responde automáticamente con las jugadas del rival.
   */
  line?: string[];
  goal: 'mate' | 'material';
  concept: string;
  rating: number;
  prompt: string;
  explanation: string;
}

export const PUZZLES: Puzzle[] = [
  { id: 'p-free-bishop', fen: '4k3/ppp2ppp/4pq2/1b6/8/8/PPP1QPPP/4K1N1 w - - 0 1', accept: ['e2b5'], goal: 'material', concept: 'vision.undefended-pieces', rating: 400,
    prompt: 'Juegan blancas. Gana material.', explanation: 'Dxb5+: el alfil de b5 atacaba tu dama y no tenía defensa. La dama lo captura dando jaque.' },
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
  { id: 'p-knight-fork', fen: '3q3k/6pp/8/4N3/8/8/6PP/R5K1 w - - 0 1', accept: ['e5f7'], goal: 'material', concept: 'tactics.fork', rating: 750,
    prompt: 'Juegan blancas. Gana material.', explanation: 'Cf7+: horquilla. El caballo ataca a la vez al rey y a la dama; tras mover el rey, capturas la dama.' },
  { id: 'p-pawn-fork', fen: 'k7/pp3ppp/2r1r3/8/3P4/6P1/5PKP/R4R2 w - - 0 1', accept: ['d4d5'], goal: 'material', concept: 'tactics.fork', rating: 700,
    prompt: 'Juegan blancas. Gana material.', explanation: 'd5: el peón ataca las dos torres a la vez. Solo una puede salvarse.' },
  { id: 'p-skewer', fen: '6q1/6pp/8/3k4/8/8/6PP/3BK2R w K - 0 1', accept: ['d1b3'], goal: 'material', concept: 'tactics.skewer', rating: 900,
    prompt: 'Juegan blancas. Gana material.', explanation: 'Ab3+: ensartada. El rey debe apartarse de la diagonal y el alfil captura la dama que estaba detrás.' },
  { id: 'p-double-attack', fen: 'r5k1/6pp/8/8/8/8/5PPP/3Q2K1 w - - 0 1', accept: ['d1d5'], goal: 'material', concept: 'tactics.double-attack', rating: 950,
    prompt: 'Juegan blancas. Gana material.', explanation: 'Dd5+: ataque doble. La dama da jaque al rey y a la vez ataca la torre de a8 por la otra diagonal.' },
  // ── Visión: material gratis ──
  { id: 'p-free-rook', fen: 'r3k3/pp3ppp/1N4n1/8/8/8/PP3PPP/2B3K1 w - - 0 1', accept: ['b6a8'], goal: 'material', concept: 'vision.undefended-pieces', rating: 420,
    prompt: 'Juegan blancas. Gana material.', explanation: 'Cxa8: la torre estaba sin defensa al alcance del caballo. Aunque el peón de a7 ataca tu caballo, capturar primero gana una torre entera.' },
  { id: 'p-pawn-takes-queen', fen: '4k3/ppp2ppp/8/3q4/4P3/8/PPP2PPP/4K2Q w - - 0 1', accept: ['e4d5'], goal: 'material', concept: 'vision.undefended-pieces', rating: 380,
    prompt: 'Juegan blancas. Gana material.', explanation: 'exd5: el peón captura en diagonal ¡y se lleva la dama! Tu dama no llega a d5: tu propio peón de e4 le tapa la diagonal.' },
  { id: 'p-which-capture', fen: '4k2r/ppp2ppp/3p4/4n3/7b/5N2/PPP2PPP/2BK3R w k - 0 1', accept: ['f3h4'], goal: 'material', concept: 'vision.threats', rating: 700,
    prompt: 'Juegan blancas. Gana material.', explanation: 'Cxh4: gana el alfil y además saca tu caballo del ataque de e5. Cxe5 solo cambiaría caballos, porque el peón de d6 recaptura.' },
  // ── Mates en 1 ──
  { id: 'p-arabian', fen: '7k/8/5N2/8/8/8/8/6RK w - - 0 1', accept: ['g1g8'], goal: 'mate', concept: 'tactics.mate-in-1', rating: 700,
    prompt: 'Juegan blancas. Mate en 1.', explanation: 'Tg8#: el caballo protege la torre y quita la casilla h7. Torre y caballo trabajan juntos.' },
  { id: 'p-long-diagonal', fen: 'r5k1/5ppp/8/8/6Q1/8/1B6/6K1 w - - 0 1', accept: ['g4g7'], goal: 'mate', concept: 'tactics.mate-in-1', rating: 750,
    prompt: 'Juegan blancas. Mate en 1.', explanation: 'Dxg7#: el alfil de b2 apoya a la dama desde la gran diagonal.' },
  { id: 'p-back-rank-black', fen: '3r2k1/8/8/8/8/8/5PPP/6K1 b - - 0 1', accept: ['d8d1'], goal: 'mate', concept: 'tactics.mate-in-1', rating: 550,
    prompt: 'Juegan negras. Mate en 1.', explanation: 'Td1#: el mate del pasillo también funciona para las negras.' },
  { id: 'p-queen-knight', fen: '5rk1/5pp1/8/6NQ/8/8/8/6K1 w - - 0 1', accept: ['h5h7'], goal: 'mate', concept: 'tactics.mate-in-1', rating: 800,
    prompt: 'Juegan blancas. Mate en 1.', explanation: 'Dh7#: el caballo de g5 protege la dama y la torre negra le quita al rey la casilla f8.' },
  // ── Mates en 2 ──
  { id: 'p-smothered-2', fen: '4r2k/6pp/7N/8/2Q5/8/8/6K1 w - - 0 1', accept: ['c4g8'], line: ['c4g8', 'e8g8', 'h6f7'], goal: 'mate', concept: 'tactics.mate-in-2', rating: 1100,
    prompt: 'Juegan blancas. Mate en 2.', explanation: 'Dg8+! Txg8 (el rey no puede capturar: el caballo protege g8) y Cf7#, mate de la coz.' },
  { id: 'p-deflection-2', fen: '3q2k1/5ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1', accept: ['e2e8'], line: ['e2e8', 'd8e8', 'e1e8'], goal: 'mate', concept: 'tactics.mate-in-2', rating: 1000,
    prompt: 'Juegan blancas. Mate en 2.', explanation: 'De8+! Dxe8 y Txe8#: sacrificas la dama para desviar a la única defensora de la octava fila.' },
  // ── Horquillas ──
  { id: 'p-royal-fork', fen: '2r3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1', accept: ['d5e7'], goal: 'material', concept: 'tactics.fork', rating: 700,
    prompt: 'Juegan blancas. Gana material.', explanation: 'Ce7+: horquilla al rey y a la torre de c8.' },
  { id: 'p-knight-fork-c7', fen: 'r3k2r/ppp2ppp/8/1N6/8/8/PPP2PPP/R3K3 w - - 0 1', accept: ['b5c7'], goal: 'material', concept: 'tactics.fork', rating: 650,
    prompt: 'Juegan blancas. Gana material.', explanation: 'Cxc7+: el caballo captura un peón, da jaque y ataca la torre de a8.' },
  { id: 'p-bishop-fork', fen: '8/3n1k2/6pp/8/8/6P1/r3BP2/4K2R w K - 0 1', accept: ['e2c4'], goal: 'material', concept: 'tactics.fork', rating: 800,
    prompt: 'Juegan blancas. Gana material.', explanation: 'Ac4+: el alfil da jaque y, por la otra diagonal, ataca la torre de a2. De paso sale del ataque de la torre.' },
  { id: 'p-black-fork', fen: 'r3k3/ppp2ppp/8/8/3n4/8/PPP2PPP/R3K2R b KQ - 0 1', accept: ['d4c2'], goal: 'material', concept: 'tactics.fork', rating: 650,
    prompt: 'Juegan negras. Gana material.', explanation: 'Cxc2+: el caballo captura un peón, da jaque al rey blanco y ataca la torre de a1.' },
  { id: 'p-underpromotion', fen: '8/2q1P1k1/6p1/8/8/6P1/5P2/K7 w - - 0 1', accept: ['e7e8n'], goal: 'material', concept: 'tactics.fork', rating: 1200,
    prompt: 'Juegan blancas. Gana material.', explanation: 'e8=C+! Coronar en caballo da jaque y ataca la dama de c7. Coronar en dama permitiría a las negras salvar la suya.' },
  // ── Clavada, descubierta y ensartada ──
  { id: 'p-pin-queen', fen: '4k3/ppp2ppp/8/4q3/8/5B2/PPP2KPP/R7 w - - 0 1', accept: ['a1e1'], goal: 'material', concept: 'tactics.pin', rating: 850,
    prompt: 'Juegan blancas. Gana material.', explanation: 'Te1: la dama queda clavada contra su rey. Solo puede capturar la torre, y tu rey recaptura: cambias torre por dama y te queda un alfil de ventaja.' },
  { id: 'p-discovered-bishop', fen: '4k3/7q/8/8/4B3/8/8/4RK2 w - - 0 1', accept: ['e4h7', 'e4g6'], goal: 'material', concept: 'tactics.discovered', rating: 700,
    prompt: 'Juegan blancas. Gana material.', explanation: 'Axh7+: el alfil captura la dama y descubre el jaque de la torre. (Ag6+ también gana: si la dama tapa en e7, queda clavada.)' },
  { id: 'p-discovered-knight', fen: '3q4/6k1/8/8/3N4/8/8/3R2K1 w - - 0 1', accept: ['d4f5', 'd4e6'], goal: 'material', concept: 'tactics.discovered', rating: 900,
    prompt: 'Juegan blancas. Gana material.', explanation: 'Cf5+ (o Ce6+): jaque de caballo y, a la vez, la torre ataca la dama de d8.' },
  { id: 'p-rook-skewer', fen: '8/8/8/3k3q/8/8/8/R5K1 w - - 0 1', accept: ['a1a5'], goal: 'material', concept: 'tactics.skewer', rating: 850,
    prompt: 'Juegan blancas. Gana material.', explanation: 'Ta5+: ensartada. El rey sale de la quinta fila y la torre captura la dama de h5.' },
];

/** Selector adaptativo simple: prioriza conceptos débiles y dificultad cercana al rating. */
export function pickPuzzle(opts: { rating: number; weakConcepts?: string[]; exclude?: string[] }): Puzzle | undefined {
  const pool = PUZZLES.filter((p) => !opts.exclude?.includes(p.id));
  const score = (p: Puzzle) =>
    Math.abs(p.rating - (opts.rating + 50)) - (opts.weakConcepts?.includes(p.concept) ? 250 : 0);
  return pool.sort((a, b) => score(a) - score(b))[0];
}
