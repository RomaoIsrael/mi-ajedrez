/**
 * Posición de ajedrez inmutable: generación de jugadas legales, FEN y detección de jaque.
 *
 * Representación: tablero de 64 casillas (a1 = 0). Se prioriza la claridad sobre la
 * velocidad; el rendimiento es suficiente para reglas, pedagogía y bots de nivel bajo.
 * El juego fuerte lo aportará Stockfish (Fase 6).
 */
import { fileOf, makeSquare, onBoard, parseSquare, rankOf, squareName } from './square.js';
import type { CastlingRights, Color, Move, Piece, PieceType, Square } from './types.js';
import { opposite } from './types.js';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const KNIGHT_STEPS: ReadonlyArray<readonly [number, number]> = [
  [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];
const KING_STEPS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
];
const ROOK_DIRS: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIRS: ReadonlyArray<readonly [number, number]> = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const PROMOTIONS: readonly PieceType[] = ['q', 'r', 'b', 'n'];

const SQ = { a1: 0, e1: 4, h1: 7, a8: 56, e8: 60, h8: 63 } as const;

export class Position {
  private constructor(
    readonly board: ReadonlyArray<Piece | null>,
    readonly turn: Color,
    readonly castling: Readonly<CastlingRights>,
    readonly epSquare: Square | null,
    readonly halfmove: number,
    readonly fullmove: number,
  ) {}

  static start(): Position {
    return Position.fromFen(START_FEN);
  }

  /**
   * Diagrama didáctico (ejercicios de coordenadas y visión): solo la colocación de piezas, sin
   * exigir reyes. No se debe usar para jugar: las reglas de jaque necesitan ambos reyes.
   */
  static diagram(placement: string, turn: Color = 'w'): Position {
    const board = Position.fromFen(`${placement.split(' ')[0]} ${turn} - - 0 1`, { diagram: true }).board;
    return new Position(board, turn, { K: false, Q: false, k: false, q: false }, null, 0, 1);
  }

  /** Crea una posición desde FEN. Lanza Error con mensaje claro si es inválida. */
  static fromFen(fen: string, opts: { diagram?: boolean } = {}): Position {
    const parts = fen.trim().split(/\s+/);
    if (parts.length < 4 || parts.length > 6) throw new Error('FEN inválido: número de campos');
    const [placement, turn, castling, ep, half = '0', full = '1'] = parts as [string, string, string, string, string?, string?];

    const rows = placement.split('/');
    if (rows.length !== 8) throw new Error('FEN inválido: se esperan 8 filas');
    const board: (Piece | null)[] = new Array(64).fill(null);
    rows.forEach((row, i) => {
      const rank = 7 - i;
      let file = 0;
      for (const ch of row) {
        if (/[1-8]/.test(ch)) {
          file += Number(ch);
        } else if (/[pnbrqkPNBRQK]/.test(ch)) {
          if (file > 7) throw new Error(`FEN inválido: fila ${8 - i} demasiado larga`);
          const color: Color = ch === ch.toUpperCase() ? 'w' : 'b';
          board[makeSquare(file, rank)] = { color, type: ch.toLowerCase() as PieceType };
          file++;
        } else {
          throw new Error(`FEN inválido: carácter '${ch}'`);
        }
      }
      if (file !== 8) throw new Error(`FEN inválido: fila ${8 - i} no tiene 8 casillas`);
    });

    if (turn !== 'w' && turn !== 'b') throw new Error('FEN inválido: turno');
    if (!/^(-|K?Q?k?q?)$/.test(castling) || castling === '') throw new Error('FEN inválido: enroque');
    if (ep !== '-' && !/^[a-h][36]$/.test(ep)) throw new Error('FEN inválido: casilla al paso');
    const halfmove = Number(half);
    const fullmove = Number(full);
    if (!Number.isInteger(halfmove) || halfmove < 0) throw new Error('FEN inválido: medio movimiento');
    if (!Number.isInteger(fullmove) || fullmove < 1) throw new Error('FEN inválido: número de jugada');

    if (opts.diagram) return new Position(board, turn, { K: false, Q: false, k: false, q: false }, null, 0, 1);
    for (const color of ['w', 'b'] as const) {
      const kings = board.filter((p) => p?.type === 'k' && p.color === color).length;
      if (kings !== 1) throw new Error(`FEN inválido: debe haber exactamente un rey ${color === 'w' ? 'blanco' : 'negro'}`);
    }
    for (let f = 0; f < 8; f++) {
      if (board[makeSquare(f, 0)]?.type === 'p' || board[makeSquare(f, 7)]?.type === 'p') {
        throw new Error('FEN inválido: peón en la primera u octava fila');
      }
    }

    // Derechos de enroque solo si rey y torre están en su sitio (tolerante con FEN reales).
    const has = (sq: Square, color: Color, type: PieceType) =>
      board[sq]?.color === color && board[sq]?.type === type;
    const rights: CastlingRights = {
      K: castling.includes('K') && has(SQ.e1, 'w', 'k') && has(SQ.h1, 'w', 'r'),
      Q: castling.includes('Q') && has(SQ.e1, 'w', 'k') && has(SQ.a1, 'w', 'r'),
      k: castling.includes('k') && has(SQ.e8, 'b', 'k') && has(SQ.h8, 'b', 'r'),
      q: castling.includes('q') && has(SQ.e8, 'b', 'k') && has(SQ.a8, 'b', 'r'),
    };

    const pos = new Position(board, turn, rights, ep === '-' ? null : parseSquare(ep), halfmove, fullmove);
    if (pos.isAttacked(pos.kingSquare(opposite(turn)), turn)) {
      throw new Error('FEN inválido: el bando que no mueve está en jaque');
    }
    return pos;
  }

