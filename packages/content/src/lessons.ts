/**
 * Lecciones EMPCRAE del prototipo (Explicar → Mostrar → Practicar → Corregir → …).
 * Texto y posiciones originales. Casillas en notación algebraica; jugadas en UCI.
 */

export type LessonStep =
  | { kind: 'explain'; text: string; fen?: string; highlights?: string[]; arrows?: [string, string][] }
  | { kind: 'select'; text: string; fen?: string; answer: string[]; success: string; wrong: string }
  | { kind: 'move'; text: string; fen: string; accept: string[]; success: string; wrong: string }
  | {
      kind: 'reach'; text: string; fen: string; from: string; target: string; maxMoves: number;
      success: string; wrong: string;
    }
  | { kind: 'quiz'; text: string; fen?: string; highlights?: string[]; options: string[]; answer: number; explanation: string };

export interface Lesson {
  id: string;
  conceptId: string;
  title: string;
  minutes: number;
  steps: LessonStep[];
}

const EMPTY = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';

export const LESSONS: Lesson[] = [
  {
    id: 'board', conceptId: 'fundamentals.board', title: 'El tablero', minutes: 3,
    steps: [
      { kind: 'explain', text: 'El tablero tiene 64 casillas. Las columnas se nombran con letras (a–h) y las filas con números (1–8). Cada casilla tiene un nombre único: su letra y su número.', fen: EMPTY, highlights: ['e4'] },
      { kind: 'explain', text: 'Esta casilla es e4: columna «e», fila «4». Ahora te toca a ti.', fen: EMPTY, highlights: ['e4'], arrows: [['e1', 'e4'], ['a4', 'e4']] },
      { kind: 'select', text: 'Toca la casilla d5.', fen: EMPTY, answer: ['d5'], success: '¡Exacto! Columna d, fila 5.', wrong: 'Casi. Busca primero la columna d y sube hasta la fila 5.' },
      { kind: 'select', text: 'Toca la casilla b7.', fen: EMPTY, answer: ['b7'], success: '¡Muy bien!', wrong: 'La columna b es la segunda desde la izquierda (con blancas abajo).' },
      { kind: 'quiz', text: '¿De qué color es la casilla f5?', fen: EMPTY, highlights: ['f5'], options: ['Clara', 'Oscura'], answer: 0, explanation: 'f5 es clara. Truco: a1 siempre es oscura y los colores se alternan.' },
      { kind: 'explain', text: 'Las diagonales son líneas de casillas del mismo color que cruzan el tablero en inclinado. Serán las autopistas de los alfiles.', fen: EMPTY, arrows: [['a1', 'h8'], ['h1', 'a8']] },
    ],
  },
  {
    id: 'knight', conceptId: 'fundamentals.knight', title: 'El caballo', minutes: 4,
    steps: [
      { kind: 'explain', text: 'El caballo salta en forma de L: dos casillas en una dirección y una hacia el lado. Es la única pieza que puede saltar por encima de otras.', fen: '4k3/8/8/8/3N4/8/8/4K3 w - - 0 1', highlights: ['b3', 'b5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5'] },
      { kind: 'explain', text: 'Fíjate: cada salto cambia el color de la casilla. Si el caballo está en una casilla clara, su siguiente casilla será oscura.', fen: '4k3/8/8/8/3N4/8/8/4K3 w - - 0 1', arrows: [['d4', 'f5'], ['d4', 'b3']] },
      { kind: 'select', text: 'Toca todas las casillas a las que puede saltar el caballo de e4.', fen: '4k3/8/8/8/4N3/8/8/4K3 w - - 0 1', answer: ['c3', 'c5', 'd2', 'd6', 'f2', 'f6', 'g3', 'g5'], success: '¡Perfecto! Desde el centro el caballo controla 8 casillas.', wrong: 'Esa casilla no está en L. Recuerda: dos en una dirección, una al lado.' },
      { kind: 'reach', text: 'Lleva el caballo de g1 a la casilla f5. Tienes 3 saltos.', fen: 'k7/8/8/8/8/8/8/K5N1 w - - 0 1', from: 'g1', target: 'f5', maxMoves: 3, success: '¡Llegaste! Planificar rutas del caballo es una habilidad muy útil.', wrong: 'Te quedaste sin saltos. Piensa hacia atrás: ¿desde qué casillas se llega a f5?' },
      { kind: 'move', text: 'Captura el peón con tu caballo.', fen: '4k3/8/8/2p5/8/1N6/8/4K3 w - - 0 1', accept: ['b3c5'], success: '¡Capturado! El caballo captura igual que se mueve.', wrong: 'Esa jugada no captura el peón. Busca la L que termina en c5.' },
    ],
  },
  {
    id: 'undefended', conceptId: 'vision.undefended-pieces', title: 'Piezas indefensas', minutes: 5,
    steps: [
      { kind: 'explain', text: 'Una pieza está DEFENDIDA si, cuando la capturan, puedes recapturar. Está INDEFENSA si nadie la protege. Las piezas indefensas son el error más común de quien empieza.', fen: '4k3/8/2p5/3n4/8/8/2B5/4K3 w - - 0 1', highlights: ['d5', 'c6'], arrows: [['c6', 'd5']] },
      { kind: 'explain', text: 'Aquí el caballo de d5 está defendido por el peón de c6: si el alfil lo captura, el peón recaptura y pierdes tu alfil.', fen: '4k3/8/2p5/3n4/8/8/2B5/4K3 w - - 0 1', arrows: [['c2', 'd5']] },
      { kind: 'select', text: 'Toca las piezas negras que están indefensas (nadie las protege).', fen: '4k3/1p6/8/3n2b1/8/8/8/4K3 w - - 0 1', answer: ['d5', 'g5', 'b7'], success: '¡Bien visto! Las tres están sin defensa.', wrong: 'Esa pieza sí está defendida, o no es negra. Pregúntate: si la capturo, ¿puede alguien recapturar?' },
      { kind: 'move', text: 'Una de las piezas negras está indefensa y la otra no. Captura la que puedes ganar gratis.', fen: '4k3/8/4p3/3n4/8/5b2/8/3RK1N1 w - - 0 1', accept: ['g1f3'], success: '¡Exacto! El alfil de f3 estaba solo. El caballo de d5 estaba defendido por el peón de e6.', wrong: 'Cuidado: esa pieza está defendida y perderías material al recapturar. Busca la que nadie protege.' },
      { kind: 'quiz', text: 'Antes de mover, ¿qué pregunta te ayuda a no dejar piezas colgadas?', options: ['¿Qué pieza es la más bonita?', '¿Tengo alguna pieza indefensa después de mi jugada?', '¿Cuántas jugadas llevamos?'], answer: 1, explanation: 'Es la pregunta 6 de tu rutina mental. La usarás en cada partida.' },
    ],
  },
  {
    id: 'checkmate', conceptId: 'fundamentals.checkmate', title: 'Jaque y jaque mate', minutes: 4,
    steps: [
      { kind: 'explain', text: 'Jaque: el rey está atacado. Es obligatorio salir del jaque: mover el rey, tapar el ataque o capturar la pieza que ataca.', fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', arrows: [['a1', 'a8']] },
      { kind: 'explain', text: 'Jaque mate: el rey está en jaque y NO hay ninguna forma de salir. Ese es el objetivo del ajedrez.', fen: '3R2k1/5ppp/8/8/8/8/8/6K1 b - - 0 1', highlights: ['g8'], arrows: [['d8', 'g8']] },
      { kind: 'quiz', text: 'Juegan negras. El rey negro no está en jaque pero no tiene ninguna jugada legal. ¿Qué es?', fen: 'k7/2Q5/1K6/8/8/8/8/8 b - - 0 1', options: ['Jaque mate', 'Ahogado (tablas)', 'Jaque'], answer: 1, explanation: 'Es ahogado: sin jaque y sin jugadas legales. ¡La partida termina en tablas! Cuidado con esto cuando vas ganando.' },
      { kind: 'move', text: 'Da jaque mate en una jugada.', fen: '6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1', accept: ['d1d8'], success: '¡Jaque mate! Los peones del rey le quitan sus propias casillas de escape: es el mate del pasillo.', wrong: 'Esa jugada no es mate. Busca un jaque del que el rey no pueda escapar.' },
    ],
  },
  {
    id: 'center', conceptId: 'openings.center', title: 'Control del centro', minutes: 4,
    steps: [
      { kind: 'explain', text: 'Las 4 casillas centrales (d4, e4, d5, e5) son las más valiosas: desde ahí tus piezas llegan a todas partes del tablero.', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', highlights: ['d4', 'e4', 'd5', 'e5'] },
      { kind: 'explain', text: 'Compara: un caballo en el centro controla 8 casillas; en una esquina, solo 2. «Caballo en el borde, caballo que se pierde».', fen: '4k3/8/8/8/3N4/8/8/N3K3 w - - 0 1', highlights: ['b3', 'b5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5', 'b3', 'c2'] },
      { kind: 'move', text: 'Primera jugada de la partida: mueve un peón que ocupe el centro.', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', accept: ['e2e4', 'd2d4'], success: '¡Muy bien! Ocupas el centro y abres camino a tu dama y un alfil.', wrong: 'Esa jugada no ocupa el centro. Busca los peones de las columnas d y e.' },
      { kind: 'quiz', text: '¿Por qué es mala idea empezar con a4 o h4?', options: ['Porque son jugadas ilegales', 'Porque no ayudan a controlar el centro ni a desarrollar piezas', 'Porque el peón se pierde'], answer: 1, explanation: 'Son legales, pero no pelean por el centro. En la apertura cada jugada cuenta.' },
    ],
  },
];

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
