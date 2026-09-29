/**
 * Entrenamientos específicos (brief §51–53): coordenadas, visión y cálculo.
 * Rutas: #/train · #/train/coords · #/train/vision · #/train/calc
 */
import { Game, parseSquare, Position, squareName, type Square } from '@kavalo/chess-core';
import {
  CALC_EXERCISES, checkCoordinate, checkSelection, coordinateSet, scoreCalculation, seeded, VISION_LABEL, visionSet,
  type CalcExercise, type CoordinateExercise, type VisionExercise, type VisionKind,
} from '@kavalo/training';
import { PUZZLES } from '@kavalo/content';
import { Board } from '../components/board.js';
import { coachBubble } from '../components/coach.js';
import { button, h, navigate, primaryButton, screen } from '../dom.js';
import { getEngine } from '../engine.js';
import { addEvidence, logActivity, profile, recordLearning, save, updateSkillRating } from '../state/store.js';

const EMPTY = '8/8/8/8/8/8/8/8 w - - 0 1';

export function renderTrain(root: HTMLElement, [kind]: string[] = []): void | (() => void) {
  if (kind === 'coords') return renderCoords(root);
  if (kind === 'vision') return renderVision(root);
  if (kind === 'calc') return renderCalc(root);
  const t = profile.training;
  const visionTotals = Object.values(t.vision).reduce((a, v) => ({ c: a.c + v.correct, n: a.n + v.total }), { c: 0, n: 0 });
  const card = (href: string, icon: string, title: string, desc: string, stat: string) =>
    h('a', { class: 'card card-link train-card', href }, h('span', { class: 'train-icon', 'aria-hidden': 'true' }, icon),
      h('span', {}, h('strong', {}, title), h('span', { class: 'muted small' }, ` ${desc}`), stat ? h('span', { class: 'small train-stat' }, stat) : null));
  root.append(screen('Entrenamiento',
    h('p', { class: 'muted' }, 'Ejercicios cortos para entrenar lo que usas en cada jugada: ver el tablero, detectar amenazas y calcular.'),
    card('#/train/coords', '⌗', 'Coordenadas', 'Encuentra casillas, colores y saltos de caballo contra el reloj.',
      t.coords.bestScore !== null ? `Mejor sesión: ${t.coords.bestScore}/20${t.coords.bestMs ? ` en ${Math.round(t.coords.bestMs / 1000)} s` : ''}` : ''),
    card('#/train/vision', '👁', 'Visión', 'Piezas atacadas, defendidas e indefensas, jaques, capturas, amenazas, líneas y rutas.',
      visionTotals.n ? `Aciertos: ${visionTotals.c}/${visionTotals.n}` : ''),
    card('#/train/calc', '🧠', 'Cálculo', 'Mira sin mover: escribe tus candidatas y la línea completa; después la comparamos.',
      t.calc.exercises ? `Profundidad media: ${(t.calc.totalDepth / t.calc.exercises).toFixed(1)} medias jugadas · máxima ${t.calc.maxDepth}` : ''),
  ));
}

// ───────────── Coordenadas ─────────────

