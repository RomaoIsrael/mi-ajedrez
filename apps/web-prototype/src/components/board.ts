/**
 * Tablero interactivo (docs/04-ux.md §6, brief §31):
 * - mover tocando pieza y destino o arrastrando; solo jugadas legales (puntos y anillos);
 * - flechas y resaltados del coach + flechas y círculos dibujados por el usuario
 *   (clic derecho, o modo dibujo en pantallas táctiles);
 * - teclado completo: flechas para moverse, Enter/Espacio para elegir, Esc para cancelar;
 *   anuncios para lectores de pantalla;
 * - orientación, coordenadas, promoción y animaciones discretas (jugada, jaque, mate,
 *   promoción, destellos) que respetan «reducir animaciones».
 */
import { fileOf, FILES, rankOf, squareName, type Color, type PieceType, type Position, type Square } from '@kavalo/chess-core';
import type { Arrow } from '@kavalo/tactics';
import { h } from '../dom.js';

const PIECE_BASE = new URL('../../../../assets/pieces/royal-modern/', import.meta.url).href;
const NAMES: Record<PieceType, string> = { p: 'peón', n: 'caballo', b: 'alfil', r: 'torre', q: 'dama', k: 'rey' };
let boardCount = 0;

export type HighlightKind = 'hint' | 'good' | 'bad' | 'info' | 'zone';
export type FlashKind = 'good' | 'brilliant' | 'bad';
export type UserArrowColor = 'user' | 'danger' | 'info';

