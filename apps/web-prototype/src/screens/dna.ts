/**
 * ADN Ajedrecístico (brief §17–21, docs/15-adn.md): tendencias ACTUALES medidas con Stockfish,
 * con intervalo de confianza, evolución «antes → ahora», consejos y aperturas compatibles.
 */
import { LESSONS } from '@kavalo/content';
import {
  compareDna, describeDna, DNA_HELP, dnaAdvice, MIN_GAMES, suggestOpenings,
  type Dna, type DnaValue, type OpeningSuggestion,
} from '@kavalo/dna';
import { button, h, navigate, primaryButton, screen } from '../dom.js';
import { engineStatus } from '../engine.js';
import { chessDna } from '../state/insights.js';
import { explanationLevel, profile } from '../state/store.js';

const ex = (key: DnaValue['key'], label: string, value: number): DnaValue => ({ key, label, value, low: value - 8, high: value + 8, samples: 0 });
const EXAMPLE: DnaValue[] = [
  ex('attack', 'Ataque', 74), ex('defense', 'Defensa', 52), ex('tactics', 'Táctica', 68), ex('strategy', 'Control posicional', 61),
  ex('calculation', 'Cálculo', 57), ex('intuition', 'Intuición', 70), ex('endgame', 'Finales', 44), ex('technique', 'Técnica (convertir ventajas)', 49),
];
const SHORT: Record<string, string> = { strategy: 'Posicional', technique: 'Técnica' };

