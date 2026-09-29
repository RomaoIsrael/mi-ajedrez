/** Análisis post‑partida: resultado, precisión humana y LOS 3 MOMENTOS más importantes. */
import { Game, localizeSan, type PlayedMove } from '@kavalo/chess-core';
import { conceptById, LESSONS } from '@kavalo/content';
import { analyzeMove, explain, hintLadder, moveEffects, SEVERITY_LABEL, SEVERITY_SYMBOL, type MoveAnalysis } from '@kavalo/tactics';
import { bestMove } from '@kavalo/bots';
import { Board } from '../components/board.js';
import { drawToggle, moveNavigator } from '../components/board-tools.js';
import { coachBubble } from '../components/coach.js';
import { button, h, navigate, primaryButton, screen } from '../dom.js';
import { explanationLevel, mastery, profile } from '../state/store.js';

interface Row { ply: number; played: PlayedMove; analysis: MoveAnalysis }

const RANK = { excellent: 0, good: 1, ok: 2, inaccuracy: 3, mistake: 4, blunder: 5 } as const;

export function renderAnalysis(root: HTMLElement, [id]: string[]): void | (() => void) {
  const record = profile.games.find((g) => g.id === id);
  if (!record) {
    root.append(screen('Partida no encontrada', primaryButton('Volver', () => navigate('#/progress'))));
    return;
  }
  const game = Game.fromPgn(record.pgn);
  const rows: Row[] = game.history
    .map((played, ply) => ({ ply, played }))
    .filter((r) => r.played.move.color === record.userColor)
    .map((r) => ({ ...r, analysis: analyzeMove(r.played.before, r.played.move) }));

  const errors = rows.filter((r) => RANK[r.analysis.severity] >= 4);
  const clean = rows.filter((r) => RANK[r.analysis.severity] <= 2).length;
  const accuracy = rows.length ? clean / rows.length : 1;
  const accuracyLabel = accuracy >= 0.9 ? 'muy buena' : accuracy >= 0.75 ? 'buena' : accuracy >= 0.6 ? 'aceptable' : 'mejorable';

  // MOMENTO 1: la mejor decisión (mate, captura ganadora o jugada con más efectos positivos).
  const bestRow = rows.filter((r) => r.analysis.severity === 'excellent' || r.analysis.severity === 'good')
    .sort((a, b) => RANK[a.analysis.severity] - RANK[b.analysis.severity])[0]
    ?? rows.filter((r) => r.analysis.severity === 'ok')
      .map((r) => ({ r, n: moveEffects(r.played.before, r.played.move).length }))
      .sort((a, b) => b.n - a.n)[0]?.r;
  // MOMENTO 2: dónde empezó el problema (primer error serio).
  const firstError = errors[0];
  // MOMENTO 3: lo que debes aprender (error más grave del concepto menos dominado).
  const learnRow = [...errors].sort((a, b) =>
    RANK[b.analysis.severity] - RANK[a.analysis.severity]
    || mastery(a.analysis.concept!).pKnown - mastery(b.analysis.concept!).pKnown)[0];

  const board = new Board({ orientation: record.userColor, coordinates: profile.settings.coordinates, reduceMotion: profile.settings.reduceMotion });
  const detail = h('div', { class: 'moment-detail' });
  const title = record.userResult === 'win' ? 'Victoria' : record.userResult === 'draw' ? 'Tablas' : 'Derrota';
  const study = learnRow?.analysis.concept ? conceptById(learnRow.analysis.concept) : undefined;

  const total = game.history.length + 1;
  const nav = moveNavigator((ply) => goto(ply));

  /** Navegación libre: muestra la posición tras `ply` medias jugadas y, si te toca, analiza tu jugada. */
  const goto = (ply: number) => {
    const row = rows.find((r) => r.ply === ply);
    if (row) return showRow(row, SEVERITY_LABEL.es[row.analysis.severity], false);
    const played = game.history[ply - 1];
    board.clearMarks();
    board.setPosition(ply === 0 ? game.history[0]!.before : played!.after, played ? { from: played.move.from, to: played.move.to } : null, false);
    detail.replaceChildren(played ? coachBubble([h('p', { class: 'muted' }, `${Math.floor((ply - 1) / 2) + 1}${played.move.color === 'w' ? '.' : '…'} ${localizeSan(played.san, 'es')} — jugada del rival.`)]) : '');
    nav.update(total, ply);
  };

  const showRow = (r: Row, heading: string, scroll = true) => {
    nav.update(total, r.ply);
    board.clearMarks();
    board.setPosition(r.played.before, r.ply > 0 ? { from: game.history[r.ply - 1]!.move.from, to: game.history[r.ply - 1]!.move.to } : null, false);
    const e = explain(r.analysis, { level: explanationLevel() });
    const moveLabel = `${Math.floor(r.ply / 2) + 1}${r.played.move.color === 'w' ? '.' : '…'} ${localizeSan(r.played.san, 'es')}`;
    board.setArrows([{ from: r.played.move.from, to: r.played.move.to, color: RANK[r.analysis.severity] >= 3 ? 'danger' : 'good' }]);
    board.setHighlights(e.highlights, RANK[r.analysis.severity] >= 3 ? 'bad' : 'good');
    const effects = moveEffects(r.played.before, r.played.move);
    const acts: HTMLElement[] = [];
    if (RANK[r.analysis.severity] >= 3) {
      acts.push(button('Ver la jugada correcta', () => {
        const ladder = hintLadder(r.played.before, { fallback: bestMove(r.played.before, 2) ?? undefined });
        if (!ladder) return;
        const final = ladder.steps[4]!;
        board.setArrows(final.arrows);
        detail.append(coachBubble([h('p', { class: 'msg msg-good' }, final.text)]));
      }));
      if (r.analysis.primary?.move) {
        acts.push(button('¿Qué pasaba después?', () => {
          const m = r.analysis.primary!.move!;
          board.setPosition(r.played.after, { from: r.played.move.from, to: r.played.move.to }, false);
          board.setArrows([{ from: m.from, to: m.to, color: 'danger' }]);
        }));
      }
    } else if (effects.length) {
      acts.push(button('¿Por qué es buena?', () => {
        board.setArrows(effects.flatMap((x) => x.arrows));
        detail.append(coachBubble([h('ul', {}, ...effects.map((x) => h('li', {}, x.text)))]));
      }));
    }
    detail.replaceChildren(coachBubble([
      h('p', { class: 'eyebrow' }, heading),
      h('h3', { class: `exp-title sev-${r.analysis.severity}` }, `${moveLabel} ${SEVERITY_SYMBOL[r.analysis.severity]} · ${e.title}`),
      ...[e.why, e.consequence, e.whatToNotice].filter(Boolean).map((t) => h('p', {}, t!)),
    ], acts));
    if (scroll) detail.scrollIntoView({ behavior: profile.settings.reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  };

  const momentCard = (icon: string, label: string, r: Row | undefined, empty: string) =>
    h('button', { class: 'card moment', disabled: !r, onclick: (() => r && showRow(r, label)) as EventListener },
      h('span', { class: 'moment-icon' }, icon),
      h('span', {}, h('strong', {}, label), h('span', { class: 'muted small' },
        r ? ` Jugada ${Math.floor(r.ply / 2) + 1}: ${localizeSan(r.played.san, 'es')}` : ` ${empty}`)));

  const lesson = study ? LESSONS.find((l) => l.conceptId === study.id) : undefined;
  root.append(screen(`${title} · precisión ${accuracyLabel}`,
    h('p', { class: 'muted' }, `${rows.length} jugadas tuyas · ${errors.length} errores importantes${study ? ` · Concepto a estudiar: ${study.title}` : ''}`),
    momentCard('⭐', 'Momento 1 · Lo hiciste muy bien', bestRow, 'Aún no hay una jugada destacada.'),
    momentCard('⚠', 'Momento 2 · Aquí empezó el problema', firstError, 'No hubo errores graves. ¡Bien!'),
    momentCard('🎯', 'Momento 3 · Esto debes aprender', learnRow, 'Sigue practicando para detectar tu siguiente reto.'),
    h('div', { class: 'board-holder' }, board.el),
    h('div', { class: 'analysis-tools' }, nav.el, drawToggle(board)),
    detail,
    h('details', { class: 'card' }, h('summary', {}, 'Ver todas tus jugadas'),
      h('ol', { class: 'movelist' }, ...rows.map((r) => h('li', {},
        h('button', { class: `link mv sev-${r.analysis.severity}`, onclick: (() => showRow(r, SEVERITY_LABEL.es[r.analysis.severity])) as EventListener },
          `${Math.floor(r.ply / 2) + 1}. ${localizeSan(r.played.san, 'es')} ${SEVERITY_SYMBOL[r.analysis.severity]}`))))),
    h('p', { class: 'muted small' }, 'Análisis del prototipo con detectores tácticos de 1–2 jugadas. La Fase 6 añade Stockfish para evaluar también errores posicionales.'),
    h('div', { class: 'cta' },
      learnRow
        ? primaryButton('PRACTICAR ESTO AHORA', () => navigate(lesson && !profile.completedLessons.includes(lesson.id) ? `#/lesson/${lesson.id}` : `#/puzzles/${learnRow.analysis.concept}`))
        : primaryButton('NUEVA PARTIDA', () => navigate('#/play')),
      button('Copiar PGN', () => { void navigator.clipboard?.writeText(record.pgn); })),
  ));
  const initial = learnRow ?? firstError ?? bestRow;
  if (initial) showRow(initial, initial === learnRow ? 'Momento 3 · Esto debes aprender' : initial === firstError ? 'Momento 2 · Aquí empezó el problema' : 'Momento 1 · Lo hiciste muy bien', false);
  else goto(game.history.length);
  return () => nav.destroy();
}
