/**
 * Jugar: configuración (rival, nivel, color, reloj, Coach Mode) y partida con
 * pistas progresivas, aviso de amenazas, explicación inmediata de errores y checklist.
 */
import { BOT_LEVELS, LOCAL_LEVELS, PERSONALITIES, bestMove, chooseFromCandidates, chooseMoveAsync, type Personality } from '@kavalo/bots';
import { describeEval, formatEval, scoreToCp, winProb } from '@kavalo/engine';
import { engineBestMove, engineStatus, evaluate, getEngine } from '../engine.js';
import { Game, localizeSan, moveToUci, parseMove, type Color, type Move, type PieceType, type Position, type Square } from '@kavalo/chess-core';
import {
  analyzeMove, explain, hintLadder, moveEffects, SEVERITY_SYMBOL, threatWarning,
  type HintLadder, type MoveAnalysis,
} from '@kavalo/tactics';
import { Board } from '../components/board.js';
import { drawToggle, moveInput, moveNavigator } from '../components/board-tools.js';
import { cue, moveCue } from '../feedback.js';
import { coachBubble, explanationCard } from '../components/coach.js';
import { button, h, navigate, primaryButton, screen } from '../dom.js';
import { KIND_LABEL, mistakeStats } from '../state/insights.js';
import { OPENINGS, START_POSITIONS, THEMES, type PositionGoal } from '@kavalo/content';
import { reviewInBackground } from '../state/review.js';
import { checklistStatus, FADE_AFTER_GAMES, threatWarningsNeeded } from '@kavalo/coach';
import {
  addEvidence, addReview, explanationLevel, logActivity, mastery, profile, recordLearning, save, uid, updateRating,
  type GameRecord,
} from '../state/store.js';

/** Modos de partida (brief §60). */
export type GameMode = 'ai' | 'coach' | 'educational' | 'training' | 'nohints' | 'free' | 'thematic' | 'opening' | 'middlegame' | 'endgame';

interface Setup {
  mode: GameMode; personality: Personality; level: number; color: 'w' | 'b' | 'random'; clock: string;
  coach: boolean; checklist: boolean;
  /** Posición, apertura o tema elegidos en los modos que empiezan desde otra posición. */
  positionId: string; openingId: string; theme: string;
  custom: { base: number; inc: number };
}

export const MODES: Record<GameMode, { label: string; desc: string }> = {
  ai: { label: 'Contra la IA', desc: 'Partida normal contra un robot con personalidad. Cuenta para tu rating.' },
  coach: { label: 'Coach Mode', desc: 'El coach te acompaña: avisa de amenazas, explica errores y te deja repetir.' },
  educational: { label: 'Educativa', desc: 'Una partida con un objetivo concreto basado en tu error más frecuente.' },
  training: { label: 'Entrenamiento', desc: 'Sin presión: pistas y deshacer ilimitados. No cuenta para el rating.' },
  nohints: { label: 'Sin pistas', desc: 'Juega solo, como en un torneo. Al final, el análisis completo.' },
  free: { label: 'Libre (2 jugadores)', desc: 'Dos personas en el mismo dispositivo, sin robot ni ayudas.' },
  thematic: { label: 'Temática', desc: 'Elige un tema (ataque al rey, finales de torres…) y juega desde una posición típica.' },
  opening: { label: 'Desde apertura', desc: 'Empieza tras la línea principal de una apertura y juega sus planes.' },
  middlegame: { label: 'Desde medio juego', desc: 'Posiciones con una estructura y un plan claros.' },
  endgame: { label: 'Desde final', desc: 'Practica los finales esenciales contra el robot.' },
};

/** Modos que cuentan para el rating (partida completa desde la posición inicial). */
const RATED: GameMode[] = ['ai', 'coach', 'educational', 'nohints'];

let levelChosen = false;
const setup: Setup = {
  mode: 'ai', personality: 'nova', level: 1, color: 'w', clock: 'none', coach: true, checklist: true,
  positionId: START_POSITIONS[0]!.id, openingId: OPENINGS[0]!.id, theme: Object.keys(THEMES)[0]!, custom: { base: 10, inc: 5 },
};

