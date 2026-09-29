/**
 * Puzzles adaptativos: primero los repasos vencidos de posiciones de TUS partidas,
 * después puzzles originales según conceptos débiles y rating.
 */
import { Game, localizeSan, moveToSan, parseMove, Position, type PieceType } from '@kavalo/chess-core';
import { conceptById, pickPuzzle, PUZZLES } from '@kavalo/content';
import { dueCards, gradeAttempt } from '@kavalo/pedagogy';
import { hintLadder, type HintLadder } from '@kavalo/tactics';
import { Board } from '../components/board.js';
import { drawToggle, moveInput } from '../components/board-tools.js';
import { cue } from '../feedback.js';
import { coachBubble } from '../components/coach.js';
import { append, button, h, navigate, primaryButton, screen } from '../dom.js';
import { mistakeStats } from '../state/insights.js';
import { addEvidence, addReview, gradeReview, profile, recordLearning, save, updateRating } from '../state/store.js';

interface Item { id: string; fen: string; accept: string[]; line?: string[]; goal?: 'mate' | 'material'; concept: string; rating: number; prompt: string; explanation?: string; personal?: { days: number } }

function nextItem(conceptFilter?: string, exclude: string[] = []): Item | null {
  const now = Date.now();
  for (const card of dueCards(profile.reviews, now)) {
    if (exclude.includes(card.itemId)) continue;
    const pp = profile.personalPuzzles.find((p) => p.id === card.itemId);
    if (pp && (!conceptFilter || pp.concept === conceptFilter)) {
      return { id: pp.id, fen: pp.fen, accept: pp.accept, concept: pp.concept, rating: profile.puzzleRating, prompt: pp.goal === 'mate' ? 'Encuentra el jaque mate.' : 'Encuentra la jugada que gana material.', personal: { days: Math.round((now - pp.createdAt) / 86_400_000) } };
    }
    const orig = PUZZLES.find((p) => p.id === card.itemId);
    if (orig && (!conceptFilter || orig.concept === conceptFilter)) return { ...orig };
  }
  const weak = mistakeStats().map((m) => (m.kind === 'missed-mate' ? 'tactics.mate-in-1' : 'vision.undefended-pieces'));
  const solved = new Set(profile.solvedPuzzles);
  const pool = conceptFilter ? PUZZLES.filter((p) => p.concept === conceptFilter) : PUZZLES;
  const fresh = pool.filter((p) => !solved.has(p.id) && !exclude.includes(p.id));
  const pick = conceptFilter
    ? fresh.sort((a, b) => a.rating - b.rating)[0]
    : pickPuzzle({ rating: profile.puzzleRating, weakConcepts: weak, exclude: [...solved, ...exclude] });
  return pick ? { ...pick } : null;
}

