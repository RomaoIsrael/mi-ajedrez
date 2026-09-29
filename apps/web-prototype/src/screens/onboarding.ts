/** Onboarding: una pregunta por pantalla y una evaluación rápida opcional con posiciones reales. */
import { Game } from '@kavalo/chess-core';
import { AREA_LABEL, ASSESSMENT, scoreAssessment } from '@kavalo/content';
import { Board } from '../components/board.js';
import { COACHES } from '../components/coach.js';
import { button, clear, h, navigate, primaryButton, screen } from '../dom.js';
import { addEvidence, profile, save, seedSkillRatings, type CoachStyle, type Experience } from '../state/store.js';
import { t } from '../i18n.js';
import { applyTheme } from '../theme.js';

const LOGO = new URL('../../../../assets/brand/logo.svg', import.meta.url).href;

const EXPERIENCE: { id: Experience; label: string; rating: number }[] = [
  { id: 'never', label: 'Nunca', rating: 250 },
  { id: 'rules', label: 'Conozco las reglas', rating: 450 },
  { id: 'occasional', label: 'Juego ocasionalmente', rating: 700 },
  { id: 'frequent', label: 'Juego frecuentemente', rating: 950 },
  { id: 'club', label: 'Juego en club', rating: 1300 },
  { id: 'competitive', label: 'Competitivo', rating: 1600 },
];

const GOALS = [
  ['learn', 'Aprender desde cero'], ['friends', 'Jugar con amigos'], ['rating', 'Mejorar mi rating'], ['compete', 'Competir'],
  ['tactics', 'Mejorar táctica'], ['endgames', 'Dominar finales'], ['openings', 'Aprender aperturas'], ['tournaments', 'Prepararme para torneos'],
] as const;