function renderCoords(root: HTMLElement): () => void {
  const N = 20;
  const set = coordinateSet(N, seeded(Date.now() % 100000), profile.completedLessons.includes('knight') ? 2 : 1);
  let i = 0;
  let score = 0;
  let started = 0;
  let showCoords = false;
  let picked: Square[] = [];
  const board = new Board({ coordinates: false, reduceMotion: profile.settings.reduceMotion });
  const prompt = h('p', { class: 'train-prompt', 'aria-live': 'polite' });
  const counter = h('p', { class: 'muted small' });
  const feedback = h('div', {});
  const controls = h('div', { class: 'cta' });
  const coordsToggle = button('Mostrar coordenadas: no', () => {
    showCoords = !showCoords;
    board.setCoordinates(showCoords);
    coordsToggle.textContent = `Mostrar coordenadas: ${showCoords ? 'sí' : 'no'}`;
  });

  const finish = () => {
    const ms = Date.now() - started;
    const t = profile.training.coords;
    t.sessions++;
    const better = t.bestScore === null || score > t.bestScore || (score === t.bestScore && ms < (t.bestMs ?? Infinity));
    if (better) { t.bestScore = score; t.bestMs = ms; }
    addEvidence('fundamentals.board', score >= N * 0.8, 'guided');
    logActivity({ kind: 'training', ms, ok: score >= N * 0.8, ref: 'train:coords', concept: 'fundamentals.board' });
    recordLearning(5 + score, 'train');
    save();
    board.setInteraction({});
    prompt.textContent = `${score}/${N} en ${Math.round(ms / 1000)} s${better ? ' · ¡nuevo récord!' : ''}`;
    counter.textContent = '';
    feedback.replaceChildren(coachBubble([score >= N * 0.9 ? 'Excelente: ya ves el tablero sin necesidad de coordenadas.' : 'Repite a menudo: conocer las casillas de memoria hace que leer partidas y lecciones sea mucho más fácil.']));
    controls.replaceChildren(primaryButton('OTRA SERIE', () => { root.replaceChildren(); renderCoords(root); }), button('Volver', () => navigate('#/train')));
  };

  const answer = (ok: boolean, correct: Square[]) => {
    if (ok) score++;
    board.setHighlights(correct, ok ? 'good' : 'bad');
    feedback.replaceChildren(h('p', { class: ok ? 'msg msg-good' : 'msg msg-bad' }, ok ? '✓ Correcto' : `✗ Era ${correct.map(squareName).join(', ')}`));
    board.setInteraction({});
    setTimeout(() => { i++; if (i < N) load(); else finish(); }, ok ? 450 : 1100);
  };

  const load = () => {
    const ex: CoordinateExercise = set[i]!;
    picked = [];
    feedback.replaceChildren();
    controls.replaceChildren(coordsToggle);
    counter.textContent = `${i + 1} de ${N} · aciertos: ${score}`;
    prompt.textContent = ex.prompt;
    board.clearMarks();
    if (ex.kind === 'knight-squares') {
      board.setPosition(Position.diagram(fenWithKnight(ex.square)), null, false);
      board.setInteraction({ onSquare: (sq) => {
        picked = picked.includes(sq) ? picked.filter((s) => s !== sq) : [...picked, sq];
        board.setHighlights(picked, 'info');
      } });
      controls.prepend(primaryButton('Comprobar', () => answer(checkCoordinate(ex, picked), ex.answer)));
    } else if (ex.kind === 'square-color') {
      board.setPosition(Position.diagram(EMPTY), null, false);
      board.setHighlights([ex.square], 'zone');
      board.setInteraction({});
      controls.prepend(
        button('Clara', () => answer(checkCoordinate(ex, 'light'), [ex.square]), { 'data-answer': 'light' }),
        button('Oscura', () => answer(checkCoordinate(ex, 'dark'), [ex.square]), { 'data-answer': 'dark' }));
    } else {
      board.setPosition(Position.diagram(EMPTY), null, false);
      board.setInteraction({ onSquare: (sq) => answer(checkCoordinate(ex, sq), [ex.square]) });
    }
  };

  root.append(screen('Coordenadas', counter, prompt, h('div', { class: 'board-holder' }, board.el), feedback, controls));
  controls.append(primaryButton('EMPEZAR', () => { started = Date.now(); load(); }));
  prompt.textContent = `${N} preguntas. Intenta hacerlas sin mirar las coordenadas.`;
  board.setPosition(Position.diagram(EMPTY), null, false);
  return () => board.setInteraction({});
}

