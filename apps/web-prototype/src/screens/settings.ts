/** Perfil y configuración: tema, coach, ayudas, accesibilidad y privacidad (exportar / borrar). */
import { Position } from '@kavalo/chess-core';
import { Board } from '../components/board.js';
import { COACHES } from '../components/coach.js';
import { cue } from '../feedback.js';
import { engineLabel, engineStatus, getEngine, onEngineStatus } from '../engine.js';
import { button, h, navigate, screen } from '../dom.js';
import { profile, resetProfile, save, type BoardTheme, type CoachStyle, type HelpLevel } from '../state/store.js';
import { applyTheme } from '../theme.js';
import { t, type Locale } from '../i18n.js';
import { pieceUrl, PIECE_SETS } from '../components/pieces.js';
import type { PieceType } from '@kavalo/chess-core';

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

  const sets = PIECE_SETS.map((ps) => {
    const on = profile.settings.pieceSet === ps.id;
    const b = h('button', { class: `set-card ${on ? 'on' : ''}`, 'aria-pressed': String(on), 'data-set': ps.id, title: ps.name },
      h('span', { class: 'set-pieces' }, ...(['wN', 'bN', 'wQ', 'bK'] as const).map((k) => h('img', { src: pieceUrl(k[0] as 'w' | 'b', k[1]!.toLowerCase() as PieceType, ps.id), alt: '' }))),
      h('span', { class: 'small' }, ps.name));
    b.addEventListener('click', () => { profile.settings.pieceSet = ps.id; rerender(); });
    return b;
  });

  root.append(screen(t('settings.title'),
    h('div', { class: 'card' }, h('h2', {}, t('settings.profile')),
      h('label', { class: 'field' }, h('span', {}, t('settings.name')), nameInput),
      select<Locale>(t('settings.language'), profile.settings.locale, [['es', 'Español'], ['en', 'English']], (v) => { profile.settings.locale = v; }),
      profile.settings.locale !== 'es' ? h('p', { class: 'muted small' }, t('settings.partial')) : null,
      select<'adult' | 'kids'>(t('settings.mode'), profile.settings.mode, [['adult', t('settings.mode.adult')], ['kids', t('settings.mode.kids')]], (v) => {
        profile.settings.mode = v;
        // En modo niños, el set Kids y las ayudas de principiante por defecto (se pueden cambiar).
        if (v === 'kids' && profile.settings.pieceSet === 'royal-modern') profile.settings.pieceSet = 'kids';
        if (v === 'adult' && profile.settings.pieceSet === 'kids') profile.settings.pieceSet = 'royal-modern';
      }),
      select(t('settings.daily'), String(profile.dailyMinutes), ['5', '10', '20', '30', '45', '60'].map((m) => [m, `${m} min`]), (v) => { profile.dailyMinutes = Number(v); }),
      select<CoachStyle>(t('settings.coach'), profile.coachStyle, (Object.keys(COACHES) as CoachStyle[]).map((k) => [k, `${COACHES[k].name} — ${COACHES[k].desc}`]), (v) => { profile.coachStyle = v; })),
    h('div', { class: 'card' }, h('h2', {}, t('settings.help')),
      select<HelpLevel>('Nivel de explicaciones', profile.settings.helpLevel, [['auto', 'Automático (según tu nivel)'], ['beginner', 'Principiante'], ['intermediate', 'Intermedio'], ['advanced', 'Avanzado']], (v) => { profile.settings.helpLevel = v; }),
      toggle('Mostrar barra de evaluación en partidas', profile.settings.evalBar, (v) => { profile.settings.evalBar = v; }),
      h('p', { class: 'muted small' }, 'Desactivada por defecto: el objetivo es aprender a evaluar tú. Para principiantes muestra palabras, no números.'),
      h('p', { class: 'muted small' }, 'Las ayudas se retiran progresivamente a medida que dejas de necesitarlas.'),
      engineLine),
    h('div', { class: 'card' }, h('h2', {}, t('settings.board')),
      select<BoardTheme>('Tema del tablero', profile.settings.boardTheme, [
        ['slate', 'Pizarra y marfil'], ['walnut', 'Nogal'], ['marble', 'Mármol'], ['ocean', 'Océano'], ['forest', 'Bosque'], ['contrast', 'Alto contraste'],
      ], (v) => { profile.settings.boardTheme = v; }),
      h('div', { class: 'board-preview' }, preview.el),
      toggle('Mostrar coordenadas', profile.settings.coordinates, (v) => { profile.settings.coordinates = v; }),
      h('p', { class: 'muted small' }, 'Dibuja flechas con clic derecho y arrastrando; clic derecho en una casilla para marcarla con un círculo (Mayús = rojo, Alt = azul). En móvil, usa el botón «Dibujar».')),
    h('div', { class: 'card' }, h('h2', {}, t('settings.a11y')),
      select('Tema', profile.settings.theme, [['system', 'Según el sistema'], ['light', 'Claro'], ['dark', 'Oscuro']], (v) => { profile.settings.theme = v; }),
      select('Tamaño del texto', String(profile.settings.textScale), [['100', '100 %'], ['115', '115 %'], ['130', '130 %'], ['150', '150 %'], ['175', '175 %'], ['200', '200 %']], (v) => { profile.settings.textScale = Number(v); }),
      select('Colores para daltonismo', profile.settings.colorblind, [['none', 'Estándar'], ['deutan', 'Deuteranopía / protanopía (azul y naranja)'], ['tritan', 'Tritanopía (verde y rojo anaranjado)']], (v) => { profile.settings.colorblind = v; }),
      toggle('Reducir animaciones', profile.settings.reduceMotion, (v) => { profile.settings.reduceMotion = v; }),
      toggle('Sonidos', profile.settings.sound, (v) => { profile.settings.sound = v; if (v) setTimeout(() => cue('success'), 50); }),
      'vibrate' in navigator ? toggle('Vibración', profile.settings.vibration, (v) => { profile.settings.vibration = v; }) : null,
      h('p', { class: 'muted small' }, 'Teclado: Tab hasta el tablero, flechas para moverte, Enter para elegir pieza y destino, Esc para cancelar; ← → para revisar jugadas. También puedes escribir la jugada (Cf3, e4, O-O).'),
      h('fieldset', { class: 'group' }, h('legend', {}, t('settings.pieces')), h('div', { class: 'set-grid' }, ...sets)),
      h('p', { class: 'muted small' }, t('settings.piecesHelp'))),
    h('div', { class: 'card' }, h('h2', {}, t('settings.privacy')),
      h('p', { class: 'muted small' }, profile.sync.enabled ? 'Copia en la nube activada (elegida por ti).' : 'Todo se guarda solo en este navegador. Nada se envía a ningún servidor.'),
      h('div', { class: 'game-actions' },
        button('Privacidad, copia en la nube y mis datos', () => navigate('#/privacy')),
        button('Borrar todos mis datos', () => {
          if (confirm('Se borrará tu progreso de este dispositivo. ¿Continuar?')) { resetProfile(); navigate('#/'); location.reload(); }
        }))),
  ));
  return () => { off(); offInner?.(); };
}
