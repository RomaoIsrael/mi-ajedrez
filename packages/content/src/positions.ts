/**
 * Posiciones de partida para los modos «Desde medio juego», «Desde final» y «Temática»
 * (brief §60). Cada una tiene un objetivo claro y verificable con Stockfish
 * (test/stockfish.test.mjs): ganar, hacer tablas o simplemente jugar una posición equilibrada.
 * Posiciones y textos originales (las estructuras son patrones generales del ajedrez).
 */

export type PositionGoal = 'win' | 'draw' | 'play';

export interface StartPosition {
  id: string;
  category: 'middlegame' | 'endgame';
  theme: string;
  title: string;
  fen: string;
  /** Color que juega el usuario (el turno de la FEN puede ser del rival). */
  side: 'w' | 'b';
  goal: PositionGoal;
  objective: string;
  /** Idea principal que el coach recuerda al empezar. */
  idea: string;
  concept: string;
  minLevel: 'beginner' | 'intermediate' | 'advanced';
}

export const THEMES: Record<string, string> = {
  'king-attack': 'Ataque al rey',
  'isolated-pawn': 'Peón aislado',
  'pawn-chain': 'Cadenas de peones',
  'open-file': 'Columnas abiertas',
  'basic-mates': 'Mates básicos',
  'king-pawn': 'Finales de peones',
  'rook-endings': 'Finales de torres',
  'passed-pawn': 'Peón pasado',
};

