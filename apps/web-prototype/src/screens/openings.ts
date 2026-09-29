/**
 * Aperturas (brief §13): se enseñan en el orden PRINCIPIOS → ESTRUCTURAS → PLANES →
 * JUGADAS TÍPICAS → VARIANTES, y después se practican sin memorizar a ciegas: si te desvías,
 * el coach te recuerda la idea antes de enseñarte la jugada.
 * Rutas: #/openings · #/openings/:id · #/openings/:id/practice
 */
import { Game, localizeSan, parseSquare } from '@kavalo/chess-core';
import { OPENINGS, type Opening } from '@kavalo/content';
import { Board } from '../components/board.js';
import { moveNavigator } from '../components/board-tools.js';
import { coachBubble } from '../components/coach.js';
import { button, h, navigate, primaryButton, screen } from '../dom.js';
import { addEvidence, logActivity, profile, recordLearning, save } from '../state/store.js';
import { presetGame } from './play.js';

const LEVEL = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' } as const;
const group = (o: Opening) => (o.color === 'w' ? 'Con blancas' : `Con negras contra ${o.against}`);

export function renderOpenings(root: HTMLElement, [id, sub]: string[] = []): void | (() => void) {
  const opening = id ? OPENINGS.find((o) => o.id === id) : undefined;
  if (opening && sub === 'practice') return renderPractice(root, opening);
  if (opening) return renderOpening(root, opening);
  const groups = [...new Set(OPENINGS.map(group))];
  root.append(screen('Aperturas',
    h('p', { class: 'muted' }, 'No se trata de memorizar jugadas: primero entenderás el objetivo, la estructura y los planes; las variantes llegan al final.'),
    ...groups.map((g) => h('div', { class: 'card' }, h('h2', {}, g),
      h('ul', { class: 'opening-list' }, ...OPENINGS.filter((o) => group(o) === g).map((o) => {
        const st = profile.training.openings[o.id];
        return h('li', {}, h('a', { href: `#/openings/${o.id}`, class: 'opening-sugg' }, h('strong', {}, o.name),
          h('span', { class: 'muted small' }, ` · ${LEVEL[o.minLevel]}${st ? ` · practicada ${st.practiced} ${st.practiced === 1 ? 'vez' : 'veces'}` : ''}`)));
      })))),
  ));
}

function sanLine(moves: string[]): string {
  return moves.map((m, i) => `${i % 2 === 0 ? `${i / 2 + 1}. ` : ''}${localizeSan(m, 'es')}`).join(' ');
}

function bar(label: string, v: number, left: string, right: string): HTMLElement {
  return h('div', { class: 'style-scale' }, h('p', { class: 'small' }, h('strong', {}, label)),
    h('div', { class: 'scale', role: 'img', 'aria-label': `${label}: ${Math.round(v * 100)} sobre 100` },
      h('span', { class: 'scale-end' }, left), h('span', { class: 'scale-track' }, h('span', { class: 'scale-dot', style: `left:${v * 100}%` })), h('span', { class: 'scale-end' }, right)));
}

function renderOpening(root: HTMLElement, o: Opening): () => void {
  const STEPS = ['Principios', 'Estructura', 'Planes', 'Jugadas típicas', 'Variantes'] as const;
  let step = 0;
  let line = o.line;
  let ply = line.length;
  const board = new Board({ orientation: o.color, coordinates: profile.settings.coordinates, reduceMotion: profile.settings.reduceMotion });
  const nav = moveNavigator((i) => show(i));
  const stepper = h('ol', { class: 'stepper', 'aria-label': 'Pasos' });
  const content = h('div', {});
  const controls = h('div', { class: 'cta' });

  const show = (i: number) => {
    ply = i;
    const g = new Game();
    for (const m of line.slice(0, i)) g.move(m);
    const last = g.history.at(-1);
    board.setPosition(g.position, last ? { from: last.move.from, to: last.move.to } : null, false);
    nav.update(line.length + 1, i);
  };

  const render = () => {
    stepper.replaceChildren(...STEPS.map((s, i) => h('li', { class: i === step ? 'on' : i < step ? 'done' : '' },
      h('button', { class: 'link', onclick: (() => { step = i; render(); }) as EventListener, 'aria-current': i === step ? 'step' : undefined }, `${i + 1}. ${s}`))));
    line = o.line;
    board.clearMarks();
    show(line.length);
    const list = (title: string, items: string[]) => items.length ? h('div', {}, h('h3', {}, title), h('ul', {}, ...items.map((t) => h('li', {}, t)))) : null;
    switch (step) {
      case 0:
        content.replaceChildren(h('div', { class: 'card' },
          h('p', { class: 'eyebrow' }, 'Objetivo'), h('p', {}, o.objective),
          bar('Carácter', o.character.dynamism, 'Estratégica', 'Táctica'),
          bar('Teoría necesaria', o.character.theory, 'Poca', 'Mucha'),
          bar('Riesgo', o.character.risk, 'Sólida', 'Arriesgada'),
          h('p', { class: 'muted small' }, 'Principios que siempre se cumplen: controla el centro, desarrolla las piezas menores antes que la dama y pon tu rey a salvo.')));
        break;
      case 1:
        board.setHighlights(o.keySquares.map(parseSquare), 'zone');
        content.replaceChildren(h('div', { class: 'card' },
          h('p', { class: 'eyebrow' }, 'Estructura de peones'), h('p', {}, o.structure),
          h('p', { class: 'eyebrow' }, 'Piezas importantes'), h('p', {}, o.keyPieces),
          h('p', { class: 'eyebrow' }, 'Casillas importantes'), h('p', {}, o.keySquares.join(', '), h('span', { class: 'muted small' }, ' (resaltadas en el tablero)'))));
        break;
      case 2:
        content.replaceChildren(h('div', { class: 'card' }, list('Planes', o.plans), list('Rupturas', o.breaks),
          h('h3', {}, 'Medio juego típico'), h('p', {}, o.middlegame), h('h3', {}, 'Finales típicos'), h('p', {}, o.endgame)));
        break;
      case 3:
        show(0);
        content.replaceChildren(h('div', { class: 'card' }, h('p', {}, sanLine(o.line)),
          h('p', { class: 'muted small' }, 'Usa ◀ ▶ para recorrer la línea. En cada jugada pregúntate qué principio cumple: centro, desarrollo o seguridad del rey.')),
          h('div', { class: 'card' }, list('Errores frecuentes', o.commonMistakes), list('Trampas', o.traps)));
        break;
      case 4:
        content.replaceChildren(h('div', { class: 'card' },
          h('p', {}, h('strong', {}, 'Línea principal: '), sanLine(o.line)),
          ...(o.variations ?? []).map((v, i) => h('p', {}, h('button', { class: 'link', onclick: (() => { line = v; show(v.length); }) as EventListener }, `Variante ${i + 1}`), `: ${sanLine(v)}`)),
          !(o.variations ?? []).length ? h('p', { class: 'muted small' }, 'Por ahora, domina la línea principal y sus ideas.') : null));
        break;
    }
    controls.replaceChildren(
      step < STEPS.length - 1 ? primaryButton(`SIGUIENTE: ${STEPS[step + 1]!.toUpperCase()}`, () => { step++; render(); })
        : primaryButton('PRACTICAR LA LÍNEA', () => navigate(`#/openings/${o.id}/practice`)),
      button('Jugar desde esta apertura', () => { presetGame({ mode: 'opening', openingId: o.id }); navigate('#/play'); }));
  };

  root.append(screen(o.name, h('p', { class: 'muted' }, `${group(o)} · ${LEVEL[o.minLevel]}`), stepper,
    h('div', { class: 'board-holder' }, board.el), nav.el, content, controls));
  render();
  return () => nav.destroy();
}

