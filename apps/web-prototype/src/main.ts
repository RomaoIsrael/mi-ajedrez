/** Punto de entrada: enrutado por hash, navegación inferior y montaje de pantallas. */
import { h } from './dom.js';
import { renderAchievements } from './screens/achievements.js';
import { renderAnalysis } from './screens/analysis.js';
import { renderReport } from './screens/report.js';
import { reviewInBackground } from './state/review.js';
import { renderTrain } from './screens/train.js';
import { renderOpenings } from './screens/openings.js';
import { renderLibrary } from './screens/library.js';
import { renderImport } from './screens/import.js';
import { t } from './i18n.js';
import { syncNow } from './state/sync.js';
import { renderPrivacy } from './screens/privacy.js';
import { showReward } from './components/toast.js';
import { renderDna } from './screens/dna.js';
import { renderHome, renderPlan } from './screens/home.js';
import { renderLearn } from './screens/learn.js';
import { renderLesson } from './screens/lesson.js';
import { renderOnboarding } from './screens/onboarding.js';
import { renderGame, renderPlaySetup } from './screens/play.js';
import { renderProgress } from './screens/progress.js';
import { renderPuzzles } from './screens/puzzles.js';
import { renderSettings } from './screens/settings.js';
import { checkRewards, onReward, profile } from './state/store.js';
import { applyTheme } from './theme.js';
import { getEngine } from './engine.js';

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
  achievements: { render: renderAchievements, tab: 'progress', title: 'Logros' },
  report: { render: renderReport, tab: 'progress', title: 'Tu reporte' },
  train: { render: renderTrain, tab: 'learn', title: 'Entrenamiento' },
  openings: { render: renderOpenings, tab: 'learn', title: 'Aperturas' },
  library: { render: renderLibrary, tab: 'learn', title: 'Biblioteca' },
  import: { render: renderImport, tab: 'progress', title: 'Importar' },
  privacy: { render: renderPrivacy, title: 'Privacidad' },
};

const TABS = [
  ['home', '#/', '🏠', 'nav.home'], ['learn', '#/learn', '📚', 'nav.learn'], ['play', '#/play', '♟', 'nav.play'],
  ['puzzles', '#/puzzles', '🧩', 'nav.puzzles'], ['progress', '#/progress', '📈', 'nav.progress'],
] as const;

const LOGO = new URL('../../../assets/brand/favicon.svg', import.meta.url).href;
const app = document.getElementById('app')!;
const main = h('main', { id: 'main', tabindex: '-1' });
const nav = h('nav', { class: 'tabbar' });
const brand = h('a', { href: '#/', class: 'brand' }, h('img', { src: LOGO, alt: '' }), h('span', {}, 'Kavalo'));
const avatar = h('a', { href: '#/settings', class: 'avatar' }, '⚙');
const header = h('header', { class: 'topbar' }, brand, avatar);
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
  nav.setAttribute('aria-label', t('nav.main'));
  brand.setAttribute('aria-label', t('nav.brand'));
  avatar.setAttribute('aria-label', t('nav.settings'));
  nav.replaceChildren(...TABS.map(([id, href, icon, label]) =>
    h('a', { href, class: `tab ${r.tab === id ? 'on' : ''}`, 'aria-current': r.tab === id ? 'page' : undefined }, h('span', { class: 'tab-icon', 'aria-hidden': 'true' }, icon), h('span', {}, t(label)))));
  cleanup = r.render(main, params.map(decodeURIComponent));
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

applyTheme();
onReward(showReward);
window.addEventListener('hashchange', route);
route();
// Logros ya merecidos por perfiles anteriores a esta versión.
if (profile.onboarded) checkRewards();
// Stockfish se carga en segundo plano, sin retrasar la primera pantalla.
// Después, las partidas recientes sin analizar se revisan en serie para alimentar el ADN.
setTimeout(() => void (async () => {
  if (!(await getEngine())) return;
  for (const g of profile.games.slice(-30).filter((x) => !x.features)) await reviewInBackground(g);
})(), 1500);
// Modo sin conexión (brief §72): el service worker guarda la app, Stockfish y el contenido.
if ('serviceWorker' in navigator && !new URLSearchParams(location.search).has('nosw')) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('sw.js').catch(() => undefined); });
}
// Sincronización opcional (solo si el usuario la activó en Ajustes).
void syncNow().catch(() => undefined);
window.addEventListener('online', () => void syncNow().catch(() => undefined));
