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

/** Modo niños (brief §46): el coach es Kavi, un caballo amigo, y habla con frases cortas. */
export const KIDS_COACH = { name: 'Kavi', onError: '¡Casi! Mira esto conmigo.', onGood: '¡Muy bien! ⭐' };
const isKids = () => profile.settings.mode === 'kids';

export function coachBubble(children: (Node | string)[], actions: HTMLElement[] = []): HTMLElement {
  return h('div', { class: `coach${isKids() ? ' coach-kids' : ''}`, role: 'status', 'aria-live': 'polite' },
    h('img', { class: 'coach-avatar', src: LOGO, alt: isKids() ? KIDS_COACH.name : 'Coach' }),
    h('div', { class: 'coach-body' }, ...children, actions.length ? h('div', { class: 'coach-actions' }, ...actions) : null));
}

/** Tarjeta de explicación: QUÉ estuvo mal · POR QUÉ · CONSECUENCIA · QUÉ OBSERVAR · CÓMO EVITARLO. */
export function explanationCard(e: Explanation, actions: HTMLElement[] = []): HTMLElement {
  const bad = e.severity === 'inaccuracy' || e.severity === 'mistake' || e.severity === 'blunder';
  const coach = isKids() ? KIDS_COACH : COACHES[profile.coachStyle];
  const row = (label: string, text?: string) => (text ? h('p', { class: 'exp-row' }, h('strong', {}, `${label} `), text) : null);
  if (isKids()) {
    // Explicación breve: qué pasó, qué mirar la próxima vez y una pregunta. Las reglas no cambian.
    const nodes: HTMLElement[] = [
      h('p', { class: 'coach-tone' }, bad ? coach.onError : coach.onGood),
      h('h3', { class: `exp-title sev-${e.severity}` }, `${SEVERITY_SYMBOL[e.severity]} ${e.title}`.trim()),
    ];
    const notice = e.whatToNotice ?? e.why;
    if (notice) nodes.push(h('p', {}, `👀 ${notice}`));
    if (e.question) nodes.push(h('p', { class: 'exp-question' }, `🤔 ${e.question}`));
    return coachBubble(nodes, actions);
  }
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