/** Controles de tiempo (brief §61), en segundos. */
export const CLOCKS: Record<string, { label: string; base: number; inc: number } | null> = {
  none: null,
  '1+0': { label: '1+0', base: 60, inc: 0 }, '3+0': { label: '3+0', base: 180, inc: 0 }, '3+2': { label: '3+2', base: 180, inc: 2 },
  '5+0': { label: '5+0', base: 300, inc: 0 }, '5+3': { label: '5+3', base: 300, inc: 3 }, '10+0': { label: '10+0', base: 600, inc: 0 },
  '15+10': { label: '15+10', base: 900, inc: 10 }, '30': { label: '30 min', base: 1800, inc: 0 }, custom: { label: 'Personalizado', base: 0, inc: 0 },
};

/** Prepara la configuración desde otra pantalla (p. ej. «Jugar desde esta apertura»). */
export function presetGame(p: Partial<Pick<Setup, 'mode' | 'openingId' | 'positionId' | 'theme'>>): void {
  Object.assign(setup, p);
}

function clockFor(s: Setup): { base: number; inc: number } | null {
  if (s.clock === 'custom') return { base: Math.max(1, s.custom.base) * 60, inc: Math.max(0, s.custom.inc) };
  return CLOCKS[s.clock] ?? null;
}

/** Objetivo de la partida educativa: el error más frecuente (o las piezas colgadas). */
function educationalGoal(): { kind: string; label: string } {
  const top = mistakeStats().find((m) => KIND_LABEL[m.kind] && m.kind !== 'positional' && m.kind !== 'missed-win');
  const kind = top?.kind ?? 'hanging-piece';
  return { kind, label: KIND_LABEL[kind]!.toLowerCase() };
}

