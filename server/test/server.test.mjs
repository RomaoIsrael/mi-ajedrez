import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSyncServer } from '../src/server.mjs';

let server;
let base;
const codes = new Map();

before(async () => {
  server = createSyncServer({ db: ':memory:', origins: 'http://localhost:5173', sendCode: (e, c) => codes.set(e, c) });
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const call = (path, { method = 'GET', token, body, headers = {} } = {}) => fetch(`${base}${path}`, {
  method, headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
  body: body !== undefined ? JSON.stringify(body) : undefined,
});

test('invitado: crea cuenta, sube y descarga el perfil', async () => {
  const r = await call('/v1/accounts/guest', { method: 'POST', body: {} });
  assert.equal(r.status, 201);
  const { token } = await r.json();
  assert.equal((await call('/v1/profile', { token })).status, 404);
  const put = await call('/v1/profile', { method: 'PUT', token, body: { baseVersion: 0, data: { name: 'Ana', xp: 10 } } });
  assert.deepEqual(await put.json(), { version: 1 });
  const got = await (await call('/v1/profile', { token })).json();
  assert.equal(got.version, 1);
  assert.equal(got.data.name, 'Ana');
});

test('concurrencia optimista: el segundo dispositivo recibe 409 con la copia del servidor', async () => {
  const { token } = await (await call('/v1/accounts/guest', { method: 'POST', body: {} })).json();
  await call('/v1/profile', { method: 'PUT', token, body: { baseVersion: 0, data: { xp: 1 } } });
  assert.equal((await call('/v1/profile', { method: 'PUT', token, body: { baseVersion: 1, data: { xp: 2 } } })).status, 200);
  const stale = await call('/v1/profile', { method: 'PUT', token, body: { baseVersion: 1, data: { xp: 3 } } });
  assert.equal(stale.status, 409);
  const body = await stale.json();
  assert.deepEqual(body, { version: 2, data: { xp: 2 } });
  // Un perfil nuevo con baseVersion distinta de 0 también es conflicto.
  const { token: t2 } = await (await call('/v1/accounts/guest', { method: 'POST', body: {} })).json();
  assert.equal((await call('/v1/profile', { method: 'PUT', token: t2, body: { baseVersion: 3, data: {} } })).status, 409);
});

test('seguridad: sin token o token falso → 401; cuerpo inválido → 400/415; otra cuenta no ve mis datos', async () => {
  assert.equal((await call('/v1/profile')).status, 401);
  assert.equal((await call('/v1/profile', { token: 'x'.repeat(43) })).status, 401);
  const { token } = await (await call('/v1/accounts/guest', { method: 'POST', body: {} })).json();
  assert.equal((await call('/v1/profile', { method: 'PUT', token, body: { baseVersion: -1, data: {} } })).status, 400);
  assert.equal((await call('/v1/profile', { method: 'PUT', token, body: { baseVersion: 0, data: [1] } })).status, 400);
  const raw = await fetch(`${base}/v1/profile`, { method: 'PUT', headers: { authorization: `Bearer ${token}`, 'content-type': 'text/plain' }, body: 'hola' });
  assert.equal(raw.status, 415);
  await call('/v1/profile', { method: 'PUT', token, body: { baseVersion: 0, data: { secret: 1 } } });
  const { token: other } = await (await call('/v1/accounts/guest', { method: 'POST', body: {} })).json();
  assert.equal((await call('/v1/profile', { token: other })).status, 404);
});

test('CORS: solo orígenes permitidos', async () => {
  const ok = await call('/health', { headers: { origin: 'http://localhost:5173' } });
  assert.equal(ok.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  const bad = await call('/health', { headers: { origin: 'https://malicioso.example' } });
  assert.equal(bad.headers.get('access-control-allow-origin'), null);
  const pre = await fetch(`${base}/v1/profile`, { method: 'OPTIONS', headers: { origin: 'https://malicioso.example' } });
  assert.equal(pre.status, 403);
});

test('email: código de un solo uso que convierte al invitado en cuenta con email', async () => {
  const { token, accountId } = await (await call('/v1/accounts/guest', { method: 'POST', body: {} })).json();
  await call('/v1/profile', { method: 'PUT', token, body: { baseVersion: 0, data: { xp: 42 } } });
  assert.equal((await call('/v1/accounts/email/start', { method: 'POST', body: { email: 'no-es-un-email' } })).status, 400);
  assert.equal((await call('/v1/accounts/email/start', { method: 'POST', body: { email: 'Ana@Ejemplo.com ' } })).status, 202);
  const code = codes.get('ana@ejemplo.com');
  assert.match(code, /^\d{6}$/);
  assert.equal((await call('/v1/accounts/email/verify', { method: 'POST', token, body: { email: 'ana@ejemplo.com', code: '000000' === code ? '111111' : '000000' } })).status, 401);
  const v = await call('/v1/accounts/email/verify', { method: 'POST', token, body: { email: 'ana@ejemplo.com', code } });
  assert.equal(v.status, 200);
  const linked = await v.json();
  assert.equal(linked.accountId, accountId, 'conserva la cuenta y el progreso del invitado');
  assert.equal((await (await call('/v1/profile', { token: linked.token })).json()).data.xp, 42);
  // El código no se puede reutilizar.
  assert.equal((await call('/v1/accounts/email/verify', { method: 'POST', body: { email: 'ana@ejemplo.com', code } })).status, 401);
  assert.equal((await call('/v1/accounts/oauth/google', { method: 'POST', body: {} })).status, 501);
});

test('exportación y eliminación de la cuenta (brief §77)', async () => {
  const { token } = await (await call('/v1/accounts/guest', { method: 'POST', body: {} })).json();
  await call('/v1/profile', { method: 'PUT', token, body: { baseVersion: 0, data: { name: 'Leo' } } });
  const exp = await (await call('/v1/export', { token })).json();
  assert.equal(exp.profile.data.name, 'Leo');
  assert.equal(exp.account.kind, 'guest');
  assert.equal((await call('/v1/account', { method: 'DELETE', token })).status, 204);
  assert.equal((await call('/v1/profile', { token })).status, 401, 'el token deja de funcionar: todo se ha borrado');
});
