/** Herramientas alrededor del tablero: navegación por jugadas, entrada escrita y modo dibujo. */
import { localizeSan, parseUserMove, type Move, type Position } from '@kavalo/chess-core';
import { h } from '../dom.js';
import type { Board } from './board.js';

export interface Navigator {
  el: HTMLElement;
  /** Actualiza el total de posiciones (jugadas + 1) y la posición mostrada. */
  update(count: number, index: number): void;
  destroy(): void;
}

/**
 * Botones ⏮ ◀ ▶ ⏭ para revisar la partida. También responde a ← → Inicio Fin
 * cuando el foco no está en un campo de texto.
 */
export function moveNavigator(onGo: (index: number) => void): Navigator {
  let count = 1;
  let index = 0;
  const go = (i: number) => {
    const next = Math.max(0, Math.min(count - 1, i));
    if (next !== index) onGo(next);
  };
  const mk = (label: string, text: string, fn: () => void) =>
    h('button', { class: 'btn nav-btn', 'aria-label': label, title: label, onclick: fn as EventListener }, text);
  const first = mk('Ir al inicio', '⏮', () => go(0));
  const prev = mk('Jugada anterior', '◀', () => go(index - 1));
  const next = mk('Jugada siguiente', '▶', () => go(index + 1));
  const last = mk('Ir a la posición actual', '⏭', () => go(count - 1));
  const label = h('span', { class: 'nav-label', 'aria-live': 'polite' });
  const el = h('div', { class: 'navigator', role: 'group', 'aria-label': 'Navegar por la partida' }, first, prev, label, next, last);

  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.classList.contains('board-grid'))) return;
    if (e.key === 'ArrowLeft') go(index - 1);
    else if (e.key === 'ArrowRight') go(index + 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(count - 1);
    else return;
    e.preventDefault();
  };
  window.addEventListener('keydown', onKey);

  return {
    el,
    update(c, i) {
      count = c;
      index = i;
      first.disabled = prev.disabled = i === 0;
      next.disabled = last.disabled = i >= c - 1;
      label.textContent = i === 0 ? 'Inicio' : `Jugada ${Math.ceil(i / 2)}${i % 2 ? '' : '…'}${i < c - 1 ? ` (${i}/${c - 1})` : ''}`;
    },
    destroy() {
      window.removeEventListener('keydown', onKey);
    },
  };
}

/**
 * Campo para escribir la jugada ("Cf3", "caballo f3", "e2-e4"…). Imprescindible con
 * lector de pantalla y útil para practicar notación.
 */
export function moveInput(position: () => Position | null, submit: (m: Move) => boolean): HTMLElement {
  const input = h('input', {
    class: 'input move-input', placeholder: 'Escribe tu jugada: Cf3, e4, O-O…', autocomplete: 'off',
    autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Escribe tu jugada en notación algebraica',
  });
  const msg = h('p', { class: 'muted small move-input-msg', 'aria-live': 'polite' });
  const play = () => {
    const pos = position();
    const text = input.value.trim();
    if (!pos || !text) return;
    const m = parseUserMove(pos, text, 'es');
    if (!m) {
      msg.textContent = `No entiendo «${text}» o no es legal aquí. Ejemplos: Cf3, exd5, O-O, e8=D.`;
      msg.classList.add('bad');
      return;
    }
    if (submit(m)) {
      input.value = '';
      msg.textContent = '';
      msg.classList.remove('bad');
    }
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); play(); } });
  return h('details', { class: 'move-entry' },
    h('summary', {}, '⌨ Escribir jugada'),
    h('div', { class: 'move-entry-row' }, input, h('button', { class: 'btn', onclick: play as EventListener }, 'Jugar')),
    msg);
}

/** Botón para activar el modo dibujo (flechas y círculos con el dedo). */
export function drawToggle(board: Board): HTMLButtonElement {
  const b = h('button', { class: 'btn', 'aria-pressed': 'false', title: 'Dibujar flechas y círculos (en ordenador: clic derecho)' }, '✏ Dibujar');
  b.addEventListener('click', () => {
    board.setDrawMode(!board.isDrawMode);
    b.setAttribute('aria-pressed', String(board.isDrawMode));
    b.classList.toggle('on', board.isDrawMode);
  });
  return b;
}

/** SAN localizado para la interfaz. */
export const sanEs = (san: string) => localizeSan(san, 'es');