export function renderPuzzles(root: HTMLElement, [conceptFilter]: string[]): void {
  const seen: string[] = [];
  const board = new Board({ coordinates: profile.settings.coordinates, reduceMotion: profile.settings.reduceMotion });
  const head = h('div', {});
  const panel = h('div', {});
  let current: Game | null = null;
  let submitMove: ((from: number, to: number, promotion?: PieceType) => boolean) | null = null;
  const entry = moveInput(() => current?.position ?? null, (m) => submitMove?.(m.from, m.to, m.promotion) ?? false);
  const filterTitle = conceptFilter ? conceptById(conceptFilter)?.title : null;
  root.append(screen(filterTitle ? `Puzzles · ${filterTitle}` : 'Puzzles', h('p', { class: 'muted small' }, `Rating de puzzles: `, h('strong', { id: 'prating' }, String(profile.puzzleRating))), head, h('div', { class: 'board-holder' }, board.el), panel, entry));

  const load = () => {
    const item = nextItem(conceptFilter, seen);
    if (!item) {
      board.setPosition(Position.start(), null, false);
      head.replaceChildren();
      panel.replaceChildren(coachBubble([h('p', {}, conceptFilter ? '¡Has resuelto todos los puzzles de este concepto! Volverán como repasos en los próximos días.' : '¡Has resuelto todos los puzzles disponibles del prototipo! Juega partidas: tus errores se convertirán en nuevos ejercicios.')]),
        h('div', { class: 'cta' }, primaryButton('JUGAR UNA PARTIDA', () => navigate('#/play'))));
      return;
    }
    seen.push(item.id);
    play(item);
  };

  function play(item: Item) {
    const game = new Game(item.fen);
    current = game;
    const start = performance.now();
    let hints = 0;
    let sawSolution = false;
    let ladder: HintLadder | null = null;
    let wrong = 0;
    board.setOrientation(game.position.turn);
    board.setPosition(game.position, null, false);
    board.clearMarks();
    const side = game.position.turn === 'w' ? 'Juegan blancas' : 'Juegan negras';
    head.replaceChildren();
    append(head, [
      item.personal ? h('p', { class: 'badge' }, `📌 Esta posición viene de una partida tuya ${item.personal.days === 0 ? 'de hoy' : `de hace ${item.personal.days} ${item.personal.days === 1 ? 'día' : 'días'}`}. ¿Encuentras ahora la jugada correcta?`) : null,
      h('p', { class: 'puzzle-prompt' }, `${side}. ${item.prompt.replace(/^Juegan (blancas|negras)\. /, '')}`)]);

    const hintBtn = button('Pista', () => {
      ladder ??= hintLadder(game.position);
      if (!ladder) return;
      hints++;
      const st = ladder.steps[Math.min(3, hints - 1)]!;
      board.setHighlights(st.highlights, st.level === 2 ? 'zone' : 'hint');
      panel.replaceChildren(coachBubble([h('p', {}, st.text)]), actions());
    });
    const solutionBtn = button('Ver solución', () => {
      sawSolution = true;
      const m = parseMove(game.position, step === 0 ? item.accept[0]! : item.line![step]!)!;
      board.setArrows([{ from: m.from, to: m.to, color: 'good' }]);
      panel.replaceChildren(coachBubble([h('p', {}, `${localizeSan(moveToSan(game.position, m), 'es')}. ${item.explanation ?? ''}`)]), actions());
    });
    const draw = drawToggle(board);
    const actions = () => h('div', { class: 'game-actions' }, hintBtn, solutionBtn, draw, button('Saltar', load));
    panel.replaceChildren(actions());

    const user = game.position.turn;
    /** Índice en `item.line` de la jugada que toca al usuario (0, 2, 4…). */
    let step = 0;
    const lastStep = item.line ? item.line.length - 1 : 0;
    const onMove = (from: number, to: number, promotion?: PieceType) => {
        const before = game.position;
        const played = game.move({ from, to, promotion });
        if (!played) return false;
        board.setPosition(game.position, { from, to });
        const expected = step === 0 ? item.accept : [item.line![step]!];
        // En la última jugada de un mate, cualquier mate vale.
        const ok = expected.includes(played.uci) || (step === lastStep && item.goal === 'mate' && game.status().reason === 'checkmate');
        if (ok && item.line && step < lastStep) {
          // Puzzle de varias jugadas: la app responde con la mejor defensa del rival.
          cue('move');
          board.setHighlights([to], 'good');
          board.setInteraction({});
          const reply = item.line[step + 1]!;
          setTimeout(() => {
            const r = game.move(reply);
            if (!r) return;
            board.setPosition(game.position, { from: r.move.from, to: r.move.to });
            step += 2;
            ladder = null;
            panel.replaceChildren(coachBubble([h('p', { class: 'msg msg-good' }, `¡Bien! El rival responde ${localizeSan(r.san, 'es')}. ¿Cómo sigues?`)]), actions());
            board.setInteraction({ movable: () => (game.position.turn === user ? user : null), onMove });
          }, 600);
          return true;
        }
        if (ok) {
          cue('success');
          board.flash(to, 'good');
          if (game.status().reason === 'checkmate') board.celebrateMate(game.position.kingSquare(game.position.turn));
          board.setHighlights([to], 'good');
          board.setInteraction({});
          finish(true);
        } else {
          wrong++;
          cue('error');
          board.setHighlights([to], 'bad');
          panel.replaceChildren(coachBubble([h('p', { class: 'msg msg-bad' }, 'No es la mejor jugada. Revisa jaques, capturas y amenazas en ese orden.')]), actions());
          setTimeout(() => { game.undo(); board.setPosition(before, null, false); board.clearMarks(); }, 800);
        }
        return true;
    };
    submitMove = onMove;
    board.setInteraction({ movable: () => (game.position.turn === user ? user : null), onMove });

    function finish(correct: boolean) {
      const ms = performance.now() - start;
      const firstTry = correct && wrong === 0 && !sawSolution;
      const grade = gradeAttempt({ correct: firstTry, hints, sawSolution, ms, medianMs: 25_000 });
      const delta = updateRating('puzzleRating', item.rating, firstTry && hints === 0 ? 1 : 0);
      addEvidence(item.concept, firstTry, item.personal ? 'personal_puzzle' : 'puzzle', hints);
      if (profile.reviews.some((r) => r.itemId === item.id)) gradeReview(item.id, grade);
      else if (!firstTry) addReview(item.concept, item.id); // repetición espaciada si falla
      if (firstTry && !profile.solvedPuzzles.includes(item.id)) profile.solvedPuzzles.push(item.id);
      recordLearning(firstTry ? (item.personal ? 20 : 8) : 2, 'puzzle');
      save();
      document.getElementById('prating')!.textContent = String(profile.puzzleRating);
      panel.replaceChildren(
        coachBubble([
          h('p', { class: 'msg msg-good' }, firstTry ? `¡Correcto! (${delta >= 0 ? '+' : ''}${delta})` : 'Resuelto. Lo repasaremos pronto para fijarlo.'),
          item.explanation ? h('p', {}, item.explanation) : null,
          item.personal && firstTry ? h('p', { class: 'muted small' }, 'Este patrón está mejorando: lo verificaremos también en tus partidas.') : null,
        ].filter((x): x is HTMLParagraphElement => !!x)),
        h('div', { class: 'cta' }, primaryButton('SIGUIENTE', load)));
    }
  }

  load();
}
