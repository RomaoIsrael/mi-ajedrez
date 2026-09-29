/**
 * Jugar: configuración (rival, nivel, color, reloj, Coach Mode) y partida con
 * pistas progresivas, aviso de amenazas, explicación inmediata de errores y checklist.
 */
import { BOT_LEVELS, PERSONALITIES, bestMove, chooseMove, type Personality } from '@kavalo/bots';
import { Game, localizeSan, moveToUci, type Color, type PieceType, type Square } from '@kavalo/chess-core';
import {
  analyzeMove, explain, hintLadder, moveEffects, SEVERITY_SYMBOL, threatWarning,
  type HintLadder, type MoveAnalysis,
} from '@kavalo/tactics';
import { Board } from '../components/board.js';
import { drawToggle, moveInput, moveNavigator } from '../components/board-tools.js';
import { cue, moveCue } from '../feedback.js';
import { coachBubble, explanationCard } from '../components/coach.js';
import { button, h, navigate, primaryButton, screen } from '../dom.js';
import { KIND_LABEL } from '../state/insights.js';
import {
  addEvidence, addReview, explanationLevel, mastery, profile, recordLearning, save, uid, updateRating,
  type GameRecord,
} from '../state/store.js';

interface Setup { personality: Personality; level: number; color: 'w' | 'b' | 'random'; clock: string; coach: boolean; checklist: boolean }

let levelChosen = false;
const setup: Setup = { personality: 'nova', level: 1, color: 'w', clock: 'none', coach: true, checklist: true };
const CLOCKS: Record<string, { label: string; base: number; inc: number } | null> = {
  none: null, '10+0': { label: '10+0', base: 600, inc: 0 }, '15+10': { label: '15+10', base: 900, inc: 10 }, '30': { label: '30 min', base: 1800, inc: 0 },
};

export function renderPlaySetup(root: HTMLElement): void {
  const recommendedLevel = BOT_LEVELS.reduce((best, l) => (Math.abs(l.elo - profile.gameRating) < Math.abs(best.elo - profile.gameRating) ? l : best)).level;
  // La recomendación se aplica una sola vez; después manda la elección del usuario.
  if (!levelChosen) {
    setup.level = recommendedLevel;
    levelChosen = true;
  }

  const group = (label: string, items: HTMLElement[]) => h('fieldset', { class: 'group' }, h('legend', {}, label), h('div', { class: 'seg' }, ...items));
  const seg = <T extends string | number | boolean>(key: keyof Setup, value: T, label: string, extra = '') => {
    const b = h('button', { class: `seg-btn ${setup[key] === value ? 'on' : ''}`, 'aria-pressed': String(setup[key] === value), title: extra },
      label);
    b.addEventListener('click', () => { (setup as unknown as Record<string, unknown>)[key] = value; rerender(); });
    return b;
  };
  const toggle = (key: 'coach' | 'checklist', label: string) => {
    const b = h('button', { class: `seg-btn ${setup[key] ? 'on' : ''}`, 'aria-pressed': String(setup[key]) }, `${label}: ${setup[key] ? 'sí' : 'no'}`);
    b.addEventListener('click', () => { setup[key] = !setup[key]; rerender(); });
    return b;
  };
  const rerender = () => { root.replaceChildren(); renderPlaySetup(root); };

  root.append(screen('Nueva partida',
    group('Rival', (Object.keys(PERSONALITIES) as Personality[]).map((p) => seg('personality', p, PERSONALITIES[p].name, PERSONALITIES[p].style.es))),
    h('p', { class: 'muted small' }, PERSONALITIES[setup.personality].style.es),
    group('Nivel', BOT_LEVELS.map((l) => seg('level', l.level, String(l.level), l.name.es))),
    h('p', { class: 'muted small' }, `${BOT_LEVELS[setup.level - 1]!.name.es} · ~${BOT_LEVELS[setup.level - 1]!.elo} Elo${setup.level === recommendedLevel ? ' · recomendado para ti' : ''}. Los niveles bajos cometen errores humanos, no juegan al azar.`),
    group('Tu color', [seg('color', 'w', 'Blancas'), seg('color', 'b', 'Negras'), seg('color', 'random', 'Al azar')]),
    group('Reloj', Object.entries(CLOCKS).map(([k, v]) => seg('clock', k, v ? v.label : 'Sin reloj'))),
    profile.gameRating < 1000 && setup.clock !== 'none' && setup.clock !== '15+10' ? h('p', { class: 'muted small' }, 'Consejo: al empezar, las partidas lentas enseñan más.') : null,
    group('Ayudas', [toggle('coach', 'Coach Mode'), toggle('checklist', 'Checklist')]),
    h('div', { class: 'cta' }, primaryButton('JUGAR', () => { startGame(); navigate('#/game'); })),
  ));
}