export const START_POSITIONS: StartPosition[] = [
  // ── Medio juego ──
  {
    id: 'mg-opposite-castling', category: 'middlegame', theme: 'king-attack', title: 'Enroques opuestos',
    fen: 'r1bq1rk1/pp2ppbp/2np1np1/8/3NP1P1/2N1BP2/PPPQ3P/2KR1B1R b - - 0 1', side: 'w', goal: 'play',
    objective: 'Ataca al rey enrocado del rival antes de que él llegue al tuyo.',
    idea: 'Con los reyes en flancos opuestos, los peones pueden avanzar sin miedo: h4–h5 abre líneas. Cada tiempo cuenta.',
    concept: 'planning.imbalances', minLevel: 'intermediate',
  },
  {
    id: 'mg-iqp', category: 'middlegame', theme: 'isolated-pawn', title: 'Jugar con el peón aislado',
    fen: 'r1bq1rk1/pp2bppp/2n1pn2/8/2BP4/2N2N2/PP3PPP/R1BQ1RK1 w - - 0 1', side: 'w', goal: 'play',
    objective: 'Usa la actividad que te da el peón de d4 antes de que se convierta en una debilidad.',
    idea: 'El peón aislado da casillas (e5, c5) y columnas semiabiertas: piezas activas y ataque. En el final suele ser una debilidad, así que evita cambios innecesarios.',
    concept: 'strategy.pawn-structure', minLevel: 'intermediate',
  },
  {
    id: 'mg-iqp-defend', category: 'middlegame', theme: 'isolated-pawn', title: 'Contra el peón aislado',
    fen: 'r1bq1rk1/pp2bppp/2n1pn2/8/2BP4/2N2N2/PP3PPP/R1BQ1RK1 w - - 0 1', side: 'b', goal: 'play',
    objective: 'Bloquea el peón aislado y cambia piezas para llegar a un final favorable.',
    idea: 'La casilla delante del peón aislado (d5) es ideal para un caballo. Cada cambio de piezas debilita el peón.',
    concept: 'strategy.pawn-structure', minLevel: 'intermediate',
  },
  {
    id: 'mg-pawn-chain', category: 'middlegame', theme: 'pawn-chain', title: 'Atacar la base de la cadena',
    fen: 'r1bqk2r/pp1nbppp/2n1p3/2ppP3/3P1P2/2N2N2/PPP3PP/R1BQKB1R b KQkq - 0 1', side: 'b', goal: 'play',
    objective: 'Presiona la base de la cadena de peones blanca (d4).',
    idea: 'Una cadena de peones se ataca por su base: …c5 y …Cc6 presionan d4; …f6 puede romper el frente.',
    concept: 'strategy.pawn-structure', minLevel: 'intermediate',
  },
  {
    id: 'mg-open-file', category: 'middlegame', theme: 'open-file', title: 'Conquistar la columna abierta',
    fen: 'r4rk1/pp2qppp/2n1bn2/8/8/2N1BN2/PP2QPPP/R4RK1 w - - 0 1', side: 'w', goal: 'play',
    objective: 'Coloca tus torres en las columnas abiertas (c y d) antes que el rival.',
    idea: 'Las torres necesitan columnas abiertas. Quien las ocupa primero puede entrar en la séptima fila.',
    concept: 'strategy.piece-activity', minLevel: 'beginner',
  },
  // ── Finales ──
  {
    id: 'eg-kq-k', category: 'endgame', theme: 'basic-mates', title: 'Rey y dama contra rey',
    fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1', side: 'w', goal: 'win',
    objective: 'Da jaque mate (sin ahogar al rey rival).',
    idea: 'Encierra al rey con la dama a salto de caballo, acércalo con tu rey y cuida de dejarle siempre una casilla.',
    concept: 'endgame.kq-vs-k', minLevel: 'beginner',
  },
  {
    id: 'eg-kr-k', category: 'endgame', theme: 'basic-mates', title: 'Rey y torre contra rey',
    fen: '8/8/3k4/8/8/8/8/R3K3 w - - 0 1', side: 'w', goal: 'win',
    objective: 'Da jaque mate con la torre.',
    idea: 'La torre corta al rey fila a fila; tu rey se coloca enfrente (oposición) para dar el jaque definitivo.',
    concept: 'endgame.kq-vs-k', minLevel: 'beginner',
  },
  {
    id: 'eg-king-sixth', category: 'endgame', theme: 'king-pawn', title: 'Rey en sexta',
    fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', side: 'w', goal: 'win',
    objective: 'Corona el peón.',
    idea: 'Con tu rey en la sexta fila delante del peón, la victoria es segura: usa la oposición y no avances el peón antes de tiempo.',
    concept: 'endgame.opposition', minLevel: 'beginner',
  },
  {
    id: 'eg-outside-passer', category: 'endgame', theme: 'passed-pawn', title: 'Peón pasado alejado',
    fen: '8/5pk1/6p1/8/P7/6P1/5PK1/8 w - - 0 1', side: 'w', goal: 'win',
    objective: 'Gana usando tu peón pasado de la columna a.',
    idea: 'El peón alejado desvía al rey rival; mientras tanto, tu rey se come los peones del otro flanco.',
    concept: 'strategy.pawn-structure', minLevel: 'intermediate',
  },
  {
    id: 'eg-lucena', category: 'endgame', theme: 'rook-endings', title: 'Construir el puente',
    fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', side: 'w', goal: 'win',
    objective: 'Corona el peón de b7.',
    idea: 'Aparta al rey rival con un jaque, lleva tu torre a la cuarta fila y úsala como «puente» para proteger a tu rey de los jaques.',
    concept: 'endgame.opposition', minLevel: 'advanced',
  },
  {
    id: 'eg-philidor', category: 'endgame', theme: 'rook-endings', title: 'La defensa en la tercera fila',
    fen: '4k3/8/8/3KP3/8/8/7r/R7 b - - 0 1', side: 'b', goal: 'draw',
    objective: 'Consigue las tablas.',
    idea: 'Coloca tu torre en tu tercera fila (…Th6) para impedir que el rey blanco avance. Cuando el peón avance, pasa la torre atrás y da jaques desde lejos.',
    concept: 'endgame.opposition', minLevel: 'advanced',
  },
];

export const positionById = (id: string) => START_POSITIONS.find((p) => p.id === id);
