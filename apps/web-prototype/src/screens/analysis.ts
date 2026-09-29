/**
 * Análisis post‑partida (brief §27–30): resultado, precisión, gráfica de la partida y LOS 3
 * MOMENTOS más importantes. Con Stockfish, cada jugada se clasifica por pérdida de
 * probabilidad de victoria y se explica (táctica o posicionalmente); sin motor se usa el
 * análisis táctico propio. Incluye «¿Por qué?» y «¿Qué pasaba si…?».
 */
import { bestMove } from '@kavalo/bots';
import { Game, localizeSan, moveToUci, parseMove, type PlayedMove, type Position, type Square } from '@kavalo/chess-core';
import { conceptById, LESSONS } from '@kavalo/content';
import { describeEval, formatEval, scoreToCp, winProb } from '@kavalo/engine';
import {
  analyzeMove, CLASS_LABEL, CLASS_SYMBOL, explain, hintLadder, moveEffects, pvToSan, reviewGame,
  SEVERITY_LABEL, SEVERITY_SYMBOL, type Explanation, type PositionEval, type ReviewedMove,
} from '@kavalo/tactics';
import { Board } from '../components/board.js';
import { drawToggle, moveNavigator } from '../components/board-tools.js';
import { coachBubble } from '../components/coach.js';
import { append, button, h, navigate, primaryButton, screen } from '../dom.js';
import { evaluate, getEngine } from '../engine.js';
import { addReview, explanationLevel, mastery, profile, save, uid, type GameRecord } from '../state/store.js';

interface Row {
  ply: number;
  played: PlayedMove;
  /** 0 = mejor … 5 = error grave. */
  rank: number;
  label: string;
  symbol: string;
  css: string;
  explanation: Explanation;
  concept: string | null;
  engine?: ReviewedMove;
}

const CLASS_RANK: Record<ReviewedMove['moveClass'], number> = {
  brilliant: 0, best: 0, excellent: 1, book: 1, good: 2, inaccuracy: 3, mistake: 4, 'missed-win': 5, blunder: 5,
};
const CLASS_CSS: Record<ReviewedMove['moveClass'], string> = {
  brilliant: 'excellent', best: 'excellent', excellent: 'good', book: 'good', good: 'good',
  inaccuracy: 'inaccuracy', mistake: 'mistake', 'missed-win': 'blunder', blunder: 'blunder',
};
const SEV_RANK = { excellent: 0, good: 1, ok: 2, inaccuracy: 3, mistake: 4, blunder: 5 } as const;

function tacticalRows(game: Game, color: 'w' | 'b'): Row[] {
  return game.history.map((played, ply) => ({ ply, played })).filter((r) => r.played.move.color === color).map(({ ply, played }) => {
    const a = analyzeMove(played.before, played.move);
    return {
      ply, played, rank: SEV_RANK[a.severity], label: SEVERITY_LABEL.es[a.severity], symbol: SEVERITY_SYMBOL[a.severity],
      css: a.severity, explanation: explain(a, { level: explanationLevel() }), concept: a.concept,
    };
  });
}

