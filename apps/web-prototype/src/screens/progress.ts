/** Progreso: ratings, partidas, errores frecuentes, Error Reduction Rate y dominio de conceptos. */
import { STATE_ICON } from '@kavalo/pedagogy';
import { learningStreak } from '@kavalo/coach';
import { button, h, navigate, primaryButton, screen } from '../dom.js';
import { download } from '../components/board-image.js';
import { planMarkdown, statsCsv } from '../state/exports.js';
import { chessDna, conceptProgress, errorReduction, mistakeStats } from '../state/insights.js';
import { Game } from '@kavalo/chess-core';
import { AREA_LABEL, detectOpening } from '@kavalo/content';
import { radar, type RadarValue } from './dna.js';
import { levelName, profile, SKILL_LABEL, type SkillArea } from '../state/store.js';

interface Dashboard { accuracy: number | null; mistakesPerGame: number | null; chances: number | null; endgame: number | null; moveSec: number | null; openings: { id: string; name: string; games: number; score: number }[] }

/** Métricas del dashboard (brief §48), solo con datos reales. */
function dashboard(): Dashboard {
  const f = profile.games.slice(-30).map((x) => x.features).filter((x): x is NonNullable<typeof x> => !!x);
  const mean = (pick: (x: (typeof f)[number]) => { sum: number; n: number }) => {
    const s = f.reduce((a, x) => ({ sum: a.sum + pick(x).sum, n: a.n + pick(x).n }), { sum: 0, n: 0 });
    return s.n >= 6 ? Math.round(s.sum / s.n) : null;
  };
  const chances = f.reduce((a, x) => a + x.chances, 0);
  const timed = f.filter((x) => x.avgMoveMs !== null);
  const last10 = profile.games.slice(-10);
  const openings = new Map<string, { id: string; name: string; games: number; points: number }>();
  for (const game of profile.games) {
    try {
      const sans = Game.fromPgn(game.pgn).history.slice(0, 12).map((p) => p.san);
      const o = detectOpening(sans);
      if (!o) continue;
      const e = openings.get(o.id) ?? { id: o.id, name: o.name, games: 0, points: 0 };
      e.games++;
      e.points += game.userResult === 'win' ? 1 : game.userResult === 'draw' ? 0.5 : 0;
      openings.set(o.id, e);
    } catch { /* PGN antiguo o dañado: se ignora */ }
  }
  return {
    accuracy: mean((x) => x.accuracy), endgame: mean((x) => x.endgame),
    chances: chances >= 4 ? Math.round((f.reduce((a, x) => a + x.chancesTaken, 0) / chances) * 100) : null,
    moveSec: timed.length ? Math.round(timed.reduce((a, x) => a + x.avgMoveMs!, 0) / timed.length / 100) / 10 : null,
    mistakesPerGame: last10.length >= 2 ? profile.mistakes.filter((m) => last10.some((x) => x.id === m.gameId)).length / last10.length : null,
    openings: [...openings.values()].sort((a, b) => b.games - a.games).slice(0, 4).map((o) => ({ id: o.id, name: o.name, games: o.games, score: Math.round((o.points / o.games) * 100) })),
  };
}

/** Radar de habilidades (brief §49): dominio de conceptos + ADN medido. */
function skills(): RadarValue[] {
  const dna = chessDna();
  const dnaV = (k: string) => (dna.confidence === 'building' ? null : dna.dims.find((x) => x.key === k)?.value ?? null);
  const sect = (prefix: string) => {
    const ms = Object.values(profile.mastery).filter((m) => m.conceptId.startsWith(prefix) && m.attempts > 0);
    return ms.length ? Math.round((ms.reduce((a, m) => a + m.pKnown, 0) / ms.length) * 100) : null;
  };
  const vision = Object.values(profile.training.vision).reduce((a, v) => ({ c: a.c + v.correct, n: a.n + v.total }), { c: 0, n: 0 });
  const visionTrain = vision.n >= 5 ? Math.round((vision.c / vision.n) * 100) : null;
  const avg = (...xs: (number | null)[]) => { const v = xs.filter((x): x is number => x !== null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
  return [
    { key: 'tactics', label: 'Táctica', value: avg(dnaV('tactics'), sect('tactics.')) },
    { key: 'strategy', label: 'Estrategia', value: avg(dnaV('strategy'), sect('strategy.')) },
    { key: 'openings', label: 'Apertura', value: sect('openings.') },
    { key: 'calculation', label: 'Cálculo', value: avg(dnaV('calculation'), sect('calculation.')) },
    { key: 'endgame', label: 'Finales', value: avg(dnaV('endgame'), sect('endgame.')) },
    { key: 'defense', label: 'Defensa', value: dnaV('defense') },
    { key: 'attack', label: 'Ataque', value: dnaV('attack') },
    { key: 'vision', label: 'Visión', value: avg(sect('vision.'), visionTrain) },
    { key: 'planning', label: 'Planificación', value: sect('planning.') },
  ];
}

/** Progresión del rating de partidas (una serie, con etiqueta del último valor). */
function ratingSparkline(): HTMLElement | null {
  const pts = profile.ratingHistory.filter((r) => r.kind === 'game').slice(-40);
  if (pts.length < 2) return null;
  const W = 300;
  const H = 70;
  const min = Math.min(...pts.map((p) => p.rating)) - 10;
  const max = Math.max(...pts.map((p) => p.rating)) + 10;
  const x = (i: number) => (i / (pts.length - 1)) * (W - 40);
  const y = (r: number) => H - 8 - ((r - min) / (max - min)) * (H - 16);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.rating).toFixed(1)}`).join('');
  const last = pts.at(-1)!;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'sparkline');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Rating de partidas: de ${pts[0]!.rating} a ${last.rating} en las últimas ${pts.length} partidas`);
  svg.innerHTML = `<path class="line" d="${path}"/><circle class="dot" r="4" cx="${x(pts.length - 1)}" cy="${y(last.rating)}"/><text class="spark-label" x="${x(pts.length - 1) + 8}" y="${y(last.rating) + 4}">${last.rating}</text>`;
  return h('div', { class: 'card' }, h('p', { class: 'eyebrow' }, 'Progresión del rating de partidas'), svg);
}

