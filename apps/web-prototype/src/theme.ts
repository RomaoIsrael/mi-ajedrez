import { profile } from './state/store.js';

/** Aplica tema, tema de tablero, modo para daltonismo, tamaño de texto y reducción de movimiento. */
export function applyTheme(): void {
  const root = document.documentElement;
  const s = profile.settings;
  if (s.theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', s.theme);
  root.setAttribute('data-board-theme', s.boardTheme);
  if (s.colorblind === 'none') root.removeAttribute('data-cb');
  else root.setAttribute('data-cb', s.colorblind);
  root.style.setProperty('--text-scale', `${s.textScale}%`);
  root.classList.toggle('reduce-motion', s.reduceMotion);
}