const levelOrder = { beginner: 0, intermediate: 1, advanced: 2 } as const;

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
  const select = (label: string, value: string, options: [string, string][], onChange: (v: string) => void) => {
    const sel = h('select', { class: 'input', 'aria-label': label }, ...options.map(([v, l]) => h('option', { value: v, selected: v === value }, l))) as HTMLSelectElement;
    sel.addEventListener('change', () => { onChange(sel.value); rerender(); });
    return h('label', { class: 'field' }, h('span', { class: 'small' }, label), sel);
  };
  const mode = setup.mode;
  const vsBot = mode !== 'free';
  const level = explanationLevel();
  const fromPosition = mode === 'thematic' || mode === 'middlegame' || mode === 'endgame';
  const positions = START_POSITIONS.filter((p) => (mode === 'thematic' ? p.theme === setup.theme : p.category === mode));
  if (fromPosition && !positions.some((p) => p.id === setup.positionId)) setup.positionId = positions[0]?.id ?? setup.positionId;
  const pos = fromPosition ? START_POSITIONS.find((p) => p.id === setup.positionId) : undefined;
  const opening = mode === 'opening' ? OPENINGS.find((o) => o.id === setup.openingId) : undefined;

  root.append(screen('Nueva partida',
    h('fieldset', { class: 'group' }, h('legend', {}, 'Modo'),
      h('div', { class: 'mode-grid' }, ...(Object.keys(MODES) as GameMode[]).map((m) => {
        const b = h('button', { class: `mode-card ${mode === m ? 'on' : ''}`, 'aria-pressed': String(mode === m), 'data-mode': m }, h('strong', {}, MODES[m].label));
        b.addEventListener('click', () => { setup.mode = m; rerender(); });
        return b;
      }))),
    h('p', { class: 'muted small mode-desc' }, MODES[mode].desc, RATED.includes(mode) ? '' : ' No cuenta para el rating.'),
    mode === 'educational' ? h('p', { class: 'badge' }, `🎯 Objetivo: termina la partida sin «${educationalGoal().label}».`) : null,
    mode === 'thematic' ? select('Tema', setup.theme, Object.entries(THEMES), (v) => { setup.theme = v; }) : null,
    fromPosition ? select('Posición', setup.positionId, positions.map((p) => [p.id, `${p.title}${levelOrder[p.minLevel] > levelOrder[level] ? ' (reto)' : ''}`]), (v) => { setup.positionId = v; }) : null,
    pos ? h('div', { class: 'card' }, h('p', {}, h('strong', {}, `Objetivo: ${pos.objective}`)), h('p', { class: 'muted small' }, `Juegas con ${pos.side === 'w' ? 'blancas' : 'negras'}.`)) : null,
    mode === 'opening' ? select('Apertura', setup.openingId, OPENINGS.map((o) => [o.id, `${o.name} (${o.color === 'w' ? 'blancas' : `negras contra ${o.against}`})`]), (v) => { setup.openingId = v; }) : null,
    opening ? h('div', { class: 'card' }, h('p', {}, h('strong', {}, 'Objetivo: '), opening.objective), h('p', { class: 'muted small' }, `Plan típico: ${opening.plans[0]}`)) : null,
    vsBot ? group('Rival', (Object.keys(PERSONALITIES) as Personality[]).map((p) => seg('personality', p, PERSONALITIES[p].name, PERSONALITIES[p].style.es))) : null,
    vsBot ? h('p', { class: 'muted small' }, PERSONALITIES[setup.personality].style.es) : null,
    vsBot ? group('Nivel', BOT_LEVELS.map((l) => {
      const b = seg('level', l.level, String(l.level), l.name.es);
      if (l.level > LOCAL_LEVELS && engineStatus() === 'unavailable') { b.disabled = true; b.title = 'Requiere el motor Stockfish'; }
      return b;
    })) : null,
    vsBot ? h('p', { class: 'muted small engine-status' }, engineStatus() === 'ready' ? '♞ Stockfish listo: niveles 1–10 disponibles.' : engineStatus() === 'unavailable' ? 'Stockfish no está disponible en este navegador: niveles 1–6 con el motor propio.' : 'Cargando Stockfish en segundo plano…') : null,
    vsBot ? h('p', { class: 'muted small' }, `${BOT_LEVELS[setup.level - 1]!.name.es} · ~${BOT_LEVELS[setup.level - 1]!.elo} Elo${setup.level === recommendedLevel ? ' · recomendado para ti' : ''}. Los niveles bajos cometen errores humanos, no juegan al azar.`) : null,
    vsBot && !fromPosition && mode !== 'opening' ? group('Tu color', [seg('color', 'w', 'Blancas'), seg('color', 'b', 'Negras'), seg('color', 'random', 'Al azar')]) : null,
    group('Reloj', Object.entries(CLOCKS).map(([k, v]) => seg('clock', k, v ? v.label : 'Sin reloj'))),
    setup.clock === 'custom' ? h('div', { class: 'custom-clock' },
      numberField('Minutos', setup.custom.base, 1, 180, (v) => { setup.custom.base = v; }),
      numberField('Incremento (s)', setup.custom.inc, 0, 60, (v) => { setup.custom.inc = v; })) : null,
    profile.gameRating < 1000 && setup.clock !== 'none' && (clockFor(setup)?.base ?? 0) < 900 ? h('p', { class: 'muted small' }, 'Consejo: al empezar, las partidas lentas (15+10 o más) enseñan más.') : null,
    mode === 'ai' ? group('Ayudas', [toggle('coach', 'Coach Mode'), toggle('checklist', 'Checklist')]) : null,
    h('div', { class: 'cta' }, primaryButton('JUGAR', () => { startGame(); navigate('#/game'); })),
  ));
}

function numberField(label: string, value: number, min: number, max: number, onChange: (v: number) => void): HTMLElement {
  const input = h('input', { class: 'input', type: 'number', min, max, value, 'aria-label': label }) as HTMLInputElement;
  input.addEventListener('change', () => onChange(Math.max(min, Math.min(max, Math.round(Number(input.value) || min)))));
  return h('label', { class: 'field' }, h('span', { class: 'small' }, label), input);
}

interface Session {
  id: string;
  game: Game;
  user: Color;
  setup: Setup;
  clock: { w: number; b: number; inc: number; base: number } | null;
  analyses: Map<number, MoveAnalysis>;
  hintsUsed: number;
  startedAt: number;
  /** Por jugada del usuario (índice de ply): ms empleados y fracción de reloj restante. */
  moveMs: Map<number, number>;
  clockLeft: Map<number, number>;
  /** Momento en que empezó el turno actual del usuario. */
  turnStart: number;
  /** Ayudas efectivas del modo. */
  coach: boolean;
  hints: boolean;
  rated: boolean;
  /** Objetivo de la partida (modos educativa, temáticos y desde apertura). */
  goal: { text: string; kind?: string; result?: PositionGoal; idea?: string } | null;
}

