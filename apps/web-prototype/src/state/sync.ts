/**
 * Sincronización opcional con el servidor (brief §72–73, docs/18-publicacion.md §3).
 * Desactivada por defecto (privacidad por defecto, brief §77): solo se activa con el
 * consentimiento explícito del usuario en Ajustes. La app funciona igual sin ella.
 *
 * Protocolo: GET /v1/profile y PUT /v1/profile con control de versión optimista. Si otro
 * dispositivo subió antes (409), se fusiona con `mergeProfiles` y se reintenta una vez.
 */
import { mergeProfiles } from './merge.js';
import { profile, save, type Profile } from './store.js';

export interface SyncResult { ok: boolean; message: string }

let running: Promise<SyncResult> | null = null;

async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const s = profile.sync;
  return fetch(`${s.server.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(s.token ? { authorization: `Bearer ${s.token}` } : {}), ...(init.headers ?? {}) },
  });
}

/** Lo que se sube: el perfil sin los datos de la propia sincronización (token incluido). */
function payload(p: Profile): Omit<Profile, 'sync'> {
  const { sync: _omit, ...rest } = p;
  void _omit;
  return rest;
}

function apply(data: Profile): void {
  const sync = profile.sync;
  Object.assign(profile, data, { sync });
}

/** Crea una cuenta de invitado (sin email) y guarda su token en este dispositivo. */
export async function connectGuest(server: string): Promise<SyncResult> {
  profile.sync = { ...profile.sync, server, enabled: true, consentAt: Date.now() };
  const res = await api('/v1/accounts/guest', { method: 'POST', body: '{}' });
  if (!res.ok) return { ok: false, message: `El servidor respondió ${res.status}` };
  const { token } = await res.json() as { token: string };
  profile.sync.token = token;
  profile.sync.version = 0;
  save();
  return syncNow();
}

export async function disconnect(deleteRemote: boolean): Promise<SyncResult> {
  if (deleteRemote && profile.sync.token) {
    const res = await api('/v1/account', { method: 'DELETE' });
    if (!res.ok && res.status !== 404) return { ok: false, message: `No se pudo borrar la cuenta (${res.status})` };
  }
  profile.sync = { enabled: false, server: profile.sync.server, token: null, version: 0, lastSync: null, consentAt: null };
  save();
  return { ok: true, message: deleteRemote ? 'Cuenta y datos del servidor borrados.' : 'Sincronización desactivada.' };
}

export function syncNow(): Promise<SyncResult> {
  if (!profile.sync.enabled || !profile.sync.token) return Promise.resolve({ ok: false, message: 'Sincronización desactivada.' });
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.resolve({ ok: false, message: 'Sin conexión: se sincronizará al volver.' });
  running ??= (async () => {
    try {
      let base = profile.sync.version;
      const remote = await api('/v1/profile');
      if (remote.ok) {
        const r = await remote.json() as { version: number; data: Profile };
        if (r.version !== base) { apply(mergeProfiles(profile, r.data)); base = r.version; }
      } else if (remote.status !== 404) {
        return { ok: false, message: `Error del servidor (${remote.status})` };
      } else base = 0;
      for (let attempt = 0; attempt < 2; attempt++) {
        const put = await api('/v1/profile', { method: 'PUT', body: JSON.stringify({ baseVersion: base, data: payload(profile) }) });
        if (put.ok) {
          const { version } = await put.json() as { version: number };
          profile.sync.version = version;
          profile.sync.lastSync = Date.now();
          save();
          return { ok: true, message: 'Sincronizado.' };
        }
        if (put.status !== 409) return { ok: false, message: `Error del servidor (${put.status})` };
        // Otro dispositivo se adelantó: fusionar y reintentar.
        const r = await put.json() as { version: number; data: Profile };
        apply(mergeProfiles(profile, r.data));
        base = r.version;
      }
      return { ok: false, message: 'Conflicto persistente: se reintentará más tarde.' };
    } catch {
      return { ok: false, message: 'No se pudo conectar con el servidor.' };
    } finally {
      running = null;
    }
  })();
  return running;
}