  toFen(): string {
    const rows: string[] = [];
    for (let rank = 7; rank >= 0; rank--) {
      let row = '';
      let empty = 0;
      for (let file = 0; file < 8; file++) {
        const p = this.board[makeSquare(file, rank)];
        if (!p) {
          empty++;
          continue;
        }
        if (empty) row += String(empty);
        empty = 0;
        row += p.color === 'w' ? p.type.toUpperCase() : p.type;
      }
      if (empty) row += String(empty);
      rows.push(row);
    }
    const c = this.castling;
    const castling = `${c.K ? 'K' : ''}${c.Q ? 'Q' : ''}${c.k ? 'k' : ''}${c.q ? 'q' : ''}` || '-';
    const ep = this.epSquare === null ? '-' : squareName(this.epSquare);
    return `${rows.join('/')} ${this.turn} ${castling} ${ep} ${this.halfmove} ${this.fullmove}`;
  }

  get(sq: Square): Piece | null {
    return this.board[sq] ?? null;
  }

  kingSquare(color: Color): Square {
    const sq = this.board.findIndex((p) => p?.type === 'k' && p.color === color);
    if (sq < 0) throw new Error('Posición sin rey');
    return sq;
  }

  /** ¿Está la casilla atacada por alguna pieza de `by`? */
  isAttacked(sq: Square, by: Color): boolean {
    return this.attackers(sq, by).length > 0;
  }

  /** Casillas de las piezas de `by` que atacan `sq` (sin rayos X). */
  attackers(sq: Square, by: Color): Square[] {
    const result: Square[] = [];
    const f = fileOf(sq);
    const r = rankOf(sq);
    const at = (file: number, rank: number) => (onBoard(file, rank) ? this.board[makeSquare(file, rank)] : null);

    // Peones: un peón blanco ataca en diagonal hacia arriba, así que se busca debajo.
    const pr = by === 'w' ? r - 1 : r + 1;
    for (const df of [-1, 1]) {
      const p = at(f + df, pr);
      if (p?.color === by && p.type === 'p') result.push(makeSquare(f + df, pr));
    }
    for (const [df, dr] of KNIGHT_STEPS) {
      const p = at(f + df, r + dr);
      if (p?.color === by && p.type === 'n') result.push(makeSquare(f + df, r + dr));
    }
    for (const [df, dr] of KING_STEPS) {
      const p = at(f + df, r + dr);
      if (p?.color === by && p.type === 'k') result.push(makeSquare(f + df, r + dr));
    }
    const slide = (dirs: typeof ROOK_DIRS, types: PieceType[]) => {
      for (const [df, dr] of dirs) {
        let cf = f + df;
        let cr = r + dr;
        while (onBoard(cf, cr)) {
          const p = this.board[makeSquare(cf, cr)];
          if (p) {
            if (p.color === by && types.includes(p.type)) result.push(makeSquare(cf, cr));
            break;
          }
          cf += df;
          cr += dr;
        }
      }
    };
    slide(ROOK_DIRS, ['r', 'q']);
    slide(BISHOP_DIRS, ['b', 'q']);
    return result;
  }

