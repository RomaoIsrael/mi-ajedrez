/** ADN Ajedrecístico: tendencias actuales, con honestidad sobre la cantidad de datos. */
import { h, navigate, primaryButton, screen } from '../dom.js';
import { chessDna, type DnaDimension } from '../state/insights.js';

const EXAMPLE: DnaDimension[] = [
  { key: 'tactics', label: 'Táctica', value: 73 }, { key: 'defense', label: 'Defensa', value: 54 },
  { key: 'vision', label: 'Visión', value: 66 }, { key: 'attack', label: 'Ataque', value: 78 }, { key: 'calm', label: 'Paciencia', value: 47 },
];

function radar(dims: DnaDimension[]): SVGSVGElement {
  const n = dims.length;
  const R = 80;
  const pt = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [100 + Math.cos(a) * r, 100 + Math.sin(a) * r] as const;
  };
  const ring = (f: number) => dims.map((_, i) => pt(i, R * f).join(',')).join(' ');
  const shape = dims.map((d, i) => pt(i, (R * (d.value ?? 0)) / 100).join(',')).join(' ');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 200 200');
  svg.setAttribute('class', 'radar');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', dims.map((d) => `${d.label} ${d.value ?? 'sin datos'}`).join(', '));
  svg.innerHTML = `
    ${[0.25, 0.5, 0.75, 1].map((f) => `<polygon points="${ring(f)}" class="radar-grid"/>`).join('')}
    ${dims.map((_, i) => `<line x1="100" y1="100" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" class="radar-grid"/>`).join('')}
    <polygon points="${shape}" class="radar-shape"/>
    ${dims.map((d, i) => { const [x, y] = pt(i, R + 12); return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" class="radar-label">${d.label}</text>`; }).join('')}`;
  return svg;
}

export function renderDna(root: HTMLElement): void {
  const dna = chessDna();
  const building = dna.confidence === 'building';
  const dims = building ? EXAMPLE : dna.dims;
  const sorted = [...dims].filter((d) => d.value !== null).sort((a, b) => b.value! - a.value!);
  const strong = sorted[0];
  const weak = sorted.at(-1);

  root.append(screen('Tu ADN ajedrecístico',
    h('p', { class: 'muted' }, building
      ? `Perfil en construcción: necesitamos al menos 5 partidas (llevas ${dna.games}). Abajo ves un EJEMPLO de cómo se verá.`
      : `Basado en tus últimas ${dna.games} partidas · confianza ${dna.confidence === 'low' ? 'baja' : 'media'}. Son tendencias actuales, no etiquetas.`),
    h('div', { class: `card ${building ? 'example' : ''}` }, building ? h('p', { class: 'badge' }, 'Ejemplo') : null, radar(dims),
      h('ul', { class: 'bars' }, ...dims.map((d) => h('li', {},
        h('span', {}, d.label),
        h('span', { class: 'bar' }, h('span', { class: 'bar-fill', style: `width:${d.value ?? 0}%` })),
        h('span', { class: 'bar-val' }, d.value === null ? '—' : `${d.value}%`))))),
    !building && strong && weak ? h('div', { class: 'card' },
      h('p', {}, `Tu fortaleza actual es ${strong.label.toLowerCase()}. El aspecto con más margen de mejora es ${weak.label.toLowerCase()}: tu plan de entrenamiento lo tendrá en cuenta.`)) : null,
    h('p', { class: 'muted small' }, 'En el prototipo el ADN se calcula a partir de los errores tácticos detectados en tus partidas. Con Stockfish (Fase 6) se añadirán estrategia, finales, cálculo y uso del tiempo, además de la evolución antes → ahora.'),
    h('div', { class: 'cta' }, primaryButton(building ? 'JUGAR UNA PARTIDA' : 'ENTRENAR MI PUNTO DÉBIL', () => navigate(building ? '#/play' : '#/'))),
  ));
}
