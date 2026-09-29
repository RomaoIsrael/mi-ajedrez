/**
 * Finales (brief §12, §78.16): lecciones de finales del mapa y posiciones para practicarlos
 * contra el robot (modo «Desde final»).
 */
import { LESSONS, SECTIONS, START_POSITIONS } from '@kavalo/content';
import { h, navigate, screen } from '../dom.js';
import { mastery, profile } from '../state/store.js';
import { presetGame } from './play.js';

export function renderEndgames(root: HTMLElement): void {
  const section = SECTIONS.find((s) => s.id === 'endgames');
  const lessons = (section?.nodes ?? []).map((n) => LESSONS.find((l) => l.conceptId === n.id)).filter((l): l is NonNullable<typeof l> => !!l);
  const positions = START_POSITIONS.filter((p) => p.category === 'endgame');
  root.append(screen('Finales',
    h('p', { class: 'muted' }, 'Los finales enseñan el valor real de cada pieza. Primero la técnica en las lecciones; después, a practicarla contra el robot.'),
    h('div', { class: 'card' }, h('h2', {}, 'Lecciones'),
      h('ul', { class: 'opening-list' }, ...lessons.map((l) => h('li', {}, h('a', { class: 'opening-sugg', href: `#/lesson/${l.id}` }, h('strong', {}, l.title),
        h('span', { class: 'muted small' }, ` · ${l.minutes} min · ${profile.completedLessons.includes(l.id) ? `completada (${Math.round(mastery(l.conceptId).pKnown * 100)} %)` : 'pendiente'}`)))))),
    h('div', { class: 'card' }, h('h2', {}, 'Practica contra el robot'),
      h('ul', { class: 'opening-list' }, ...positions.map((p) => h('li', {},
        h('button', { class: 'link', onclick: (() => { presetGame({ mode: 'endgame', positionId: p.id }); navigate('#/play'); }) as EventListener }, p.title),
        h('span', { class: 'muted small' }, ` — ${p.objective}`))))),
  ));
}
