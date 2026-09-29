/** Perfil y configuración: tema, coach, ayudas, accesibilidad y privacidad (exportar / borrar). */
import { Position } from '@kavalo/chess-core';
import { Board } from '../components/board.js';
import { COACHES } from '../components/coach.js';
import { cue } from '../feedback.js';
import { engineLabel, engineStatus, getEngine, onEngineStatus } from '../engine.js';
import { button, h, navigate, screen } from '../dom.js';
import { profile, resetProfile, save, type BoardTheme, type CoachStyle, type HelpLevel } from '../state/store.js';
import { applyTheme } from '../theme.js';

export function renderSettings(root: HTMLElement): () => void {
  let offInner: (() => void) | null = null;
  const rerender = () => { save(); applyTheme(); off(); root.replaceChildren(); offInner = renderSettings(root); };
  const select = <T extends string>(label: string, value: T, options: [T, string][], set: (v: T) => void) => {
    const sel = h('select', { class: 'input', 'aria-label': label }, ...options.map(([v, l]) => h('option', { value: v, selected: v === value }, l)));
    sel.addEventListener('change', () => { set(sel.value as T); rerender(); });
    return h('label', { class: 'field' }, h('span', {}, label), sel);
  };
  const toggle = (label: string, value: boolean, set: (v: boolean) => void) => {
    const input = h('input', { type: 'checkbox', checked: value });
    input.addEventListener('change', () => { set(input.checked); rerender(); });
    return h('label', { class: 'field field-inline' }, input, h('span', {}, label));
  };
  const engineText = () => `Motor de análisis: ${engineStatus() === 'ready' ? `${engineLabel()} · listo` : engineStatus() === 'unavailable' ? 'no disponible (se usa el motor propio)' : 'cargando…'}`;
  const engineLine = h('p', { class: 'small engine-line' }, engineText());
  const off = onEngineStatus(() => { engineLine.textContent = engineText(); });
  void getEngine();
  const preview = new Board({ coordinates: profile.settings.coordinates, reduceMotion: true });
  preview.setPosition(Position.fromFen('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'), { from: 57, to: 42 }, false);
  preview.setHighlights([28], 'hint');
  preview.setArrows([{ from: 21, to: 36, color: 'good' }]);
  const nameInput = h('input', { class: 'input', value: profile.name, maxlength: 30, 'aria-label': 'Nombre' });
  nameInput.addEventListener('change', () => { profile.name = nameInput.value.trim(); save(); });

  root.append(screen('Perfil y ajustes',
    h('div', { class: 'card' }, h('h2', {}, 'Perfil'),
      h('label', { class: 'field' }, h('span', {}, 'Nombre'), nameInput),
      select('Tiempo diario', String(profile.dailyMinutes), ['5', '10', '20', '30', '45', '60'].map((m) => [m, `${m} min`]), (v) => { profile.dailyMinutes = Number(v); }),
      select<CoachStyle>('Entrenador', profile.coachStyle, (Object.keys(COACHES) as CoachStyle[]).map((k) => [k, `${COACHES[k].name} — ${COACHES[k].desc}`]), (v) => { profile.coachStyle = v; })),
    h('div', { class: 'card' }, h('h2', {}, 'Ayudas'),
      select<HelpLevel>('Nivel de explicaciones', profile.settings.helpLevel, [['auto', 'Automático (según tu nivel)'], ['beginner', 'Principiante'], ['intermediate', 'Intermedio'], ['advanced', 'Avanzado']], (v) => { profile.settings.helpLevel = v; }),
      toggle('Mostrar barra de evaluación en partidas', profile.settings.evalBar, (v) => { profile.settings.evalBar = v; }),
      h('p', { class: 'muted small' }, 'Desactivada por defecto: el objetivo es aprender a evaluar tú. Para principiantes muestra palabras, no números.'),
      h('p', { class: 'muted small' }, 'Las ayudas se retiran progresivamente a medida que dejas de necesitarlas.'),
      engineLine),
    h('div', { class: 'card' }, h('h2', {}, 'Tablero'),
      select<BoardTheme>('Tema del tablero', profile.settings.boardTheme, [
        ['slate', 'Pizarra y marfil'], ['walnut', 'Nogal'], ['marble', 'Mármol'], ['ocean', 'Océano'], ['forest', 'Bosque'], ['contrast', 'Alto contraste'],
      ], (v) => { profile.settings.boardTheme = v; }),
      h('div', { class: 'board-preview' }, preview.el),
      toggle('Mostrar coordenadas', profile.settings.coordinates, (v) => { profile.settings.coordinates = v; }),
      h('p', { class: 'muted small' }, 'Dibuja flechas con clic derecho y arrastrando; clic derecho en una casilla para marcarla con un círculo (Mayús = rojo, Alt = azul). En móvil, usa el botón «Dibujar».')),
    h('div', { class: 'card' }, h('h2', {}, 'Apariencia y accesibilidad'),
      select('Tema', profile.settings.theme, [['system', 'Según el sistema'], ['light', 'Claro'], ['dark', 'Oscuro']], (v) => { profile.settings.theme = v; }),
      select('Tamaño del texto', String(profile.settings.textScale), [['100', '100 %'], ['115', '115 %'], ['130', '130 %'], ['150', '150 %'], ['175', '175 %'], ['200', '200 %']], (v) => { profile.settings.textScale = Number(v); }),
      select('Colores para daltonismo', profile.settings.colorblind, [['none', 'Estándar'], ['deutan', 'Deuteranopía / protanopía (azul y naranja)'], ['tritan', 'Tritanopía (verde y rojo anaranjado)']], (v) => { profile.settings.colorblind = v; }),
      toggle('Reducir animaciones', profile.settings.reduceMotion, (v) => { profile.settings.reduceMotion = v; }),
      toggle('Sonidos', profile.settings.sound, (v) => { profile.settings.sound = v; if (v) setTimeout(() => cue('success'), 50); }),
      'vibrate' in navigator ? toggle('Vibración', profile.settings.vibration, (v) => { profile.settings.vibration = v; }) : null,
      h('p', { class: 'muted small' }, 'Teclado: Tab hasta el tablero, flechas para moverte, Enter para elegir pieza y destino, Esc para cancelar; ← → para revisar jugadas. También puedes escribir la jugada (Cf3, e4, O-O).'),
      h('label', { class: 'field' }, h('span', {}, 'Set de piezas'), h('select', { class: 'input', disabled: true }, h('option', {}, 'Royal Modern (otros sets: próximamente)')))),
    h('div', { class: 'card' }, h('h2', {}, 'Privacidad'),
      h('p', { class: 'muted small' }, 'Todo se guarda solo en este navegador. Nada se envía a ningún servidor.'),
      h('div', { class: 'game-actions' },
        button('Exportar mis datos', () => {
          const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
          const a = h('a', { href: URL.createObjectURL(blob), download: 'kavalo-datos.json' });
          a.click();
          URL.revokeObjectURL(a.href);
        }),
        button('Borrar todos mis datos', () => {
          if (confirm('Se borrará tu progreso de este dispositivo. ¿Continuar?')) { resetProfile(); navigate('#/'); location.reload(); }
        }))),
  ));
  return () => { off(); offInner?.(); };
}
