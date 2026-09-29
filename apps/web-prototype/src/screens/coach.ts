/**
 * Pantalla del Coach (brief §78.9 y §100): responde, con los datos reales del jugador, a las
 * nueve preguntas que la app debe poder contestar continuamente. Si todavía no hay datos
 * suficientes, lo dice en lugar de inventar.
 */
import { checklistStatus, threatWarningsNeeded } from '@kavalo/coach';
import { conceptById } from '@kavalo/content';
import { describeDna } from '@kavalo/dna';
import { coachBubble, COACHES, KIDS_COACH } from '../components/coach.js';
import { h, navigate, primaryButton, screen } from '../dom.js';
import { chessDna, dailyPlan, errorReduction, mistakeStats, recommend } from '../state/insights.js';
import { profile } from '../state/store.js';

export function renderCoach(root: HTMLElement): void {
  const kids = profile.settings.mode === 'kids';
  const coachName = kids ? KIDS_COACH.name : COACHES[profile.coachStyle].name;
  const title = (id: string) => conceptById(id)?.title ?? id;
  const mastered = Object.values(profile.mastery).filter((m) => ['understood', 'mastered', 'mastery'].includes(m.state)).sort((a, b) => b.pKnown - a.pKnown);
  const weak = Object.values(profile.mastery).filter((m) => m.attempts > 0 && ['introduced', 'learning'].includes(m.state)).sort((a, b) => a.pKnown - b.pKnown);
  const errors = mistakeStats();
  const dna = chessDna();
  const rec = recommend();
  const plan = dailyPlan();
  const reduction = errorReduction();
  const games = profile.ratingHistory.filter((r) => r.kind === 'game');
  const monthAgo = [...games].reverse().find((r) => r.at <= Date.now() - 30 * 86_400_000) ?? games[0];
  const ratingDelta = games.length >= 2 && monthAgo ? profile.gameRating - monthAgo.rating : null;
  const status = checklistStatus(profile);
  const needs = status.filter((s) => !s.retired).map((s) => s.item.label);
  const retired = status.filter((s) => s.retired).map((s) => s.item.label);
  const nodata = (t: string) => h('p', { class: 'muted small' }, t);

  const qa = (q: string, ...a: (Node | string | null)[]) => h('div', { class: 'card qa' }, h('h2', {}, q), ...a.filter((x): x is Node | string => x !== null));
  root.append(screen(`Tu coach: ${coachName}`,
    coachBubble([kids ? '¡Hola! Esto es lo que he aprendido de ti jugando juntos.' : 'Esto es lo que sé de ti a partir de tus partidas, ejercicios y lecciones. Se actualiza con cada entrenamiento.']),
    qa('¿Qué sabes ya?', mastered.length ? h('ul', {}, ...mastered.slice(0, 6).map((m) => h('li', {}, `${title(m.conceptId)} · ${m.state === 'understood' ? 'comprendido' : m.state === 'mastered' ? 'dominado' : 'maestría'}`))) : nodata('Aún ningún concepto está comprobado: un concepto cuenta cuando lo demuestras varias veces y en contextos distintos.')),
    qa('¿Qué te falta por aprender?', weak.length ? h('ul', {}, ...weak.slice(0, 5).map((m) => h('li', {}, `${title(m.conceptId)} · ${Math.round(m.pKnown * 100)} % de confianza`))) : nodata('Todavía no hay conceptos en los que hayas fallado.')),
    qa('¿Qué error repites?', errors.length ? h('p', {}, `${errors[0]!.label}: ${errors[0]!.perGame.toFixed(1)} por partida en tus últimas partidas (${errors[0]!.games} ${errors[0]!.games === 1 ? 'partida' : 'partidas'}).`) : nodata('Ningún error se repite todavía.')),
    qa('¿Cuál es tu ADN ajedrecístico actual?', ...describeDna(dna).map((l) => h('p', {}, l)), h('a', { class: 'chip', href: '#/dna' }, 'Ver el ADN completo')),
    qa('¿Qué deberías estudiar ahora?', h('p', {}, h('strong', {}, rec.title)), h('p', { class: 'small' }, rec.reason)),
    qa('¿Qué ejercicio te ayudaría?', plan[0] ? h('p', {}, h('a', { href: plan[0].href }, plan[0].label), ` — ${plan[0].why}`) : nodata('Completa tu primera lección para recibir ejercicios.')),
    qa('¿Estás mejorando?',
      reduction?.some((r) => r.rate > 0) ? h('p', { class: 'good' }, ...reduction.filter((r) => r.rate > 0).slice(0, 2).map((r) => `${r.label}: ${r.before.toFixed(1)} → ${r.now.toFixed(1)} por partida (−${Math.round(r.rate * 100)} %). `)) : null,
      ratingDelta !== null ? h('p', {}, `Rating de partidas: ${ratingDelta >= 0 ? '+' : ''}${ratingDelta} en el último periodo.`) : null,
      !reduction && ratingDelta === null ? nodata('Necesitamos más partidas para comparar con honestidad.') : null),
    qa('¿Qué ayuda todavía necesitas?', needs.length ? h('p', {}, `Checklist antes de mover: ${needs.join(', ')}.`) : h('p', {}, 'Ya no necesitas el checklist.'),
      h('p', { class: 'small' }, threatWarningsNeeded(profile) ? 'Seguiré avisándote de las amenazas del rival durante las partidas.' : 'Ya detectas las amenazas solo: no te aviso durante las partidas.')),
    qa('¿Qué ayuda ya podemos retirar?', retired.length ? h('p', { class: 'good' }, `Retirado: ${retired.join(', ')}. Llevas varias partidas sin ese error.`) : nodata('Las ayudas se retiran tras 5 partidas seguidas sin el error correspondiente.')),
    h('div', { class: 'cta' }, primaryButton('CONTINUAR ENTRENAMIENTO', () => navigate(rec.href))),
  ));
}
