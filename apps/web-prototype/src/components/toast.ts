/** Avisos breves (logros y misiones). Accesibles: se anuncian por lector de pantalla. */
import { cue } from '../feedback.js';
import { h } from '../dom.js';
import type { Reward } from '../state/store.js';

let host: HTMLElement | null = null;

export function toast(icon: string, title: string, text: string): void {
  host ??= document.body.appendChild(h('div', { class: 'toasts', 'aria-live': 'polite', role: 'status' }));
  const el = h('div', { class: 'toast' }, h('span', { class: 'toast-icon', 'aria-hidden': 'true' }, icon), h('div', {}, h('strong', {}, title), h('p', {}, text)));
  host.append(el);
  setTimeout(() => el.classList.add('toast-out'), 4200);
  setTimeout(() => el.remove(), 4700);
}

export function showReward(r: Reward): void {
  cue('success');
  if (r.type === 'achievement') toast(r.achievement.icon, `Logro: ${r.achievement.title}`, r.achievement.description);
  else toast('✅', `Misión cumplida (+${r.mission.xp} XP)`, r.mission.title);
}
