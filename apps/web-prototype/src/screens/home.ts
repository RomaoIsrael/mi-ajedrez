/** Home inteligente: saludo, nivel, racha, recomendación explicada, misiones y UN botón principal. */
import { ACHIEVEMENTS, dailyMissions, learningStreak } from '@kavalo/coach';
import { h, navigate, primaryButton, screen } from '../dom.js';
import { chessDna, dailyPlan, recommendations } from '../state/insights.js';
import { levelName, profile } from '../state/store.js';

export function renderHome(root: HTMLElement): void {
  const hour = new Date().getHours();
  const greet = hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
  const [rec, ...alternatives] = recommendations();
  const dna = chessDna();
  const top = [...dna.dims].filter((d) => d.value !== null).sort((a, b) => b.value! - a.value!);
  const missions = dailyMissions(profile);
  const achievementsGot = ACHIEVEMENTS.filter((a) => profile.achievements[a.id]).length;

  const reasonBtn = h('button', { class: 'link', 'aria-expanded': 'false' }, '¿Por qué esto?');
  const reason = h('div', { class: 'why', hidden: true },
    h('p', {}, rec!.reason),
    h('ul', { class: 'factors' }, ...rec!.factors.map((f) => h('li', { class: 'small' }, f))));
  reasonBtn.addEventListener('click', () => {
    reason.hidden = !reason.hidden;
    reasonBtn.setAttribute('aria-expanded', String(!reason.hidden));
  });
  const others = alternatives.filter((a) => a.action.type !== rec!.action.type || a.title !== rec!.title).slice(0, 2);

  root.append(screen(null,
    h('header', { class: 'home-head' },
      h('div', {},
        h('h1', { class: 'greet' }, `${greet}${profile.name ? `, ${profile.name}` : ''}`),
        h('p', { class: 'muted' }, `Nivel: ${levelName()} · Rating ${profile.gameRating}`)),
      h('div', { class: 'streak', title: 'Días seguidos aprendiendo' }, `🔥 ${learningStreak(profile)}`)),

    h('div', { class: 'card card-focus' },
      h('p', { class: 'eyebrow' }, 'Hoy'),
      h('h2', {}, rec!.title),
      reasonBtn, reason,
      h('div', { class: 'cta' }, primaryButton(rec!.cta.toUpperCase(), () => navigate(rec!.href))),
      h('p', { class: 'muted small center' }, `${profile.dailyMinutes} min · ${dailyPlan().length} bloques`, ' · ', h('a', { href: '#/plan' }, 'Ver plan')),
      others.length ? h('details', { class: 'alternatives' },
        h('summary', { class: 'small' }, 'Otras opciones'),
        h('ul', {}, ...others.map((o) => h('li', {}, h('a', { href: o.href }, o.title), h('span', { class: 'muted small' }, ` — ${o.reason}`))))) : null),

    missions.length ? h('div', { class: 'card missions' },
      h('p', { class: 'eyebrow' }, 'Misiones de hoy'),
      h('ul', {}, ...missions.map((m) => h('li', { class: `mission ${m.done ? 'done' : ''}` },
        h('span', { class: 'mission-check', 'aria-hidden': 'true' }, m.done ? '✅' : '○'),
        h('span', { class: 'mission-body' },
          h('span', {}, m.title),
          h('span', { class: 'bar' }, h('span', { class: 'bar-fill', style: `width:${(m.progress / m.target) * 100}%` })),
          h('span', { class: 'muted small' }, `${m.progress}/${m.target} · +${m.xp} XP${m.done ? ' · ¡cumplida!' : ''}`)))))) : null,

    h('a', { class: 'card card-link', href: '#/dna' },
      h('p', { class: 'eyebrow' }, 'Tu ADN ajedrecístico'),
      dna.confidence === 'building'
        ? h('p', {}, `Perfil en construcción (${dna.games}/5 partidas). Juega para descubrir tu estilo.`)
        : h('p', {}, `▲ ${top[0]!.label}  ·  ▼ ${top.at(-1)!.label}`, h('span', { class: 'muted small' }, ` — basado en tus últimas ${dna.games} partidas`))),

    h('div', { class: 'home-links' },
      h('a', { class: 'card card-link', href: '#/report' }, h('p', { class: 'eyebrow' }, 'Tu semana'), h('p', {}, 'Reporte de progreso')),
      h('a', { class: 'card card-link', href: '#/achievements' }, h('p', { class: 'eyebrow' }, 'Logros'), h('p', {}, `${achievementsGot} de ${ACHIEVEMENTS.length}`))),
  ));
}

export function renderPlan(root: HTMLElement): void {
  const blocks = dailyPlan();
  root.append(screen(`Plan de ${profile.dailyMinutes} minutos`,
    h('p', { class: 'muted' }, 'Generado según tu tiempo, tus repasos pendientes, tus errores recientes y tu objetivo.'),
    h('ol', { class: 'plan' }, ...blocks.map((b) =>
      h('li', { class: 'card plan-item' },
        h('a', { href: b.href },
          h('span', { class: 'plan-min' }, `${b.minutes} min`),
          h('strong', {}, b.label),
          h('span', { class: 'muted small' }, b.why))))),
    h('div', { class: 'cta' }, primaryButton('Empezar', () => navigate(blocks[0]!.href)))));
}