export interface LastMove {
  from: Square;
  to: Square;
  /** true si la jugada fue una promoción (animación específica). */
  promotion?: boolean;
}

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
  private readonly id = ++boardCount;
  private readonly grid: HTMLElement;
  private readonly svg: SVGSVGElement;
  private readonly overlay: HTMLElement;
  private readonly live: HTMLElement;
  private readonly squares: HTMLElement[] = [];
  private pos: Position | null = null;
  private selected: Square | null = null;
  private lastMove: LastMove | null = null;
  private highlights = new Map<Square, HighlightKind>();
  private arrows: Arrow[] = [];
  private userArrows: { from: Square; to: Square; color: UserArrowColor }[] = [];
  private userCircles = new Map<Square, UserArrowColor>();
  private orientation: Color;
  private cursor: Square = 12; // e2
  private drawMode = false;
  private drag: { from: Square; ghost: HTMLImageElement | null; startX: number; startY: number } | null = null;
  private annotating: { from: Square; color: UserArrowColor } | null = null;

  constructor(private readonly opts: BoardOptions = {}) {
    this.orientation = opts.orientation ?? 'w';
    this.grid = h('div', {
      class: 'board-grid', role: 'grid', tabindex: '0',
      'aria-label': 'Tablero de ajedrez. Usa las flechas para moverte y Enter para elegir.',
    });
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'board-arrows');
    this.svg.setAttribute('viewBox', '0 0 8 8');
    this.svg.setAttribute('aria-hidden', 'true');
    this.svg.innerHTML = `<defs>${['danger', 'good', 'info', 'user']
      .map((c) => `<marker id="ah-${this.id}-${c}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="arrow-${c}"/></marker>`)
      .join('')}</defs>`;
    this.overlay = h('div', { class: 'board-overlay', hidden: true });
    this.live = h('div', { class: 'sr-only', 'aria-live': 'polite' });
    this.el = h('div', { class: 'board' }, this.grid, this.svg, this.overlay, this.live);
    for (let i = 0; i < 64; i++) {
      this.squares.push(h('div', { class: 'sq', role: 'gridcell', id: `b${this.id}-sq${i}` }));
    }
    this.layout();
    this.grid.addEventListener('pointerdown', (e) => this.pointerDown(e));
    this.grid.addEventListener('contextmenu', (e) => e.preventDefault());
    this.grid.addEventListener('keydown', (e) => this.keyDown(e));
    this.grid.addEventListener('focus', () => this.renderCursor());
    this.grid.addEventListener('blur', () => this.renderCursor());
  }

  // Las escuchas globales solo existen mientras se arrastra (sin fugas al cambiar de pantalla).
  private readonly onWindowMove = (e: PointerEvent) => this.pointerMove(e);
  private readonly onWindowUp = (e: PointerEvent) => {
    window.removeEventListener('pointermove', this.onWindowMove);
    window.removeEventListener('pointerup', this.onWindowUp);
    this.pointerUp(e);
  };

  private listenWindow(): void {
    window.addEventListener('pointermove', this.onWindowMove);
    window.addEventListener('pointerup', this.onWindowUp);
  }

  // ───────────────────────── API pública ─────────────────────────

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

  get currentOrientation(): Color {
    return this.orientation;
  }

  flip(): void {
    this.setOrientation(this.orientation === 'w' ? 'b' : 'w');
  }

  setCoordinates(on: boolean): void {
    this.opts.coordinates = on;
    this.layout();
    this.render(false);
  }

  setReduceMotion(on: boolean): void {
    this.opts.reduceMotion = on;
  }

  /** Modo dibujo: en pantallas táctiles, tocar y arrastrar dibuja flechas en lugar de mover. */
  setDrawMode(on: boolean): void {
    this.drawMode = on;
    this.el.classList.toggle('drawing', on);
  }

  get isDrawMode(): boolean {
    return this.drawMode;
  }

  setPosition(pos: Position, lastMove: LastMove | null = null, animate = true): void {
    const wasCheck = this.pos?.inCheck() ?? false;
    this.pos = pos;
    this.lastMove = lastMove;
    this.selected = null;
    this.userArrows = [];
    this.userCircles.clear();
    this.render(animate);
    if (animate && pos.inCheck() && !wasCheck) this.pulse(pos.kingSquare(pos.turn), 'check-pulse', 700);
    if (animate && lastMove?.promotion) this.pulse(lastMove.to, 'promo-pop', 600);
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

  clearUserMarks(): void {
    this.userArrows = [];
    this.userCircles.clear();
    this.drawArrows();
  }

  /** Flechas y círculos del usuario (para tests o para guardar anotaciones). */
  get userMarks() {
    return { arrows: [...this.userArrows], circles: [...this.userCircles.keys()] };
  }

  /** Destello breve en una casilla: excelente jugada, brillante o error. */
  flash(sq: Square, kind: FlashKind): void {
    this.pulse(sq, `flash-${kind}`, 700);
  }

  /** Animación especial de jaque mate: el rey derrotado se inclina y el tablero brilla. */
  celebrateMate(kingSq: Square): void {
    this.squares[kingSq]!.classList.add('mated');
    if (!this.opts.reduceMotion) {
      this.el.classList.add('mate-glow');
      setTimeout(() => this.el.classList.remove('mate-glow'), 1200);
    }
  }

  focus(): void {
    this.grid.focus({ preventScroll: true });
  }

  announce(text: string): void {
    this.live.textContent = '';
    requestAnimationFrame(() => { this.live.textContent = text; });
  }

  // ───────────────────────── Render ─────────────────────────

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
          if (row === 7) el.append(h('span', { class: 'coord coord-file', 'aria-hidden': 'true' }, FILES[fileOf(sq)]!));
          if (col === 0) el.append(h('span', { class: 'coord coord-rank', 'aria-hidden': 'true' }, String(rankOf(sq) + 1)));
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

  private describe(sq: Square): string {
    const piece = this.pos?.get(sq);
    return `${squareName(sq)}${piece ? `, ${NAMES[piece.type]} ${piece.color === 'w' ? 'blanco' : 'negro'}` : ', vacía'}`;
  }

  private render(animate: boolean): void {
    const pos = this.pos;
    const targets = new Set(this.selected !== null && pos ? pos.legalMoves(this.selected).map((m) => m.to) : []);
    const checkSq = pos && pos.inCheck() ? pos.kingSquare(pos.turn) : -1;
    for (let sq = 0; sq < 64; sq++) {
      const el = this.squares[sq]!;
      el.querySelector('img')?.remove();
      el.querySelector('.dot')?.remove();
      el.classList.remove('mated');
      el.classList.toggle('last', !!this.lastMove && (this.lastMove.from === sq || this.lastMove.to === sq));
      el.classList.toggle('selected', this.selected === sq);
      el.classList.toggle('check', sq === checkSq);
      el.classList.toggle('target', targets.has(sq));
      for (const k of ['hint', 'good', 'bad', 'info', 'zone']) el.classList.toggle(`hl-${k}`, this.highlights.get(sq) === k);
      const piece = pos?.get(sq);
      el.setAttribute('aria-label', `${this.describe(sq)}${targets.has(sq) ? ', destino posible' : ''}`);
      el.setAttribute('aria-selected', String(this.selected === sq));
      if (piece) {
        el.append(h('img', { class: 'piece', src: `${PIECE_BASE}${piece.color}${piece.type.toUpperCase()}.svg`, alt: '', draggable: 'false' }));
      }
      if (targets.has(sq)) el.append(h('span', { class: piece ? 'dot dot-capture' : 'dot', 'aria-hidden': 'true' }));
    }
    this.renderCursor();
    this.drawArrows();
    if (animate && this.lastMove && !this.opts.reduceMotion) this.animate(this.lastMove);
  }

  private renderCursor(): void {
    // Solo se muestra el cursor al navegar con teclado (no al tocar o hacer clic).
    const focused = document.activeElement === this.grid && this.grid.matches(':focus-visible');
    this.squares.forEach((el, sq) => el.classList.toggle('kbd-cursor', focused && sq === this.cursor));
    this.grid.setAttribute('aria-activedescendant', `b${this.id}-sq${this.cursor}`);
  }

  private pulse(sq: Square, cls: string, ms: number): void {
    if (this.opts.reduceMotion) return;
    const el = this.squares[sq]!;
    el.classList.remove(cls);
    void el.offsetWidth; // reinicia la animación CSS
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms);
  }

  private animate({ from, to }: LastMove): void {
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
    this.svg.querySelectorAll('line, circle').forEach((l) => l.remove());
    const NS = 'http://www.w3.org/2000/svg';
    const line = (from: Square, to: Square, color: string, user: boolean) => {
      const [x1, y1] = this.center(from);
      const [x2, y2] = this.center(to);
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      const shorten = 0.3 / len;
      const el = document.createElementNS(NS, 'line');
      el.setAttribute('x1', String(x1));
      el.setAttribute('y1', String(y1));
      el.setAttribute('x2', String(x2 - (x2 - x1) * shorten));
      el.setAttribute('y2', String(y2 - (y2 - y1) * shorten));
      el.setAttribute('class', `arrow arrow-${color}${user ? ' arrow-user-drawn' : ''}`);
      el.setAttribute('marker-end', `url(#ah-${this.id}-${color})`);
      this.svg.append(el);
    };
    for (const a of this.arrows) line(a.from, a.to, a.color, false);
    for (const a of this.userArrows) line(a.from, a.to, a.color, true);
    for (const [sq, color] of this.userCircles) {
      const [cx, cy] = this.center(sq);
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', String(cx));
      c.setAttribute('cy', String(cy));
      c.setAttribute('r', '0.44');
      c.setAttribute('class', `user-circle arrow-${color}`);
      this.svg.append(c);
    }
  }

  // ───────────────────────── Interacción ─────────────────────────

  private sqFromEvent(e: PointerEvent): Square | null {
    const el = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>('.sq');
    return el && this.grid.contains(el) ? Number(el.dataset.sq) : null;
  }

  private canMove(sq: Square): boolean {
    const color = this.opts.movable?.() ?? null;
    const piece = this.pos?.get(sq);
    return !!piece && color !== null && piece.color === color && this.pos!.turn === color;
  }

  private annotationColor(e: { shiftKey: boolean; altKey: boolean }): UserArrowColor {
    return e.shiftKey ? 'danger' : e.altKey ? 'info' : 'user';
  }

  private pointerDown(e: PointerEvent): void {
    const sq = this.sqFromEvent(e);
    if (sq === null) return;
    this.cursor = sq;
    if (e.button === 2 || (this.drawMode && e.button === 0)) {
      e.preventDefault();
      this.annotating = { from: sq, color: this.annotationColor(e) };
      this.listenWindow();
      return;
    }
    if (e.button !== 0) return;
    if (this.userArrows.length || this.userCircles.size) this.clearUserMarks();
    if (this.canMove(sq)) e.preventDefault();
    this.activate(sq, e.clientX, e.clientY);
  }

  /** Acción de "elegir" una casilla (toque, clic o Enter). */
  private activate(sq: Square, x?: number, y?: number): void {
    if (this.opts.onSquare && !(this.opts.movable?.())) {
      this.opts.onSquare(sq);
      return;
    }
    if (this.selected !== null && sq !== this.selected && !this.canMove(sq)) {
      this.tryMove(this.selected, sq);
      return;
    }
    if (this.canMove(sq)) {
      this.selected = this.selected === sq && !this.drag ? null : sq;
      this.render(false);
      if (this.selected !== null) {
        const n = this.pos!.legalMoves(sq).length;
        this.announce(`${this.describe(sq)} seleccionado. ${n} ${n === 1 ? 'jugada posible' : 'jugadas posibles'}.`);
        if (x !== undefined && y !== undefined) {
          this.drag = { from: sq, ghost: null, startX: x, startY: y };
          this.listenWindow();
        }
      }
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
    if (this.annotating) {
      const { from, color } = this.annotating;
      this.annotating = null;
      const to = this.sqFromEvent(e);
      if (to === null) return;
      if (to === from) {
        if (this.userCircles.has(to)) this.userCircles.delete(to);
        else this.userCircles.set(to, color);
      } else {
        const i = this.userArrows.findIndex((a) => a.from === from && a.to === to);
        if (i >= 0) this.userArrows.splice(i, 1);
        else this.userArrows.push({ from, to, color });
      }
      this.drawArrows();
      return;
    }
    if (!this.drag) return;
    const { from, ghost } = this.drag;
    this.drag = null;
    if (!ghost) return; // fue un toque: se mantiene la selección
    ghost.remove();
    const to = this.sqFromEvent(e);
    if (to !== null && to !== from) this.tryMove(from, to);
    else this.render(false);
  }

  private keyDown(e: KeyboardEvent): void {
    const delta: Record<string, [number, number]> = {
      ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    };
    const d = delta[e.key];
    if (d) {
      e.preventDefault();
      const sign = this.orientation === 'w' ? 1 : -1;
      const f = Math.min(7, Math.max(0, fileOf(this.cursor) + d[0] * sign));
      const r = Math.min(7, Math.max(0, rankOf(this.cursor) + d[1] * sign));
      this.cursor = r * 8 + f;
      this.renderCursor();
      this.announce(this.describe(this.cursor));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.activate(this.cursor);
    } else if (e.key === 'Escape') {
      this.selected = null;
      this.render(false);
      this.announce('Selección cancelada');
    }
  }

  private tryMove(from: Square, to: Square): void {
    const pos = this.pos;
    if (!pos) return;
    const moves = pos.legalMoves(from).filter((m) => m.to === to);
    if (moves.length === 0) {
      this.selected = this.canMove(to) ? to : null;
      this.render(false);
      if (this.selected === null) this.announce(`Jugada ilegal a ${squareName(to)}`);
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
    const buttons = (['q', 'r', 'b', 'n'] as PieceType[]).map((p) =>
      h('button', { class: 'promo-btn', 'aria-label': `Coronar en ${NAMES[p]}`, onclick: (() => { this.overlay.hidden = true; done(p); this.grid.focus(); }) as EventListener },
        h('img', { src: `${PIECE_BASE}${color}${p.toUpperCase()}.svg`, alt: '' })));
    this.overlay.replaceChildren(
      h('div', { class: 'promo', role: 'dialog', 'aria-label': 'Elegir pieza de promoción' },
        h('p', {}, '¿En qué pieza quieres coronar?'),
        h('div', { class: 'promo-row' }, ...buttons)));
    buttons[0]!.focus();
  }
}