/** Radar de una o dos series («ahora» y «antes»). Los valores sin datos van al centro. */
function radar(now: DnaValue[], before?: DnaValue[]): SVGSVGElement {
  const n = now.length;
  const R = 78;
  const pt = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [+(100 + Math.cos(a) * r).toFixed(1), +(100 + Math.sin(a) * r).toFixed(1)] as const;
  };
  const ring = (f: number) => now.map((_, i) => pt(i, R * f).join(',')).join(' ');
  const shape = (dims: DnaValue[]) => now.map((d, i) => pt(i, (R * (dims.find((x) => x.key === d.key)?.value ?? 0)) / 100).join(',')).join(' ');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '-20 -6 240 212');
  svg.setAttribute('class', 'radar');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', now.map((d) => {
    const b = before?.find((x) => x.key === d.key)?.value;
    return `${d.label} ${d.value ?? 'sin datos'}${b !== undefined && b !== null ? ` (antes ${b})` : ''}`;
  }).join(', '));
  svg.innerHTML = `
    ${[0.25, 0.5, 0.75, 1].map((f) => `<polygon points="${ring(f)}" class="radar-grid"/>`).join('')}
    ${now.map((_, i) => `<line x1="100" y1="100" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" class="radar-grid"/>`).join('')}
    ${before ? `<polygon points="${shape(before)}" class="radar-before"/>` : ''}
    <polygon points="${shape(now)}" class="radar-shape"/>
    ${now.map((d, i) => `<circle r="3" cx="${pt(i, (R * (d.value ?? 0)) / 100)[0]}" cy="${pt(i, (R * (d.value ?? 0)) / 100)[1]}" class="radar-dot"><title>${d.label}: ${d.value ?? 'sin datos'}</title></circle>`).join('')}
    ${now.map((d, i) => { const [x, y] = pt(i, R + 13); return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" class="radar-label">${SHORT[d.key] ?? d.label}</text>`; }).join('')}`;
  return svg;
}

/** Barra con el valor y su intervalo de confianza (P10–P90). */
function ciBar(d: DnaValue, before?: DnaValue): HTMLElement {
  const band = d.low !== null && d.high !== null
    ? h('span', { class: 'ci-band', style: `left:${d.low}%;width:${Math.max(2, d.high - d.low)}%` }) : null;
  const prev = before?.value !== null && before?.value !== undefined ? h('span', { class: 'ci-before', style: `left:${before.value}%`, title: `Antes: ${before.value}` }) : null;
  const delta = prev && d.value !== null ? d.value - before!.value! : null;
  return h('li', { title: DNA_HELP[d.key] },
    h('span', {}, d.label),
    h('span', { class: 'bar ci' }, band, d.value !== null ? h('span', { class: 'bar-fill', style: `width:${d.value}%` }) : null, prev),
    h('span', { class: 'bar-val' }, d.value === null ? 'sin datos' : `${d.value}${d.low !== null ? ` (${d.low}–${d.high})` : ''}`,
      delta !== null && Math.abs(delta) >= 3 ? h('span', { class: delta > 0 ? 'good' : 'bad' }, ` ${delta > 0 ? '▲' : '▼'}${Math.abs(delta)}`) : null));
}

function styleScale(label: string, left: string, right: string, value: number | null): HTMLElement {
  return h('div', { class: 'style-scale' },
    h('p', { class: 'small' }, h('strong', {}, label), value === null ? ' — sin datos suficientes' : ''),
    h('div', { class: 'scale', role: 'img', 'aria-label': `${label}: ${value ?? 'sin datos'} sobre 100 (${left} a ${right})` },
      h('span', { class: 'scale-end' }, left), h('span', { class: 'scale-track' }, value !== null ? h('span', { class: 'scale-dot', style: `left:${value}%` }) : null), h('span', { class: 'scale-end' }, right)));
}

function openingsCard(dna: Dna): HTMLElement | null {
  const level = explanationLevel();
  const groups: [string, OpeningSuggestion[]][] = [
    ['Con blancas', suggestOpenings(dna, { level, color: 'w' })],
    ['Con negras contra 1.e4', suggestOpenings(dna, { level, color: 'b', against: '1.e4' })],
    ['Con negras contra 1.d4', suggestOpenings(dna, { level, color: 'b', against: '1.d4' })],
  ];
  if (!groups.some(([, s]) => s.length)) return null;
  return h('div', { class: 'card' }, h('h2', {}, 'Aperturas que encajan con tu estilo'),
    h('p', { class: 'muted small' }, 'Sugerencias, no obligaciones: se basan en el tipo de posiciones que juegas mejor últimamente.'),
    ...groups.filter(([, s]) => s.length).map(([title, s]) => h('div', { class: 'opening-group' },
      h('p', { class: 'eyebrow' }, title),
      ...s.map((o) => h('a', { class: 'opening-sugg', href: `#/openings/${o.opening.id}` }, h('strong', {}, o.opening.name), h('span', { class: 'muted small' }, ` — ${o.reason}`))))));
}

export function renderDna(root: HTMLElement): void {
  const dna = chessDna();
  const building = dna.confidence === 'building';
  const snapshots = profile.dnaSnapshots;
  // «Antes»: la instantánea más antigua de hace al menos 3 semanas (o la primera disponible).
  const baseline = [...snapshots].reverse().find((s) => Date.now() - s.at >= 21 * 86_400_000) ?? snapshots[0];
  const hasBefore = !building && baseline && Date.now() - baseline.at >= 7 * 86_400_000 ? baseline : undefined;
  const weeks = hasBefore ? Math.round((Date.now() - hasBefore.at) / (7 * 86_400_000)) : 0;
  const dims = building ? EXAMPLE : dna.dims;
  const changes = hasBefore ? compareDna(hasBefore, dna).filter((c) => c.significant) : [];
  const advice = dnaAdvice(dna);
  const confidence = { building: '', low: 'baja', medium: 'media', high: 'alta' }[dna.confidence];
  const analysed = profile.games.filter((g) => g.features).length;
  const pending = profile.games.length - analysed;
  const p = dna.preferences;

  root.append(screen('Tu ADN ajedrecístico',
    h('p', { class: 'muted' }, building
      ? `Perfil en construcción: necesitamos al menos ${MIN_GAMES} partidas analizadas con Stockfish (llevas ${dna.games}). Abajo ves un EJEMPLO de cómo se verá.`
      : `Basado en tus últimas ${dna.games} partidas analizadas con Stockfish · confianza ${confidence}. Son tendencias actuales, no etiquetas: cambian cuando mejoras.`),
    building && engineStatus() === 'unavailable'
      ? h('p', { class: 'msg msg-bad small' }, 'Stockfish no está disponible en este navegador: el ADN necesita el motor para medir tus partidas.') : null,
    pending > 0 && !building ? h('p', { class: 'muted small' }, `${pending} ${pending === 1 ? 'partida aún no se ha analizado' : 'partidas aún no se han analizado'}; ábrelas en «Progreso» para incluirlas.`) : null,
    h('div', { class: `card ${building ? 'example' : ''}` }, building ? h('p', { class: 'badge' }, 'Ejemplo') : null,
      radar(dims, hasBefore?.dims),
      hasBefore ? h('p', { class: 'legend' }, h('span', { class: 'key key-now' }), 'Ahora  ', h('span', { class: 'key key-before' }), `Hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`) : null,
      h('ul', { class: 'bars bars-ci' }, ...dims.map((d) => ciBar(d, hasBefore?.dims.find((x) => x.key === d.key)))),
      h('p', { class: 'muted small' }, 'Entre paréntesis, el rango probable (con pocas partidas es más ancho). Mantén el cursor o el dedo sobre una dimensión para ver cómo se mide.')),
    changes.length ? h('div', { class: 'card' }, h('h2', {}, 'Evolución'),
      ...changes.map((c) => h('p', { class: c.delta > 0 ? 'good' : 'bad' }, `${c.delta > 0 ? '▲' : '▼'} ${c.label}: ${c.before} → ${c.now}`)),
      h('p', { class: 'muted small' }, 'Solo mostramos cambios cuyos rangos no se solapan: así sabemos que no es casualidad.')) : null,
    !building ? h('div', { class: 'card' }, h('h2', {}, 'Tu estilo reciente'),
      ...describeDna(dna).map((l) => h('p', {}, l)),
      styleScale('Tipo de posiciones', 'Sólido', 'Dinámico', dna.style.dynamic),
      styleScale('Actitud', 'Paciente', 'Agresivo', dna.style.aggressive),
      h('ul', { class: 'prefs small' },
        p.openShare !== null ? h('li', {}, `Jugadas en posiciones abiertas: ${Math.round(p.openShare * 100)} %`) : null,
        p.sacrificesPerGame !== null ? h('li', {}, `Sacrificios por partida: ${p.sacrificesPerGame.toFixed(1)}`) : null,
        p.tradesPerGame !== null ? h('li', {}, `Cambios de piezas por partida: ${p.tradesPerGame.toFixed(1)}`) : null,
        p.avgMoveSec !== null ? h('li', {}, `Tiempo medio por jugada: ${p.avgMoveSec} s`) : null,
        p.timeTroublePerGame !== null && p.timeTroublePerGame > 0 ? h('li', {}, `Jugadas con apuros de tiempo por partida: ${p.timeTroublePerGame.toFixed(1)}`) : null)) : null,
    advice.length ? h('div', { class: 'card card-focus' }, h('p', { class: 'eyebrow' }, 'Tu plan según el ADN'),
      ...advice.map((a) => {
        const lesson = a.lessonId ? LESSONS.find((l) => l.id === a.lessonId) : undefined;
        return h('div', { class: 'advice' }, h('p', {}, a.message),
          button(lesson ? `Empezar: ${lesson.title}` : 'Practicar', () => navigate(lesson ? `#/lesson/${lesson.id}` : `#/puzzles/${a.concept}`)));
      })) : null,
    !building ? openingsCard(dna) : null,
    h('div', { class: 'cta' }, primaryButton(building ? 'JUGAR UNA PARTIDA' : 'CONTINUAR ENTRENAMIENTO', () => navigate(building ? '#/play' : '#/'))),
  ));
}