let session: Session | null = null;

function startGame(): void {
  const m = setup.mode;
  const pos = m === 'thematic' || m === 'middlegame' || m === 'endgame' ? START_POSITIONS.find((p) => p.id === setup.positionId) : undefined;
  const opening = m === 'opening' ? OPENINGS.find((o) => o.id === setup.openingId) : undefined;
  const game = new Game(pos?.fen);
  if (opening) for (const san of opening.line) game.move(san);
  const user: Color = pos ? pos.side : opening ? opening.color : setup.color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : setup.color;
  const c = clockFor(setup);
  const coach = m === 'coach' || m === 'educational' || m === 'training' || (m === 'ai' && setup.coach)
    || ((m === 'thematic' || m === 'middlegame' || m === 'endgame' || m === 'opening') && explanationLevel() !== 'advanced');
  const goal = m === 'educational' ? (() => { const g = educationalGoal(); return { text: `Termina la partida sin «${g.label}».`, kind: g.kind }; })()
    : pos ? { text: pos.objective, result: pos.goal, idea: pos.idea }
    : opening ? { text: opening.objective, idea: opening.plans.join(' ') } : null;
  session = {
    id: uid(), game, user, setup: { ...setup, custom: { ...setup.custom }, checklist: setup.checklist && m !== 'nohints' && m !== 'free' },
    clock: c ? { w: c.base * 1000, b: c.base * 1000, inc: c.inc * 1000, base: c.base * 1000 } : null,
    analyses: new Map(), hintsUsed: 0, startedAt: Date.now(), moveMs: new Map(), clockLeft: new Map(), turnStart: performance.now(),
    coach, hints: coach, rated: RATED.includes(m), goal,
  };
}