  inCheck(color: Color = this.turn): boolean {
    return this.isAttacked(this.kingSquare(color), opposite(color));
  }

  /** Jugadas pseudo‑legales (pueden dejar el rey propio en jaque). */
  private pseudoMoves(): Move[] {
    const moves: Move[] = [];
    const us = this.turn;
    const them = opposite(us);

    for (let from = 0; from < 64; from++) {
      const piece = this.board[from];
      if (!piece || piece.color !== us) continue;
      const f = fileOf(from);
      const r = rankOf(from);

      const add = (to: Square, extra: Partial<Move> = {}) => {
        const target = this.board[to];
        moves.push({
          from, to, color: us, piece: piece.type,
          ...(target ? { captured: target.type } : {}),
          ...extra,
        });
      };

      switch (piece.type) {
        case 'p': {
          const dir = us === 'w' ? 1 : -1;
          const startRank = us === 'w' ? 1 : 6;
          const lastRank = us === 'w' ? 7 : 0;
          const pushPawn = (to: Square, extra: Partial<Move> = {}) => {
            if (rankOf(to) === lastRank) PROMOTIONS.forEach((promotion) => add(to, { ...extra, promotion }));
            else add(to, extra);
          };
          const one = makeSquare(f, r + dir);
          if (onBoard(f, r + dir) && !this.board[one]) {
            pushPawn(one);
            const two = makeSquare(f, r + 2 * dir);
            if (r === startRank && !this.board[two]) add(two, { doublePush: true });
          }
          for (const df of [-1, 1]) {
            if (!onBoard(f + df, r + dir)) continue;
            const to = makeSquare(f + df, r + dir);
            const target = this.board[to];
            if (target && target.color === them) pushPawn(to);
            else if (to === this.epSquare) add(to, { enPassant: true, captured: 'p' });
          }
          break;
        }
        case 'n':
        case 'k': {
          const steps = piece.type === 'n' ? KNIGHT_STEPS : KING_STEPS;
          for (const [df, dr] of steps) {
            if (!onBoard(f + df, r + dr)) continue;
            const to = makeSquare(f + df, r + dr);
            if (this.board[to]?.color !== us) add(to);
          }
          if (piece.type === 'k') this.addCastling(moves, from);
          break;
        }
        default: {
          const dirs =
            piece.type === 'r' ? ROOK_DIRS : piece.type === 'b' ? BISHOP_DIRS : [...ROOK_DIRS, ...BISHOP_DIRS];
          for (const [df, dr] of dirs) {
            let cf = f + df;
            let cr = r + dr;
            while (onBoard(cf, cr)) {
              const to = makeSquare(cf, cr);
              const target = this.board[to];
              if (target?.color === us) break;
              add(to);
              if (target) break;
              cf += df;
              cr += dr;
            }
          }
        }
      }
    }
    return moves;
  }

  private addCastling(moves: Move[], from: Square): void {
    const us = this.turn;
    const them = opposite(us);
    const home = us === 'w' ? SQ.e1 : SQ.e8;
    if (from !== home || this.isAttacked(home, them)) return;
    const empty = (...sqs: Square[]) => sqs.every((s) => !this.board[s]);
    const safe = (...sqs: Square[]) => sqs.every((s) => !this.isAttacked(s, them));
    const kingSide = us === 'w' ? this.castling.K : this.castling.k;
    const queenSide = us === 'w' ? this.castling.Q : this.castling.q;
    if (kingSide && empty(home + 1, home + 2) && safe(home + 1, home + 2)) {
      moves.push({ from, to: home + 2, color: us, piece: 'k', castle: 'k' });
    }
    if (queenSide && empty(home - 1, home - 2, home - 3) && safe(home - 1, home - 2)) {
      moves.push({ from, to: home - 2, color: us, piece: 'k', castle: 'q' });
    }
  }

