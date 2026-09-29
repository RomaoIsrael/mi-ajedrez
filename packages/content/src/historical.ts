/**
 * Biblioteca de partidas históricas (brief §54). Solo partidas antiguas de dominio público; las
 * jugadas son hechos históricos y todos los comentarios son originales. En los momentos clave
 * se pregunta «¿Qué jugarías?» y después se explica qué ocurrió, la idea y el concepto.
 * Los tests comprueban que todas las jugadas son legales y que los finales anunciados son mate.
 */

export interface KeyMoment {
  /** Índice (media jugada, desde 0) de la jugada que el usuario debe encontrar. */
  ply: number;
  question: string;
  /** Jugadas aceptadas (SAN inglés); la primera es la de la partida. */
  accept: string[];
  explanation: string;
  concept: string;
}

export interface HistoricalGame {
  id: string;
  title: string;
  white: string;
  black: string;
  year: number;
  place: string;
  /** Jugadas en SAN inglés. */
  moves: string;
  result: '1-0' | '0-1' | '1/2-1/2';
  intro: string;
  moments: KeyMoment[];
  lesson: string;
  minLevel: 'beginner' | 'intermediate' | 'advanced';
  /** La partida termina con jaque mate en el tablero. */
  endsInMate: boolean;
}

export const HISTORICAL_GAMES: HistoricalGame[] = [
  {
    id: 'legal-1750', title: 'La trampa de Légal', white: 'Kermur de Légal', black: 'Saint Brie', year: 1750, place: 'París',
    moves: 'e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6 Nxe5 Bxd1 Bxf7+ Ke7 Nd5#', result: '1-0', endsInMate: true, minLevel: 'beginner',
    intro: 'Una miniatura de hace más de 250 años. Las negras clavan el caballo contra la dama… o eso creen.',
    moments: [
      { ply: 8, question: 'El caballo de f3 está clavado contra tu dama. ¿Te atreves a moverlo?', accept: ['Nxe5'],
        explanation: 'Cxe5: una clavada contra la dama NO es absoluta. Si las negras capturan la dama, las piezas blancas dan mate. Las negras deberían haber jugado …dxe5.', concept: 'tactics.pin' },
      { ply: 10, question: 'Las negras se han comido tu dama. ¿Cómo sigues el ataque?', accept: ['Bxf7+'],
        explanation: 'Axf7+: jaque que obliga al rey a salir a e7. Ahora las piezas menores bastan para encerrarlo.', concept: 'tactics.mate-in-2' },
      { ply: 12, question: 'Mate en 1.', accept: ['Nd5#'],
        explanation: 'Cd5#: tres piezas menores coordinadas dan mate con la dama negra todavía en el tablero. El desarrollo vale más que el material.', concept: 'tactics.mate-in-1' },
    ],
    lesson: 'Antes de aceptar un regalo de material, comprueba qué puede hacer el rival con sus piezas desarrolladas.',
  },
  {
    id: 'opera-1858', title: 'La partida de la Ópera', white: 'Paul Morphy', black: 'Duque de Brunswick y conde Isouard', year: 1858, place: 'París',
    moves: 'e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#',
    result: '1-0', endsInMate: true, minLevel: 'beginner',
    intro: 'Jugada en un palco durante una representación de ópera. Es la mejor demostración de por qué el desarrollo rápido importa.',
    moments: [
      { ply: 18, question: 'Tus piezas están desarrolladas y las negras tienen el alfil y la torre en casa. ¿Cómo abres líneas?', accept: ['Nxb5'],
        explanation: 'Cxb5: Morphy entrega un caballo para abrir la diagonal y la columna hacia el rey negro, que sigue en el centro.', concept: 'openings.development' },
      { ply: 24, question: 'El caballo de d7 está clavado. ¿Cómo lo aprovechas?', accept: ['Rxd7'],
        explanation: 'Txd7: se elimina un defensor clave. Cada cambio acerca más piezas blancas al rey expuesto.', concept: 'tactics.pin' },
      { ply: 30, question: 'Mate en 2: ¡piensa en un sacrificio de dama!', accept: ['Qb8+'],
        explanation: 'Db8+: la dama se sacrifica para desviar al caballo de d7. Después Td8 es mate.', concept: 'tactics.mate-in-2' },
      { ply: 32, question: 'Remata la partida.', accept: ['Rd8#'],
        explanation: 'Td8#: la torre, apoyada por el alfil de g5, da mate. Con solo dos piezas contra muchas: la actividad decide.', concept: 'tactics.mate-in-1' },
    ],
    lesson: 'Desarrolla todas tus piezas antes de atacar y, cuando el rey rival se quede en el centro, abre líneas aunque cueste material.',
  },
  {
    id: 'immortal-1851', title: 'La Inmortal', white: 'Adolf Anderssen', black: 'Lionel Kieseritzky', year: 1851, place: 'Londres',
    moves: 'e4 e5 f4 exf4 Bc4 Qh4+ Kf1 b5 Bxb5 Nf6 Nf3 Qh6 d3 Nh5 Nh4 Qg5 Nf5 c6 g4 Nf6 Rg1 cxb5 h4 Qg6 h5 Qg5 Qf3 Ng8 Bxf4 Qf6 Nc3 Bc5 Nd5 Qxb2 Bd6 Bxg1 e5 Qxa1+ Ke2 Na6 Nxg7+ Kd8 Qf6+ Nxf6 Be7#',
    result: '1-0', endsInMate: true, minLevel: 'intermediate',
    intro: 'El romanticismo en estado puro: las blancas entregan ambas torres, un alfil y la dama para dar mate con tres piezas menores.',
    moments: [
      { ply: 34, question: 'Las negras amenazan comerse tus torres. ¿Defiendes o sigues atacando?', accept: ['Bd6'],
        explanation: 'Ad6: Anderssen ignora sus torres y corta la huida del rey por f8. Cuando el rey rival está rodeado, el tiempo vale más que el material.', concept: 'planning.imbalances' },
      { ply: 42, question: 'Mate en 2 con un sacrificio espectacular.', accept: ['Qf6+'],
        explanation: 'Df6+: la dama se entrega para desviar al caballo de g8. Queda libre la casilla e7 para el alfil.', concept: 'tactics.mate-in-2' },
      { ply: 44, question: 'Termina la obra de arte.', accept: ['Be7#'],
        explanation: 'Ae7#: alfil, caballos y peón controlan todas las casillas del rey. Tres piezas menores contra un ejército entero.', concept: 'tactics.mate-in-1' },
    ],
    lesson: 'La actividad y la coordinación de las piezas pueden valer más que mucho material. (Hoy sabemos que las negras se defendieron mal: el análisis moderno es menos romántico).',
  },
  {
    id: 'evergreen-1852', title: 'La Siempreviva', white: 'Adolf Anderssen', black: 'Jean Dufresne', year: 1852, place: 'Berlín',
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d3 Qb3 Qf6 e5 Qg6 Re1 Nge7 Ba3 b5 Qxb5 Rb8 Qa4 Bb6 Nbd2 Bb7 Ne4 Qf5 Bxd3 Qh5 Nf6+ gxf6 exf6 Rg8 Rad1 Qxf3 Rxe7+ Nxe7 Qxd7+ Kxd7 Bf5+ Ke8 Bd7+ Kf8 Bxe7#',
    result: '1-0', endsInMate: true, minLevel: 'advanced',
    intro: 'Una combinación larga y precisa contra un rey que parecía seguro en el centro.',
    moments: [
      { ply: 32, question: 'Las negras amenazan tu caballo de f3 y mate en g2. ¿Qué haces?', accept: ['Nf6+'],
        explanation: 'Cf6+: el sacrificio abre la columna e y la diagonal hacia el rey negro. Las blancas van un paso por delante.', concept: 'tactics.discovered' },
      { ply: 40, question: 'Aquí empieza la combinación decisiva: mate en 4.', accept: ['Qxd7+'],
        explanation: 'Dxd7+!!: otro sacrificio de dama. El rey debe capturar y queda expuesto a un jaque doble.', concept: 'tactics.double-attack' },
      { ply: 42, question: 'Jaque doble.', accept: ['Bf5+'],
        explanation: 'Af5+: jaque doble del alfil y de la torre de d1. Contra un jaque doble, el rey solo puede moverse.', concept: 'tactics.discovered' },
      { ply: 46, question: 'Mate en 1.', accept: ['Bxe7#'],
        explanation: 'Axe7#: el peón de f6 y la torre de d1 completan la red de mate.', concept: 'tactics.mate-in-1' },
    ],
    lesson: 'Un rey en el centro con columnas abiertas es un blanco perfecto: busca jaques dobles y descubiertos.',
  },
  {
    id: 'reti-tartakower-1910', title: 'Réti contra Tartakower', white: 'Richard Réti', black: 'Savielly Tartakower', year: 1910, place: 'Viena',
    moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Qd3 e5 dxe5 Qa5+ Bd2 Qxe5 O-O-O Nxe4 Qd8+ Kxd8 Bg5+ Kc7 Bd8#',
    result: '1-0', endsInMate: true, minLevel: 'intermediate',
    intro: 'Una Caro‑Kann que termina en 11 jugadas con un sacrificio de dama y un jaque doble.',
    moments: [
      { ply: 16, question: 'Las negras se comieron tu caballo. Tu torre está en d1… ¿Ves el mate en 3?', accept: ['Qd8+'],
        explanation: 'Dd8+!!: la dama se sacrifica para atraer al rey a la columna de tu torre.', concept: 'tactics.mate-in-2' },
      { ply: 18, question: 'El rey está en d8. ¿Cómo aprovechas la torre de d1?', accept: ['Bg5+'],
        explanation: 'Ag5+: jaque doble (alfil y torre). El rey solo puede moverse.', concept: 'tactics.discovered' },
      { ply: 20, question: 'Mate en 1.', accept: ['Bd8#'],
        explanation: 'Ad8#: el alfil vuelve a d8 y la torre sigue dando jaque: el rey no tiene casillas.', concept: 'tactics.mate-in-1' },
    ],
    lesson: 'Cuando tu torre ya está en la columna del rey rival, los jaques descubiertos y dobles aparecen solos.',
  },
];

export const historicalById = (id: string) => HISTORICAL_GAMES.find((g) => g.id === id);
