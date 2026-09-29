/** Home inteligente: saludo, nivel, racha, ADN resumido, recomendación y UN botón principal. */
import { h, navigate, primaryButton, screen } from '../dom.js';
import { chessDna, dailyPlan, recommend } from '../state/insights.js';
import { levelName, profile } from '../state/store.js';

export function renderHome(root: HTMLElement): void {
  const hour = new Date().getHours();
  const greet = hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
  const rec = recommend();
  const dna = chessDna();
  const top = [...dna.dims].filter((d) => d.value !== null).sort((a, b) => b.value! - a.value!);
  const reasonBtn = h('button', { class: 'link', 'aria-expanded': 'false' }, '¿Por qué esto?');
  const reason = h('p', { class: 'why', hidden: true }, rec.reason);
  reasonBtn.addEventListener('click', () => {
    reason.hidden = !reason.hidden;
    reasonBtn.setAttribute('aria-expanded', String(!reason.hidden));
  });

  root.append(screen(null,
    h('header', { class: 'home-head' },
      h('div', {},
        h('h1', { class: 'greet' }, `${greet}${profile.name ? `, ${profile.name}` : ''}`),
        h('p', { class: 'muted' }, `Nivel: ${levelName()} · Rating ${profile.gameRating}`)),
      h('div', { class: 'streak', title: 'Días seguidos aprendiendo' }, `🔥 ${profile.streak.current}`)),

    h('a', { class: 'card card-link', href: '#/dna' },
      h('p', { class: 'eyebrow' }, 'Tu ADN ajedrecístico'),
      dna.confidence === 'building'
        ? h('p', {}, `Perfil en construcción (${dna.games}/5 partidas). Juega para descubrir tu estilo.`)
        : h('p', {}, `▲ ${top[0]!.label}  ·  ▼ ${top.at(-1)!.label}`, h('span', { class: 'muted small' }, ` — basado en tus últimas ${dna.games} partidas`))),

    h('div', { class: 'card card-focus' },
      h('p', { class: 'eyebrow' }, 'Hoy'),
      h('h2', {}, rec.title),
      reasonBtn, reason,
      h('div', { class: 'cta' }, primaryButton(rec.cta.toUpperCase(), () => navigate(rec.href))),
      h('p', { class: 'muted small center' }, `${profile.dailyMinutes} min · ${dailyPlan().length} bloques`, ' · ', h('a', { href: '#/plan' }, 'Ver plan'))),
  ));
}

export function renderPlan(root: HTMLElement): void {
  const blocks = dailyPlan();
  root.append(screen(`Plan de ${profile.dailyMinutes} minutos`,
    h('p', { class: 'muted' }, 'Generado según tu tiempo, tus errores recientes y tu mapa de aprendizaje.'),
    h('ol', { class: 'plan' }, ...blocks.map((b) =>
      h('li', { class: 'card plan-item' },
        h('a', { href: b.href },
          h('span', { class: 'plan-min' }, `${b.minutes} min`),
          h('strong', {}, b.label),
          h('span', { class: 'muted small' }, b.why))))),
    h('div', { class: 'cta' }, primaryButton('Empezar', () => navigate(blocks[0]!.href)))));
}