interface Session {
  id: string;
  game: Game;
  user: Color;
  setup: Setup;
  clock: { w: number; b: number; inc: number } | null;
  analyses: Map<number, MoveAnalysis>;
  hintsUsed: number;
}

let session: Session | null = null;

function startGame(): void {
  const user: Color = setup.color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : setup.color;
  const c = CLOCKS[setup.clock];
  session = {
    id: uid(), game: new Game(), user, setup: { ...setup },
    clock: c ? { w: c.base * 1000, b: c.base * 1000, inc: c.inc * 1000 } : null,
    analyses: new Map(), hintsUsed: 0,
  };
}

export function renderGame(root: HTMLElement): () => void {
  if (!session) {
    navigate('#/play');
    return () => {};
  }
  const s = session;
  const bot = PERSONALITIES[s.setup.personality];
  const level = BOT_LEVELS[s.setup.level - 1]!;
  let ladder: HintLadder | null = null;
  let hintStep = 0;
  let thinking = false;
  let lastBotMove: { before: Game['position']; move: Game['history'][number]['move'] } | null = null;
  let timer = 0;
  /** Jugada que se está revisando con ◀ ▶ (null = posición actual, se puede jugar). */
  let viewing: number | null = null;

  const board = new Board({
    orientation: s.user, coordinates: profile.settings.coordinates, reduceMotion: profile.settings.reduceMotion,
    movable: () => (thinking || viewing !== null || s.game.status().over ? null : s.user),
    onMove: onUserMove,
  });
  const coachPanel = h('div', { class: 'game-coach' });
  const moveList = h('ol', { class: 'movelist', 'aria-label': 'Jugadas' });
  const clockEl = { w: h('span', { class: 'clock' }), b: h('span', { class: 'clock' }) };
  const checklist = h('details', { class: 'checklist', open: s.setup.checklist },
    h('summary', {}, 'Checklist antes de mover'),
    h('div', { class: 'checks' }, ...['Jaques', 'Capturas', 'Amenazas', 'Piezas indefensas', 'Seguridad del rey', 'Respuesta del rival'].map((c) =>
      h('label', {}, h('input', { type: 'checkbox' }), ` ${c}`))));
  const opp = s.user === 'w' ? 'b' : 'w';
  const nav = moveNavigator((i) => showPly(i));
  const reviewBanner = h('div', { class: 'review-banner', hidden: true },
    h('span', {}, 'Estás revisando una jugada anterior.'),
    h('button', { class: 'link', onclick: (() => showPly(s.game.history.length)) as EventListener }, 'Volver a la posición actual'));
  const entry = moveInput(() => (viewing === null && !thinking && s.game.position.turn === s.user ? s.game.position : null),
    (m) => onUserMove(m.from, m.to, m.promotion));

  const hintBtn = button('Pista', () => showHint());
  const undoBtn = button('Deshacer', () => undo());
  const actions = h('div', { class: 'game-actions' },
    s.setup.coach ? hintBtn : null,
    s.setup.coach ? undoBtn : null,
    button('Girar', () => board.flip()),
    drawToggle(board),
    button('Rendirse', () => { if (confirm('¿Seguro que quieres rendirte?')) { s.game.resign(s.user); end(); } }));

  root.append(screen(null,
    h('div', { class: 'player-bar' }, h('span', {}, h('strong', {}, bot.name), ` · ${bot.style.es.split(' · ')[0]} · Nivel ${level.level}`), clockEl[opp]),
    h('div', { class: 'board-holder' }, board.el),
    h('div', { class: 'player-bar' }, h('span', {}, h('strong', {}, profile.name || 'Tú')), clockEl[s.user]),
    reviewBanner, nav.el, actions, coachPanel, entry, checklist, moveList));

  const say = (nodes: (Node | string)[], acts: HTMLElement[] = []) => coachPanel.replaceChildren(coachBubble(nodes, acts));

  function refresh(animate = true) {
    const last = s.game.history.at(-1);
    viewing = null;
    reviewBanner.hidden = true;
    board.clearMarks();
    board.setPosition(s.game.position, last ? { from: last.move.from, to: last.move.to, promotion: !!last.move.promotion } : null, animate);
    if (last && animate) moveCue(last, s.game.status());
    if (s.game.status().reason === 'checkmate') board.celebrateMate(s.game.position.kingSquare(s.game.position.turn));
    nav.update(s.game.history.length + 1, s.game.history.length);
    renderMoves();
    renderClocks();
    ladder = null;
    hintStep = 0;
    checklist.querySelectorAll('input').forEach((i) => { (i as HTMLInputElement).checked = false; });
  }

  function renderMoves() {
    moveList.replaceChildren();
    s.game.history.forEach((p, i) => {
      const a = s.analyses.get(i);
      const sym = a && p.move.color === s.user ? SEVERITY_SYMBOL[a.severity] : '';
      const label = `${localizeSan(p.san, 'es')}${sym && !['✓', '👍'].includes(sym) ? sym : ''}`;
      if (p.move.color === 'w' || i === 0) moveList.append(h('li', {}, h('span', { class: 'mv-no' }, `${Math.floor(i / 2) + 1}.`)));
      const current = viewing === null ? i === s.game.history.length - 1 : i === viewing - 1;
      moveList.lastElementChild!.append(h('button', {
        class: `mv mv-btn sev-${a?.severity ?? 'none'}${current ? ' mv-current' : ''}`,
        'aria-current': current ? 'true' : undefined, onclick: (() => showPly(i + 1)) as EventListener,
      }, label));
    });
    if (viewing === null) moveList.scrollTop = moveList.scrollHeight;
  }

  /** Muestra la posición tras `ply` medias jugadas (0 = inicio). La actual permite jugar. */
  function showPly(ply: number) {
    if (thinking) return;
    if (ply >= s.game.history.length) {
      if (viewing !== null) refresh(false);
      return;
    }
    viewing = ply;
    const played = s.game.history[ply - 1];
    const pos = ply === 0 ? (s.game.history[0]?.before ?? s.game.position) : played!.after;
    board.clearMarks();
    board.setPosition(pos, played ? { from: played.move.from, to: played.move.to } : null, false);
    reviewBanner.hidden = false;
    nav.update(s.game.history.length + 1, ply);
    renderMoves();
  }

  function renderClocks() {
    if (!s.clock) return;
    for (const c of ['w', 'b'] as const) {
      const ms = Math.max(0, s.clock[c]);
      clockEl[c].textContent = `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
      clockEl[c].classList.toggle('clock-on', s.game.position.turn === c && !s.game.status().over);
    }
  }

  if (s.clock) {
    let t = performance.now();
    timer = window.setInterval(() => {
      const now = performance.now();
      if (!s.game.status().over && s.clock) {
        const turn = s.game.position.turn;
        s.clock[turn] -= now - t;
        if (s.clock[turn] <= 0) { s.game.timeout(turn); end(); }
      }
      t = now;
      renderClocks();
    }, 250);
  }

  function onUserMove(from: Square, to: Square, promotion?: PieceType): boolean {
    const before = s.game.position;
    const played = s.game.move({ from, to, promotion });
    if (!played) return false;
    if (s.clock) s.clock[s.user] += s.clock.inc;
    const analysis = analyzeMove(before, played.move);
    s.analyses.set(s.game.history.length - 1, analysis);
    const stage = analysis.concept ? mastery(analysis.concept).memoryStage : 1;
    record(analysis, before.toFen(), moveToUci(played.move));
    refresh();
    if (s.game.status().over) return end(), true;

    const bad = analysis.severity === 'mistake' || analysis.severity === 'blunder';
    if (bad) cue('error');
    else if (analysis.severity === 'excellent' || analysis.severity === 'good') board.flash(to, analysis.severity === 'excellent' ? 'brilliant' : 'good');
    if (s.setup.coach && bad) {
      const e = explain(analysis, { level: explanationLevel(), memoryStage: stage });
      board.setArrows(e.arrows);
      board.setHighlights(e.highlights, 'bad');
      coachPanel.replaceChildren(explanationCard(e, [
        primaryButton('Intentar de nuevo', () => { undo(1); say(['Piensa de nuevo. ¿Qué cambió en la posición?']); }),
        button('Continuar', () => { board.clearMarks(); coachPanel.replaceChildren(); botMove(); }),
      ]));
    } else {
      if (analysis.severity === 'good' || analysis.severity === 'excellent') {
        const e = explain(analysis);
        say([h('p', { class: 'msg msg-good' }, `${SEVERITY_SYMBOL[analysis.severity]} ${e.title}`)]);
      } else coachPanel.replaceChildren();
      botMove();
    }
    return true;
  }

  function record(a: MoveAnalysis, fen: string, uci: string) {
    const kind = a.primary?.kind;
    if (!kind || !a.concept) return;
    // Solo errores claros (las imprecisiones leves generarían ruido y sobrecorrección).
    const bad = a.severity === 'mistake' || a.severity === 'blunder';
    if (bad && KIND_LABEL[kind]) {
      profile.mistakes.push({ at: Date.now(), gameId: s.id, kind, concept: a.concept, severity: a.severity, fen, uci });
      addEvidence(a.concept, false, 'game');
      // Convertir el error real en un ejercicio personal (docs §44).
      if ((kind === 'missed-mate' || kind === 'missed-capture') && a.primary?.move) {
        const pid = `pp-${uid()}`;
        profile.personalPuzzles.push({
          id: pid, fen, accept: [moveToUci(a.primary.move)], concept: a.concept, createdAt: Date.now(), gameId: s.id,
          goal: kind === 'missed-mate' ? 'mate' : 'material',
        });
        addReview(a.concept, pid);
      }
    } else if (a.severity === 'good' || a.severity === 'excellent') {
      addEvidence(a.concept, true, 'game');
    }
    save();
  }

  function botMove() {
    if (s.game.status().over || s.game.position.turn === s.user) return;
    thinking = true;
    say([`${bot.name} está pensando…`]);
    setTimeout(() => {
      const before = s.game.position;
      const choice = chooseMove(before, { level: s.setup.level, personality: s.setup.personality });
      s.game.move({ from: choice.move.from, to: choice.move.to, promotion: choice.move.promotion });
      if (s.clock) s.clock[opp] += s.clock.inc;
      lastBotMove = { before, move: choice.move };
      thinking = false;
      refresh();
      if (s.game.status().over) return end();
      const why = button(`¿Por qué jugó eso?`, () => {
        if (!lastBotMove) return;
        const effects = moveEffects(lastBotMove.before, lastBotMove.move);
        board.setArrows(effects.flatMap((e) => e.arrows));
        say([h('ul', {}, ...(effects.length ? effects.map((e) => h('li', {}, e.text)) : [h('li', {}, 'Una jugada de espera: mejora ligeramente su posición.')]))]);
      });
      const warn = s.setup.coach && explanationLevel() !== 'advanced' ? threatWarning(s.game.position) : null;
      if (warn) {
        board.setArrows(warn.arrows);
        say([h('p', { class: 'msg msg-bad' }, warn.text)], [why]);
      } else if (s.setup.coach) {
        say([h('p', { class: 'muted' }, 'Tu turno. ¿Qué hizo tu rival? ¿Qué amenaza?')], [why]);
      } else coachPanel.replaceChildren();
    }, 350);
  }

  function showHint() {
    if (thinking || s.game.status().over || s.game.position.turn !== s.user) return;
    if (!ladder) ladder = hintLadder(s.game.position, { fallback: bestMove(s.game.position, 2) ?? undefined });
    if (!ladder) return;
    hintStep = Math.min(5, hintStep + 1);
    s.hintsUsed++;
    const steps = ladder.steps.slice(0, hintStep);
    const cur = steps.at(-1)!;
    board.setHighlights(cur.highlights, cur.level === 2 ? 'zone' : 'hint');
    board.setArrows(cur.arrows);
    say([h('ol', { class: 'hints' }, ...steps.map((st) => h('li', {}, st.text)))],
      hintStep < 5 ? [button(`Pista ${hintStep + 1}/5`, showHint)] : []);
  }

  function undo(plies?: number) {
    if (thinking) return;
    const n = plies ?? (s.game.position.turn === s.user ? 2 : 1);
    for (let i = 0; i < n && s.game.history.length; i++) {
      s.analyses.delete(s.game.history.length - 1);
      s.game.undo();
    }
    board.clearMarks();
    refresh(false);
  }

  function end() {
    window.clearInterval(timer);
    const st = s.game.status();
    const userResult: GameRecord['userResult'] = st.result === '1/2-1/2' ? 'draw' : (st.result === '1-0') === (s.user === 'w') ? 'win' : 'loss';
    const record: GameRecord = {
      id: s.id, at: Date.now(), userColor: s.user, bot: { personality: s.setup.personality, level: s.setup.level },
      pgn: s.game.pgn({ White: s.user === 'w' ? profile.name || 'Tú' : bot.name, Black: s.user === 'b' ? profile.name || 'Tú' : bot.name }),
      result: st.result, reason: st.reason, userResult, timeControl: s.setup.clock, hintsUsed: s.hintsUsed,
    };
    if (s.game.history.length >= 2) {
      profile.games.push(record);
      updateRating('gameRating', level.elo, userResult === 'win' ? 1 : userResult === 'draw' ? 0.5 : 0);
      recordLearning(15, 'game');
    }
    const REASON: Record<string, string> = { checkmate: 'jaque mate', stalemate: 'ahogado', threefold: 'triple repetición', 'fifty-move': 'regla de 50 movimientos', 'insufficient-material': 'material insuficiente', resign: 'abandono', timeout: 'tiempo' };
    const title = userResult === 'win' ? '¡Victoria!' : userResult === 'draw' ? 'Tablas' : 'Derrota';
    say([h('h2', {}, `${title} · ${REASON[st.reason ?? ''] ?? ''}`), h('p', {}, 'Veamos juntos los 3 momentos más importantes.')],
      s.game.history.length >= 2 ? [primaryButton('VER ANÁLISIS', () => navigate(`#/analysis/${s.id}`))] : [primaryButton('Nueva partida', () => navigate('#/play'))]);
    session = null;
  }

  refresh(false);
  board.focus();
  if (s.game.position.turn !== s.user) botMove();
  else if (s.setup.coach) say(['Tú empiezas. Recuerda: centro, desarrollo y rey seguro.']);
  return () => { window.clearInterval(timer); nav.destroy(); };
}