export function renderOnboarding(root: HTMLElement): void {
  const steps: (() => HTMLElement)[] = [splash, language, audience, experience, name, goal, minutes, coach];
  let i = 0;
  const show = () => {
    clear(root);
    root.append(steps[i]!());
  };
  const next = () => {
    i++;
    if (i < steps.length) show();
    else finish();
  };

  function splash(): HTMLElement {
    setTimeout(() => i === 0 && next(), 1400);
    return h('section', { class: 'splash', onclick: next as EventListener },
      h('img', { src: LOGO, alt: 'Kavalo', class: 'splash-logo' }),
      h('h1', {}, 'Kavalo'),
      h('p', {}, 'No te dice la mejor jugada. Te enseña a encontrarla.'));
  }

  function choice<T extends string>(title: string, options: readonly (readonly [T, string])[], onPick: (v: T) => void, subtitle?: string) {
    return screen(title,
      subtitle ? h('p', { class: 'muted' }, subtitle) : null,
      h('div', { class: 'choices' }, ...options.map(([v, label]) =>
        h('button', { class: 'choice', onclick: (() => { onPick(v); next(); }) as EventListener }, label))));
  }

  function language() {
    return choice(t('onb.language'), [['es', 'Español'], ['en', 'English']] as const, (v) => { profile.settings.locale = v; applyTheme(); });
  }

  function audience() {
    return choice(t('onb.audience'), [['adult', t('onb.audience.adult')], ['kids', t('onb.audience.kids')]] as const, (v) => {
      profile.settings.mode = v;
      if (v === 'kids') profile.settings.pieceSet = 'kids';
      applyTheme();
    }, t('onb.audienceHelp'));
  }

  function experience() {
    return choice('¿Has jugado antes al ajedrez?', EXPERIENCE.map((e) => [e.id, e.label] as const), (v) => {
      profile.experience = v;
      profile.gameRating = profile.puzzleRating = EXPERIENCE.find((e) => e.id === v)!.rating;
      if (v !== 'never') steps.splice(i + 1, 0, assessment);
    }, 'Así adaptamos el punto de partida. Después lo comprobaremos con ejercicios reales.');
  }

  function name() {
    const input = h('input', { class: 'input', placeholder: 'Tu nombre (opcional)', maxlength: 30, value: profile.name, 'aria-label': 'Tu nombre' });
    return screen('¿Cómo te llamas?',
      h('p', { class: 'muted' }, 'Tus datos se guardan solo en este dispositivo.'),
      input,
      h('div', { class: 'cta' }, primaryButton('Continuar', () => { profile.name = input.value.trim(); next(); })));
  }

  function goal() {
    return choice('¿Cuál es tu objetivo?', GOALS, (v) => { profile.goal = v; });
  }

  function minutes() {
    return choice('¿Cuánto tiempo quieres entrenar al día?',
      ([5, 10, 20, 30, 45, 60] as const).map((m) => [String(m), `${m} minutos`] as const),
      (v) => { profile.dailyMinutes = Number(v); }, 'Mejor poco cada día que mucho de vez en cuando.');
  }

  function coach() {
    return choice('Elige a tu entrenador',
      (Object.keys(COACHES) as CoachStyle[]).map((k) => [k, `${COACHES[k].name} — ${COACHES[k].desc}`] as const),
      (v) => { profile.coachStyle = v; }, 'La información técnica es la misma; cambia la forma de decirla.');
  }

  /** Test inicial (brief §81): 13 ejercicios progresivos; se puede terminar antes. */
  function assessment(): HTMLElement {
    const items = ASSESSMENT;
    let idx = 0;
    const answers: Record<string, boolean> = {};
    const container = screen('Evaluación inicial');
    const info = h('p', { class: 'muted small' });
    const prompt = h('p', { class: 'train-prompt' });
    const progress = h('div', { class: 'progress' }, h('div', { class: 'progress-bar' }));
    const options = h('div', { class: 'choices' });
    const board = new Board({ coordinates: profile.settings.coordinates, reduceMotion: profile.settings.reduceMotion });
    const answer = (ok: boolean, sq?: number) => {
      answers[items[idx]!.id] = ok;
      if (sq !== undefined) board.setHighlights([sq], ok ? 'good' : 'bad');
      setTimeout(nextItem, 650);
    };
    const load = () => {
      const item = items[idx]!;
      const pos = new Game(item.fen).position;
      info.textContent = `${idx + 1} de ${items.length} · ${AREA_LABEL[item.area]}`;
      prompt.textContent = item.prompt;
      (progress.firstChild as HTMLElement).style.width = `${(idx / items.length) * 100}%`;
      board.setPosition(pos, null, false);
      board.clearMarks();
      options.replaceChildren();
      if (item.type === 'move') {
        board.setInteraction({
          movable: () => pos.turn,
          onMove: (from, to, promotion) => {
            const game = new Game(item.fen);
            const played = game.move({ from, to, promotion });
            if (!played) return false;
            board.setPosition(game.position, { from, to });
            board.setInteraction({});
            answer(item.accept.includes(played.uci), to);
            return true;
          },
        });
      } else {
        board.setInteraction({});
        options.append(...item.options.map((o, i) => h('button', { class: 'choice', onclick: (() => {
          options.querySelectorAll('button').forEach((b) => { (b as HTMLButtonElement).disabled = true; });
          (options.children[item.answer] as HTMLElement).classList.add('choice-good');
          if (i !== item.answer) (options.children[i] as HTMLElement).classList.add('choice-bad');
          answer(i === item.answer);
        }) as EventListener }, o)));
      }
    };
    const nextItem = () => {
      idx++;
      if (idx < items.length) return load();
      done();
    };
    const done = () => {
      // Estimación prudente (alta incertidumbre): se ajusta con las primeras partidas y puzzles.
      const r = scoreAssessment(answers, profile.gameRating);
      profile.assessment = { at: Date.now(), score: r.score, total: r.total, byArea: r.byArea, rating: r.rating };
      profile.puzzleRating = r.rating;
      profile.gameRating = Math.round((profile.gameRating + r.rating) / 2);
      for (const item of items) if (item.id in answers) addEvidence(item.concept, answers[item.id]!, 'guided');
      seedSkillRatings(r.byArea, r.rating);
      next();
    };
    container.append(info, progress, prompt, h('div', { class: 'board-holder' }, board.el), options,
      h('div', { class: 'cta' }, button('No lo sé', () => answer(false)), button('Terminar la evaluación', () => done())));
    load();
    return container;
  }

  function finish() {
    profile.onboarded = true;
    save();
    navigate('#/');
  }

  show();
}
