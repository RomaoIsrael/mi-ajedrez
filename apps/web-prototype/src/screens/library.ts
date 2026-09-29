/**
 * Biblioteca de partidas históricas (brief §54): en cada momento clave se pregunta
 * «¿Qué jugarías?» y después se explica qué ocurrió, la idea y el concepto.
 * Rutas: #/library · #/library/:id
 */
import { Game, localizeSan } from '@kavalo/chess-core';
import { conceptById, HISTORICAL_GAMES, type HistoricalGame } from '@kavalo/content';
import { Board } from '../components/board.js';
import { moveNavigator } from '../components/board-tools.js';
import { coachBubble } from '../components/coach.js';
import { button, h, navigate, primaryButton, screen } from '../dom.js';
import { evaluate } from '../engine.js';
import { addEvidence, explanationLevel, logActivity, profile, recordLearning, save } from '../state/store.js';

const LEVEL = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' } as const;

export function renderLibrary(root: HTMLElement, [id]: string[] = []): void | (() => void) {
  const game = id ? HISTORICAL_GAMES.find((g) => g.id === id) : undefined;
  if (game) return renderGameStudy(root, game);
  root.append(screen('Biblioteca',
    h('p', { class: 'muted' }, 'Partidas históricas para aprender de los clásicos. En los momentos clave te preguntaremos qué jugarías.'),
    ...HISTORICAL_GAMES.map((g) => {
      const st = profile.training.library[g.id];
      return h('a', { class: 'card card-link', href: `#/library/${g.id}` },
        h('strong', {}, g.title), h('p', { class: 'muted small' }, `${g.white} – ${g.black} · ${g.place} ${g.year} · ${LEVEL[g.minLevel]}`),
        h('p', { class: 'small' }, g.intro),
        st ? h('p', { class: 'small train-stat' }, `Momentos acertados: ${st.found}/${st.total}`) : null);
    })));
}

function renderGameStudy(root: HTMLElement, hg: HistoricalGame): () => void {
  const sans = hg.moves.split(' ');
  const full = new Game();
  for (const s of sans) full.move(s);
  const history = full.history;
  const winner = hg.result === '0-1' ? 'b' : 'w';
  const board = new Board({ orientation: winner, coordinates: profile.settings.coordinates, reduceMotion: profile.settings.reduceMotion });
  const nav = moveNavigator((i) => { if (!waiting) show(i); });
  const panel = h('div', {});
  const say = (nodes: (Node | string)[], acts: HTMLElement[] = []) => panel.replaceChildren(coachBubble(nodes, acts));
  let ply = 0;
  let waiting = false;
  let found = 0;
  const done = new Set<number>();
  const started = Date.now();

  const show = (i: number, animate = false) => {
    ply = i;
    const pos = i === 0 ? history[0]!.before : history[i - 1]!.after;
    const last = history[i - 1];
    board.setInteraction({});
    board.clearMarks();
    board.setPosition(pos, last ? { from: last.move.from, to: last.move.to } : null, animate);
    nav.update(history.length + 1, i);
  };

  /** Avanza automáticamente hasta el siguiente momento clave (o el final). */
  const advance = () => {
    const next = hg.moments.find((m) => m.ply >= ply && !done.has(m.ply));
    if (!next) {
      show(history.length, true);
      return finish();
    }
    show(next.ply);
    ask(next);
  };

  const explainMoment = (m: HistoricalGame['moments'][number], ok: boolean, extra?: string) => {
    done.add(m.ply);
    if (ok) found++;
    addEvidence(m.concept, ok, 'puzzle');
    const played = history[m.ply]!;
    board.setInteraction({});
    board.setArrows([{ from: played.move.from, to: played.move.to, color: 'good' }]);
    const concept = conceptById(m.concept);
    say([
      h('p', { class: ok ? 'msg msg-good' : 'msg' }, ok ? '✓ ¡Eso es lo que se jugó!' : `En la partida se jugó ${localizeSan(played.san, 'es')}.`),
      extra ? h('p', { class: 'small' }, extra) : '',
      h('p', {}, m.explanation),
      concept ? h('p', { class: 'muted small' }, `Concepto: ${concept.title}`) : '',
    ], [primaryButton('Continuar', () => { waiting = false; show(m.ply + 1, true); setTimeout(advance, 500); })]);
  };

  const ask = (m: HistoricalGame['moments'][number]) => {
    waiting = true;
    const before = history[m.ply]!.before;
    say([h('p', { class: 'eyebrow' }, '¿Qué jugarías?'), h('p', {}, m.question)],
      [button('Ver la jugada', () => explainMoment(m, false))]);
    board.setInteraction({
      movable: () => before.turn,
      onMove: (from, to, promotion) => {
        const g = new Game(before.toFen());
        const p = g.move({ from, to, promotion });
        if (!p) return false;
        if (m.accept.includes(p.san)) { explainMoment(m, true); return true; }
        board.setPosition(before, null, false);
        // Con Stockfish se reconoce una alternativa igual de buena (no se castiga pensar distinto).
        void (async () => {
          const [mine, theirs] = await Promise.all([evaluate(p.after, { depth: 12 }), evaluate(history[m.ply]!.after, { depth: 12 })]);
          if (mine && theirs && -mine.cp >= -theirs.cp - 30) {
            explainMoment(m, true, `${localizeSan(p.san, 'es')} también es muy buena según Stockfish.`);
          } else {
            explainMoment(m, false, `${localizeSan(p.san, 'es')} no aprovecha la posición tan bien.${explanationLevel() === 'beginner' ? '' : ' Busca primero jaques, capturas y amenazas.'}`);
          }
        })();
        return true;
      },
    });
  };

  const finish = () => {
    const prev = profile.training.library[hg.id];
    profile.training.library[hg.id] = { found: Math.max(found, prev?.found ?? 0), total: hg.moments.length, at: Date.now() };
    logActivity({ kind: 'training', ms: Date.now() - started, ok: found === hg.moments.length, ref: `library:${hg.id}` });
    recordLearning(5 + found * 3, 'library');
    save();
    say([h('p', {}, h('strong', {}, `Momentos acertados: ${found}/${hg.moments.length}`)), h('p', {}, `Lección: ${hg.lesson}`)],
      [primaryButton('OTRA PARTIDA', () => navigate('#/library')), button('Repasar desde el inicio', () => { root.replaceChildren(); renderGameStudy(root, hg); })]);
  };

  root.append(screen(hg.title, h('p', { class: 'muted' }, `${hg.white} – ${hg.black} · ${hg.place} ${hg.year} · ${hg.result}`),
    h('p', {}, hg.intro), h('div', { class: 'board-holder' }, board.el), nav.el, panel));
  show(0);
  say(['Reproduciremos la partida y nos detendremos en los momentos clave.'], [primaryButton('EMPEZAR', advance)]);
  return () => nav.destroy();
}
