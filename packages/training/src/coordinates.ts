/**
 * Entrenamiento de coordenadas (brief §53): «Selecciona e4», «¿De qué color es f5?»,
 * «¿Qué casillas controla este caballo?». Generadores puros y deterministas con semilla.
 */
import { fileOf, isLightSquare, makeSquare, onBoard, rankOf, squareName, type Square } from '@kavalo/chess-core';

export type CoordinateExercise =
  | { kind: 'find-square'; square: Square; prompt: string }
  | { kind: 'square-color'; square: Square; prompt: string; answer: 'light' | 'dark' }
  | { kind: 'knight-squares'; square: Square; prompt: string; answer: Square[] };

export type Random = () => number;

/** Generador pseudoaleatorio con semilla (mismas series para las mismas semillas). */
export function seeded(seed: number): Random {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
}

export function knightSquares(sq: Square): Square[] {
  const f = fileOf(sq);
  const r = rankOf(sq);
  return [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]
    .filter(([df, dr]) => onBoard(f + df!, r + dr!))
    .map(([df, dr]) => makeSquare(f + df!, r + dr!))
    .sort((a, b) => a - b);
}

/**
 * Serie de ejercicios. `stage` 0 = solo buscar casillas; 1 = añade colores; 2 = añade el caballo.
 */
export function coordinateSet(n: number, random: Random, stage: 0 | 1 | 2 = 2): CoordinateExercise[] {
  const out: CoordinateExercise[] = [];
  for (let i = 0; i < n; i++) {
    const square = Math.floor(random() * 64);
    const kinds = stage === 0 ? ['find-square'] : stage === 1 ? ['find-square', 'find-square', 'square-color'] : ['find-square', 'find-square', 'square-color', 'knight-squares'];
    const kind = kinds[Math.floor(random() * kinds.length)]!;
    const name = squareName(square);
    if (kind === 'find-square') out.push({ kind, square, prompt: `Selecciona ${name}.` });
    else if (kind === 'square-color') out.push({ kind, square, prompt: `¿De qué color es ${name}?`, answer: isLightSquare(square) ? 'light' : 'dark' });
    else out.push({ kind: 'knight-squares', square, prompt: `Un caballo en ${name}: ¿qué casillas controla?`, answer: knightSquares(square) });
  }
  return out;
}

/** Comprueba una respuesta. Para el caballo exige el conjunto exacto de casillas. */
export function checkCoordinate(ex: CoordinateExercise, answer: Square | 'light' | 'dark' | Square[]): boolean {
  switch (ex.kind) {
    case 'find-square': return answer === ex.square;
    case 'square-color': return answer === ex.answer;
    case 'knight-squares': {
      if (!Array.isArray(answer)) return false;
      const a = [...new Set(answer)].sort((x, y) => x - y);
      return a.length === ex.answer.length && a.every((s, i) => s === ex.answer[i]);
    }
  }
}
