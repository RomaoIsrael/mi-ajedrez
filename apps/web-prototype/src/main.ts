/** Punto de entrada: enrutado por hash, navegación inferior y montaje de pantallas. */
import { h } from './dom.js';
import { renderAnalysis } from './screens/analysis.js';
import { renderDna } from './screens/dna.js';
import { renderHome, renderPlan } from './screens/home.js';
import { renderLearn } from './screens/learn.js';
import { renderLesson } from './screens/lesson.js';
import { renderOnboarding } from './screens/onboarding.js';
import { renderGame, renderPlaySetup } from './screens/play.js';
import { renderProgress } from './screens/progress.js';
import { renderPuzzles } from './screens/puzzles.js';
import { renderSettings } from './screens/settings.js';
import { profile } from './state/store.js';
import { applyTheme } from './theme.js';

type Render = (root: HTMLElement, params: string[]) => void | (() => void);

const ROUTES: Record<string, { render: Render; tab?: string; title: string }> = {
  '': { render: renderHome, tab: 'home', title: 'Inicio' },
  plan: { render: renderPlan, tab: 'home', title: 'Plan diario' },
  learn: { render: renderLearn, tab: 'learn', title: 'Aprender' },
  lesson: { render: renderLesson, tab: 'learn', title: 'Lección' },
  play: { render: renderPlaySetup, tab: 'play', title: 'Jugar' },
  game: { render: renderGame, tab: 'play', title: 'Partida' },
  analysis: { render: renderAnalysis, tab: 'progress', title: 'Análisis' },
  puzzles: { render: renderPuzzles, tab: 'puzzles', title: 'Puzzles' },
  progress: { render: renderProgress, tab: 'progress', title: 'Progreso' },
  dna: { render: renderDna, tab: 'progress', title: 'ADN ajedrecístico' },
  settings: { render: renderSettings, title: 'Ajustes' },
};

const TABS = [
  ['home', '#/', '🏠', 'Inicio'], ['learn', '#/learn', '📚', 'Aprender'], ['play', '#/play', '♟', 'Jugar'],
  ['puzzles', '#/puzzles', '🧩', 'Puzzles'], ['progress', '#/progress', '📈', 'Progreso'],
] as const;

const LOGO = new URL('../../../assets/brand/favicon.svg', import.meta.url).href;
const app = document.getElementById('app')!;
const main = h('main', { id: 'main', tabindex: '-1' });
const nav = h('nav', { class: 'tabbar', 'aria-label': 'Navegación principal' });
const header = h('header', { class: 'topbar' },
  h('a', { href: '#/', class: 'brand', 'aria-label': 'Kavalo, inicio' }, h('img', { src: LOGO, alt: '' }), h('span', {}, 'Kavalo')),
  h('a', { href: '#/settings', class: 'avatar', 'aria-label': 'Perfil y ajustes' }, '⚙'));
app.append(header, main, nav);

let cleanup: void | (() => void);

function route(): void {
  const [name = '', ...params] = location.hash.replace(/^#\/?/, '').split('/');
  if (typeof cleanup === 'function') cleanup();
  main.replaceChildren();
  const onboarding = !profile.onboarded;
  header.hidden = nav.hidden = onboarding;
  if (onboarding) {
    renderOnboarding(main);
    return;
  }
  const r = ROUTES[name] ?? ROUTES['']!;
  document.title = `${r.title} · Kavalo`;
  nav.replaceChildren(...TABS.map(([id, href, icon, label]) =>
    h('a', { href, class: `tab ${r.tab === id ? 'on' : ''}`, 'aria-current': r.tab === id ? 'page' : undefined }, h('span', { class: 'tab-icon', 'aria-hidden': 'true' }, icon), h('span', {}, label))));
  cleanup = r.render(main, params.map(decodeURIComponent));
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

applyTheme();
window.addEventListener('hashchange', route);
route();
