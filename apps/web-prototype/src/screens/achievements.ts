/** Logros: todos ligados a aprendizaje demostrado (docs/08-gamificacion.md §4). */
import { ACHIEVEMENTS } from '@kavalo/coach';
import { h, screen } from '../dom.js';
import { profile } from '../state/store.js';

export function renderAchievements(root: HTMLElement): void {
  const got = ACHIEVEMENTS.filter((a) => profile.achievements[a.id]).length;
  root.append(screen('Logros',
    h('p', { class: 'muted' }, `${got} de ${ACHIEVEMENTS.length} conseguidos. Ninguno se gana por entrar en la app: todos exigen demostrar lo aprendido.`),
    h('ul', { class: 'achievements' }, ...ACHIEVEMENTS.map((a) => {
      const at = profile.achievements[a.id];
      return h('li', { class: `card achievement ${at ? 'got' : 'locked'}`, 'aria-label': `${a.title}: ${at ? 'conseguido' : 'pendiente'}` },
        h('span', { class: 'achievement-icon', 'aria-hidden': 'true' }, at ? a.icon : '🔒'),
        h('span', {}, h('strong', {}, a.title), h('span', { class: 'muted small' }, a.description),
          at ? h('span', { class: 'small good' }, `Conseguido el ${new Date(at).toLocaleDateString('es')}`) : null));
    }))));
}
