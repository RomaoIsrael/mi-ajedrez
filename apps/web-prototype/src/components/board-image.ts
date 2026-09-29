/**
 * Exportar el tablero como imagen PNG (brief §75): se dibuja en un canvas con los colores del
 * tema actual y el set de piezas elegido, con coordenadas y la última jugada resaltada.
 */
import { FILES, type Color, type Position, type Square } from '@kavalo/chess-core';
import { pieceUrl } from './pieces.js';

const cache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  if (!cache.has(src)) {
    cache.set(src, new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
      img.src = src;
    }));
  }
  return cache.get(src)!;
}

export async function boardToPng(pos: Position, opts: { orientation?: Color; size?: number; lastMove?: { from: Square; to: Square } | null } = {}): Promise<Blob> {
  const size = opts.size ?? 640;
  const cell = size / 8;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const css = getComputedStyle(document.documentElement);
  const light = css.getPropertyValue('--sq-light').trim() || '#E9E4D8';
  const dark = css.getPropertyValue('--sq-dark').trim() || '#6A7A93';
  const white = (opts.orientation ?? 'w') === 'w';
  const xy = (sq: Square) => {
    const f = sq & 7;
    const r = sq >> 3;
    return [(white ? f : 7 - f) * cell, (white ? 7 - r : r) * cell] as const;
  };
  for (let sq = 0; sq < 64; sq++) {
    const [x, y] = xy(sq);
    ctx.fillStyle = ((sq & 7) + (sq >> 3)) % 2 ? light : dark;
    ctx.fillRect(x, y, cell, cell);
    if (opts.lastMove && (opts.lastMove.from === sq || opts.lastMove.to === sq)) {
      ctx.fillStyle = 'rgba(242, 177, 52, 0.45)';
      ctx.fillRect(x, y, cell, cell);
    }
  }
  ctx.font = `600 ${Math.round(cell * 0.18)}px system-ui, sans-serif`;
  for (let i = 0; i < 8; i++) {
    const file = white ? i : 7 - i;
    const rank = white ? 7 - i : i;
    ctx.fillStyle = (i + 7) % 2 ? dark : light;
    ctx.fillText(FILES[file]!, i * cell + cell - cell * 0.18, size - cell * 0.06);
    ctx.fillStyle = i % 2 ? dark : light;
    ctx.fillText(String(rank + 1), cell * 0.05, i * cell + cell * 0.2);
  }
  const draws: Promise<void>[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = pos.get(sq);
    if (!p) continue;
    const [x, y] = xy(sq);
    draws.push(loadImage(pieceUrl(p.color, p.type)).then((img) => { ctx.drawImage(img, x, y, cell, cell); }));
  }
  await Promise.all(draws);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo crear la imagen'))), 'image/png'));
}

/** Descarga un Blob o un texto como archivo. */
export function download(name: string, data: Blob | string, type = 'text/plain'): void {
  const blob = typeof data === 'string' ? new Blob([data], { type }) : data;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
