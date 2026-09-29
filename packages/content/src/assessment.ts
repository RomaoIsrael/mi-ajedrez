/**
 * Test inicial (brief §81): 13 ejercicios progresivos que miden reglas, visión, táctica,
 * estrategia, finales y cálculo. Cada respuesta es evidencia para el modelo de dominio y la
 * puntuación por área fija el nivel inicial (con incertidumbre alta: las partidas lo ajustan).
 * Las respuestas se verifican en los tests (reglas y Stockfish).
 */

export type AssessmentArea = 'rules' | 'vision' | 'tactics' | 'strategy' | 'endgame' | 'calculation';

export const AREA_LABEL: Record<AssessmentArea, string> = {
  rules: 'Reglas', vision: 'Visión', tactics: 'Táctica', strategy: 'Estrategia', endgame: 'Finales', calculation: 'Cálculo',
};

interface Base { id: string; area: AssessmentArea; concept: string; fen: string; prompt: string; rating: number }
/** El usuario mueve en el tablero; se acepta cualquiera de las jugadas (UCI). */
export interface MoveItem extends Base { type: 'move'; accept: string[] }
/** Pregunta con opciones sobre la posición. */
export interface ChoiceItem extends Base { type: 'choice'; options: string[]; answer: number; why: string }
export type AssessmentItem = MoveItem | ChoiceItem;

