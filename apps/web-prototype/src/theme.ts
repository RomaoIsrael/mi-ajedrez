import { profile } from './state/store.js';

export function applyTheme(): void {
  const t = profile.settings.theme;
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  document.documentElement.classList.toggle('reduce-motion', profile.settings.reduceMotion);
}
