/**
 * Retirada progresiva de ayudas (docs/05-pedagogia.md §7 y §9, brief §62–63): cada ayuda se
 * retira por separado cuando las partidas demuestran que el jugador ya no comete el error
 * asociado. El objetivo es la independencia, no depender de la app.
 */
import { cleanInLastGames } from './stats.js';
import type { CoachState } from './types.js';

export interface ChecklistItem {
  label: string;
  /** Errores que indican que el recordatorio todavía hace falta. */
  kinds: string[];
}

export const CHECKLIST: ChecklistItem[] = [
  { label: 'Jaques', kinds: ['missed-mate', 'allows-mate'] },
  { label: 'Capturas', kinds: ['missed-capture'] },
  { label: 'Amenazas', kinds: ['ignored-threat', 'allows-mate'] },
  { label: 'Piezas indefensas', kinds: ['hanging-piece'] },
  { label: 'Seguridad del rey', kinds: ['allows-mate'] },
  { label: 'Respuesta del rival', kinds: ['hanging-piece', 'ignored-threat'] },
];

/** Partidas seguidas sin el error necesarias para retirar una ayuda. */
export const FADE_AFTER_GAMES = 5;

export function checklistStatus(state: CoachState): { item: ChecklistItem; retired: boolean }[] {
  return CHECKLIST.map((item) => ({ item, retired: cleanInLastGames(state, item.kinds, FADE_AFTER_GAMES) === true }));
}

/** Aviso proactivo de amenazas en partida: se retira cuando ya no se ignoran amenazas. */
export function threatWarningsNeeded(state: CoachState): boolean {
  const m = state.mastery['vision.threats']?.state;
  if (m === 'mastered' || m === 'mastery') return false;
  return cleanInLastGames(state, ['ignored-threat', 'allows-mate', 'hanging-piece'], FADE_AFTER_GAMES) !== true;
}