function fenWithKnight(sq: Square): string {
  const rows: string[] = [];
  for (let r = 7; r >= 0; r--) {
    let row = '';
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      if (r * 8 + f === sq) { if (empty) row += empty; empty = 0; row += 'N'; } else empty++;
    }
    rows.push(row + (empty ? empty : ''));
  }
  return rows.join('/');
}

// ───────────── Visión ─────────────

function renderVision(root: HTMLElement): () => void {
  const N = 10;
  const set = visionSet(N, seeded(Date.now() % 100000));
  let i = 0;
  let score = 0;
  let selected: string[] = [];
  const started = Date.now();
  const board = new Board({ coordinates: profile.settings.coordinates, reduceMotion: profile.settings.reduceMotion });
  const title = h('p', { class: 'eyebrow' });
  const prompt = h('p', { class: 'train-prompt', 'aria-live': 'polite' });
  const found = h('p', { class: 'small muted' });
  const feedback = h('div', {});
  const controls = h('div', { class: 'cta' });

  const finish = () => {
    logActivity({ kind: 'training', ms: Date.now() - started, ok: score >= N * 0.7, ref: 'train:vision', concept: 'vision.threats' });
    recordLearning(5 + score * 2, 'train');
    board.setInteraction({});
    title.textContent = 'Resultado';
    prompt.textContent = `${score}/${N} ejercicios perfectos.`;
    found.textContent = '';
    const weak = Object.entries(profile.training.vision).filter(([, v]) => v.total >= 3).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)[0];
    feedback.replaceChildren(coachBubble([weak ? `Donde más te cuesta: ${VISION_LABEL[weak[0] as VisionKind].toLowerCase()} (${weak[1].correct}/${weak[1].total}).` : 'Sigue practicando: la visión se entrena con repetición.']));
    controls.replaceChildren(primaryButton('OTRA SERIE', () => { root.replaceChildren(); renderVision(root); }), button('Volver', () => navigate('#/train')));
  };

  const check = (ex: VisionExercise) => {
    const r = checkSelection(ex.answer, selected);
    const stat = profile.training.vision[ex.kind] ?? { correct: 0, total: 0 };
    stat.total++;
    if (r.correct) { stat.correct++; score++; }
    profile.training.vision[ex.kind] = stat;
    addEvidence(ex.concept, r.correct, 'guided');
    save();
    board.setInteraction({});
    if (ex.select === 'squares') {
      board.clearMarks();
      r.found.forEach((s) => board.addHighlight(parseSquare(s), 'good'));
      r.missed.forEach((s) => board.addHighlight(parseSquare(s), 'hint'));
      r.wrong.forEach((s) => board.addHighlight(parseSquare(s), 'bad'));
    } else if (ex.select === 'moves') {
      board.setArrows([
        ...r.found.map((u) => ({ from: parseSquare(u.slice(0, 2)), to: parseSquare(u.slice(2, 4)), color: 'good' as const })),
        ...r.missed.map((u) => ({ from: parseSquare(u.slice(0, 2)), to: parseSquare(u.slice(2, 4)), color: 'info' as const })),
      ]);
    }
    feedback.replaceChildren(h('p', { class: r.correct ? 'msg msg-good' : 'msg msg-bad' },
      r.correct ? '✓ ¡Perfecto!' : ex.select === 'number' ? `✗ La respuesta era ${ex.answer[0]}.`
        : `✗ Encontraste ${r.found.length} de ${ex.answer.length}${r.wrong.length ? ` y marcaste ${r.wrong.length} de más` : ''}. En azul/amarillo, lo que faltaba.`));
    controls.replaceChildren(primaryButton(i + 1 < N ? 'Siguiente' : 'Ver resultado', () => { i++; if (i < N) load(); else finish(); }));
  };

  const load = () => {
    const ex = set[i]!;
    selected = [];
    feedback.replaceChildren();
    found.textContent = '';
    title.textContent = `${i + 1} de ${N} · ${VISION_LABEL[ex.kind]}`;
    prompt.textContent = ex.prompt;
    const pos = ex.kind === 'knight-route' ? Position.diagram(ex.fen) : Position.fromFen(ex.fen);
    board.setPosition(pos, null, false);
    board.clearMarks();
    if (ex.marks.length) board.setHighlights(ex.marks.map(parseSquare), 'zone');
    controls.replaceChildren();
    if (ex.select === 'squares') {
      board.setInteraction({ onSquare: (sq) => {
        const n = squareName(sq);
        selected = selected.includes(n) ? selected.filter((s) => s !== n) : [...selected, n];
        board.setHighlights([...ex.marks.map(parseSquare)], 'zone');
        selected.forEach((s) => board.addHighlight(parseSquare(s), 'info'));
        found.textContent = `Seleccionadas: ${selected.length}`;
      } });
      controls.append(primaryButton('Comprobar', () => check(ex)));
    } else if (ex.select === 'moves') {
      board.setInteraction({
        movable: () => pos.turn,
        onMove: (from, to, promotion) => {
          const m = pos.legalMoves(from).find((x) => x.to === to && (!x.promotion || x.promotion === (promotion ?? 'q')));
          if (!m) return false;
          const uci = `${squareName(from)}${squareName(to)}${m.promotion ?? ''}`;
          if (!selected.includes(uci)) selected.push(uci);
          const g = new Game(ex.fen);
          found.textContent = `Encontradas (${selected.length}): ${selected.map((u) => g.move(u) && (g.undo()?.san ?? u)).join(', ')}`;
          board.setPosition(pos, null, false);
          return false;
        },
      });
      controls.append(primaryButton('Ya las tengo todas', () => check(ex)));
    } else {
      board.setInteraction({});
      controls.append(...(ex.options ?? []).map((o) => button(o, () => { selected = [o]; check(ex); }, { 'data-answer': o })));
    }
  };

  root.append(screen('Visión', title, prompt, h('div', { class: 'board-holder' }, board.el), found, feedback, controls));
  load();
  return () => board.setInteraction({});
}

