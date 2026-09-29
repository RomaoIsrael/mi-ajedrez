/** Mapa de aprendizaje: FUNDAMENTOS → VISIÓN → … → MAESTRÍA, con estado de dominio por nodo. */
import { SECTIONS } from '@kavalo/content';
import { STATE_ICON } from '@kavalo/pedagogy';
import { h, navigate, primaryButton, screen } from '../dom.js';
import { isUnlocked, nextLesson } from '../state/insights.js';
import { mastery, profile } from '../state/store.js';

const STATE_LABEL = { locked: 'Bloqueado', introduced: 'Introducido', learning: 'En aprendizaje', understood: 'Comprendido', mastered: 'Dominado', mastery: 'Maestría' } as const;

export function renderLearn(root: HTMLElement): void {
  const next = nextLesson();
  root.append(screen('Tu camino',
    h('p', { class: 'muted' }, '🔒 no iniciado · ○ introducido · ◐ en aprendizaje · ● comprendido · ★ dominado · ♛ maestría'),
    h('ol', { class: 'map' }, ...SECTIONS.map((s) =>
      h('li', { class: 'map-section' },
        h('h2', {}, h('span', { class: 'map-icon' }, s.icon), s.title),
        h('ul', { class: 'map-nodes' }, ...s.nodes.map((n) => {
          const unlocked = isUnlocked(n.id);
          const done = n.lessonId && profile.completedLessons.includes(n.lessonId);
          const state = !unlocked ? 'locked' : done || mastery(n.id).attempts ? mastery(n.id).state : 'introduced';
          const icon = !unlocked ? STATE_ICON.locked : done || mastery(n.id).attempts ? STATE_ICON[state] : '○';
          const label = `${n.title}: ${STATE_LABEL[state]}`;
          const content = [h('span', { class: `node-icon st-${state}` }, icon), h('span', { class: 'node-text' }, h('strong', {}, n.title), h('span', { class: 'muted small' }, n.lessonId ? n.summary : `${n.summary} · Próximamente`))];
          return h('li', {}, unlocked && n.lessonId
            ? h('a', { class: 'node', href: `#/lesson/${n.lessonId}`, 'aria-label': label }, ...content)
            : h('div', { class: `node ${unlocked ? '' : 'node-locked'}`, 'aria-label': label }, ...content));
        }))))),
    next ? h('div', { class: 'cta sticky' }, primaryButton(`SIGUIENTE: ${next.title.toUpperCase()}`, () => navigate(`#/lesson/${next.id}`))) : null,
  ));
}
