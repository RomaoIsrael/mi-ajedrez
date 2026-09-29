/**
 * Sonidos y vibración opcionales (desactivados por defecto). Los sonidos se sintetizan con
 * Web Audio: no hay archivos que descargar y funcionan sin conexión.
 */
import type { GameStatus, PlayedMove } from '@kavalo/chess-core';
import { profile } from './state/store.js';

export type Cue = 'move' | 'capture' | 'check' | 'success' | 'error' | 'end' | 'promote';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (!profile.settings.sound) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Tono corto con envolvente suave. */
function tone(ac: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.12): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = ac.currentTime + start;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const PATTERNS: Record<Cue, (ac: AudioContext) => void> = {
  move: (ac) => tone(ac, 520, 0, 0.07, 'triangle', 0.1),
  capture: (ac) => { tone(ac, 330, 0, 0.08, 'triangle', 0.14); tone(ac, 220, 0.05, 0.1, 'triangle', 0.12); },
  check: (ac) => { tone(ac, 880, 0, 0.09, 'sine', 0.1); tone(ac, 660, 0.09, 0.12, 'sine', 0.1); },
  promote: (ac) => [523, 659, 784].forEach((f, i) => tone(ac, f, i * 0.06, 0.12, 'sine', 0.09)),
  success: (ac) => [523, 659, 784, 1047].forEach((f, i) => tone(ac, f, i * 0.07, 0.14, 'sine', 0.08)),
  error: (ac) => tone(ac, 150, 0, 0.22, 'sawtooth', 0.05),
  end: (ac) => [392, 330, 262].forEach((f, i) => tone(ac, f, i * 0.12, 0.25, 'sine', 0.09)),
};

const VIBRATION: Partial<Record<Cue, number[]>> = { check: [40], error: [60, 40, 60], success: [30], end: [80] };

export function cue(c: Cue): void {
  const ac = audio();
  if (ac) PATTERNS[c](ac);
  if (profile.settings.vibration) {
    const v = VIBRATION[c];
    if (v) navigator.vibrate?.(v);
  }
}

/** Sonido adecuado para una jugada recién hecha. */
export function moveCue(played: PlayedMove, status: GameStatus): void {
  if (status.over) cue('end');
  else if (status.check) cue('check');
  else if (played.move.promotion) cue('promote');
  else if (played.move.captured) cue('capture');
  else cue('move');
}