  /** Todas las jugadas legales del bando que mueve (opcionalmente desde una casilla). */
  legalMoves(from?: Square): Move[] {
    return this.pseudoMoves().filter(
      (m) => (from === undefined || m.from === from) && !this.play(m).inCheck(this.turn),
    );
  }

  /**
   * Aplica una jugada (se asume generada por esta posición) y devuelve la posición nueva.
   * No valida legalidad: usar `legalMoves` o `Game.move` para entradas externas.
   */
  play(m: Move): Position {
    const board = this.board.slice();
    const us = this.turn;
    board[m.to] = { color: us, type: m.promotion ?? m.piece };
    board[m.from] = null;
    if (m.enPassant) board[m.to + (us === 'w' ? -8 : 8)] = null;
    if (m.castle === 'k') {
      board[m.to - 1] = board[m.to + 1] ?? null;
      board[m.to + 1] = null;
    } else if (m.castle === 'q') {
      board[m.to + 1] = board[m.to - 2] ?? null;
      board[m.to - 2] = null;
    }

    const c = { ...this.castling };
    const touch = (sq: Square) => {
      if (sq === SQ.e1) c.K = c.Q = false;
      if (sq === SQ.e8) c.k = c.q = false;
      if (sq === SQ.h1) c.K = false;
      if (sq === SQ.a1) c.Q = false;
      if (sq === SQ.h8) c.k = false;
      if (sq === SQ.a8) c.q = false;
    };
    touch(m.from);
    touch(m.to);

    const ep = m.doublePush ? (m.from + m.to) / 2 : null;
    const halfmove = m.piece === 'p' || m.captured ? 0 : this.halfmove + 1;
    const fullmove = us === 'b' ? this.fullmove + 1 : this.fullmove;
    return new Position(board, opposite(us), c, ep, halfmove, fullmove);
  }

  /** Devuelve una copia con el turno cambiado (útil en lecciones de "pieza libre"). */
  withTurn(turn: Color): Position {
    if (turn === this.turn) return this;
    return Position.fromFen(this.toFen().replace(/ [wb] /, ` ${turn} `).replace(/ [a-h][36] /, ' - '));
  }

  isCheckmate(): boolean {
    return this.inCheck() && this.legalMoves().length === 0;
  }

  isStalemate(): boolean {
    return !this.inCheck() && this.legalMoves().length === 0;
  }

  /** Material insuficiente para dar mate con cualquier secuencia legal. */
  isInsufficientMaterial(): boolean {
    const pieces: { p: Piece; sq: Square }[] = [];
    this.board.forEach((p, sq) => {
      if (p && p.type !== 'k') pieces.push({ p, sq });
    });
    if (pieces.length === 0) return true;
    if (pieces.some(({ p }) => p.type === 'p' || p.type === 'r' || p.type === 'q')) return false;
    if (pieces.length === 1) return true; // un solo caballo o alfil
    // Solo alfiles, todos en casillas del mismo color.
    if (pieces.every(({ p }) => p.type === 'b')) {
      const colors = new Set(pieces.map(({ sq }) => (fileOf(sq) + rankOf(sq)) % 2));
      return colors.size === 1;
    }
    return false;
  }

  /** Clave para repetición: piezas, turno, enroques y al paso solo si es capturable. */
  repetitionKey(): string {
    const [placement, turn, castling] = this.toFen().split(' ');
    const epCapturable = this.epSquare !== null && this.legalMoves().some((m) => m.enPassant);
    return `${placement} ${turn} ${castling} ${epCapturable ? squareName(this.epSquare!) : '-'}`;
  }
}