function renderPractice(root: HTMLElement, o: Opening): () => void {
  const game = new Game();
  let errors = 0;
  let missesHere = 0;
  const started = Date.now();
  const board = new Board({ orientation: o.color, coordinates: profile.settings.coordinates, reduceMotion: profile.settings.reduceMotion });
  const panel = h('div', {});
  const say = (nodes: (Node | string)[], acts: HTMLElement[] = []) => panel.replaceChildren(coachBubble(nodes, acts));
  const expected = () => o.line[game.history.length];

  const autoReply = () => {
    while (game.history.length < o.line.length && game.position.turn !== o.color) game.move(o.line[game.history.length]!);
    const last = game.history.at(-1);
    board.setPosition(game.position, last ? { from: last.move.from, to: last.move.to } : null);
    if (game.history.length >= o.line.length) return finish();
    board.clearMarks();
  };

  const finish = () => {
    board.setInteraction({});
    const st = profile.training.openings[o.id] ?? { practiced: 0, clean: 0, at: 0 };
    st.practiced++;
    if (!errors) st.clean++;
    st.at = Date.now();
    profile.training.openings[o.id] = st;
    addEvidence('openings.development', errors === 0, 'guided');
    logActivity({ kind: 'training', ms: Date.now() - started, ok: errors === 0, ref: `opening:${o.id}`, concept: 'openings.development' });
    recordLearning(errors ? 8 : 15, 'opening');
    save();
    say([h('p', { class: errors ? 'msg' : 'msg msg-good' }, errors ? `Línea completada con ${errors} ${errors === 1 ? 'desvío' : 'desvíos'}.` : '¡Línea completada sin errores!'),
      h('p', {}, `Recuerda el plan: ${o.plans[0]}`)],
    [primaryButton('JUGAR DESDE AQUÍ', () => { presetGame({ mode: 'opening', openingId: o.id }); navigate('#/play'); }),
      button('Repetir', () => { root.replaceChildren(); renderPractice(root, o); }), button('Volver a la apertura', () => navigate(`#/openings/${o.id}`))]);
  };

  board.setInteraction({
    movable: () => o.color,
    onMove: (from, to, promotion) => {
      const want = expected();
      if (!want) return false;
      const g = new Game(game.position.toFen());
      const played = g.move({ from, to, promotion });
      if (!played) return false;
      const target = new Game(game.position.toFen()).move(want)!;
      if (played.uci !== target.uci) {
        errors++;
        missesHere++;
        board.setPosition(game.position, null, false);
        // Primero la idea; solo tras dos intentos, la jugada.
        if (missesHere >= 2) {
          board.setArrows([{ from: target.move.from, to: target.move.to, color: 'good' }]);
          say([`La jugada de la línea es ${localizeSan(target.san, 'es')}.`, h('p', { class: 'muted small' }, o.objective)]);
        } else say([`${localizeSan(played.san, 'es')} no es la jugada de la línea principal. Piensa en el objetivo:`, h('p', {}, o.objective)]);
        return false;
      }
      missesHere = 0;
      game.move(want);
      say([h('p', { class: 'msg msg-good' }, `✓ ${localizeSan(target.san, 'es')}`)]);
      setTimeout(autoReply, 300);
      return true;
    },
  });

  root.append(screen(`Practicar: ${o.name}`, h('p', { class: 'muted' }, 'Juega las jugadas de tu bando; el rival responde con la línea principal.'),
    h('div', { class: 'board-holder' }, board.el), panel));
  autoReply();
  say(['Tu turno. ¿Qué jugada cumple el objetivo de la apertura?']);
  return () => board.setInteraction({});
}
