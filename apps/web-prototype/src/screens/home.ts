/** Home inteligente: saludo, nivel, racha, recomendación explicada, misiones y UN botón principal. */
import { ACHIEVEMENTS, dailyMissions, learningStreak } from '@kavalo/coach';
import { h, navigate, primaryButton, screen } from '../dom.js';
import { chessDna, dailyPlan, recommendations } from '../state/insights.js';
import { levelName, profile } from '../state/store.js';
import { t } from '../i18n.js';

export function renderHome(root: HTMLElement): void {
  const hour = new Date().getHours();
  const greet = t(hour < 13 ? 'home.morning' : hour < 20 ? 'home.afternoon' : 'home.evening');
  const kids = profile.settings.mode === 'kids';
  const [rec, ...alternatives] = recommendations();
  const dna = chessDna();
  const top = [...dna.dims].filter((d) => d.value !== null).sort((a, b) => b.value! - a.value!);
  const missions = dailyMissions(profile);
  const achievementsGot = ACHIEVEMENTS.filter((a) => profile.achievements[a.id]).length;

  const reasonBtn = h('button', { class: 'link', 'aria-expanded': 'false' }, t('home.why'));
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
        h('p', { class: 'muted' }, kids ? t('home.kidsStory') : t('home.level', { level: levelName(), rating: profile.gameRating }))),
      h('div', { class: 'streak', title: t('home.streak') }, `🔥 ${learningStreak(profile)}`)),

    h('div', { class: 'card card-focus' },
      h('p', { class: 'eyebrow' }, t('home.today')),
      h('h2', {}, rec!.title),
      reasonBtn, reason,
      h('div', { class: 'cta' }, primaryButton(rec!.cta.toUpperCase(), () => navigate(rec!.href))),
      h('p', { class: 'muted small center' }, t('home.plan', { min: profile.dailyMinutes, blocks: dailyPlan().length }), ' · ', h('a', { href: '#/plan' }, t('home.seePlan'))),
      others.length ? h('details', { class: 'alternatives' },
        h('summary', { class: 'small' }, t('home.other')),
        h('ul', {}, ...others.map((o) => h('li', {}, h('a', { href: o.href }, o.title), h('span', { class: 'muted small' }, ` — ${o.reason}`))))) : null),

    missions.length ? h('div', { class: 'card missions' },
      h('p', { class: 'eyebrow' }, kids ? `🦄 ${t('home.missions')}` : t('home.missions')),
      h('ul', {}, ...missions.map((m) => h('li', { class: `mission ${m.done ? 'done' : ''}` },
        h('span', { class: 'mission-check', 'aria-hidden': 'true' }, m.done ? '✅' : '○'),
        h('span', { class: 'mission-body' },
          h('span', {}, m.title),
          h('span', { class: 'bar' }, h('span', { class: 'bar-fill', style: `width:${(m.progress / m.target) * 100}%` })),
          h('span', { class: 'muted small' }, `${m.progress}/${m.target} · +${m.xp} XP${m.done ? ` · ${t('home.missionDone')}` : ''}`)))))) : null,

    h('a', { class: 'card card-link', href: '#/dna' },
      h('p', { class: 'eyebrow' }, t('home.dna')),
      dna.confidence === 'building' || top.length < 2
        ? h('p', {}, t('home.dnaBuilding', { n: dna.games }))
        : h('p', {}, `▲ ${top[0]!.label}  ·  ▼ ${top.at(-1)!.label}`, h('span', { class: 'muted small' }, ` — ${t('home.dnaBased', { n: dna.games })}`))),

    h('div', { class: 'home-links' },
      h('a', { class: 'card card-link', href: '#/report' }, h('p', { class: 'eyebrow' }, t('home.week')), h('p', {}, t('home.report'))),
      h('a', { class: 'card card-link', href: '#/coach' }, h('p', { class: 'eyebrow' }, t('home.coach')), h('p', {}, t('home.coachWhat'))),
      h('a', { class: 'card card-link', href: '#/achievements' }, h('p', { class: 'eyebrow' }, t('home.achievements')), h('p', {}, t('home.ofTotal', { a: achievementsGot, b: ACHIEVEMENTS.length })))),
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
