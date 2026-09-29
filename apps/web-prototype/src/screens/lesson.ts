/** Lección EMPCRAE paso a paso: explicar, mostrar, practicar, corregir y comprobar. */
import { Game, parseSquare, Position, squareName, type Square } from '@kavalo/chess-core';
import { lessonById, PUZZLES, type LessonStep } from '@kavalo/content';
import { Board } from '../components/board.js';
import { cue } from '../feedback.js';
import { coachBubble, COACHES } from '../components/coach.js';
import { button, h, navigate, primaryButton, screen } from '../dom.js';
import { addEvidence, profile, recordLearning, save } from '../state/store.js';

export function renderLesson(root: HTMLElement, [id]: string[]): void {
  const lesson = lessonById(id ?? '');
  if (!lesson) {
    root.append(screen('Lección no encontrada', primaryButton('Volver al mapa', () => navigate('#/learn'))));
    return;
  }
  let index = 0;
  let mistakes = 0;
  const title = h('p', { class: 'eyebrow' }, lesson.title);
  const bar = h('div', { class: 'progress-bar' });
  const boardHolder = h('div', { class: 'board-holder' });
  const panel = h('div', { class: 'lesson-panel' });
  const board = new Board({ coordinates: profile.settings.coordinates, reduceMotion: profile.settings.reduceMotion });
  boardHolder.append(board.el);
  root.append(screen(null, h('div', { class: 'lesson-head' }, h('a', { href: '#/learn', class: 'link', 'aria-label': 'Salir' }, '✕'), title), h('div', { class: 'progress' }, bar), boardHolder, panel));

  const setInteraction = (o: Parameters<Board['setInteraction']>[0]) => board.setInteraction(o);

  const goodBubble = (text: string) => {
    cue('success');
    return coachBubble([h('p', { class: 'msg msg-good' }, text)]);
  };

  const message = (text: string, kind: 'info' | 'good' | 'bad' = 'info', actions: HTMLElement[] = []) => {
    if (kind === 'bad') cue('error');
    panel.replaceChildren(coachBubble([h('p', { class: `msg msg-${kind}` }, text)], actions));
  };

  const next = () => {
    index++;
    if (index >= lesson.steps.length) return finish();
    show();
  };

  const continueBtn = (label = 'Continuar') => h('div', { class: 'cta' }, primaryButton(label, next));

  function show() {
    const step = lesson!.steps[index]!;
    bar.style.width = `${(index / lesson!.steps.length) * 100}%`;
    board.clearMarks();
    setInteraction({});
    const pos = step.fen ? Position.fromFen(step.fen) : null;
    boardHolder.hidden = !pos;
    if (pos) board.setPosition(pos, null, false);
    render(step, pos);
  }

  function render(step: LessonStep, pos: Position | null) {
    switch (step.kind) {
      case 'explain':
        board.setHighlights((step.highlights ?? []).map(parseSquare), 'info');
        board.setArrows((step.arrows ?? []).map(([a, b]) => ({ from: parseSquare(a), to: parseSquare(b), color: 'info' })));
        panel.replaceChildren(coachBubble([h('p', {}, step.text)]), continueBtn());
        break;

      case 'select': {
        const answer = new Set(step.answer.map(parseSquare));
        const found = new Set<Square>();
        message(step.text);
        setInteraction({
          onSquare: (sq) => {
            if (answer.has(sq)) {
              found.add(sq);
              board.addHighlight(sq, 'good');
              if (found.size === answer.size) {
                panel.replaceChildren(goodBubble(step.success), continueBtn());
                setInteraction({});
              } else if (answer.size > 1) {
                message(`${step.text} (${found.size}/${answer.size})`, 'good');
              }
            } else {
              mistakes++;
              board.addHighlight(sq, 'bad');
              setTimeout(() => { board.setHighlights([...found], 'good'); }, 600);
              message(`${step.wrong} (tocaste ${squareName(sq)})`, 'bad');
            }
          },
        });
        break;
      }

      case 'move': {
        let game = new Game(step.fen);
        message(step.text);
        setInteraction({
          movable: () => game.position.turn,
          onMove: (from, to, promotion) => {
            const played = game.move({ from, to, promotion });
            if (!played) return false;
            board.setPosition(game.position, { from, to });
            if (step.accept.includes(played.uci)) {
              board.setHighlights([to], 'good');
              setInteraction({});
              panel.replaceChildren(goodBubble(step.success), continueBtn());
            } else {
              mistakes++;
              board.setHighlights([to], 'bad');
              message(step.wrong, 'bad');
              setTimeout(() => { game = new Game(step.fen); board.setPosition(game.position, null, false); board.clearMarks(); }, 900);
            }
            return true;
          },
        });
        break;
      }

      case 'reach': {
        const target = parseSquare(step.target);
        let current = pos!;
        let used = 0;
        board.setHighlights([target], 'hint');
        message(`${step.text} Saltos: 0/${step.maxMoves}`);
        setInteraction({
          movable: () => 'w',
          onMove: (from, to) => {
            const move = current.legalMoves(from).find((m) => m.to === to);
            if (!move || move.piece !== 'n') return false;
            used++;
            current = current.play(move).withTurn('w'); // modo "pieza libre": siempre mueves tú
            board.setPosition(current, { from, to });
            board.setHighlights([target], 'hint');
            if (to === target) {
              board.setHighlights([target], 'good');
              setInteraction({});
              panel.replaceChildren(goodBubble(step.success), continueBtn());
            } else if (used >= step.maxMoves) {
              mistakes++;
              message(step.wrong, 'bad', [button('Reintentar', () => show())]);
              setInteraction({});
            } else {
              message(`${step.text} Saltos: ${used}/${step.maxMoves}`);
            }
            return true;
          },
        });
        break;
      }

      case 'quiz': {
        board.setHighlights((step.highlights ?? []).map(parseSquare), 'info');
        const options = step.options.map((o, i) =>
          h('button', { class: 'choice', onclick: (() => answer(i)) as EventListener }, o));
        panel.replaceChildren(coachBubble([h('p', {}, step.text)]), h('div', { class: 'choices' }, ...options));
        const answer = (i: number) => {
          const ok = i === step.answer;
          if (!ok) mistakes++;
          cue(ok ? 'success' : 'error');
          options.forEach((b, j) => { b.disabled = true; b.classList.toggle('choice-good', j === step.answer); b.classList.toggle('choice-bad', j === i && !ok); });
          panel.append(coachBubble([h('p', { class: `msg msg-${ok ? 'good' : 'bad'}` }, `${ok ? '¡Correcto! ' : 'No exactamente. '}${step.explanation}`)]), continueBtn());
        };
        break;
      }
    }
  }

  function finish() {
    bar.style.width = '100%';
    const first = !profile.completedLessons.includes(lesson!.id);
    if (first) profile.completedLessons.push(lesson!.id);
    addEvidence(lesson!.conceptId, mistakes <= 1, 'guided', 0);
    recordLearning(first ? 20 : 5, `lesson:${lesson!.id}`);
    save();
    boardHolder.hidden = true;
    const puzzles = PUZZLES.filter((p) => p.concept === lesson!.conceptId);
    panel.replaceChildren(
      coachBubble([
        h('h2', {}, '¡Lección completada!'),
        h('p', {}, mistakes === 0 ? `${COACHES[profile.coachStyle].onGood} Sin errores.` : `Cometiste ${mistakes} ${mistakes === 1 ? 'error' : 'errores'}: es parte de aprender.`),
        h('p', { class: 'muted small' }, 'Un concepto no se considera aprendido por resolverlo una vez: volverá en puzzles, repasos y partidas.'),
      ]),
      h('div', { class: 'cta' },
        puzzles.length
          ? primaryButton('PRACTICAR CON PUZZLES', () => navigate(`#/puzzles/${lesson!.conceptId}`))
          : primaryButton('VOLVER AL MAPA', () => navigate('#/learn')),
        puzzles.length ? button('Volver al mapa', () => navigate('#/learn')) : null),
    );
  }

  show();
}