export function renderGame(root: HTMLElement): () => void {
  if (!session) {
    navigate('#/play');
    return () => {};
  }
  const s = session;
  const free = s.setup.mode === 'free';
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
    movable: () => (thinking || viewing !== null || s.game.status().over ? null : free ? s.game.position.turn : s.user),
    onMove: onUserMove,
  });
  const coachPanel = h('div', { class: 'game-coach' });
  // Barra de evaluación opcional (desactivada por defecto: el objetivo es pensar, no mirar números).
  const evalFill = h('div', { class: 'eval-fill' });
  const evalText = h('span', { class: 'eval-text' });
  const evalBar = h('div', { class: 'eval-bar', role: 'img', 'aria-label': 'Evaluación' }, evalFill, evalText);
  async function updateEvalBar() {
    if (!profile.settings.evalBar) return;
    const pos = s.game.position;
    const e = await evaluate(pos, { depth: 10 });
    if (!e || s.game.position !== pos) return;
    const whiteCp = pos.turn === 'w' ? e.cp : -e.cp;
    const userCp = s.user === 'w' ? whiteCp : -whiteCp;
    evalFill.style.height = `${Math.round(winProb(whiteCp) * 100)}%`;
    const text = explanationLevel() === 'beginner' ? describeEval(userCp) : formatEval(e.mate !== undefined ? { mate: e.mate } : { cp: whiteCp });
    evalText.textContent = explanationLevel() === 'beginner' ? '' : text;
    evalBar.setAttribute('aria-label', `Evaluación: ${describeEval(userCp)}`);
    evalBar.title = describeEval(userCp);
  }
  const moveList = h('ol', { class: 'movelist', 'aria-label': 'Jugadas' });
  const clockEl = { w: h('span', { class: 'clock' }), b: h('span', { class: 'clock' }) };
  // Retirada progresiva de ayudas: cada recordatorio desaparece cuando ya no hace falta.
  const status = checklistStatus(profile);
  const active = status.filter((c) => !c.retired).map((c) => c.item.label);
  const retired = status.filter((c) => c.retired).map((c) => c.item.label);
  const checklist = h('details', { class: 'checklist', open: s.setup.checklist },
    h('summary', {}, 'Checklist antes de mover'),
    active.length
      ? h('div', { class: 'checks' }, ...active.map((c) => h('label', {}, h('input', { type: 'checkbox' }), ` ${c}`)))
      : h('p', { class: 'muted small' }, '¡Ya no necesitas el checklist! Haz estas preguntas mentalmente.'),
    retired.length
      ? h('p', { class: 'muted small checks-retired' }, `👏 Retirados porque llevas ${FADE_AFTER_GAMES} partidas sin ese error: ${retired.join(', ')}.`)
      : null);
  const opp = s.user === 'w' ? 'b' : 'w';
  const nav = moveNavigator((i) => showPly(i));
  const reviewBanner = h('div', { class: 'review-banner', hidden: true },
    h('span', {}, 'Estás revisando una jugada anterior.'),
    h('button', { class: 'link', onclick: (() => showPly(s.game.history.length)) as EventListener }, 'Volver a la posición actual'));
  const entry = moveInput(() => (viewing === null && !thinking && s.game.position.turn === s.user ? s.game.position : null),
    (m) => onUserMove(m.from, m.to, m.promotion));

  const hintBtn = button('Pista', () => void showHint());
  const undoBtn = button('Deshacer', () => undo());
  const actions = h('div', { class: 'game-actions' },
    s.hints ? hintBtn : null,
    s.coach || free ? undoBtn : null,
    button('Girar', () => board.flip()),
    drawToggle(board),
    button('Rendirse', () => { if (confirm('¿Seguro que quieres rendirte?')) { s.game.resign(free ? s.game.position.turn : s.user); end(); } }));
  const goalBanner = s.goal ? h('p', { class: 'goal-banner' }, `🎯 ${s.goal.text}`) : null;

  root.append(screen(null,
    goalBanner,
    h('div', { class: 'player-bar' }, free ? h('span', {}, h('strong', {}, s.user === 'w' ? 'Negras' : 'Blancas')) : h('span', {}, h('strong', {}, bot.name), ` · ${bot.style.es.split(' · ')[0]} · Nivel ${level.level}`), clockEl[opp]),
    h('div', { class: `board-holder${profile.settings.evalBar ? ' with-eval' : ''}` }, profile.settings.evalBar ? evalBar : null, board.el),
    h('div', { class: 'player-bar' }, h('span', {}, h('strong', {}, free ? (s.user === 'w' ? 'Blancas' : 'Negras') : profile.name || 'Tú')), clockEl[s.user]),
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
    void updateEvalBar();
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
    if (free) {
      // Dos jugadores: sin robot ni coach; solo reloj y reglas.
      if (s.clock) s.clock[played.move.color] += s.clock.inc;
      refresh();
      if (s.game.status().over) end();
      return true;
    }
    const ply = s.game.history.length - 1;
    s.moveMs.set(ply, Math.round(performance.now() - s.turnStart));
    if (s.clock) s.clockLeft.set(ply, Math.max(0, s.clock[s.user]) / s.clock.base);
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
    if (s.coach && bad) {
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

  /**
   * Jugada del robot: niveles 7–10 con Stockfish limitado por Elo; niveles 1–6 con candidatas
   * MultiPV de Stockfish humanizadas; sin motor, el buscador propio (asíncrono, sin congelar).
   */
  async function pickBotMove(pos: Position): Promise<Move> {
    const cfg = level.engine;
    const engine = await getEngine();
    if (engine) {
      try {
        const a = cfg.humanize
          ? await engine.analyse(pos.toFen(), { nodes: cfg.nodes, multipv: cfg.multipv })
          : await engine.analyse(pos.toFen(), { movetime: cfg.movetime, ...(cfg.elo ? { elo: cfg.elo } : {}) });
        if (!cfg.humanize && a.bestmove) {
          const m = parseMove(pos, a.bestmove);
          if (m) return m;
        }
        if (cfg.humanize && a.lines.length) {
          const candidates = a.lines.map((l) => ({ uci: l.pv[0]!, cp: scoreToCp(l) }));
          return chooseFromCandidates(pos, candidates, { level: s.setup.level, personality: s.setup.personality }).move;
        }
      } catch {
        /* si el motor falla, se usa el buscador propio */
      }
    }
    return (await chooseMoveAsync(pos, { level: s.setup.level, personality: s.setup.personality })).move;
  }

  function botMove() {
    if (s.game.status().over || s.game.position.turn === s.user) return;
    thinking = true;
    say([`${bot.name} está pensando…`]);
    const started = performance.now();
    void (async () => {
      const before = s.game.position;
      const move = await pickBotMove(before);
      // Un mínimo de «tiempo de reflexión» hace la partida más natural.
      await new Promise((r) => setTimeout(r, Math.max(0, 350 - (performance.now() - started))));
      if (s.game.position !== before) return;
      const choice = { move };
      s.game.move({ from: choice.move.from, to: choice.move.to, promotion: choice.move.promotion });
      if (s.clock) s.clock[opp] += s.clock.inc;
      lastBotMove = { before, move: choice.move };
      thinking = false;
      s.turnStart = performance.now();
      refresh();
      if (s.game.status().over) return end();
      const why = button(`¿Por qué jugó eso?`, () => {
        if (!lastBotMove) return;
        const effects = moveEffects(lastBotMove.before, lastBotMove.move);
        board.setArrows(effects.flatMap((e) => e.arrows));
        say([h('ul', {}, ...(effects.length ? effects.map((e) => h('li', {}, e.text)) : [h('li', {}, 'Una jugada de espera: mejora ligeramente su posición.')]))]);
      });
      const warn = s.coach && explanationLevel() !== 'advanced' && threatWarningsNeeded(profile) ? threatWarning(s.game.position) : null;
      if (warn) {
        board.setArrows(warn.arrows);
        say([h('p', { class: 'msg msg-bad' }, warn.text)], [why]);
      } else if (s.coach) {
        say([h('p', { class: 'muted' }, 'Tu turno. ¿Qué hizo tu rival? ¿Qué amenaza?')], [why]);
      } else coachPanel.replaceChildren();
    })();
  }

  async function showHint() {
    if (thinking || s.game.status().over || s.game.position.turn !== s.user) return;
    if (!ladder) {
      const pos = s.game.position;
      // Pistas tácticas propias primero; si no hay nada táctico, la sugerencia la da Stockfish.
      const fallback = (await engineBestMove(pos)) ?? bestMove(pos, 2) ?? undefined;
      if (s.game.position !== pos) return;
      ladder = hintLadder(pos, { fallback });
    }
    if (!ladder) return;
    hintStep = Math.min(5, hintStep + 1);
    s.hintsUsed++;
    const steps = ladder.steps.slice(0, hintStep);
    const cur = steps.at(-1)!;
    board.setHighlights(cur.highlights, cur.level === 2 ? 'zone' : 'hint');
    board.setArrows(cur.arrows);
    say([h('ol', { class: 'hints' }, ...steps.map((st) => h('li', {}, st.text)))],
      hintStep < 5 ? [button(`Pista ${hintStep + 1}/5`, () => void showHint())] : []);
  }

  function undo(plies?: number) {
    if (thinking) return;
    const n = plies ?? (free || s.game.position.turn !== s.user ? 1 : 2);
    for (let i = 0; i < n && s.game.history.length; i++) {
      s.analyses.delete(s.game.history.length - 1);
      s.moveMs.delete(s.game.history.length - 1);
      s.clockLeft.delete(s.game.history.length - 1);
      s.game.undo();
    }
    board.clearMarks();
    s.turnStart = performance.now();
    refresh(false);
  }

  function end() {
    window.clearInterval(timer);
    const st = s.game.status();
    const REASON: Record<string, string> = { checkmate: 'jaque mate', stalemate: 'ahogado', threefold: 'triple repetición', 'fifty-move': 'regla de 50 movimientos', 'insufficient-material': 'material insuficiente', resign: 'abandono', timeout: 'tiempo' };
    if (free) {
      const winner = st.result === '1-0' ? 'Ganan las blancas' : st.result === '0-1' ? 'Ganan las negras' : 'Tablas';
      const pgn = s.game.pgn({ White: 'Blancas', Black: 'Negras' });
      say([h('h2', {}, `${winner} · ${REASON[st.reason ?? ''] ?? ''}`)],
        [primaryButton('Nueva partida', () => navigate('#/play')), button('Copiar PGN', () => { void navigator.clipboard?.writeText(pgn); })]);
      session = null;
      return;
    }
    // Jugadas del usuario hechas antes de empezar (línea de apertura): sin tiempo medido.
    const preUser = s.game.history.filter((p, i) => p.move.color === s.user && !s.moveMs.has(i)).length;
    const userResult: GameRecord['userResult'] = st.result === '1/2-1/2' ? 'draw' : (st.result === '1-0') === (s.user === 'w') ? 'win' : 'loss';
    const record: GameRecord = {
      id: s.id, at: Date.now(), userColor: s.user, bot: { personality: s.setup.personality, level: s.setup.level },
      pgn: s.game.pgn({ White: s.user === 'w' ? profile.name || 'Tú' : bot.name, Black: s.user === 'b' ? profile.name || 'Tú' : bot.name }),
      result: st.result, reason: st.reason, userResult, timeControl: s.setup.clock, hintsUsed: s.hintsUsed,
      moveTimes: [...Array<null>(preUser).fill(null), ...[...s.moveMs.entries()].sort((a, b) => a[0] - b[0]).map(([, ms]) => ms)],
      clockFractions: s.clock ? [...Array<null>(preUser).fill(null), ...[...s.clockLeft.entries()].sort((a, b) => a[0] - b[0]).map(([, f]) => Math.round(f * 1000) / 1000)] : undefined,
      mode: s.setup.mode,
    };
    // ¿Se cumplió el objetivo de la partida?
    let goalLine: string | null = null;
    let goalMet = false;
    if (s.goal?.kind) {
      const n = profile.mistakes.filter((m) => m.gameId === s.id && m.kind === s.goal!.kind).length;
      goalMet = n === 0;
      goalLine = goalMet ? `🎯 Objetivo cumplido: ni una vez «${KIND_LABEL[s.goal.kind]!.toLowerCase()}».` : `🎯 Objetivo: ${n} ${n === 1 ? 'vez' : 'veces'} «${KIND_LABEL[s.goal.kind]!.toLowerCase()}». En la próxima lo conseguirás.`;
    } else if (s.goal?.result) {
      goalMet = s.goal.result === 'win' ? userResult === 'win' : s.goal.result === 'draw' ? userResult !== 'loss' : true;
      if (s.goal.result !== 'play') goalLine = goalMet ? '🎯 ¡Objetivo conseguido!' : '🎯 Objetivo no conseguido esta vez: repasa la idea y vuelve a intentarlo.';
    }
    if (s.game.history.length >= 2) {
      profile.games.push(record);
      if (s.rated) updateRating('gameRating', level.elo, userResult === 'win' ? 1 : userResult === 'draw' ? 0.5 : 0);
      const clean = !profile.mistakes.some((m) => m.gameId === s.id);
      logActivity({ kind: 'game', ms: Date.now() - s.startedAt, ok: clean, ref: s.id });
      recordLearning(15, 'game');
      // Revisión con Stockfish en segundo plano: errores posicionales, ejercicios y ADN.
      void reviewInBackground(record);
    }
    const title = userResult === 'win' ? '¡Victoria!' : userResult === 'draw' ? 'Tablas' : 'Derrota';
    say([h('h2', {}, `${title} · ${REASON[st.reason ?? ''] ?? ''}`), goalLine ? h('p', { class: goalMet ? 'msg msg-good' : 'msg' }, goalLine) : '', h('p', {}, 'Veamos juntos los 3 momentos más importantes.')],
      s.game.history.length >= 2 ? [primaryButton('VER ANÁLISIS', () => navigate(`#/analysis/${s.id}`))] : [primaryButton('Nueva partida', () => navigate('#/play'))]);
    session = null;
  }

  refresh(false);
  board.focus();
  const intro = s.goal?.idea ? `Idea: ${s.goal.idea}` : 'Tú empiezas. Recuerda: centro, desarrollo y rey seguro.';
  if (!free && s.game.position.turn !== s.user) {
    if (s.coach && s.goal?.idea) say([intro]);
    botMove();
  } else if (s.coach) say([intro]);
  return () => { window.clearInterval(timer); nav.destroy(); };
}