export const ASSESSMENT: AssessmentItem[] = [
  { id: 'a-mate-or-not', type: 'choice', area: 'rules', concept: 'fundamentals.checkmate', rating: 300,
    fen: '3R2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 1 1', prompt: 'Juegan negras. ¿Es jaque mate?',
    options: ['Sí, es jaque mate', 'No, es solo jaque', 'No hay jaque'], answer: 0,
    why: 'El rey está en jaque, no puede escapar (sus peones le tapan) y nada puede interponerse ni capturar la torre.' },
  { id: 'a-castle', type: 'move', area: 'rules', concept: 'fundamentals.special', rating: 350,
    fen: 'r3k2r/pppq1ppp/2npbn2/2b1p3/2B1P3/2NPBN2/PPPQ1PPP/R3K2R w KQkq - 0 1', prompt: 'Juegan blancas. Pon tu rey a salvo enrocando en el flanco de rey.', accept: ['e1g1'] },
  { id: 'a-en-passant', type: 'move', area: 'rules', concept: 'fundamentals.special', rating: 500,
    fen: 'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3', prompt: 'Juegan blancas. El peón negro acaba de avanzar de f7 a f5. Captúralo.', accept: ['e5f6'] },
  { id: 'a-free-piece', type: 'move', area: 'vision', concept: 'vision.undefended-pieces', rating: 400,
    fen: '4k3/ppp2ppp/4pq2/1b6/8/8/PPP1QPPP/4K1N1 w - - 0 1', prompt: 'Juegan blancas. Gana material.', accept: ['e2b5'] },
  { id: 'a-undefended', type: 'choice', area: 'vision', concept: 'vision.undefended-pieces', rating: 550,
    fen: 'r1bqk2r/pppp1ppp/2n2n2/4p3/1bB1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 1', prompt: '¿Qué pieza negra NO tiene ninguna defensa?',
    options: ['El alfil de b4', 'El caballo de c6', 'El caballo de f6'], answer: 0,
    why: 'El caballo de c6 lo defienden los peones b7 y d7, el de f6 el peón g7 y la dama. El alfil de b4 está solo.' },
  { id: 'a-back-rank', type: 'move', area: 'tactics', concept: 'tactics.mate-in-1', rating: 550,
    fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', prompt: 'Juegan blancas. Mate en 1.', accept: ['d1d8'] },
  { id: 'a-opening-plan', type: 'choice', area: 'strategy', concept: 'openings.development', rating: 600,
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', prompt: 'Juegan blancas. ¿Qué jugada sigue mejor los principios de la apertura?',
    options: ['Cf3: desarrolla una pieza y ataca e5', 'Dh5: saca la dama a atacar', 'a4: gana espacio en el flanco'], answer: 0,
    why: 'Cf3 desarrolla, controla el centro y ataca un peón. Sacar la dama tan pronto permite que el rival gane tiempos atacándola.' },
  { id: 'a-fork', type: 'move', area: 'tactics', concept: 'tactics.fork', rating: 750,
    fen: '3q3k/6pp/8/4N3/8/8/6PP/R5K1 w - - 0 1', prompt: 'Juegan blancas. Gana material.', accept: ['e5f7'] },
  { id: 'a-isolated', type: 'choice', area: 'strategy', concept: 'strategy.pawn-structure', rating: 850,
    fen: 'r1bq1rk1/pp2bppp/2n1pn2/8/2BP4/2N2N2/PP3PPP/R1BQ1RK1 w - - 0 1', prompt: '¿Qué peón blanco está aislado (sin peones propios en las columnas vecinas)?',
    options: ['El peón de d4', 'El peón de b2', 'El peón de f2'], answer: 0,
    why: 'No hay peones blancos en las columnas c ni e: el peón de d4 no puede ser defendido por otro peón.' },
  { id: 'a-square', type: 'choice', area: 'endgame', concept: 'endgame.opposition', rating: 900,
    fen: '8/8/8/2k3P1/8/8/8/K7 b - - 0 1', prompt: 'Juegan negras. ¿Alcanza el rey negro al peón antes de que corone?',
    options: ['Sí: el rey entra en el cuadrado del peón', 'No: el peón corona'], answer: 0,
    why: 'Regla del cuadrado: desde g5 hasta g8 son 3 casillas; el cuadrado va de d5 a g8. Con …Rd5 (o …Rd6) el rey entra y alcanza al peón.' },
  { id: 'a-skewer', type: 'move', area: 'tactics', concept: 'tactics.skewer', rating: 950,
    fen: '6q1/6pp/8/3k4/8/8/6PP/3BK2R w K - 0 1', prompt: 'Juegan blancas. Gana material.', accept: ['d1b3'] },
  { id: 'a-king-sixth', type: 'choice', area: 'endgame', concept: 'endgame.opposition', rating: 1000,
    fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', prompt: 'Rey en sexta delante de su peón (que no es de torre). Con buen juego, ¿cuál es el resultado?',
    options: ['Ganan las blancas', 'Tablas'], answer: 0,
    why: 'Con el rey en la sexta fila delante del peón, las blancas ganan tanto si les toca mover como si no.' },
  { id: 'a-mate-in-2', type: 'move', area: 'calculation', concept: 'tactics.mate-in-2', rating: 1100,
    fen: '3q2k1/5ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1', prompt: 'Juegan blancas. Mate en 2: encuentra la primera jugada.', accept: ['e2e8'] },
];

export interface AssessmentResult {
  score: number;
  total: number;
  byArea: Record<AssessmentArea, { correct: number; total: number }>;
  /** Rating estimado a partir de los ejercicios (media ponderada por dificultad). */
  rating: number;
}

/**
 * Estima el nivel: cada ejercicio acertado sube la estimación hacia su dificultad, cada fallo la
 * baja (tipo Elo con K decreciente). Parte del nivel declarado en el onboarding.
 */
export function scoreAssessment(answers: Record<string, boolean>, start: number): AssessmentResult {
  const byArea = Object.fromEntries((Object.keys(AREA_LABEL) as AssessmentArea[]).map((a) => [a, { correct: 0, total: 0 }])) as AssessmentResult['byArea'];
  let rating = start;
  let score = 0;
  let total = 0;
  ASSESSMENT.forEach((item, i) => {
    if (!(item.id in answers)) return;
    const ok = answers[item.id]!;
    total++;
    byArea[item.area].total++;
    if (ok) { score++; byArea[item.area].correct++; }
    const expected = 1 / (1 + 10 ** ((item.rating - rating) / 400));
    rating += (ok ? 1 - expected : -expected) * Math.max(40, 160 - i * 8);
  });
  return { score, total, byArea, rating: Math.round(Math.max(150, Math.min(2200, rating))) };
}
