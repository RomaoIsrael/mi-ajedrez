/**
 * Prueba E2E de publicación (brief §72–73, §77): la app funciona SIN CONEXIÓN gracias al service
 * worker, y la copia en la nube opcional se sincroniza con el servidor real (con consentimiento),
 * resuelve conflictos entre dos dispositivos y borra los datos del servidor al pedirlo.
 * Requisitos: `npm start` en otra terminal. Uso: node tests/e2e/pwa.e2e.cjs
 */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const BASE = process.env.BASE_URL ?? 'http://localhost:5173/apps/web-prototype/';
const SYNC = 'http://localhost:8787';

function check(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log(`  ✓ ${msg}`);
}

(async () => {
  const srv = spawn(process.execPath, ['--no-warnings', path.join(__dirname, '../../server/src/server.mjs')], {
    env: { ...process.env, PORT: '8787', SYNC_DB: ':memory:', SYNC_ORIGINS: new URL(BASE).origin }, stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(`${SYNC}/health`)).ok) break; } catch { /* aún arrancando */ } await new Promise((r) => setTimeout(r, 100)); }
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const errors = [];
  try {
    // ── Dispositivo A: offline ──
    const ctx = await browser.newContext({ viewport: { width: 420, height: 1100 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(BASE);
    await p.evaluate(() => localStorage.setItem('kavalo.profile.v1', JSON.stringify({ onboarded: true, name: 'Ana', settings: { reduceMotion: true }, completedLessons: ['board'] })));
    await p.reload();
    await p.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.active, null, { timeout: 20000 });
    check(true, 'service worker instalado y activo');
    const manifest = await p.evaluate(async () => (await fetch(document.querySelector('link[rel=manifest]').href)).json());
    check(manifest.display === 'standalone' && manifest.icons.length >= 1, 'manifiesto PWA instalable');
    await p.reload();
    await p.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await ctx.setOffline(true);
    await p.reload();
    await p.waitForSelector('.greet', { timeout: 10000 });
    check(/Ana/.test(await p.locator('.greet').innerText()), 'sin conexión: la app arranca desde la caché');
    await p.goto(BASE + '#/puzzles');
    await p.waitForSelector('.board');
    check(await p.locator('.board img.piece').count() > 0, 'sin conexión: puzzles con piezas disponibles');
    await ctx.setOffline(false);

    // ── Copia en la nube con consentimiento ──
    await p.goto(BASE + '#/privacy');
    await p.fill('input[aria-label="Servidor de sincronización"]', SYNC);
    await p.click('text=Activar la copia en la nube');
    check(/consentimiento/.test(await p.locator('.sync-status').innerText()), 'sin consentimiento explícito no se activa');
    await p.check('input[aria-label="Consentimiento"]');
    await p.click('text=Activar la copia en la nube');
    await p.waitForSelector('text=Sincronizado.', { timeout: 10000 });
    const token = await p.evaluate(() => JSON.parse(localStorage.getItem('kavalo.profile.v1')).sync.token);
    const remote = await (await fetch(`${SYNC}/v1/profile`, { headers: { authorization: `Bearer ${token}` } })).json();
    check(remote.version === 1 && remote.data.name === 'Ana' && !('sync' in remote.data), 'el perfil llega al servidor (sin el token)');

    // ── Dispositivo B con la misma cuenta: conflicto y fusión ──
    await fetch(`${SYNC}/v1/profile`, {
      method: 'PUT', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ baseVersion: 1, data: { ...remote.data, completedLessons: ['board', 'rook'], solvedPuzzles: ['p-back-rank'], updatedAt: Date.now() - 1000 } }),
    });
    await p.evaluate(() => { const pr = JSON.parse(localStorage.getItem('kavalo.profile.v1')); pr.completedLessons.push('knight'); localStorage.setItem('kavalo.profile.v1', JSON.stringify(pr)); });
    await p.reload();
    await p.goto(BASE + '#/privacy');
    await p.click('text=Sincronizar ahora');
    await p.waitForSelector('text=Sincronizado.', { timeout: 10000 });
    const merged = await p.evaluate(() => JSON.parse(localStorage.getItem('kavalo.profile.v1')));
    check(['board', 'rook', 'knight'].every((l) => merged.completedLessons.includes(l)) && merged.solvedPuzzles.includes('p-back-rank'), 'conflicto entre dispositivos: se fusiona sin perder progreso');
    const after = await (await fetch(`${SYNC}/v1/profile`, { headers: { authorization: `Bearer ${token}` } })).json();
    check(after.version >= 3 && after.data.completedLessons.length === 3, 'la versión fusionada se sube al servidor');

    // ── Borrar los datos del servidor ──
    p.on('dialog', (d) => d.accept());
    await p.click('text=Desactivar y borrar mis datos del servidor');
    await p.waitForSelector('text=Cuenta y datos del servidor borrados.', { timeout: 10000 });
    check((await fetch(`${SYNC}/v1/profile`, { headers: { authorization: `Bearer ${token}` } })).status === 401, 'la cuenta y sus datos se borran del servidor');
    check(errors.length === 0, `sin errores de JavaScript${errors.length ? `: ${errors.join('; ')}` : ''}`);
  } finally {
    await browser.close();
    srv.kill();
  }
})().catch((e) => {
  console.error(`  ✗ ${e.message}`);
  process.exit(1);
});
