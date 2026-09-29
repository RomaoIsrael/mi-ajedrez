/**
 * Genera los sets adicionales de piezas (brief §34) a partir de las siluetas de Royal Modern.
 * Todas las variantes conservan la MISMA silueta (siempre reconocible) y cambian el material:
 * colores, contorno, brillo, transparencia o acabado plano. Uso: node tools/gen-piece-sets.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'pieces');
const SRC = join(ROOT, 'royal-modern');
const FILES = ['K', 'Q', 'R', 'B', 'N', 'P'].flatMap((p) => [`w${p}`, `b${p}`]);

/** Paleta de Royal Modern que se sustituye. */
const BASE = { w: ['#FFFFFF', '#F7F3EA', '#D9D0BC'], b: ['#3A4B66', '#1B2638', '#0E1522'], wStroke: '#0F1B2D', bStroke: '#0B1220', bDetail: '#8FA0BA', accent: '#C9A227' };

export const SETS = {
  'classic-elite': { name: 'Classic Elite', w: ['#FFFDF6', '#F3EAD3', '#D8C79E'], b: ['#4A3A2A', '#2A1E14', '#140D08'], wStroke: '#2B1D0E', bStroke: '#0A0604', bDetail: '#B89A6A', accent: '#B8860B' },
  'natural-wood': { name: 'Natural Wood', w: ['#F3D9A7', '#E2BC7E', '#C4935A'], b: ['#8A5A36', '#5E3A1F', '#3C2410'], wStroke: '#5A3A1C', bStroke: '#24150A', bDetail: '#C79A6B', accent: '#8C5A2B' },
  crystal: { name: 'Crystal', w: ['#FFFFFF', '#E6F4FF', '#B9DDF5'], b: ['#6B7FA8', '#3F4F77', '#28324F'], wStroke: '#3D6E8F', bStroke: '#101A33', bDetail: '#C8D6F5', accent: '#9FD8FF', opacity: 0.78 },
  cyber: { name: 'Cyber', w: ['#E8FFFB', '#B8FFF2', '#61E6D0'], b: ['#2A1147', '#1A0A2E', '#0D0518'], wStroke: '#00A58E', bStroke: '#FF2E97', bDetail: '#FF79C6', accent: '#00F0FF', glow: true },
  medieval: { name: 'Medieval', w: ['#F2E6C9', '#DCC9A0', '#B9A57A'], b: ['#5C2A2A', '#3D1616', '#240B0B'], wStroke: '#3B2F1E', bStroke: '#150606', bDetail: '#C9A06B', accent: '#A8322D', width: 1.6 },
  fantasy: { name: 'Fantasy', w: ['#FFF6FF', '#F2D9FF', '#D2A8F2'], b: ['#3B6E5A', '#1F4A3B', '#0F2B22'], wStroke: '#5B2A86', bStroke: '#07170F', bDetail: '#9BE3C3', accent: '#FFB84D' },
  kids: { name: 'Kids', w: ['#FFF7D6', '#FFE58A', '#FFC93C'], b: ['#6FA8FF', '#3A7BEB', '#2458C4'], wStroke: '#6B3E00', bStroke: '#0F2A66', bDetail: '#CFE2FF', accent: '#FF5C8A', width: 2 },
  minimal: { name: 'Minimal', w: ['#FFFFFF', '#FFFFFF', '#FFFFFF'], b: ['#2B2B2B', '#2B2B2B', '#2B2B2B'], wStroke: '#222222', bStroke: '#111111', bDetail: '#2B2B2B', accent: '#222222', width: 1.2, flat: true },
  dark: { name: 'Dark', w: ['#C9CED8', '#A9B0BE', '#8A92A3'], b: ['#2A2F3A', '#1A1E26', '#0E1116'], wStroke: '#1A1F29', bStroke: '#000000', bDetail: '#5A6475', accent: '#7C8599' },
  neon: { name: 'Neon', w: ['#FFFFFF', '#FFF4B3', '#FFE14D'], b: ['#1B1B2F', '#12122A', '#08081A'], wStroke: '#FF9F1C', bStroke: '#39FF14', bDetail: '#39FF14', accent: '#FF00E6', glow: true },
  tournament: { name: 'Tournament', w: ['#FFFFFF', '#FFFFFF', '#EDEDED'], b: ['#333333', '#1E1E1E', '#000000'], wStroke: '#000000', bStroke: '#000000', bDetail: '#FFFFFF', accent: '#9A9A9A', width: 1.5 },
};

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function transform(svg, id, set, file) {
  // La sombra bajo la pieza se mantiene neutra en todos los sets.
  let out = svg.replace(/fill="#0F1B2D" opacity="\.18"/g, 'fill="@@SHADOW@@" opacity=".18"');
  const swaps = [
    ...BASE.w.map((c, i) => [c, set.w[i]]), ...BASE.b.map((c, i) => [c, set.b[i]]),
    [BASE.wStroke, set.wStroke], [BASE.bStroke, set.bStroke], [BASE.bDetail, set.bDetail], [BASE.accent, set.accent],
  ];
  // Sustitución en dos pasos para que un color nuevo no vuelva a sustituirse.
  swaps.forEach(([from], i) => { out = out.replace(new RegExp(esc(from), 'gi'), `@@${i}@@`); });
  swaps.forEach(([, to], i) => { out = out.replaceAll(`@@${i}@@`, to); });
  out = out.replaceAll('@@SHADOW@@', '#0F1B2D');
  if (set.width) out = out.replace(/stroke-width="1\.4"/g, `stroke-width="${set.width}"`);
  if (set.flat) {
    out = out.replace(/<ellipse[^>]*opacity="\.18"\/>/g, '').replace(/<path[^>]*fill="none"[^>]*opacity="\.7"\/>/g, '');
  }
  if (set.opacity) out = out.replace(/fill="url\((#[^)]+)\)"/g, `fill="url($1)" fill-opacity="${set.opacity}"`);
  if (set.glow) {
    const color = file.startsWith('w') ? set.wStroke : set.bStroke;
    out = out.replace('</defs>', `<filter id="glow-${file}" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="1.1" flood-color="${color}" flood-opacity=".85"/></filter></defs><g filter="url(#glow-${file})">`).replace('</svg>', '</g></svg>');
  }
  return out.replace(/<title>Royal Modern ([wb][KQRBNP])<\/title>/, `<title>${set.name} $1</title>`).replace(/id="g([wb][KQRBNP])"/, `id="${id}-$1"`).replace(/url\(#g([wb][KQRBNP])\)/g, `url(#${id}-$1)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = [{ id: 'royal-modern', name: 'Royal Modern' }];
  for (const [id, set] of Object.entries(SETS)) {
    mkdirSync(join(ROOT, id), { recursive: true });
    for (const f of FILES) writeFileSync(join(ROOT, id, `${f}.svg`), transform(readFileSync(join(SRC, `${f}.svg`), 'utf8'), id, set, f));
    manifest.push({ id, name: set.name });
  }
  writeFileSync(join(ROOT, 'sets.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${manifest.length} sets generados en assets/pieces/`);
}
