/** Reporte semanal o mensual: el periodo frente al anterior, exportable en Markdown. */
import { monthlyReport, reportToMarkdown, weeklyReport } from '@kavalo/coach';
import { button, h, navigate, primaryButton, screen } from '../dom.js';
import { profile } from '../state/store.js';

export function renderReport(root: HTMLElement, [period]: string[] = []): void {
  const month = period === 'month';
  const r = month ? monthlyReport(profile) : weeklyReport(profile);
  const prevName = month ? 'mes anterior' : 'semana anterior';
  const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)} %`);
  const signed = (v: number | null) => (v === null ? '—' : `${v >= 0 ? '+' : ''}${v}`);
  const tile = (label: string, value: string | number, sub = '') =>
    h('div', { class: 'tile' }, h('span', { class: 'tile-val' }, String(value)), h('span', { class: 'tile-label' }, label), sub ? h('span', { class: 'muted small' }, sub) : null);
  const d = (t: number) => new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short' });

  const tab = (label: string, href: string, on: boolean) => h('a', { class: `seg-btn ${on ? 'on' : ''}`, href, 'aria-current': on ? 'page' : 'false' }, label);
  root.append(screen(month ? 'Tu mes' : 'Tu semana',
    h('div', { class: 'seg', role: 'tablist' }, tab('Semana', '#/report', !month), tab('Mes', '#/report/month', month)),
    h('p', { class: 'muted' }, `${d(r.from)} – ${d(r.to)} · comparado con el ${prevName}`),
    h('div', { class: 'card card-focus' }, h('p', { class: 'eyebrow' }, 'Lo más importante'), h('h2', {}, r.headline)),
    h('div', { class: 'tiles' },
      tile('Días activos', r.activeDays, `${r.minutes} min de estudio`),
      tile('Lecciones nuevas', r.lessons, `${r.reviews.correct}/${r.reviews.done} repasos correctos`),
      tile('Puzzles', r.puzzles.solved, `Al primer intento: ${pct(r.puzzles.accuracy)} (antes ${pct(r.puzzles.prevAccuracy)})`),
      tile('Partidas', r.games.played, `${r.games.wins} V · ${r.games.draws} T · ${r.games.losses} D`),
      tile('Rating partidas', signed(r.rating.game)),
      tile('Rating puzzles', signed(r.rating.puzzle))),
    h('div', { class: 'card' }, h('h2', {}, 'Errores'),
      h('p', {}, `Por partida: ${r.mistakesPerGame.now === null ? '— (hacen falta 2 partidas)' : r.mistakesPerGame.now.toFixed(1)}`,
        r.mistakesPerGame.prev !== null ? ` · ${prevName}: ${r.mistakesPerGame.prev.toFixed(1)}` : ''),
      r.topMistake ? h('p', {}, `Error más frecuente: ${r.topMistake}`) : null,
      ...r.improved.map((i) => h('p', { class: 'good' }, `▼ ${i.label}: ${i.before.toFixed(1)} → ${i.now.toFixed(1)} por partida`)),
      !r.improved.length ? h('p', { class: 'muted small' }, `Solo mostramos una mejora cuando hay partidas suficientes en ambos periodos para compararla.`) : null),
    r.dnaChanges.length ? h('div', { class: 'card' }, h('h2', {}, 'Evolución de tu ADN'),
      ...r.dnaChanges.map((c) => h('p', { class: c.delta > 0 ? 'good' : 'bad' }, `${c.delta > 0 ? '▲' : '▼'} ${c.label}: ${c.before} → ${c.now}`))) : null,
    r.newStrengths.length ? h('div', { class: 'card' }, h('h2', {}, 'Nuevos puntos fuertes'), h('p', {}, r.newStrengths.join(' · '))) : null,
    h('div', { class: 'card' }, h('p', { class: 'eyebrow' }, 'Próximo foco'), h('p', {}, r.nextFocus)),
    h('div', { class: 'cta' },
      primaryButton('CONTINUAR ENTRENAMIENTO', () => navigate('#/')),
      button('Exportar reporte (.md)', () => {
        const blob = new Blob([reportToMarkdown(r, profile.name)], { type: 'text/markdown' });
        const a = h('a', { href: URL.createObjectURL(blob), download: `kavalo-reporte-${month ? 'mensual' : 'semanal'}-${new Date(r.to).toISOString().slice(0, 10)}.md` });
        a.click();
        URL.revokeObjectURL(a.href);
      })),
  ));
}
