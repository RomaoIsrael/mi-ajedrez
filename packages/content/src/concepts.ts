/** Mapa de aprendizaje: secciones y nodos (grafo de prerrequisitos). Contenido original. */

export interface ConceptNode {
  id: string;
  title: string;
  summary: string;
  prerequisites: string[];
  lessonId?: string;
}

export interface Section {
  id: string;
  title: string;
  icon: string;
  nodes: ConceptNode[];
}

export const SECTIONS: Section[] = [
  {
    id: 'fundamentals', title: 'Fundamentos', icon: '♙',
    nodes: [
      { id: 'fundamentals.board', title: 'El tablero', summary: 'Filas, columnas, diagonales y coordenadas.', prerequisites: [], lessonId: 'board' },
      { id: 'fundamentals.rook', title: 'La torre', summary: 'Filas y columnas.', prerequisites: ['fundamentals.board'], lessonId: 'rook' },
      { id: 'fundamentals.bishop', title: 'El alfil', summary: 'Diagonales de un solo color.', prerequisites: ['fundamentals.board'], lessonId: 'bishop' },
      { id: 'fundamentals.queen-king', title: 'La dama y el rey', summary: 'La pieza más poderosa y la más importante.', prerequisites: ['fundamentals.rook', 'fundamentals.bishop'], lessonId: 'queen-king' },
      { id: 'fundamentals.knight', title: 'El caballo', summary: 'El salto en L, la pieza más original.', prerequisites: ['fundamentals.board'], lessonId: 'knight' },
      { id: 'fundamentals.pawn', title: 'El peón', summary: 'Pequeño, pero con gran potencial.', prerequisites: ['fundamentals.board'], lessonId: 'pawn' },
      { id: 'fundamentals.checkmate', title: 'Jaque y jaque mate', summary: 'El objetivo del juego.', prerequisites: ['fundamentals.queen-king', 'fundamentals.knight'], lessonId: 'checkmate' },
      { id: 'fundamentals.special', title: 'Reglas especiales', summary: 'Enroque, promoción y captura al paso.', prerequisites: ['fundamentals.checkmate', 'fundamentals.pawn'], lessonId: 'special' },
    ],
  },
  {
    id: 'vision', title: 'Visión', icon: '👁',
    nodes: [
      { id: 'vision.undefended-pieces', title: 'Piezas indefensas', summary: 'Quién ataca y quién defiende.', prerequisites: ['fundamentals.knight'], lessonId: 'undefended' },
      { id: 'vision.threats', title: '¿Qué amenaza mi rival?', summary: 'La primera pregunta antes de mover.', prerequisites: ['vision.undefended-pieces'], lessonId: 'threats' },
    ],
  },
  {
    id: 'tactics', title: 'Táctica', icon: '⚡',
    nodes: [
      { id: 'tactics.mate-in-1', title: 'Mate en 1', summary: 'Encuentra el golpe final.', prerequisites: ['fundamentals.checkmate'] },
      { id: 'tactics.fork', title: 'Horquilla', summary: 'Un ataque, dos objetivos.', prerequisites: ['vision.undefended-pieces'], lessonId: 'fork' },
      { id: 'tactics.pin', title: 'Clavada', summary: 'Una pieza que no puede moverse.', prerequisites: ['tactics.fork'], lessonId: 'pin' },
      { id: 'tactics.skewer', title: 'Ensartada y rayos X', summary: 'Atacar a través de una pieza.', prerequisites: ['tactics.pin'], lessonId: 'skewer' },
      { id: 'tactics.discovered', title: 'Ataque descubierto', summary: 'Una pieza se aparta y otra ataca.', prerequisites: ['tactics.pin'], lessonId: 'discovered' },
      { id: 'tactics.double-attack', title: 'Ataque doble', summary: 'Dos amenazas a la vez.', prerequisites: ['tactics.fork'] },
      { id: 'tactics.mate-in-2', title: 'Mate en 2', summary: 'Prepara el golpe con una jugada forzante.', prerequisites: ['tactics.mate-in-1', 'tactics.discovered'] },
    ],
  },
  {
    id: 'openings', title: 'Aperturas', icon: '📖',
    nodes: [
      { id: 'openings.center', title: 'Control del centro', summary: 'Las casillas más valiosas.', prerequisites: ['fundamentals.special'], lessonId: 'center' },
      { id: 'openings.development', title: 'Desarrollo', summary: 'Saca tus piezas antes de atacar.', prerequisites: ['openings.center'], lessonId: 'development' },
      { id: 'openings.castling', title: 'Seguridad del rey', summary: 'Enroca pronto.', prerequisites: ['openings.development'], lessonId: 'castling' },
    ],
  },
  {
    id: 'strategy', title: 'Estrategia', icon: '♜',
    nodes: [
      { id: 'strategy.piece-activity', title: 'Actividad de piezas', summary: 'Mejora tu peor pieza.', prerequisites: ['openings.development'], lessonId: 'activity' },
      { id: 'strategy.pawn-structure', title: 'Estructura de peones', summary: 'Doblados, aislados y pasados.', prerequisites: ['strategy.piece-activity'], lessonId: 'pawn-structure' },
    ],
  },
  {
    id: 'endgames', title: 'Finales', icon: '♔',
    nodes: [
      { id: 'endgame.kq-vs-k', title: 'Rey y dama contra rey', summary: 'El primer mate técnico.', prerequisites: ['fundamentals.checkmate'], lessonId: 'kq-vs-k' },
      { id: 'endgame.opposition', title: 'La oposición y el cuadrado', summary: 'La batalla de los reyes.', prerequisites: ['endgame.kq-vs-k', 'fundamentals.special'], lessonId: 'opposition' },
    ],
  },
  { id: 'calculation', title: 'Cálculo', icon: '🧠', nodes: [{ id: 'calculation.candidates', title: 'Jugadas candidatas', summary: 'Compara antes de decidir.', prerequisites: ['tactics.double-attack'] }] },
  { id: 'planning', title: 'Planificación', icon: '🗺', nodes: [{ id: 'planning.imbalances', title: 'Desequilibrios', summary: 'Tu plan nace de la posición.', prerequisites: ['strategy.pawn-structure'] }] },
  { id: 'mastery', title: 'Maestría', icon: '♛', nodes: [{ id: 'mastery.own-games', title: 'Analiza tus partidas', summary: 'Tu propio entrenador.', prerequisites: ['planning.imbalances'] }] },
];

export const ALL_CONCEPTS: ConceptNode[] = SECTIONS.flatMap((s) => s.nodes);

export function conceptById(id: string): ConceptNode | undefined {
  return ALL_CONCEPTS.find((c) => c.id === id);
}
