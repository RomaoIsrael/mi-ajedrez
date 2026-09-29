/**
 * Reporte semanal (docs/06-inteligencia.md §10, brief §76): compara los últimos 7 días con
 * los 7 anteriores. Solo afirma mejoras cuando hay datos suficientes para compararlas.
 */
import { conceptById } from '@kavalo/content';
import { compareDna, computeDna, type DnaChange } from '@kavalo/dna';
import { recommend } from './recommend.js';
import { KIND_LABEL, mistakeStats } from './stats.js';
import { DAY, dayKey, type CoachState } from './types.js';

export interface WeeklyReport {
  from: number;
  to: number;
  minutes: number;
  activeDays: number;
  lessons: number;
  reviews: { done: number; correct: number };
  puzzles: { solved: number; firstTry: number; accuracy: number | null; prevAccuracy: number | null };
  games: { played: number; wins: number; draws: number; losses: number };
  rating: { game: number | null; puzzle: number | null };
  mistakesPerGame: { now: number | null; prev: number | null };
  topMistake: string | null;
  improved: { label: string; before: number; now: number }[];
  newStrengths: string[];
  headline: string;
  nextFocus: string;
  days: number;
  /** Cambios significativos del ADN en el periodo (si hay instantáneas). */
  dnaChanges: DnaChange[];
}

function ratingDelta(state: CoachState, kind: 'game' | 'puzzle', from: number, to: number): number | null {
  const inWeek = state.ratingHistory.filter((r) => r.kind === kind && r.at >= from && r.at < to);
  if (!inWeek.length) return null;
  const before = [...state.ratingHistory].reverse().find((r) => r.kind === kind && r.at < from)?.rating;
  const start = before ?? inWeek[0]!.rating;
  return Math.round(inWeek.at(-1)!.rating - start);
}

/** Reporte de los últimos 7 días frente a los 7 anteriores. */
export function weeklyReport(state: CoachState, now = Date.now()): WeeklyReport {
  return periodReport(state, 7, now);
}

/** Reporte mensual (30 días frente a los 30 anteriores), con la evolución del ADN. */
export function monthlyReport(state: CoachState, now = Date.now()): WeeklyReport {
  return periodReport(state, 30, now);
}

