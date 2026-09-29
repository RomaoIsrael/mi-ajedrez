/** Perfil y configuración: tema, coach, ayudas, accesibilidad y privacidad (exportar / borrar). */
import { COACHES } from '../components/coach.js';
import { button, h, navigate, screen } from '../dom.js';
import { profile, resetProfile, save, type CoachStyle, type HelpLevel } from '../state/store.js';
import { applyTheme } from '../theme.js';

export function renderSettings(root: HTMLElement): void {
  const rerender = () => { save(); applyTheme(); root.replaceChildren(); renderSettings(root); };
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
  const nameInput = h('input', { class: 'input', value: profile.name, maxlength: 30, 'aria-label': 'Nombre' });
  nameInput.addEventListener('change', () => { profile.name = nameInput.value.trim(); save(); });

  root.append(screen('Perfil y ajustes',
    h('div', { class: 'card' }, h('h2', {}, 'Perfil'),
      h('label', { class: 'field' }, h('span', {}, 'Nombre'), nameInput),
      select('Tiempo diario', String(profile.dailyMinutes), ['5', '10', '20', '30', '45', '60'].map((m) => [m, `${m} min`]), (v) => { profile.dailyMinutes = Number(v); }),
      select<CoachStyle>('Entrenador', profile.coachStyle, (Object.keys(COACHES) as CoachStyle[]).map((k) => [k, `${COACHES[k].name} — ${COACHES[k].desc}`]), (v) => { profile.coachStyle = v; })),
    h('div', { class: 'card' }, h('h2', {}, 'Ayudas'),
      select<HelpLevel>('Nivel de explicaciones', profile.settings.helpLevel, [['auto', 'Automático (según tu nivel)'], ['beginner', 'Principiante'], ['intermediate', 'Intermedio'], ['advanced', 'Avanzado']], (v) => { profile.settings.helpLevel = v; }),
      h('p', { class: 'muted small' }, 'Las ayudas se retiran progresivamente a medida que dejas de necesitarlas.')),
    h('div', { class: 'card' }, h('h2', {}, 'Apariencia y accesibilidad'),
      select('Tema', profile.settings.theme, [['system', 'Según el sistema'], ['light', 'Claro'], ['dark', 'Oscuro']], (v) => { profile.settings.theme = v; }),
      toggle('Mostrar coordenadas', profile.settings.coordinates, (v) => { profile.settings.coordinates = v; }),
      toggle('Reducir animaciones', profile.settings.reduceMotion, (v) => { profile.settings.reduceMotion = v; }),
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
}