function engineRows(game: Game, record: GameRecord): { rows: Row[]; accuracy: number | null } {
  const review = reviewGame(game.history, record.evals!, { level: explanationLevel(), fromStart: !/\[FEN /.test(record.pgn) });
  const rows = review.moves.filter((m) => m.color === record.userColor).map((m) => ({
    ply: m.ply, played: game.history[m.ply]!, rank: CLASS_RANK[m.moveClass], label: CLASS_LABEL.es[m.moveClass],
    symbol: CLASS_SYMBOL[m.moveClass], css: CLASS_CSS[m.moveClass], explanation: m.explanation, concept: m.concept, engine: m,
  }));
  return { rows, accuracy: review.accuracy[record.userColor] };
}

/** Evalúa todas las posiciones de la partida con Stockfish (con progreso). */
async function computeEvals(game: Game, onProgress: (done: number, total: number) => void): Promise<PositionEval[] | null> {
  const positions = [game.history[0]?.before ?? game.position, ...game.history.map((p) => p.after)];
  const out: PositionEval[] = [];
  for (let i = 0; i < positions.length; i++) {
    const e = await evaluate(positions[i]!, { depth: 11 });
    if (!e) return null;
    out.push({ ...e, pv: e.pv.slice(0, 8) });
    onProgress(i + 1, positions.length);
  }
  return out;
}

/**
 * Registra una vez los errores que solo el motor detecta (posicionales, victorias perdidas) y
 * convierte los momentos decisivos con solución única en ejercicios personales (brief §44).
 */
async function recordEngineFindings(record: GameRecord, game: Game, rows: Row[]): Promise<number> {
  if (record.engineRecorded) return 0;
  record.engineRecorded = true;
  let created = 0;
  for (const r of rows) {
    const m = r.engine;
    if (!m || (m.moveClass !== 'mistake' && m.moveClass !== 'blunder' && m.moveClass !== 'missed-win')) continue;
    const fen = r.played.before.toFen();
    const tactical = profile.mistakes.some((x) => x.gameId === record.id && x.fen === fen);
    if (!tactical) {
      profile.mistakes.push({
        at: record.at, gameId: record.id, kind: m.moveClass === 'missed-win' ? 'missed-win' : 'positional',
        concept: 'calculation.candidates', severity: m.moveClass, fen, uci: m.uci,
      });
    }
    if (!m.bestUci || profile.personalPuzzles.some((p) => p.fen === fen)) continue;
    // Solo se crea el ejercicio si la mejor jugada es claramente única (MultiPV 2).
    const engine = await getEngine();
    if (!engine) break;
    const a = await engine.analyse(fen, { depth: 12, multipv: 2 });
    const [first, second] = a.lines;
    if (!first || first.pv[0] !== m.bestUci) continue;
    const gap = second ? scoreToCp(first) - scoreToCp(second) : Infinity;
    if (gap < 150 || scoreToCp(first) < 100) continue;
    const id = `pp-${uid()}`;
    profile.personalPuzzles.push({
      id, fen, accept: [m.bestUci], concept: r.concept ?? 'calculation.candidates', createdAt: Date.now(), gameId: record.id,
      goal: first.mate !== undefined && first.mate > 0 ? 'mate' : 'material',
    });
    addReview(r.concept ?? 'calculation.candidates', id);
    created++;
  }
  save();
  return created;
}

/** Gráfica de la partida: probabilidad de victoria de las blancas por jugada (una serie). */
function evalChart(record: GameRecord, game: Game, rows: Row[], onPick: (ply: number) => void): HTMLElement {
  const evals = record.evals!;
  const W = 320;
  const H = 120;
  const n = evals.length - 1;
  const white = evals.map((e, i) => {
    const turn = i === 0 ? (game.history[0]?.before.turn ?? 'w') : game.history[i - 1]!.after.turn;
    return winProb(turn === 'w' ? e.cp : -e.cp);
  });
  const x = (i: number) => (n ? (i / n) * W : 0);
  const y = (w: number) => H - 6 - w * (H - 12);
  const path = white.map((w, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(w).toFixed(1)}`).join('');
  const errors = rows.filter((r) => r.rank >= 4);
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'eval-chart');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Evolución de la partida. ${errors.length} errores importantes marcados. La lista de jugadas contiene los mismos datos.`);
  svg.innerHTML = `
    <path class="area-w" d="${path}L${W},${H}L0,${H}Z"/>
    <line class="mid" x1="0" x2="${W}" y1="${y(0.5)}" y2="${y(0.5)}"/>
    <path class="line" d="${path}"/>
    ${errors.map((r) => `<circle class="marker" r="5" cx="${x(r.ply + 1)}" cy="${y(white[r.ply + 1]!)}"/>`).join('')}
    <line class="cursor" y1="0" y2="${H}" x1="-10" x2="-10"/>
    <rect class="hit" x="0" y="0" width="${W}" height="${H}"/>`;
  const tip = h('div', { class: 'chart-tip', hidden: true });
  const cursor = svg.querySelector<SVGLineElement>('.cursor')!;
  const plyAt = (ev: PointerEvent) => {
    const r = svg.getBoundingClientRect();
    return Math.max(0, Math.min(n, Math.round(((ev.clientX - r.left) / r.width) * n)));
  };
  svg.addEventListener('pointermove', (ev) => {
    const i = plyAt(ev);
    cursor.setAttribute('x1', String(x(i)));
    cursor.setAttribute('x2', String(x(i)));
    const played = game.history[i - 1];
    const userCp = record.userColor === 'w' ? (white[i]! - 0.5) : (0.5 - white[i]!);
    tip.hidden = false;
    tip.style.left = `${(x(i) / W) * 100}%`;
    const row = rows.find((r) => r.ply === i - 1);
    tip.textContent = `${played ? `${Math.floor((i - 1) / 2) + 1}${played.move.color === 'w' ? '.' : '…'} ${localizeSan(played.san, 'es')}` : 'Inicio'}${row && row.rank >= 3 ? ` ${row.symbol}` : ''} · ${userCp > 0.05 ? 'mejor para ti' : userCp < -0.05 ? 'mejor para el rival' : 'igualada'}`;
  });
  svg.addEventListener('pointerleave', () => { tip.hidden = true; cursor.setAttribute('x1', '-10'); cursor.setAttribute('x2', '-10'); });
  svg.addEventListener('click', (ev) => onPick(plyAt(ev as PointerEvent)));
  return h('div', { class: 'card' }, h('p', { class: 'eyebrow' }, 'Evolución de la partida (Stockfish)'),
    h('div', { class: 'chart-wrap' }, svg, tip),
    h('p', { class: 'muted small' }, 'Arriba, mejor para blancas; abajo, para negras. Los puntos marcan tus errores importantes. Pulsa para ir a esa jugada.'));
}

export function renderAnalysis(root: HTMLElement, [id]: string[]): void | (() => void) {
  const record = profile.games.find((g) => g.id === id);
  if (!record) {
    root.append(screen('Partida no encontrada', primaryButton('Volver', () => navigate('#/progress'))));
    return;
  }
  const game = Game.fromPgn(record.pgn);
  const total = game.history.length + 1;
  const nav = moveNavigator((ply) => goto?.(ply));
  let goto: ((ply: number) => void) | null = null;
  const body = h('div', {});
  const progress = h('div', { class: 'analysis-progress' });
  root.append(screen(null, body));

  const draw = (rows: Row[], engineAccuracy: number | null) => {
    body.replaceChildren();
    const hasEngine = !!record.evals;
    const errors = rows.filter((r) => r.rank >= 4);
    const cleanShare = rows.length ? rows.filter((r) => r.rank <= 2).length / rows.length : 1;
    const acc = engineAccuracy ?? cleanShare * 100;
    const accuracyWords = acc >= 90 ? 'muy buena' : acc >= 75 ? 'buena' : acc >= 60 ? 'aceptable' : 'mejorable';
    const showNumber = hasEngine && engineAccuracy !== null && explanationLevel() !== 'beginner';

    // MOMENTO 1: lo mejor (brillante > mejor jugada con más impacto > captura o mate).
    const good = rows.filter((r) => r.rank <= 1 && r.engine?.moveClass !== 'book');
    const bestRow = good.find((r) => r.engine?.moveClass === 'brilliant')
      ?? [...good].sort((a, b) => (b.engine ? b.engine.playedCp : 0) - (a.engine ? a.engine.playedCp : 0) || a.rank - b.rank)[0]
      ?? rows.filter((r) => r.rank === 2).map((r) => ({ r, n: moveEffects(r.played.before, r.played.move).length })).sort((a, b) => b.n - a.n)[0]?.r;
    // MOMENTO 2: dónde empezó el problema.
    const firstError = errors[0];
    // MOMENTO 3: el error más costoso del concepto menos dominado.
    const learnRow = [...errors].sort((a, b) => b.rank - a.rank
      || (b.engine?.winLoss ?? 0) - (a.engine?.winLoss ?? 0)
      || mastery(a.concept ?? '').pKnown - mastery(b.concept ?? '').pKnown)[0];
    const study = learnRow?.concept ? conceptById(learnRow.concept) : undefined;

    const board = new Board({ orientation: record.userColor, coordinates: profile.settings.coordinates, reduceMotion: profile.settings.reduceMotion });
    const detail = h('div', { class: 'moment-detail' });
    const title = record.userResult === 'win' ? 'Victoria' : record.userResult === 'draw' ? 'Tablas' : 'Derrota';

    const plainPosition = (ply: number) => {
      const played = game.history[ply - 1];
      board.setInteraction({});
      board.clearMarks();
      board.setPosition(ply === 0 ? game.history[0]!.before : played!.after, played ? { from: played.move.from, to: played.move.to } : null, false);
      detail.replaceChildren(played ? coachBubble([h('p', { class: 'muted' }, `${Math.floor((ply - 1) / 2) + 1}${played.move.color === 'w' ? '.' : '…'} ${localizeSan(played.san, 'es')} — jugada del rival.`)]) : '');
      nav.update(total, ply);
    };

    /** «¿Qué pasaba si…?»: el usuario prueba otra jugada y el motor muestra la continuación. */
    const enableWhatIf = (before: Position, r: Row) => {
      board.setInteraction({
        movable: () => before.turn,
        onMove: (from: Square, to: Square, promotion) => {
          const m = before.legalMoves(from).find((x) => x.to === to && (!x.promotion || x.promotion === (promotion ?? 'q')));
          if (!m) return false;
          const after = before.play(m);
          board.setPosition(after, { from, to });
          const box = h('div', { class: 'whatif' }, coachBubble([h('p', { class: 'muted' }, 'Calculando la respuesta del rival…')]));
          detail.append(box);
          void (async () => {
            const e = await evaluate(after, { depth: 14 });
            const tactic = explain(analyzeMove(before, m), { level: explanationLevel() });
            if (!e) {
              box.replaceChildren(coachBubble([h('p', {}, tactic.title), tactic.why ? h('p', {}, tactic.why) : '']));
              return;
            }
            const userCp = -e.cp;
            const deep = explanationLevel() === 'advanced';
            let plies = deep ? 10 : 5;
            const render = () => {
              const line = pvToSan(after, e.pv, plies);
              box.replaceChildren(coachBubble([
                h('p', {}, h('strong', {}, `¿Y si jugabas ${localizeSan(moveToSanSafe(before, m), 'es')}? `), `Quedaría ${describeEval(userCp)}${explanationLevel() !== 'beginner' ? ` (${formatEval(e.mate !== undefined ? { mate: e.mate } : { cp: userCp })})` : ''}.`),
                line.length ? h('p', {}, `Continuación probable: ${line.join(' ')}`) : '',
                tactic.severity === 'blunder' || tactic.severity === 'mistake' ? h('p', { class: 'msg msg-bad' }, tactic.title) : '',
              ], [
                ...(plies < 10 && e.pv.length > plies ? [button('Ampliar la variante', () => { plies = 10; render(); })] : []),
                button('Volver a la posición', () => showRow(r, r.label, false)),
              ]));
              const reply = e.best ? parseMove(after, e.best) : null;
              board.setArrows(reply ? [{ from: reply.from, to: reply.to, color: 'danger' }] : []);
            };
            render();
          })();
          return true;
        },
      });
    };

    const showRow = (r: Row, heading: string, scroll = true) => {
      nav.update(total, r.ply);
      board.clearMarks();
      const prev = game.history[r.ply - 1];
      board.setPosition(r.played.before, prev ? { from: prev.move.from, to: prev.move.to } : null, false);
      const e = r.explanation;
      const moveLabel = `${Math.floor(r.ply / 2) + 1}${r.played.move.color === 'w' ? '.' : '…'} ${localizeSan(r.played.san, 'es')}`;
      const bad = r.rank >= 3;
      board.setArrows([{ from: r.played.move.from, to: r.played.move.to, color: bad ? 'danger' : 'good' }, ...e.arrows.filter((a) => a.color === 'good' && bad)]);
      board.setHighlights(e.highlights, bad ? 'bad' : 'good');
      const effects = moveEffects(r.played.before, r.played.move);
      const acts: HTMLElement[] = [];
      if (bad) {
        acts.push(button('Ver la jugada correcta', () => {
          const best = r.engine?.bestUci ? parseMove(r.played.before, r.engine.bestUci) : null;
          if (best) {
            board.setArrows([{ from: best.from, to: best.to, color: 'good' }]);
            const why = moveEffects(r.played.before, best).map((x) => x.text);
            detail.append(coachBubble([h('p', { class: 'msg msg-good' }, `${r.engine!.bestSan}${why.length ? `: ${why.join(' ')}` : ''}`),
              r.engine!.bestLine.length ? h('p', { class: 'muted small' }, `Línea: ${r.engine!.bestLine.join(' ')}`) : '']));
            return;
          }
          const ladder = hintLadder(r.played.before, { fallback: bestMove(r.played.before, 2) ?? undefined });
          if (!ladder) return;
          const final = ladder.steps[4]!;
          board.setArrows(final.arrows);
          detail.append(coachBubble([h('p', { class: 'msg msg-good' }, final.text)]));
        }));
      } else if (effects.length) {
        acts.push(button('¿Por qué es buena?', () => {
          board.setArrows(effects.flatMap((x) => x.arrows));
          detail.append(coachBubble([h('ul', {}, ...effects.map((x) => h('li', {}, x.text)))]));
        }));
      }
      detail.replaceChildren(coachBubble([
        h('p', { class: 'eyebrow' }, heading),
        h('h3', { class: `exp-title sev-${r.css}` }, `${moveLabel} ${r.symbol} · ${e.title}`),
        ...[e.whatWentWrong, e.why, e.consequence, e.whatToNotice].filter(Boolean).map((t) => h('p', {}, t!)),
        h('p', { class: 'muted small' }, '¿Qué pasaba si…? Mueve otra pieza en el tablero para ver qué habría ocurrido.'),
      ], acts));
      enableWhatIf(r.played.before, r);
      if (scroll) detail.scrollIntoView({ behavior: profile.settings.reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
    };

    goto = (ply: number) => {
      const row = rows.find((r) => r.ply === ply);
      if (row) showRow(row, row.label, false);
      else plainPosition(ply);
    };

    const momentCard = (icon: string, label: string, r: Row | undefined, empty: string) =>
      h('button', { class: 'card moment', disabled: !r, onclick: (() => r && showRow(r, label)) as EventListener },
        h('span', { class: 'moment-icon' }, icon),
        h('span', {}, h('strong', {}, label), h('span', { class: 'muted small' },
          r ? ` Jugada ${Math.floor(r.ply / 2) + 1}: ${localizeSan(r.played.san, 'es')} ${r.symbol}` : ` ${empty}`)));

    const lesson = study ? LESSONS.find((l) => l.conceptId === study.id) : undefined;
    body.replaceChildren();
    append(body, [
      h('h1', { class: 'screen-title' }, `${title} · precisión ${accuracyWords}`),
      showNumber ? h('p', {}, 'Precisión: ', h('span', { class: 'accuracy' }, `${engineAccuracy!.toFixed(0)} %`)) : null,
      h('p', { class: 'muted' }, `${rows.length} jugadas tuyas · ${errors.length} ${errors.length === 1 ? 'error importante' : 'errores importantes'}${study ? ` · Concepto a estudiar: ${study.title}` : ''}`),
      progress,
      momentCard('⭐', 'Momento 1 · Lo hiciste muy bien', bestRow, 'Aún no hay una jugada destacada.'),
      momentCard('⚠', 'Momento 2 · Aquí empezó el problema', firstError, 'No hubo errores graves. ¡Bien!'),
      momentCard('🎯', 'Momento 3 · Esto debes aprender', learnRow, 'Sigue practicando para detectar tu siguiente reto.'),
      hasEngine ? evalChart(record, game, rows, (ply) => goto!(ply)) : null,
      h('div', { class: 'board-holder' }, board.el),
      h('div', { class: 'analysis-tools' }, nav.el, drawToggle(board)),
      detail,
      h('details', { class: 'card' }, h('summary', {}, 'Ver todas tus jugadas'),
        h('ol', { class: 'movelist' }, ...rows.map((r) => h('li', {},
          h('button', { class: `link mv sev-${r.css}`, onclick: (() => showRow(r, r.label)) as EventListener },
            `${Math.floor(r.ply / 2) + 1}. ${localizeSan(r.played.san, 'es')} ${r.symbol}`))))),
      h('p', { class: 'muted small' }, hasEngine
        ? 'Análisis con Stockfish 19: cada jugada se compara con la mejor según la probabilidad de ganar que pierde. Las explicaciones usan los hechos tácticos cuando los hay.'
        : 'Análisis táctico del motor propio. Stockfish añadirá los errores posicionales cuando esté disponible.'),
      h('div', { class: 'cta' },
        learnRow
          ? primaryButton('PRACTICAR ESTO AHORA', () => navigate(lesson && !profile.completedLessons.includes(lesson.id) ? `#/lesson/${lesson.id}` : `#/puzzles/${learnRow.concept ?? ''}`))
          : primaryButton('NUEVA PARTIDA', () => navigate('#/play')),
        button('Copiar PGN', () => { void navigator.clipboard?.writeText(record.pgn); })),
    ]);
    const initial = learnRow ?? firstError ?? bestRow;
    if (initial) showRow(initial, initial === learnRow ? 'Momento 3 · Esto debes aprender' : initial === firstError ? 'Momento 2 · Aquí empezó el problema' : 'Momento 1 · Lo hiciste muy bien', false);
    else plainPosition(game.history.length);
  };

  if (record.evals && record.evals.length === total) {
    const { rows, accuracy } = engineRows(game, record);
    draw(rows, accuracy);
  } else {
    draw(tacticalRows(game, record.userColor), null);
    void (async () => {
      const engine = await getEngine();
      if (!engine || !progress.isConnected) return;
      const bar = h('div', { class: 'progress-bar' });
      const label = h('p', { class: 'muted small' }, 'Analizando con Stockfish…');
      progress.replaceChildren(label, h('div', { class: 'progress' }, bar));
      const evals = await computeEvals(game, (done, all) => {
        bar.style.width = `${(done / all) * 100}%`;
        label.textContent = `Analizando con Stockfish… ${done}/${all} posiciones`;
      });
      if (!evals) return;
      record.evals = evals;
      save();
      const { rows, accuracy } = engineRows(game, record);
      const created = await recordEngineFindings(record, game, rows);
      if (!body.isConnected) return;
      progress.replaceChildren();
      draw(rows, accuracy);
      if (created) progress.replaceChildren(h('p', { class: 'badge' }, `📌 ${created} ${created === 1 ? 'momento de esta partida se ha convertido' : 'momentos de esta partida se han convertido'} en ejercicios personales.`));
    })();
  }
  return () => nav.destroy();
}

function moveToSanSafe(pos: Position, m: Parameters<Position['play']>[0]): string {
  const uci = moveToUci(m);
  const g = new Game(pos.toFen());
  return g.move(uci)?.san ?? uci;
}
