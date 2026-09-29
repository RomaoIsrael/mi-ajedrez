/** Burbuja del coach y personalidades (el contenido técnico no cambia, solo el tono). */
import { SEVERITY_SYMBOL, type Explanation } from '@kavalo/tactics';
import { h } from '../dom.js';
import type { CoachStyle } from '../state/store.js';
import { profile } from '../state/store.js';

const LOGO = new URL('../../../../assets/brand/favicon.svg', import.meta.url).href;

export const COACHES: Record<CoachStyle, { name: string; desc: string; onError: string; onGood: string }> = {
  mentor: { name: 'Mentor', desc: 'Calmado y reflexivo', onError: 'Pasa a menudo. Veámoslo juntos.', onGood: 'Buena decisión.' },
  master: { name: 'Master', desc: 'Técnico y preciso', onError: 'Analicemos el error.', onGood: 'Correcto.' },
  friend: { name: 'Friend', desc: 'Cercano e informal', onError: '¡Uy! Se escapó algo. Mira.', onGood: '¡Genial!' },
  tactician: { name: 'Tactician', desc: 'Directo y breve', onError: 'Error.', onGood: 'Bien.' },
  motivator: { name: 'Motivator', desc: 'Enérgico y positivo', onError: '¡Buen intento! Este patrón lo vas a dominar.', onGood: '¡Eso es! ¡Sigue así!' },
};

export function coachBubble(children: (Node | string)[], actions: HTMLElement[] = []): HTMLElement {
  return h('div', { class: 'coach', role: 'status', 'aria-live': 'polite' },
    h('img', { class: 'coach-avatar', src: LOGO, alt: 'Coach' }),
    h('div', { class: 'coach-body' }, ...children, actions.length ? h('div', { class: 'coach-actions' }, ...actions) : null));
}

/** Tarjeta de explicación: QUÉ estuvo mal · POR QUÉ · CONSECUENCIA · QUÉ OBSERVAR · CÓMO EVITARLO. */
export function explanationCard(e: Explanation, actions: HTMLElement[] = []): HTMLElement {
  const bad = e.severity === 'inaccuracy' || e.severity === 'mistake' || e.severity === 'blunder';
  const coach = COACHES[profile.coachStyle];
  const row = (label: string, text?: string) => (text ? h('p', { class: 'exp-row' }, h('strong', {}, `${label} `), text) : null);
  return coachBubble([
    h('p', { class: 'coach-tone' }, bad ? coach.onError : coach.onGood),
    h('h3', { class: `exp-title sev-${e.severity}` }, `${SEVERITY_SYMBOL[e.severity]} ${e.title}`.trim()),
    ...[
      row('Qué pasó:', e.whatWentWrong),
      row('Por qué:', e.why),
      row('Consecuencia:', e.consequence),
      row('Qué observar:', e.whatToNotice),
      row('Cómo evitarlo:', e.howToAvoid),
      e.question ? h('p', { class: 'exp-question' }, `🤔 ${e.question}`) : null,
    ].filter((x): x is HTMLParagraphElement => !!x),
  ], actions);
}
