/** Partida: historial, deshacer, estado final y exportación PGN. */
import { Position } from './position.js';
import { moveToSan, moveToUci, parseMove } from './san.js';
import { toSquare } from './square.js';
import type { GameStatus, Move, MoveInput } from './types.js';

export interface PlayedMove {
  readonly move: Move;
  readonly san: string;
  readonly uci: string;
  readonly before: Position;
  readonly after: Position;
}

export class Game {
  private readonly startPos: Position;
  private readonly played: PlayedMove[] = [];
  private forcedResult: Pick<GameStatus, 'result' | 'reason'> | null = null;

  constructor(fen?: string) {
    this.startPos = fen ? Position.fromFen(fen) : Position.start();
  }

  get position(): Position {
    return this.played.at(-1)?.after ?? this.startPos;
  }

  get history(): readonly PlayedMove[] {
    return this.played;
  }

  get startFen(): string {
    return this.startPos.toFen();
  }

  /** Juega una jugada desde el tablero ({from,to,promotion}) o en SAN/UCI. */
  move(input: MoveInput | string): PlayedMove | null {
    if (this.status().over) return null;
    const pos = this.position;
    let move: Move | null;
    if (typeof input === 'string') {
      move = parseMove(pos, input);
    } else {
      const from = toSquare(input.from);
      const to = toSquare(input.to);
      const candidates = pos.legalMoves(from).filter((m) => m.to === to);
      move =
        candidates.find((m) => m.promotion === (input.promotion ?? (candidates[0]?.promotion ? 'q' : undefined))) ??
        null;
    }
    if (!move) return null;
    const played: PlayedMove = {
      move,
      san: moveToSan(pos, move),
      uci: moveToUci(move),
      before: pos,
      after: pos.play(move),
    };
    this.played.push(played);
    return played;
  }

  undo(): PlayedMove | null {
    this.forcedResult = null;
    return this.played.pop() ?? null;
  }

  resign(color: 'w' | 'b'): void {
    this.forcedResult = { result: color === 'w' ? '0-1' : '1-0', reason: 'resign' };
  }

  timeout(color: 'w' | 'b'): void {
    const other = color === 'w' ? 'b' : 'w';
    // Sin material para dar mate, la caída de bandera es tablas.
    const onlyKingAndMinor = this.position.isInsufficientMaterial() || lacksMatingMaterial(this.position, other);
    this.forcedResult = onlyKingAndMinor
      ? { result: '1/2-1/2', reason: 'insufficient-material' }
      : { result: color === 'w' ? '0-1' : '1-0', reason: 'timeout' };
  }

  status(): GameStatus {
    const pos = this.position;
    const check = pos.inCheck();
    if (this.forcedResult) return { over: true, check, ...this.forcedResult };
    const legal = pos.legalMoves();
    if (legal.length === 0) {
      return check
        ? { over: true, check, result: pos.turn === 'w' ? '0-1' : '1-0', reason: 'checkmate' }
        : { over: true, check, result: '1/2-1/2', reason: 'stalemate' };
    }
    if (pos.isInsufficientMaterial()) return { over: true, check, result: '1/2-1/2', reason: 'insufficient-material' };
    if (pos.halfmove >= 100) return { over: true, check, result: '1/2-1/2', reason: 'fifty-move' };
    if (this.repetitions() >= 3) return { over: true, check, result: '1/2-1/2', reason: 'threefold' };
    return { over: false, check, result: '*' };
  }

  /** Veces que ha aparecido la posición actual (incluida). */
  repetitions(): number {
    const key = this.position.repetitionKey();
    const all = [this.startPos, ...this.played.map((p) => p.after)];
    return all.filter((p) => p.repetitionKey() === key).length;
  }

  pgn(headers: Record<string, string> = {}): string {
    const status = this.status();
    const tags: Record<string, string> = {
      Event: 'Kavalo', Site: 'Kavalo', Date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
      White: '?', Black: '?', Result: status.result, ...headers,
    };
    if (this.startFen !== Position.start().toFen()) {
      tags.SetUp = '1';
      tags.FEN = this.startFen;
    }
    const tagText = Object.entries(tags).map(([k, v]) => `[${k} "${v.replace(/"/g, "'")}"]`).join('\n');
    let moveNo = this.startPos.fullmove;
    let text = '';
    this.played.forEach((p, i) => {
      if (p.move.color === 'w') text += `${moveNo}. `;
      else if (i === 0) text += `${moveNo}... `;
      text += `${p.san} `;
      if (p.move.color === 'b') moveNo++;
    });
    return `${tagText}\n\n${text}${status.result}`.trim() + '\n';
  }

  /** Carga una partida desde el texto de jugadas de un PGN (sin variantes). */
  /**
   * Lee la línea principal de un PGN: ignora comentarios, variantes (anidadas), NAG y signos
   * de anotación (!, ?, !?). Si el texto contiene varias partidas, lee la primera.
   */
  static fromPgn(pgn: string): Game {
    const first = splitPgn(pgn)[0] ?? pgn;
    const fen = pgnHeaders(first).FEN;
    const game = new Game(fen);
    let body = first
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/\{[^}]*\}/g, ' ')
      .replace(/;[^\n]*/g, ' ')
      .replace(/\$\d+/g, ' ');
    // Variantes: se eliminan de dentro hacia fuera para soportar anidamiento.
    while (/\([^()]*\)/.test(body)) body = body.replace(/\([^()]*\)/g, ' ');
    if (/[()]/.test(body)) throw new Error('PGN inválido: paréntesis sin cerrar');
    const tokens = body.split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
    for (const raw of tokens) {
      const token = raw.replace(/^\d+\.+/, '').replace(/[!?]+$/, '');
      if (!token) continue;
      if (!game.move(token)) throw new Error(`Jugada ilegal o no reconocida en el PGN: ${token}`);
    }
    return game;
  }
}

/** Etiquetas de un PGN ([White "…"] …); con varias partidas, las de la primera. */
export function pgnHeaders(pgn: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of (splitPgn(pgn)[0] ?? pgn).matchAll(/\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]/g)) out[m[1]!] = m[2]!.replace(/\\"/g, '"');
  return out;
}

/** Separa un archivo PGN con varias partidas. */
export function splitPgn(text: string): string[] {
  const parts = text.replace(/\r/g, '').split(/\n\s*\n(?=\s*\[)/).map((p) => p.trim()).filter(Boolean);
  const games: string[] = [];
  for (const p of parts) {
    // Un bloque que solo tiene etiquetas se une con su texto de jugadas.
    if (games.length && !/^\s*\[/.test(p)) games[games.length - 1] += `\n\n${p}`;
    else games.push(p);
  }
  return games;
}

function lacksMatingMaterial(pos: Position, color: 'w' | 'b'): boolean {
  const own = pos.board.filter((p) => p && p.color === color && p.type !== 'k');
  return own.length === 0 || (own.length === 1 && (own[0]!.type === 'n' || own[0]!.type === 'b'));
}
