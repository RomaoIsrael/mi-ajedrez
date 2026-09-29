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
  | { kind: 'quiz'; text: string; fen?: string; highlights?: string[]; options: string[]; answer: number; explanation: string }
  /** Práctica real contra un defensor (finales): conseguir el objetivo en `maxMoves` jugadas. */
  | { kind: 'play'; text: string; fen: string; goal: 'mate'; maxMoves: number; success: string; wrong: string; stalemate: string };

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
  {
    id: 'rook', conceptId: 'fundamentals.rook', title: 'La torre', minutes: 3,
    steps: [
      { kind: 'explain', text: 'La torre se mueve en línea recta por filas y columnas, tantas casillas como quiera. No puede saltar por encima de otras piezas.', fen: '4k3/8/8/8/3R4/8/8/4K3 w - - 0 1', highlights: ['d1', 'd2', 'd3', 'd5', 'd6', 'd7', 'd8', 'a4', 'b4', 'c4', 'e4', 'f4', 'g4', 'h4'] },
      { kind: 'select', text: 'Toca todas las casillas a las que puede ir la torre de c3. Fíjate en las piezas que le cortan el paso.', fen: '4k3/8/2p5/8/8/2R2P2/8/4K3 w - - 0 1', answer: ['c4', 'c5', 'c6', 'c2', 'c1', 'b3', 'a3', 'd3', 'e3'], success: '¡Exacto! Puede capturar el peón negro de c6, pero no pasar por encima de tu peón de f3.', wrong: 'Esa casilla no está en línea recta libre desde c3.' },
      { kind: 'reach', text: 'Lleva la torre de a1 a la casilla h8. Tienes 2 movimientos.', fen: '8/8/8/4k3/8/8/8/R5K1 w - - 0 1', from: 'a1', target: 'h8', maxMoves: 2, success: '¡Perfecto! Una columna y una fila: la torre cruza el tablero en dos jugadas.', wrong: 'Sin movimientos. Primero sube por la columna a y después recorre la octava fila.' },
      { kind: 'quiz', text: '¿Puede la torre saltar por encima de otras piezas?', options: ['Sí', 'No'], answer: 1, explanation: 'Solo el caballo salta. La torre se detiene ante cualquier pieza (y puede capturarla si es rival).' },
    ],
  },
  {
    id: 'bishop', conceptId: 'fundamentals.bishop', title: 'El alfil', minutes: 3,
    steps: [
      { kind: 'explain', text: 'El alfil se mueve en diagonal, tantas casillas como quiera. Por eso siempre se queda en casillas del mismo color.', fen: '4k3/8/8/8/3B4/8/8/4K3 w - - 0 1', highlights: ['c3', 'b2', 'a1', 'e5', 'f6', 'g7', 'h8', 'c5', 'b6', 'a7', 'e3', 'f2', 'g1'] },
      { kind: 'select', text: 'Toca todas las casillas a las que puede ir el alfil de c4.', fen: '4k3/5n2/8/8/2B5/3P4/8/4K3 w - - 0 1', answer: ['b5', 'a6', 'd5', 'e6', 'f7', 'b3', 'a2'], success: '¡Muy bien! Puede capturar el caballo de f7, y tu peón de d3 le tapa una diagonal.', wrong: 'Esa casilla no está en una diagonal libre desde c4.' },
      { kind: 'quiz', text: 'Un alfil que empieza en una casilla clara, ¿puede llegar alguna vez a una casilla oscura?', options: ['Sí, dando un rodeo', 'No, nunca'], answer: 1, explanation: 'Nunca: cada diagonal tiene un solo color. Por eso cada jugador tiene un alfil de casillas claras y otro de oscuras.' },
      { kind: 'move', text: 'Captura la torre con tu alfil.', fen: '4k3/8/8/6r1/8/8/8/2B1K3 w - - 0 1', accept: ['c1g5'], success: '¡Capturada! La diagonal c1–g5 estaba libre.', wrong: 'Esa jugada no captura la torre. Sigue la diagonal desde c1.' },
    ],
  },
  {
    id: 'queen-king', conceptId: 'fundamentals.queen-king', title: 'La dama y el rey', minutes: 4,
    steps: [
      { kind: 'explain', text: 'La dama combina la torre y el alfil: se mueve en línea recta y en diagonal. Es la pieza más poderosa (vale unos 9 puntos).', fen: '4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1', arrows: [['d4', 'd8'], ['d4', 'h4'], ['d4', 'h8'], ['d4', 'a1'], ['d4', 'a4'], ['d4', 'a7'], ['d4', 'g1'], ['d4', 'd1']] },
      { kind: 'select', text: 'Toca todas las casillas a las que puede ir la dama de a1.', fen: '4k3/8/8/8/8/1P6/P7/Q3K3 w - - 0 1', answer: ['b1', 'c1', 'd1', 'b2', 'c3', 'd4', 'e5', 'f6', 'g7', 'h8'], success: '¡Exacto! Tu peón de a2 le tapa la columna y tu rey la fila.', wrong: 'Esa casilla no está en una línea libre desde a1.' },
      { kind: 'explain', text: 'El rey se mueve una sola casilla en cualquier dirección. Es la pieza más importante: nunca puede ir a una casilla atacada.', fen: '4k3/8/8/8/3K4/8/8/8 w - - 0 1', highlights: ['c3', 'c4', 'c5', 'd3', 'd5', 'e3', 'e4', 'e5'] },
      { kind: 'select', text: 'La torre negra controla la columna c. Toca las casillas a las que SÍ puede ir el rey blanco.', fen: '4k3/8/8/8/3K4/8/8/2r5 w - - 0 1', answer: ['d3', 'd5', 'e3', 'e4', 'e5'], success: '¡Bien visto! Las casillas de la columna c están atacadas: el rey no puede pisarlas.', wrong: 'Esa casilla está atacada por la torre o no es contigua al rey.' },
      { kind: 'quiz', text: '¿Cuál es el valor aproximado de las piezas?', options: ['Peón 1 · Caballo 3 · Alfil 3 · Torre 5 · Dama 9', 'Peón 1 · Caballo 5 · Alfil 3 · Torre 3 · Dama 10', 'Todas valen lo mismo'], answer: 0, explanation: 'Es una guía para decidir cambios. El rey no tiene valor en puntos: si te dan jaque mate, pierdes la partida.' },
    ],
  },
  {
    id: 'pawn', conceptId: 'fundamentals.pawn', title: 'El peón', minutes: 3,
    steps: [
      { kind: 'explain', text: 'El peón avanza una casilla hacia delante. En su primera jugada puede avanzar dos. Nunca retrocede.', fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', highlights: ['e3', 'e4'] },
      { kind: 'explain', text: 'Ojo: el peón avanza de frente, pero CAPTURA en diagonal hacia delante.', fen: '4k3/8/8/3n1b2/4P3/8/8/4K3 w - - 0 1', arrows: [['e4', 'd5'], ['e4', 'f5']] },
      { kind: 'select', text: 'Toca todas las casillas a las que puede ir el peón de d4.', fen: '4k3/8/8/2npb3/3P4/8/8/4K3 w - - 0 1', answer: ['c5', 'e5'], success: '¡Exacto! De frente está bloqueado, pero puede capturar en diagonal.', wrong: 'Recuerda: el peón no puede capturar de frente.' },
      { kind: 'move', text: 'Captura el caballo con tu peón.', fen: '4k3/8/8/3n4/4P3/8/8/4K3 w - - 0 1', accept: ['e4d5'], success: '¡Capturado! Un peón (1 punto) por un caballo (3 puntos).', wrong: 'El peón captura en diagonal hacia delante.' },
      { kind: 'quiz', text: '¿Puede un peón moverse hacia atrás?', options: ['Sí', 'No'], answer: 1, explanation: 'Nunca. Por eso cada avance de peón es una decisión importante.' },
    ],
  },
  {
    id: 'special', conceptId: 'fundamentals.special', title: 'Reglas especiales', minutes: 6,
    steps: [
      { kind: 'explain', text: 'Enroque: el rey se mueve dos casillas hacia una torre y la torre salta a su lado. Pone al rey a salvo y activa la torre.', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', arrows: [['e1', 'g1'], ['h1', 'f1']] },
      { kind: 'explain', text: 'Solo se puede enrocar si ni el rey ni esa torre se han movido, no hay piezas entre ellos, el rey no está en jaque y no pasa por casillas atacadas.', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', highlights: ['f1', 'g1'] },
      { kind: 'move', text: 'Enroca corto: toca tu rey y llévalo a g1.', fen: 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', accept: ['e1g1'], success: '¡Enrocado! Tu rey está protegido y tu torre ya juega.', wrong: 'Para enrocar, mueve el rey dos casillas hacia la torre (a g1).' },
      { kind: 'quiz', text: '¿Se puede enrocar para salir de un jaque?', options: ['Sí', 'No'], answer: 1, explanation: 'No. Estando en jaque primero hay que resolverlo; el enroque tendrá que esperar.' },
      { kind: 'move', text: 'Promoción: cuando un peón llega a la última fila se convierte en otra pieza (casi siempre en dama). ¡Corona tu peón!', fen: '8/4P3/8/8/8/2k5/8/4K3 w - - 0 1', accept: ['e7e8q', 'e7e8r', 'e7e8b', 'e7e8n'], success: '¡Coronado! Un peón que llega al final puede decidir la partida.', wrong: 'Avanza el peón hasta la octava fila.' },
      { kind: 'move', text: 'Captura al paso: las negras acaban de jugar d7–d5, pasando junto a tu peón. Solo en esta jugada puedes capturarlo como si hubiera avanzado una casilla. ¡Hazlo!', fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2', accept: ['e5d6'], success: '¡Así se captura al paso! Tu peón va a d6 y el peón negro desaparece.', wrong: 'Mueve tu peón en diagonal a d6, detrás del peón negro.' },
      { kind: 'quiz', text: '¿Cuál de estas situaciones NO es tablas?', options: ['Ahogado: sin jaque y sin jugadas legales', 'La misma posición tres veces', '50 jugadas de cada bando sin capturas ni movimientos de peón', 'Tener más piezas que el rival'], answer: 3, explanation: 'Tener más material no termina la partida: hay que dar jaque mate. Las otras tres son tablas.' },
    ],
  },
  {
    id: 'threats', conceptId: 'vision.threats', title: '¿Qué amenaza mi rival?', minutes: 4,
    steps: [
      { kind: 'explain', text: 'Cada jugada de tu rival tiene una intención. Antes de pensar en tu plan, pregúntate siempre: ¿qué amenaza?', fen: '4k3/8/8/8/3p4/2N5/8/4K3 w - - 0 1', arrows: [['d5', 'd4'], ['d4', 'c3']], highlights: ['c3'] },
      { kind: 'explain', text: 'Aquí el peón negro avanzó a d4 y ahora ataca a tu caballo. Si no reaccionas, lo pierdes.', fen: '4k3/8/8/8/3p4/2N5/8/4K3 w - - 0 1', arrows: [['d4', 'c3']] },
      { kind: 'select', text: 'Tu rival acaba de mover el caballo a e5. Toca la pieza tuya que está amenazada.', fen: '4k3/8/8/4n3/6B1/8/8/4K3 w - - 0 1', answer: ['g4'], success: '¡Exacto! El caballo de e5 ataca a tu alfil, que no tiene defensa.', wrong: 'Esa pieza no está en peligro. Mira qué casillas ataca el caballo de e5.' },
      { kind: 'move', text: 'Pon a salvo tu alfil en una casilla donde el caballo no pueda capturarlo.', fen: '4k3/8/8/4n3/6B1/8/8/4K3 w - - 0 1', accept: ['g4f5', 'g4e6', 'g4c8', 'g4h5', 'g4h3', 'g4e2', 'g4d1'], success: '¡Salvado! Detectar la amenaza fue la mitad del trabajo.', wrong: 'Tu alfil sigue en peligro (o lo llevaste a una casilla atacada). Revisa las casillas del caballo: d3, f3, c4, c6, d7, f7, g4 y g6.' },
      { kind: 'quiz', text: '¿Cuál es la primera pregunta de tu rutina antes de mover?', options: ['¿Cuál es mi mejor jugada?', '¿Qué hizo mi rival y qué amenaza?', '¿Cuántas piezas me quedan?'], answer: 1, explanation: 'Primero la seguridad: qué cambió y qué amenaza. Después, tu plan.' },
    ],
  },
  {
    id: 'fork', conceptId: 'tactics.fork', title: 'La horquilla', minutes: 4,
    steps: [
      { kind: 'explain', text: 'Una horquilla es un ataque a dos piezas a la vez. El rival solo puede salvar una.', fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', arrows: [['b5', 'c7']] },
      { kind: 'explain', text: 'Desde c7 el caballo da jaque al rey y ataca la torre. El rey debe moverse… y la torre cae.', fen: 'r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1', arrows: [['c7', 'e8'], ['c7', 'a8']] },
      { kind: 'move', text: 'Encuentra la horquilla de caballo que gana la torre.', fen: '2r3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1', accept: ['d5e7'], success: '¡Horquilla! Ce7+ da jaque y ataca la torre de c8.', wrong: 'Busca una casilla desde la que el caballo ataque a la vez al rey y a la torre.' },
      { kind: 'move', text: 'Los peones también hacen horquillas. Ataca los dos caballos a la vez.', fen: 'k7/8/1n1n4/8/2P5/8/8/7K w - - 0 1', accept: ['c4c5'], success: '¡Muy bien! Desde c5 el peón ataca b6 y d6.', wrong: 'Avanza un peón hasta una casilla que ataque a los dos caballos.' },
      { kind: 'quiz', text: '¿Qué hace tan peligrosa a una horquilla con jaque?', options: ['Que es más bonita', 'Que el rival está obligado a resolver el jaque y no puede salvar la otra pieza', 'Que termina la partida'], answer: 1, explanation: 'El jaque obliga: el rival no tiene tiempo de salvar lo demás.' },
    ],
  },
  {
    id: 'pin', conceptId: 'tactics.pin', title: 'La clavada', minutes: 4,
    steps: [
      { kind: 'explain', text: 'Una pieza está clavada cuando no puede moverse sin dejar expuesta una pieza más valiosa detrás. Si detrás está el rey, la clavada es absoluta: moverse sería ilegal.', fen: '4k3/8/8/1b6/8/3N4/8/5K2 w - - 0 1', arrows: [['b5', 'f1']], highlights: ['d3'] },
      { kind: 'select', text: '¿Qué pieza negra no puede moverse porque está clavada? Tócala.', fen: '4k2r/8/2b1n3/8/8/8/8/4RK2 w - - 0 1', answer: ['e6'], success: '¡Exacto! El caballo de e6 está clavado por la torre de e1 contra su rey.', wrong: 'Esa pieza puede moverse libremente. Busca la que está entre una pieza blanca y el rey negro.' },
      { kind: 'move', text: 'Clava la dama negra contra su rey y gánala.', fen: '4k3/8/8/4q3/8/8/5K2/R7 w - - 0 1', accept: ['a1e1'], success: '¡Clavada! La dama no puede escapar de la columna e: solo le queda capturar tu torre, y tu rey recaptura.', wrong: 'Busca una línea en la que la dama y el rey negros estén alineados.' },
      { kind: 'quiz', text: 'En una clavada absoluta, ¿qué pieza está detrás de la clavada?', options: ['La dama', 'El rey', 'Cualquier torre'], answer: 1, explanation: 'Si detrás está el rey, mover la pieza clavada es ilegal. Si es otra pieza, la clavada es relativa: moverse es legal, pero costoso.' },
    ],
  },
  {
    id: 'skewer', conceptId: 'tactics.skewer', title: 'La ensartada', minutes: 3,
    steps: [
      { kind: 'explain', text: 'La ensartada es una clavada al revés: atacas a la pieza valiosa que está delante; cuando se aparta, capturas la que está detrás.', fen: '8/8/8/3k3q/8/8/8/R5K1 w - - 0 1', arrows: [['a1', 'a5'], ['a5', 'h5']] },
      { kind: 'move', text: 'Da jaque con la torre de forma que, cuando el rey se aparte, ganes la dama.', fen: '8/8/8/3k3q/8/8/8/R5K1 w - - 0 1', accept: ['a1a5'], success: '¡Ensartada! El rey debe salir de la quinta fila y la torre captura la dama.', wrong: 'Busca un jaque en la misma línea en la que están el rey y la dama.' },
      { kind: 'move', text: 'Ahora con el alfil: gana la dama con una ensartada.', fen: '6q1/8/8/3k4/8/8/8/3BK3 w - - 0 1', accept: ['d1b3'], success: '¡Así es! Ab3+ y la dama de g8 cae cuando el rey se aparte de la diagonal.', wrong: 'Busca la diagonal en la que están el rey y la dama negros.' },
      { kind: 'quiz', text: '¿En qué se diferencia la ensartada de la clavada?', options: ['En la ensartada la pieza más valiosa está delante', 'No hay diferencia', 'La ensartada solo la hace el caballo'], answer: 0, explanation: 'Clavada: la valiosa está detrás y la de delante no puede moverse. Ensartada: la valiosa está delante y, al apartarse, deja la otra expuesta.' },
    ],
  },
  {
    id: 'discovered', conceptId: 'tactics.discovered', title: 'Ataque descubierto', minutes: 4,
    steps: [
      { kind: 'explain', text: 'Ataque descubierto: una pieza se aparta y deja atacar a otra que estaba detrás. Si además la pieza que se mueve ataca algo, son dos amenazas a la vez.', fen: '4k3/7q/8/8/4B3/8/8/4RK2 w - - 0 1', arrows: [['e1', 'e8'], ['e4', 'h7']] },
      { kind: 'move', text: 'Mueve el alfil para descubrir el jaque de tu torre… y captura algo valioso a la vez.', fen: '4k3/7q/8/8/4B3/8/8/4RK2 w - - 0 1', accept: ['e4h7', 'e4g6'], success: '¡Jaque descubierto! La torre da jaque y la dama de h7 no puede salvarse.', wrong: 'El alfil debe apartarse de la columna e para que la torre dé jaque. ¿Qué puede capturar al apartarse?' },
      { kind: 'move', text: 'Ahora el caballo: da jaque y descubre el ataque de tu torre sobre la dama.', fen: '3q4/6k1/8/8/3N4/8/8/3R2K1 w - - 0 1', accept: ['d4f5', 'd4e6'], success: '¡Perfecto! El caballo da jaque y la torre ataca la dama de d8: las negras la pierden.', wrong: 'El caballo debe dar jaque al rey y, al moverse, despejar la columna d.' },
      { kind: 'quiz', text: '¿Por qué es tan fuerte un jaque descubierto?', options: ['Porque el rival debe atender el jaque y no puede salvar la otra pieza atacada', 'Porque siempre es mate', 'Porque mueve dos piezas a la vez'], answer: 0, explanation: 'Son dos amenazas en una jugada y una de ellas es un jaque: el rival no tiene tiempo para las dos.' },
    ],
  },
  {
    id: 'development', conceptId: 'openings.development', title: 'Desarrollo de piezas', minutes: 4,
    steps: [
      { kind: 'explain', text: 'En la apertura, saca tus caballos y alfiles hacia el centro, una vez cada uno, antes de atacar. Cada jugada cuenta.', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', arrows: [['g1', 'f3'], ['b1', 'c3'], ['f1', 'c4'], ['c1', 'f4']] },
      { kind: 'move', text: 'Tras 1.e4 e5, desarrolla una pieza menor (caballo o alfil) hacia una buena casilla.', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', accept: ['g1f3', 'b1c3', 'f1c4', 'f1b5'], success: '¡Buena jugada de desarrollo! La pieza sale, controla el centro y prepara el enroque.', wrong: 'Esa jugada no desarrolla un caballo o un alfil hacia el centro. Prueba Cf3, Cc3 o Ac4.' },
      { kind: 'quiz', text: '¿Qué problema tiene sacar la dama muy pronto?', options: ['Ninguno, es la pieza más fuerte', 'El rival la ataca con sus piezas menores y gana tiempo mientras se desarrolla', 'Es ilegal'], answer: 1, explanation: 'Cada vez que tu dama tiene que huir, tu rival saca otra pieza gratis.' },
      { kind: 'quiz', text: '¿Conviene mover la misma pieza varias veces en la apertura?', options: ['Sí, así llega más lejos', 'No, salvo que haya un buen motivo (capturar o evitar una pérdida)'], answer: 1, explanation: 'Mientras tú mueves la misma pieza, tu rival saca todas las suyas.' },
    ],
  },
  {
    id: 'castling', conceptId: 'openings.castling', title: 'Seguridad del rey', minutes: 3,
    steps: [
      { kind: 'explain', text: 'Un rey en el centro es un blanco fácil cuando se abren las columnas. Enroca pronto, normalmente antes de la jugada 10.', fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', highlights: ['g1'], arrows: [['e1', 'g1']] },
      { kind: 'move', text: 'Tus piezas del flanco de rey ya están fuera. Pon tu rey a salvo.', fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', accept: ['e1g1'], success: '¡Rey a salvo! Además tu torre se acerca al centro.', wrong: 'Enroca: lleva tu rey dos casillas hacia la torre de h1.' },
      { kind: 'quiz', text: 'Después de enrocar corto, ¿qué peones conviene no mover sin motivo?', options: ['Los de las columnas f, g y h', 'Los de las columnas a, b y c', 'Los de las columnas d y e'], answer: 0, explanation: 'Son el escudo de tu rey. Cada avance crea casillas débiles cerca de él.' },
    ],
  },
  {
    id: 'activity', conceptId: 'strategy.piece-activity', title: 'Actividad de las piezas', minutes: 4,
    steps: [
      { kind: 'explain', text: 'Una pieza activa controla muchas casillas. Compara: el caballo del centro controla 8 casillas; el de la esquina, solo 2.', fen: '4k3/8/8/4N3/8/8/8/N3K3 w - - 0 1', highlights: ['d3', 'f3', 'c4', 'g4', 'c6', 'g6', 'd7', 'f7', 'b3', 'c2'] },
      { kind: 'quiz', text: '¿Cuál es la peor pieza blanca de esta posición?', fen: '4k3/8/8/8/3N4/8/1P1P4/2B1K2R w K - 0 1', highlights: ['c1', 'd4', 'h1'], options: ['El caballo de d4', 'El alfil de c1', 'La torre de h1'], answer: 1, explanation: 'El alfil de c1 no tiene ninguna casilla: sus propios peones de b2 y d2 lo encierran.' },
      { kind: 'move', text: 'Mejora tu peor pieza: mueve un peón para abrirle camino al alfil.', fen: '4k3/8/8/8/3N4/8/1P1P4/2B1K2R w K - 0 1', accept: ['d2d3', 'b2b3', 'b2b4'], success: '¡Eso es! Tu alfil ya respira. «Mejora tu peor pieza» es uno de los planes más útiles.', wrong: 'Esa jugada no abre ninguna diagonal al alfil de c1.' },
      { kind: 'quiz', text: '«Caballo en el borde, caballo que se pierde». ¿Por qué?', options: ['Porque desde el borde controla menos casillas', 'Porque es ilegal', 'Porque se lo come el rey'], answer: 0, explanation: 'Desde el borde alcanza la mitad de casillas (o menos) que desde el centro.' },
    ],
  },
  {
    id: 'pawn-structure', conceptId: 'strategy.pawn-structure', title: 'Estructura de peones', minutes: 5,
    steps: [
      { kind: 'explain', text: 'Los peones son el esqueleto de la posición. Tres tipos que debes reconocer: doblados, aislados y pasados.', fen: '4k3/pp3ppp/8/8/8/8/PP3PPP/4K3 w - - 0 1' },
      { kind: 'select', text: 'Peones doblados: dos peones del mismo color en la misma columna. Toca los peones blancos doblados.', fen: '4k3/pp3ppp/8/8/8/2P5/P1P2PPP/4K3 w - - 0 1', answer: ['c2', 'c3'], success: '¡Exacto! Se estorban entre sí y no pueden protegerse.', wrong: 'Busca dos peones blancos en la misma columna.' },
      { kind: 'select', text: 'Peón aislado: no tiene peones de su color en las columnas vecinas. Toca el peón blanco aislado.', fen: '4k3/pp3ppp/8/8/3P4/8/PP3PPP/4K3 w - - 0 1', answer: ['d4'], success: '¡Muy bien! Ningún peón puede defenderlo: necesita a las piezas.', wrong: 'Mira las columnas vecinas de cada peón: ¿cuál no tiene compañeros al lado?' },
      { kind: 'select', text: 'Peón pasado: ningún peón rival puede frenarlo en su columna ni en las vecinas. Toca el peón blanco pasado.', fen: '4k3/5ppp/8/1P6/8/8/5PPP/4K3 w - - 0 1', answer: ['b5'], success: '¡Perfecto! Nada, salvo las piezas, le impide llegar a coronar.', wrong: 'Ese peón tiene un peón negro delante o en una columna vecina.' },
      { kind: 'quiz', text: '¿Por qué un peón pasado es tan valioso en los finales?', options: ['Porque vale más puntos', 'Porque amenaza coronar y obliga al rival a vigilarlo con sus piezas', 'Porque no se puede capturar'], answer: 1, explanation: 'Un peón pasado ata a las piezas rivales: mientras lo vigilan, no pueden hacer otra cosa.' },
    ],
  },
  {
    id: 'kq-vs-k', conceptId: 'endgame.kq-vs-k', title: 'Rey y dama contra rey', minutes: 8,
    steps: [
      { kind: 'explain', text: 'Método: 1) usa la dama para encerrar al rey rival en una «caja» cada vez más pequeña (un salto de caballo de distancia funciona muy bien); 2) acerca tu rey; 3) da mate en el borde.', fen: '8/8/8/3k4/8/8/8/2Q1K3 w - - 0 1', arrows: [['c1', 'c8']] },
      { kind: 'explain', text: 'Cuidado con el ahogado: si dejas al rey rival sin jugadas pero sin darle jaque, la partida es tablas. Antes de cada jugada de dama, comprueba que el rey rival tenga alguna casilla libre.', fen: 'k7/8/1Q6/8/8/8/8/4K3 b - - 0 1', highlights: ['a8'] },
      { kind: 'quiz', text: 'Juegan negras. El rey negro no está en jaque y no tiene jugadas. ¿Qué ha pasado?', fen: 'k7/8/1Q6/8/8/8/8/4K3 b - - 0 1', options: ['Jaque mate: ganan las blancas', 'Ahogado: tablas'], answer: 1, explanation: 'Ahogado. Con Db6 la dama encerró demasiado pronto al rey sin darle jaque. Había que acercar primero el rey blanco.' },
      { kind: 'play', text: 'Tu turno: da jaque mate contra un rey que se defiende.', fen: '8/8/8/3k4/8/8/8/2Q1K3 w - - 0 1', goal: 'mate', maxMoves: 25, success: '¡Jaque mate! Ya dominas el primer mate técnico.', wrong: 'Se acabaron las jugadas. Recuerda: caja con la dama, acerca el rey, mate en el borde.', stalemate: '¡Ahogado! El rey negro no tenía jugadas pero tampoco estaba en jaque: tablas. Deja siempre una casilla libre hasta que puedas dar mate.' },
    ],
  },
  {
    id: 'opposition', conceptId: 'endgame.opposition', title: 'La oposición y el cuadrado', minutes: 5,
    steps: [
      { kind: 'explain', text: 'Oposición: los reyes están enfrentados en la misma columna con una casilla entre ellos. Quien NO tiene que mover «tiene la oposición»: el otro rey debe ceder paso.', fen: '8/8/3k4/8/3K4/8/3P4/8 b - - 0 1', highlights: ['d5'] },
      { kind: 'move', text: 'Toma la oposición: coloca tu rey frente al rey negro, con una casilla entre ambos, y que les toque mover a las negras.', fen: '8/8/3k4/8/8/3K4/3P4/8 w - - 0 1', accept: ['d3d4'], success: '¡Oposición! Ahora el rey negro tiene que apartarse y tu rey avanza.', wrong: 'Busca la casilla de la misma columna que deje exactamente una casilla entre los dos reyes.' },
      { kind: 'explain', text: 'Regla del cuadrado: dibuja un cuadrado desde el peón hasta su casilla de coronación. Si el rey rival puede entrar en él (teniendo en cuenta a quién le toca), alcanza al peón.', fen: '8/8/8/7k/P7/8/8/K7 b - - 0 1', highlights: ['a4', 'b4', 'c4', 'd4', 'e4', 'a8', 'e8', 'e5', 'e6', 'e7', 'b8', 'c8', 'd8', 'a5', 'a6', 'a7'] },
      { kind: 'quiz', text: 'Juegan negras. ¿Puede el rey de h5 alcanzar al peón de a4 antes de que corone?', fen: '8/8/8/7k/P7/8/8/K7 b - - 0 1', options: ['Sí', 'No, el peón corona'], answer: 1, explanation: 'El peón necesita 4 jugadas; el rey necesita al menos 7 para llegar a a8. Está fuera del cuadrado.' },
    ],
  },
];

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