// ───────────── Cálculo ─────────────

/** Ejercicios de cálculo: mates en 2 fijos y, con Stockfish, posiciones tácticas con su línea. */
async function engineCalcExercise(): Promise<CalcExercise | null> {
  const engine = await getEngine();
  if (!engine) return null;
  const pool = PUZZLES.filter((p) => p.goal === 'material' && !p.line);
  const pz = pool[Math.floor(Math.random() * pool.length)]!;
  const a = await engine.analyse(pz.fen, { depth: 16 });
  const pv = a.lines[0]?.pv ?? [];
  if (pv.length < 3 || !pz.accept.includes(pv[0]!)) return null;
  return { id: `calc-sf-${pz.id}`, fen: pz.fen, prompt: pz.prompt, line: pv.slice(0, 3), accept: [pv[0]!], concept: 'calculation.candidates', rating: pz.rating };
}

function renderCalc(root: HTMLElement): () => void {
  const board = new Board({ coordinates: profile.settings.coordinates, reduceMotion: profile.settings.reduceMotion });
  const body = h('div', {});
  root.append(screen('Cálculo', h('p', { class: 'muted' }, 'No puedes mover las piezas: calcula mentalmente. Primero escribe tus jugadas candidatas y después la línea que elegirías (tu jugada, la respuesta del rival y tu siguiente jugada).'),
    h('div', { class: 'board-holder' }, board.el), body));

  const run = (ex: CalcExercise) => {
    const pos = Position.fromFen(ex.fen);
    board.setPosition(pos, null, false);
    board.setInteraction({});
    board.clearMarks();
    const field = (label: string, ph: string) => h('input', { class: 'input', placeholder: ph, 'aria-label': label, autocomplete: 'off' }) as HTMLInputElement;
    const cands = field('Candidatas', 'Candidatas, separadas por comas (p. ej. Dh7+, Cf7)');
    const m1 = field('Tu jugada', 'Tu jugada');
    const m2 = field('Respuesta del rival', 'Respuesta del rival');
    const m3 = field('Tu siguiente jugada', 'Tu siguiente jugada');
    const result = h('div', {});
    body.replaceChildren(
      h('p', { class: 'train-prompt' }, ex.prompt),
      h('label', { class: 'field' }, h('span', { class: 'small' }, '1. Jugadas candidatas'), cands),
      h('label', { class: 'field' }, h('span', { class: 'small' }, '2. Tu línea'), m1, m2, m3),
      h('div', { class: 'cta' }, primaryButton('Comparar', () => {
        const r = scoreCalculation(ex, {
          candidates: cands.value.split(/[,;]/).map((s) => s.trim()).filter(Boolean),
          line: [m1.value, m2.value, m3.value].map((s) => s.trim()).filter(Boolean),
        });
        const t = profile.training.calc;
        t.exercises++;
        t.totalDepth += r.depth;
        t.maxDepth = Math.max(t.maxDepth, r.depth);
        t.candidates += r.candidates;
        if (r.depth === ex.line.length) t.perfect++;
        if (r.bestAmongCandidates) t.bestInCandidates++;
        addEvidence('calculation.candidates', r.depth >= 1, 'puzzle');
        updateSkillRating('calculation.candidates', ex.rating, r.accuracy);
        logActivity({ kind: 'training', ms: 0, ok: r.depth === ex.line.length, ref: 'train:calc', concept: 'calculation.candidates' });
        save();
        const g = new Game(ex.fen);
        const refSan = ex.line.map((u) => g.move(u)?.san ?? u);
        board.setArrows(ex.line.slice(0, 1).map((u) => ({ from: parseSquare(u.slice(0, 2)), to: parseSquare(u.slice(2, 4)), color: 'good' as const })));
        result.replaceChildren(coachBubble([
          h('p', { class: r.depth === ex.line.length ? 'msg msg-good' : 'msg' }, `Profundidad correcta: ${r.depth} de ${ex.line.length} medias jugadas.`),
          h('p', {}, `Línea correcta: ${refSan.join(' ')}${ex.id.startsWith('calc-sf') ? ' (línea principal de Stockfish)' : ''}`),
          h('p', { class: 'small' }, `Candidatas válidas: ${r.candidates}${r.bestAmongCandidates ? ' · la buena estaba entre ellas ✓' : ' · la buena no estaba entre tus candidatas'}.`),
          r.illegal ? h('p', { class: 'small msg-bad' }, `${r.illegal} ${r.illegal === 1 ? 'jugada no se entiende o es ilegal' : 'jugadas no se entienden o son ilegales'} en esa posición: revisa la notación (Cf3, Dxh7+, O-O…).`) : '',
          r.firstError !== null && r.firstError > 0 ? h('p', { class: 'small' }, `El cálculo se desvió en la jugada ${r.firstError + 1}: ${r.firstError % 2 ? '¿qué es lo mejor para el rival? Busca sus jaques y capturas primero.' : 'tras la respuesta del rival, vuelve a buscar jugadas forzantes.'}`) : '',
        ], [primaryButton('Otro ejercicio', () => void next()), button('Volver', () => navigate('#/train'))]));
      })),
      result);
    cands.focus();
  };

  let k = Math.floor(Math.random() * CALC_EXERCISES.length);
  const next = async () => {
    // Alterna mates en 2 verificados con posiciones analizadas por Stockfish cuando está disponible.
    const useEngine = profile.training.calc.exercises % 2 === 1;
    const ex = (useEngine ? await engineCalcExercise() : null) ?? CALC_EXERCISES[k++ % CALC_EXERCISES.length]!;
    if (!body.isConnected) return;
    run(ex);
  };
  void next();
  return () => board.setInteraction({});
}
