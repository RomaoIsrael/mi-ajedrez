/** Progreso: ratings, partidas, errores frecuentes, Error Reduction Rate y dominio de conceptos. */
import { STATE_ICON } from '@kavalo/pedagogy';
import { h, navigate, primaryButton, screen } from '../dom.js';
import { conceptProgress, errorReduction, mistakeStats } from '../state/insights.js';
import { levelName, profile } from '../state/store.js';

export function renderProgress(root: HTMLElement): void {
  const g = profile.games;
  const wins = g.filter((x) => x.userResult === 'win').length;
  const draws = g.filter((x) => x.userResult === 'draw').length;
  const stats = mistakeStats();
  const err = errorReduction();
  const tile = (label: string, value: string | number, sub = '') => h('div', { class: 'tile' }, h('span', { class: 'tile-val' }, String(value)), h('span', { class: 'tile-label' }, label), sub ? h('span', { class: 'muted small' }, sub) : null);
  const practised = conceptProgress().flatMap((s) => s.nodes).filter((n) => profile.mastery[n.node.id]);

  root.append(screen('Tu progreso',
    h('div', { class: 'tiles' },
      tile('Rating de partidas', profile.gameRating, levelName()),
      tile('Rating de puzzles', profile.puzzleRating),
      tile('Partidas', g.length, `${wins} V · ${draws} T · ${g.length - wins - draws} D`),
      tile('XP', profile.xp, `Racha: ${profile.streak.current} (mejor ${profile.streak.best})`)),

    h('div', { class: 'card' }, h('h2', {}, 'Errores frecuentes'),
      stats.length ? h('ul', { class: 'bars' }, ...stats.map((s) => h('li', {},
        h('span', {}, s.label), h('span', { class: 'bar' }, h('span', { class: 'bar-fill bar-bad', style: `width:${Math.min(100, s.perGame * 33)}%` })),
        h('span', { class: 'bar-val' }, `${s.perGame.toFixed(1)}/partida`))))
        : h('p', { class: 'muted' }, 'Todavía no hay errores registrados. Juega una partida con el coach.'),
      h('p', { class: 'muted small' }, 'Últimas 10 partidas.')),

    h('div', { class: 'card' }, h('h2', {}, 'Reducción de errores'),
      err ? h('ul', { class: 'err' }, ...err.map((e) => h('li', {}, h('strong', {}, e.label), `: ${e.before.toFixed(1)} → ${e.now.toFixed(1)} por partida `,
        h('span', { class: e.rate > 0 ? 'good' : 'bad' }, e.rate > 0 ? `mejora ${Math.round(e.rate * 100)} %` : 'sin mejora aún'))))
        : h('p', { class: 'muted' }, `Necesitamos al menos 10 partidas para comparar con honestidad (llevas ${g.length}).`)),

    h('div', { class: 'card' }, h('h2', {}, 'Conceptos'),
      practised.length ? h('ul', { class: 'concepts' }, ...practised.map((n) =>
        h('li', {}, h('span', { class: `node-icon st-${n.state}` }, STATE_ICON[n.state]), ` ${n.node.title}`, h('span', { class: 'muted small' }, ` · ${Math.round(profile.mastery[n.node.id]!.pKnown * 100)} % de confianza`))))
        : h('p', { class: 'muted' }, 'Completa tu primera lección para empezar.')),

    h('div', { class: 'card' }, h('h2', {}, 'Ejercicios desde tus partidas'),
      profile.personalPuzzles.length
        ? h('p', {}, `${profile.personalPuzzles.length} posiciones de tus errores se han convertido en ejercicios. Aparecerán como repasos (1, 3, 7, 14 y 30 días).`)
        : h('p', { class: 'muted' }, 'Cuando se te escape un mate o una captura, esa posición volverá como ejercicio personal.')),

    g.length ? h('div', { class: 'card' }, h('h2', {}, 'Partidas recientes'),
      h('ul', { class: 'games' }, ...g.slice(-8).reverse().map((x) => h('li', {}, h('a', { href: `#/analysis/${x.id}` },
        `${x.userResult === 'win' ? '✅' : x.userResult === 'draw' ? '🤝' : '❌'} ${new Date(x.at).toLocaleDateString('es')} · vs ${x.bot.personality} nivel ${x.bot.level}`))))) : null,
    h('div', { class: 'cta' }, primaryButton('VER MI ADN', () => navigate('#/dna'))),
  ));
}
