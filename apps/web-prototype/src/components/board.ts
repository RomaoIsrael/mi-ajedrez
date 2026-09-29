/**
 * Tablero interactivo: tocar pieza + destino o arrastrar, jugadas legales, flechas,
 * resaltados, jaque, orientación, coordenadas, promoción y animación de la última jugada.
 */
import { fileOf, FILES, rankOf, squareName, type Color, type PieceType, type Position, type Square } from '@kavalo/chess-core';
import type { Arrow } from '@kavalo/tactics';
import { h } from '../dom.js';

const PIECE_BASE = new URL('../../../../assets/pieces/royal-modern/', import.meta.url).href;
const NAMES: Record<PieceType, string> = { p: 'peón', n: 'caballo', b: 'alfil', r: 'torre', q: 'dama', k: 'rey' };

export type HighlightKind = 'hint' | 'good' | 'bad' | 'info' | 'zone';

export interface BoardOptions {
  orientation?: Color;
  coordinates?: boolean;
  reduceMotion?: boolean;
  /** Color que el usuario puede mover (null = tablero de solo lectura). */
  movable?: () => Color | null;
  /** Devuelve true si la jugada se acepta. */
  onMove?: (from: Square, to: Square, promotion?: PieceType) => boolean;
  /** Modo selección de casillas (lecciones de coordenadas y visión). */
  onSquare?: (sq: Square) => void;
}

export class Board {
  readonly el: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly svg: SVGSVGElement;
  private readonly overlay: HTMLElement;
  private readonly squares: HTMLElement[] = [];
  private pos: Position | null = null;
  private selected: Square | null = null;
  private lastMove: { from: Square; to: Square } | null = null;
  private highlights = new Map<Square, HighlightKind>();
  private arrows: Arrow[] = [];
  private orientation: Color;
  private drag: { from: Square; ghost: HTMLImageElement | null; startX: number; startY: number } | null = null;

