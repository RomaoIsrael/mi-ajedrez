/**
 * Privacidad (brief §77): privacidad por defecto, mínima recopilación, exportación, eliminación,
 * consentimiento y protección infantil. Aquí también se activa (o no) la copia en la nube.
 */
import { download } from '../components/board-image.js';
import { button, h, navigate, primaryButton, screen } from '../dom.js';
import { connectGuest, disconnect, syncNow } from '../state/sync.js';
import { profile, resetProfile, save } from '../state/store.js';

export function renderPrivacy(root: HTMLElement): void {
  const s = profile.sync;
  const kids = profile.settings.mode === 'kids';
  const status = h('p', { class: 'small sync-status', 'aria-live': 'polite' },
    s.enabled ? `Copia en la nube activada${s.lastSync ? ` · última sincronización: ${new Date(s.lastSync).toLocaleString('es')}` : ''}.` : 'Copia en la nube desactivada: todo está solo en este dispositivo.');
  const server = h('input', { class: 'input', type: 'url', value: s.server || (location.origin.startsWith('http://localhost') ? 'http://localhost:8787' : ''), placeholder: 'https://sync.ejemplo.com', 'aria-label': 'Servidor de sincronización' }) as HTMLInputElement;
  const consent = h('input', { type: 'checkbox', 'aria-label': 'Consentimiento' }) as HTMLInputElement;
  const guardian = h('input', { type: 'checkbox', 'aria-label': 'Consentimiento del tutor' }) as HTMLInputElement;
  const run = async (fn: () => Promise<{ ok: boolean; message: string }>) => {
    status.textContent = 'Un momento…';
    const r = await fn();
    status.textContent = r.message;
    status.className = `small sync-status ${r.ok ? 'good' : 'bad'}`;
    if (r.ok) setTimeout(() => { root.replaceChildren(); renderPrivacy(root); }, 800);
  };

  root.append(screen('Privacidad',
    h('div', { class: 'card' }, h('h2', {}, 'Nuestro compromiso'),
      h('ul', {},
        h('li', {}, 'Privacidad por defecto: sin cuenta, sin anuncios y sin rastreadores. Tu progreso se guarda solo en este dispositivo.'),
        h('li', {}, 'Mínima recopilación: solo lo necesario para entrenarte (partidas, ejercicios y progreso). Nunca tu ubicación ni tus contactos.'),
        h('li', {}, 'Stockfish funciona dentro de tu navegador: tus partidas no salen del dispositivo para analizarse.'),
        h('li', {}, 'Puedes exportar todos tus datos y borrarlos cuando quieras.'),
        h('li', {}, 'Protección infantil: en modo niños no hay chat ni contacto con desconocidos, y la copia en la nube requiere el consentimiento de un adulto.'))),
    h('div', { class: 'card' }, h('h2', {}, 'Copia en la nube (opcional)'),
      h('p', { class: 'muted small' }, 'Sirve para continuar en otro dispositivo. Se envía tu perfil de entrenamiento a un servidor que tú eliges, con una cuenta de invitado (sin email). Puedes desactivarla y borrar los datos del servidor en cualquier momento.'),
      status,
      s.enabled
        ? h('div', { class: 'cta' },
          primaryButton('Sincronizar ahora', () => void run(syncNow)),
          button('Desactivar (conservar datos en el servidor)', () => void run(() => disconnect(false))),
          button('Desactivar y borrar mis datos del servidor', () => { if (confirm('Se borrará tu cuenta y tu copia en el servidor. ¿Continuar?')) void run(() => disconnect(true)); }))
        : h('div', {},
          h('label', { class: 'field' }, h('span', { class: 'small' }, 'Servidor'), server),
          h('label', { class: 'field field-inline' }, consent, h('span', { class: 'small' }, 'Acepto enviar mi perfil de entrenamiento a este servidor para sincronizarlo.')),
          kids ? h('label', { class: 'field field-inline' }, guardian, h('span', { class: 'small' }, 'Soy madre, padre o tutor legal y doy mi consentimiento.')) : null,
          h('div', { class: 'cta' }, primaryButton('Activar la copia en la nube', () => {
            if (!/^https?:\/\/\S+$/.test(server.value.trim())) { status.textContent = 'Escribe la dirección del servidor (https://…).'; return; }
            if (!consent.checked || (kids && !guardian.checked)) { status.textContent = 'Necesitamos tu consentimiento explícito para activarla.'; return; }
            void run(() => connectGuest(server.value.trim()));
          })))),
    h('div', { class: 'card' }, h('h2', {}, 'Tus datos'),
      h('div', { class: 'cta' },
        button('Exportar todos mis datos (JSON)', () => {
          const { sync, ...data } = profile;
          download('kavalo-datos.json', JSON.stringify({ ...data, sync: { enabled: sync.enabled, server: sync.server } }, null, 2), 'application/json');
        }),
        button('Borrar todos mis datos de este dispositivo', () => {
          if (confirm('Se borrará tu progreso de este dispositivo. ¿Continuar?')) { resetProfile(); save(); navigate('#/'); location.reload(); }
        })),
      h('p', { class: 'muted small' }, 'Para borrar también la copia del servidor, desactiva antes la copia en la nube con «borrar mis datos del servidor».')),
    h('p', { class: 'muted small' }, 'Política completa: docs/18-publicacion.md §5 y PRIVACY.md en el repositorio.'),
  ));
}