export function periodReport(state: CoachState, days: number, now = Date.now()): WeeklyReport {
  const to = now;
  const from = now - days * DAY;
  const prevFrom = from - days * DAY;
  const week = state.activity.filter((a) => a.at >= from && a.at < to);
  const prevWeek = state.activity.filter((a) => a.at >= prevFrom && a.at < from);

  const puzzleStats = (ev: typeof week) => {
    const attempts = ev.filter((a) => a.kind === 'puzzle');
    const first = attempts.filter((a) => a.ok && !a.hints).length;
    return { solved: attempts.filter((a) => a.ok).length, firstTry: first, accuracy: attempts.length >= 3 ? first / attempts.length : null };
  };
  const pw = puzzleStats(week);
  const pp = puzzleStats(prevWeek);

  const games = state.games.filter((g) => g.at >= from && g.at < to);
  const prevGames = state.games.filter((g) => g.at >= prevFrom && g.at < from);
  const perGame = (gs: typeof games) => {
    if (gs.length < 2) return null;
    const ids = new Set(gs.map((g) => g.id));
    return state.mistakes.filter((m) => ids.has(m.gameId)).length / gs.length;
  };
  const nowStats = mistakeStats(state, games.map((g) => g.id));
  const prevStats = mistakeStats(state, prevGames.map((g) => g.id));
  const improved = games.length >= 2 && prevGames.length >= 2
    ? prevStats.map((p) => ({ label: p.label, before: p.perGame, now: nowStats.find((n) => n.kind === p.kind)?.perGame ?? 0 }))
      .filter((x) => x.before > 0 && x.now <= x.before * 0.7)
    : [];

  const newStrengths = [...new Set(week.filter((a) => a.kind === 'mastery' && (a.state === 'understood' || a.state === 'mastered' || a.state === 'mastery'))
    .map((a) => conceptById(a.concept ?? '')?.title).filter((t): t is string => !!t))];

  const reviews = week.filter((a) => a.kind === 'review');
  const lessons = week.filter((a) => a.kind === 'lesson' && a.first).length;
  const minutes = Math.round(week.reduce((sum, a) => sum + a.ms, 0) / 60_000);
  const activeDays = new Set(week.filter((a) => a.kind !== 'mastery').map((a) => dayKey(a.at))).size;
  const rating = { game: ratingDelta(state, 'game', from, to), puzzle: ratingDelta(state, 'puzzle', from, to) };
  const mpg = { now: perGame(games), prev: perGame(prevGames) };

  const periodName = days === 7 ? 'Esta semana' : 'Este mes';
  const snapshots = state.dnaSnapshots ?? [];
  const baseline = [...snapshots].reverse().find((sn) => sn.at <= from) ?? snapshots[0];
  const features = state.games.map((g) => g.features).filter((f): f is NonNullable<typeof f> => !!f);
  const currentDna = computeDna(features);
  const dnaChanges = baseline && currentDna.confidence !== 'building' && baseline.at < now - DAY
    ? compareDna(baseline, currentDna).filter((c) => c.significant) : [];

  let headline: string;
  if (activeDays === 0) headline = `${periodName} no hubo entrenamiento. ¡Cinco minutos hoy ya cuentan!`;
  else if (improved.length) headline = `Tu error «${improved[0]!.label.toLowerCase()}» ha bajado de ${improved[0]!.before.toFixed(1)} a ${improved[0]!.now.toFixed(1)} por partida.`;
  else if (newStrengths.length) headline = `Nuevo punto fuerte: ${newStrengths[0]}.`;
  else if (lessons) headline = `${lessons} ${lessons === 1 ? 'concepto nuevo aprendido' : 'conceptos nuevos aprendidos'} en ${activeDays} ${activeDays === 1 ? 'día' : 'días'} de entrenamiento.`;
  else if (dnaChanges.some((c) => c.delta > 0)) headline = `Tu ADN evoluciona: ${dnaChanges.find((c) => c.delta > 0)!.label.toLowerCase()} ha subido de ${dnaChanges.find((c) => c.delta > 0)!.before} a ${dnaChanges.find((c) => c.delta > 0)!.now}.`;
  else headline = `${activeDays} ${activeDays === 1 ? 'día' : 'días'} de entrenamiento ${days === 7 ? 'esta semana' : 'este mes'}.`;

  return {
    from, to, minutes, activeDays, lessons,
    reviews: { done: reviews.length, correct: reviews.filter((r) => r.ok).length },
    puzzles: { solved: pw.solved, firstTry: pw.firstTry, accuracy: pw.accuracy, prevAccuracy: pp.accuracy },
    games: {
      played: games.length, wins: games.filter((g) => g.userResult === 'win').length,
      draws: games.filter((g) => g.userResult === 'draw').length, losses: games.filter((g) => g.userResult === 'loss').length,
    },
    rating, mistakesPerGame: mpg,
    topMistake: nowStats[0] ? KIND_LABEL[nowStats[0].kind] ?? nowStats[0].kind : null,
    improved, newStrengths, headline, nextFocus: recommend(state, now).title, days, dnaChanges,
  };
}

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)} %`);
const signed = (v: number | null) => (v === null ? '—' : `${v >= 0 ? '+' : ''}${v}`);

/** Versión en Markdown para exportar o compartir. */
export function reportToMarkdown(r: WeeklyReport, name = ''): string {
  const d = (t: number) => new Date(t).toLocaleDateString('es');
  return [
    `# Reporte ${r.days === 7 ? 'semanal' : 'mensual'}${name ? ` de ${name}` : ''}`,
    `${d(r.from)} – ${d(r.to)}`,
    '',
    `**${r.headline}**`,
    '',
    `- Días activos: ${r.activeDays} · Tiempo de estudio: ${r.minutes} min`,
    `- Lecciones nuevas: ${r.lessons} · Repasos: ${r.reviews.correct}/${r.reviews.done} correctos`,
    `- Puzzles resueltos: ${r.puzzles.solved} · Precisión al primer intento: ${pct(r.puzzles.accuracy)} (${r.days === 7 ? 'semana anterior' : 'mes anterior'}: ${pct(r.puzzles.prevAccuracy)})`,
    `- Partidas: ${r.games.played} (${r.games.wins} V · ${r.games.draws} T · ${r.games.losses} D)`,
    `- Rating de partidas: ${signed(r.rating.game)} · Rating de puzzles: ${signed(r.rating.puzzle)}`,
    `- Errores por partida: ${r.mistakesPerGame.now === null ? '—' : r.mistakesPerGame.now.toFixed(1)} (${r.days === 7 ? 'semana anterior' : 'mes anterior'}: ${r.mistakesPerGame.prev === null ? '—' : r.mistakesPerGame.prev.toFixed(1)})`,
    r.topMistake ? `- Error más frecuente: ${r.topMistake}` : '',
    ...r.improved.map((i) => `- Mejora: ${i.label} ${i.before.toFixed(1)} → ${i.now.toFixed(1)} por partida`),
    r.newStrengths.length ? `- Nuevos puntos fuertes: ${r.newStrengths.join(', ')}` : '',
    ...r.dnaChanges.map((c) => `- ADN · ${c.label}: ${c.before} → ${c.now}`),
    '',
    `**Próximo foco:** ${r.nextFocus}`,
  ].filter((l) => l !== '').join('\n') + '\n';
}