  constructor(private readonly opts: BoardOptions = {}) {
    this.orientation = opts.orientation ?? 'w';
    this.grid = h('div', { class: 'board-grid', role: 'grid', 'aria-label': 'Tablero de ajedrez' });
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'board-arrows');
    this.svg.setAttribute('viewBox', '0 0 8 8');
    this.svg.innerHTML = ['danger', 'good', 'info']
      .map((c) => `<marker id="ah-${c}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="arrow-${c}"/></marker>`)
      .map((m) => `<defs>${m}</defs>`).join('');
    this.overlay = h('div', { class: 'board-overlay', hidden: true });
    this.el = h('div', { class: 'board' }, this.grid, this.svg, this.overlay);
    for (let i = 0; i < 64; i++) {
      const sq = h('div', { class: 'sq', role: 'gridcell' });
      this.squares.push(sq);
    }
    this.layout();
    this.grid.addEventListener('pointerdown', (e) => this.pointerDown(e));
    window.addEventListener('pointermove', (e) => this.pointerMove(e));
    window.addEventListener('pointerup', (e) => this.pointerUp(e));
  }

  private layout(): void {
    this.grid.replaceChildren();
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const sq = this.squareAt(row, col);
        const el = this.squares[sq]!;
        el.dataset.sq = String(sq);
        el.className = `sq ${(fileOf(sq) + rankOf(sq)) % 2 ? 'light' : 'dark'}`;
        el.replaceChildren();
        if (this.opts.coordinates !== false) {
          if (row === 7) el.append(h('span', { class: 'coord coord-file' }, FILES[fileOf(sq)]!));
          if (col === 0) el.append(h('span', { class: 'coord coord-rank' }, String(rankOf(sq) + 1)));
        }
        this.grid.append(el);
      }
    }
  }

  private squareAt(row: number, col: number): Square {
    return this.orientation === 'w' ? (7 - row) * 8 + col : row * 8 + (7 - col);
  }

  private center(sq: Square): [number, number] {
    const col = this.orientation === 'w' ? fileOf(sq) : 7 - fileOf(sq);
    const row = this.orientation === 'w' ? 7 - rankOf(sq) : rankOf(sq);
    return [col + 0.5, row + 0.5];
  }

  /** Cambia el modo de interacción (mover, seleccionar casillas o solo lectura). */
  setInteraction(o: Pick<BoardOptions, 'movable' | 'onMove' | 'onSquare'>): void {
    this.opts.movable = o.movable;
    this.opts.onMove = o.onMove;
    this.opts.onSquare = o.onSquare;
    this.selected = null;
  }

  setOrientation(c: Color): void {
    if (c === this.orientation) return;
    this.orientation = c;
    this.layout();
    this.render(false);
  }

  flip(): void {
    this.setOrientation(this.orientation === 'w' ? 'b' : 'w');
  }

  setCoordinates(on: boolean): void {
    this.opts.coordinates = on;
    this.layout();
    this.render(false);
  }

  setPosition(pos: Position, lastMove: { from: Square; to: Square } | null = null, animate = true): void {
    this.pos = pos;
    this.lastMove = lastMove;
    this.selected = null;
    this.render(animate);
  }

  setHighlights(squares: Square[], kind: HighlightKind = 'hint'): void {
    this.highlights = new Map(squares.map((s) => [s, kind]));
    this.render(false);
  }

  addHighlight(sq: Square, kind: HighlightKind): void {
    this.highlights.set(sq, kind);
    this.render(false);
  }

  setArrows(arrows: Arrow[]): void {
    this.arrows = arrows;
    this.drawArrows();
  }

  clearMarks(): void {
    this.highlights.clear();
    this.arrows = [];
    this.render(false);
  }

  private render(animate: boolean): void {
    const pos = this.pos;
    const targets = new Set(this.selected !== null && pos ? pos.legalMoves(this.selected).map((m) => m.to) : []);
    const checkSq = pos && pos.inCheck() ? pos.kingSquare(pos.turn) : -1;
    for (let sq = 0; sq < 64; sq++) {
      const el = this.squares[sq]!;
      el.querySelector('img')?.remove();
      el.querySelector('.dot')?.remove();
      el.classList.toggle('last', !!this.lastMove && (this.lastMove.from === sq || this.lastMove.to === sq));
      el.classList.toggle('selected', this.selected === sq);
      el.classList.toggle('check', sq === checkSq);
      for (const k of ['hint', 'good', 'bad', 'info', 'zone']) el.classList.toggle(`hl-${k}`, this.highlights.get(sq) === k);
      const piece = pos?.get(sq);
      el.setAttribute('aria-label', `${squareName(sq)}${piece ? `, ${NAMES[piece.type]} ${piece.color === 'w' ? 'blanco' : 'negro'}` : ''}`);
      if (piece) {
        el.append(h('img', { class: 'piece', src: `${PIECE_BASE}${piece.color}${piece.type.toUpperCase()}.svg`, alt: '', draggable: 'false' }));
      }
      if (targets.has(sq)) el.append(h('span', { class: piece ? 'dot dot-capture' : 'dot' }));
    }
    this.drawArrows();
    if (animate && this.lastMove && !this.opts.reduceMotion) this.animate(this.lastMove);
  }

  private animate({ from, to }: { from: Square; to: Square }): void {
    const img = this.squares[to]!.querySelector<HTMLImageElement>('img');
    if (!img) return;
    const [fx, fy] = this.center(from);
    const [tx, ty] = this.center(to);
    img.style.transition = 'none';
    img.style.transform = `translate(${(fx - tx) * 100}%, ${(fy - ty) * 100}%)`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      img.style.transition = 'transform 180ms cubic-bezier(.2,.8,.2,1)';
      img.style.transform = '';
    }));
  }

  private drawArrows(): void {
    this.svg.querySelectorAll('line').forEach((l) => l.remove());
    for (const a of this.arrows) {
      const [x1, y1] = this.center(a.from);
      const [x2, y2] = this.center(a.to);
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      const shorten = 0.3 / len;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(x1));
      line.setAttribute('y1', String(y1));
      line.setAttribute('x2', String(x2 - (x2 - x1) * shorten));
      line.setAttribute('y2', String(y2 - (y2 - y1) * shorten));
      line.setAttribute('class', `arrow arrow-${a.color}`);
      line.setAttribute('marker-end', `url(#ah-${a.color})`);
      this.svg.append(line);
    }
  }

  private sqFromEvent(e: PointerEvent): Square | null {
    const el = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>('.sq');
    return el && this.grid.contains(el) ? Number(el.dataset.sq) : null;
  }

  private canMove(sq: Square): boolean {
    const color = this.opts.movable?.() ?? null;
    const piece = this.pos?.get(sq);
    return !!piece && color !== null && piece.color === color && this.pos!.turn === color;
  }

  private pointerDown(e: PointerEvent): void {
    const sq = this.sqFromEvent(e);
    if (sq === null) return;
    if (this.opts.onSquare && !(this.opts.movable?.())) {
      this.opts.onSquare(sq);
      return;
    }
    if (this.selected !== null && sq !== this.selected && !this.canMove(sq)) {
      this.tryMove(this.selected, sq);
      return;
    }
    if (this.canMove(sq)) {
      e.preventDefault();
      this.selected = this.selected === sq && !this.drag ? null : sq;
      this.render(false);
      if (this.selected !== null) this.drag = { from: sq, ghost: null, startX: e.clientX, startY: e.clientY };
    } else {
      this.selected = null;
      this.render(false);
    }
  }

  private pointerMove(e: PointerEvent): void {
    if (!this.drag) return;
    if (!this.drag.ghost) {
      if (Math.hypot(e.clientX - this.drag.startX, e.clientY - this.drag.startY) < 5) return;
      const img = this.squares[this.drag.from]!.querySelector('img');
      if (!img) return;
      const size = this.squares[0]!.getBoundingClientRect().width;
      const ghost = img.cloneNode() as HTMLImageElement;
      ghost.className = 'piece ghost';
      ghost.style.width = ghost.style.height = `${size}px`;
      document.body.append(ghost);
      img.style.opacity = '0.25';
      this.drag.ghost = ghost;
    }
    const g = this.drag.ghost;
    g.style.left = `${e.clientX - g.offsetWidth / 2}px`;
    g.style.top = `${e.clientY - g.offsetHeight / 2}px`;
  }

  private pointerUp(e: PointerEvent): void {
    if (!this.drag) return;
    const { from, ghost } = this.drag;
    this.drag = null;
    if (!ghost) return; // fue un toque: se mantiene la selección
    ghost.remove();
    const to = this.sqFromEvent(e);
    if (to !== null && to !== from) this.tryMove(from, to);
    else this.render(false);
  }

  private tryMove(from: Square, to: Square): void {
    const pos = this.pos;
    if (!pos) return;
    const moves = pos.legalMoves(from).filter((m) => m.to === to);
    if (moves.length === 0) {
      this.selected = this.canMove(to) ? to : null;
      this.render(false);
      return;
    }
    if (moves.some((m) => m.promotion)) {
      this.askPromotion(pos.turn, (p) => this.commit(from, to, p));
      return;
    }
    this.commit(from, to);
  }

  private commit(from: Square, to: Square, promotion?: PieceType): void {
    this.selected = null;
    const ok = this.opts.onMove?.(from, to, promotion) ?? false;
    if (!ok) this.render(false);
  }

  private askPromotion(color: Color, done: (p: PieceType) => void): void {
    this.overlay.hidden = false;
    this.overlay.replaceChildren(
      h('div', { class: 'promo' },
        h('p', {}, '¿En qué pieza quieres coronar?'),
        h('div', { class: 'promo-row' }, ...(['q', 'r', 'b', 'n'] as PieceType[]).map((p) =>
          h('button', { class: 'promo-btn', 'aria-label': NAMES[p], onclick: (() => { this.overlay.hidden = true; done(p); }) as EventListener },
            h('img', { src: `${PIECE_BASE}${color}${p.toUpperCase()}.svg`, alt: NAMES[p] }))))),
    );
  }
}
