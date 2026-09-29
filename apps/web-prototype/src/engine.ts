/**
 * Stockfish en el navegador: Web Worker con el motor WASM de vendor/stockfish.
 * Se carga en segundo plano la primera vez que se necesita. Si no está disponible (archivo
 * ausente, navegador sin WebAssembly), la app sigue funcionando con el motor propio.
 */
import { parseMove, type Move, type Position } from '@kavalo/chess-core';
import { scoreToCp, UciEngine, type SearchOptions } from '@kavalo/engine';
import type { PositionEval } from '@kavalo/tactics';

const WORKER_URL = new URL('../../../vendor/stockfish/stockfish-19-lite-single.js', import.meta.url).href;

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'unavailable';
let status: EngineStatus = 'idle';
let promise: Promise<UciEngine | null> | null = null;
let engineName = '';
const listeners = new Set<(s: EngineStatus) => void>();

function setStatus(s: EngineStatus): void {
  status = s;
  listeners.forEach((l) => l(s));
}

export const engineStatus = () => status;
export const engineLabel = () => engineName;
export function onEngineStatus(fn: (s: EngineStatus) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getEngine(): Promise<UciEngine | null> {
  promise ??= (async () => {
    if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') {
      setStatus('unavailable');
      return null;
    }
    setStatus('loading');
    try {
      const worker = new Worker(WORKER_URL);
      const lineListeners: ((l: string) => void)[] = [];
      worker.onmessage = (e: MessageEvent) => lineListeners.forEach((fn) => fn(String(e.data)));
      const failed = new Promise<never>((_, reject) => { worker.onerror = () => reject(new Error('worker')); });
      const engine = new UciEngine({
        send: (cmd) => worker.postMessage(cmd),
        onLine: (fn) => lineListeners.push(fn),
        terminate: () => worker.terminate(),
      });
      engineName = await Promise.race([engine.init(20_000), failed]);
      setStatus('ready');
      return engine;
    } catch {
      setStatus('unavailable');
      return null;
    }
  })();
  return promise;
}

/** Evaluación de una posición (desde el bando que mueve) o null si no hay motor. */
export async function evaluate(pos: Position, opts: SearchOptions = { depth: 12 }): Promise<PositionEval | null> {
  if (pos.isCheckmate()) return { cp: -10_000, mate: 0, best: null, pv: [] };
  if (pos.isStalemate() || pos.isInsufficientMaterial()) return { cp: 0, best: null, pv: [] };
  const engine = await getEngine();
  if (!engine) return null;
  const a = await engine.analyse(pos.toFen(), opts);
  const line = a.lines[0];
  return {
    cp: line ? scoreToCp(line) : 0,
    ...(line?.mate !== undefined ? { mate: line.mate } : {}),
    best: a.bestmove,
    pv: (line?.pv ?? []).slice(0, 10),
  };
}

/** Mejor jugada según el motor (para pistas), o null. */
export async function engineBestMove(pos: Position, opts: SearchOptions = { depth: 12, movetime: 400 }): Promise<Move | null> {
  const e = await evaluate(pos, opts);
  return e?.best ? parseMove(pos, e.best) : null;
}