export function renderProgress(root: HTMLElement): void {
  const g = profile.games;
  const wins = g.filter((x) => x.userResult === 'win').length;
  const draws = g.filter((x) => x.userResult === 'draw').length;
  const stats = mistakeStats();
  const err = errorReduction();
  const tile = (label: string, value: string | number, sub = '') => h('div', { class: 'tile' }, h('span', { class: 'tile-val' }, String(value)), h('span', { class: 'tile-label' }, label), sub ? h('span', { class: 'muted small' }, sub) : null);
  const practised = conceptProgress().flatMap((s) => s.nodes).filter((n) => profile.mastery[n.node.id]);

  const d = dashboard();
  root.append(screen('Tu progreso',
    h('div', { class: 'tiles' },
      tile('Rating de partidas', profile.gameRating, levelName()),
      tile('Rating de puzzles', profile.puzzleRating),
      tile('Partidas', g.length, `${wins} V · ${draws} T · ${g.length - wins - draws} D`),
      tile('XP', profile.xp, `Racha: ${learningStreak(profile)} (mejor ${Math.max(profile.streak.best, learningStreak(profile))})`),
      tile('Precisión media', d.accuracy === null ? '—' : `${d.accuracy} %`, 'últimas partidas analizadas'),
      tile('Errores por partida', d.mistakesPerGame === null ? '—' : d.mistakesPerGame.toFixed(1), 'últimas 10 partidas'),
      tile('Táctica en partidas', d.chances === null ? '—' : `${d.chances} %`, 'oportunidades aprovechadas'),
      tile('Precisión en finales', d.endgame === null ? '—' : `${d.endgame} %`),
      tile('Tiempo por jugada', d.moveSec === null ? '—' : `${d.moveSec} s`, 'media')),
    ratingSparkline(),
    h('div', { class: 'card' }, h('h2', {}, 'Ratings por área'),
      h('ul', { class: 'bars' }, ...(Object.keys(SKILL_LABEL) as SkillArea[]).map((k) => h('li', {},
        h('span', {}, SKILL_LABEL[k]), h('span', { class: 'bar' }, h('span', { class: 'bar-fill', style: `width:${Math.min(100, profile.skillRatings[k] / 25)}%` })),
        h('span', { class: 'bar-val' }, String(profile.skillRatings[k]))))),
      h('p', { class: 'muted small' }, 'Se actualizan con los puzzles, el cálculo, las aperturas practicadas y las partidas históricas de cada área.')),
    h('div', { class: 'card' }, h('h2', {}, 'Radar de habilidades'), radar(skills()),
      h('p', { class: 'muted small' }, 'Combina tu dominio de cada concepto con tu ADN medido con Stockfish. Sin datos, el eje queda en el centro.')),
    d.openings.length ? h('div', { class: 'card' }, h('h2', {}, 'Aperturas que juegas'),
      h('ul', {}, ...d.openings.map((o) => h('li', {}, h('a', { href: `#/openings/${o.id}` }, o.name), ` · ${o.games} ${o.games === 1 ? 'partida' : 'partidas'} · ${o.score} % de puntos`)))) : null,
    profile.assessment ? h('div', { class: 'card' }, h('h2', {}, 'Evaluación inicial'),
      h('p', {}, `${profile.assessment.score}/${profile.assessment.total} ejercicios · nivel estimado ${profile.assessment.rating}`),
      h('ul', { class: 'small' }, ...Object.entries(profile.assessment.byArea).filter(([, v]) => v.total).map(([k, v]) => h('li', {}, `${AREA_LABEL[k as keyof typeof AREA_LABEL]}: ${v.correct}/${v.total}`)))) : null,

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
        `${x.userResult === 'win' ? '✅' : x.userResult === 'draw' ? '🤝' : '❌'} ${new Date(x.at).toLocaleDateString('es')} · ${x.mode === 'import' ? 'partida importada' : `vs ${x.bot.personality} nivel ${x.bot.level}`}`))))) : null,
    h('div', { class: 'home-links' },
      h('a', { class: 'card card-link', href: '#/report' }, h('p', { class: 'eyebrow' }, 'Tu semana'), h('p', {}, 'Reporte semanal')),
      h('a', { class: 'card card-link', href: '#/achievements' }, h('p', { class: 'eyebrow' }, 'Logros'), h('p', {}, 'Ver todos'))),
    h('div', { class: 'card' }, h('h2', {}, 'Importar y exportar'),
      h('div', { class: 'cta' },
        button('📥 Importar partida (PGN) o posición (FEN)', () => navigate('#/import')),
        button('Exportar estadísticas (CSV)', () => download(`kavalo-estadisticas-${new Date().toISOString().slice(0, 10)}.csv`, statsCsv(), 'text/csv')),
        button('Exportar plan de entrenamiento (.md)', () => download(`kavalo-plan-${new Date().toISOString().slice(0, 10)}.md`, planMarkdown(), 'text/markdown')),
        button('Exportar todas mis partidas (PGN)', () => download('kavalo-partidas.pgn', profile.games.map((x) => x.pgn.trim()).join('\n\n') + '\n', 'application/x-chess-pgn'), { disabled: !g.length }))),
    h('div', { class: 'cta' }, primaryButton('VER MI ADN', () => navigate('#/dna'))),
  ));
}
