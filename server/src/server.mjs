/**
 * Servicio mínimo de sincronización (brief §72–73, docs/18-publicacion.md §3). Sin dependencias:
 * `node:http` + `node:sqlite`. Uso: node --no-warnings server/src/server.mjs
 *
 * Variables de entorno:
 *   PORT=8787                     puerto
 *   SYNC_DB=./kavalo-sync.db      archivo SQLite (":memory:" para pruebas)
 *   SYNC_ORIGINS=https://a,https://b   orígenes permitidos (CORS); por defecto, localhost
 *   SYNC_DEV=1                    devuelve el código de email en la respuesta (solo desarrollo)
 *
 * Endpoints:
 *   GET    /health
 *   POST   /v1/accounts/guest                 → 201 { accountId, token }
 *   POST   /v1/accounts/email/start {email}   → 202 (envía un código; en desarrollo lo devuelve)
 *   POST   /v1/accounts/email/verify {email, code}  → 200 { accountId, token } (vincula al invitado si hay token)
 *   POST   /v1/accounts/oauth/:provider       → 501 hasta configurar Google / Apple
 *   GET    /v1/profile                        → 200 { version, data, updatedAt } | 404
 *   PUT    /v1/profile {baseVersion, data}    → 200 { version } | 409 { version, data }
 *   GET    /v1/export                         → todos los datos de la cuenta (brief §77)
 *   DELETE /v1/account                        → 204 (borra la cuenta y todos sus datos)
 */
import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const MAX_BODY = 5 * 1024 * 1024;
const RATE = { windowMs: 60_000, max: 120 };
const sha = (s) => createHash('sha256').update(s).digest('hex');

export function createSyncServer(opts = {}) {
  const db = new DatabaseSync(opts.db ?? process.env.SYNC_DB ?? './kavalo-sync.db');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const origins = (opts.origins ?? process.env.SYNC_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((s) => s.trim()).filter(Boolean);
  const dev = opts.dev ?? process.env.SYNC_DEV === '1';
  const sendCode = opts.sendCode ?? ((email, code) => console.log(`[email] código para ${email.replace(/(.).*@/, '$1***@')}: ${dev ? code : '(oculto)'}`));
  const hits = new Map();

  const q = {
    insertAccount: db.prepare('INSERT INTO accounts (id, kind, email_hash, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)'),
    insertToken: db.prepare('INSERT INTO tokens (token_hash, account_id, created_at, last_used_at) VALUES (?, ?, ?, ?)'),
    tokenAccount: db.prepare('SELECT a.id, a.kind FROM tokens t JOIN accounts a ON a.id = t.account_id WHERE t.token_hash = ?'),
    touch: db.prepare('UPDATE tokens SET last_used_at = ? WHERE token_hash = ?'),
    getProfile: db.prepare('SELECT version, data, updated_at FROM profiles WHERE account_id = ?'),
    insertProfile: db.prepare('INSERT INTO profiles (account_id, version, data, updated_at) VALUES (?, 1, ?, ?)'),
    updateProfile: db.prepare('UPDATE profiles SET version = version + 1, data = ?, updated_at = ? WHERE account_id = ? AND version = ?'),
    deleteAccount: db.prepare('DELETE FROM accounts WHERE id = ?'),
    accountByEmail: db.prepare('SELECT id FROM accounts WHERE email_hash = ?'),
    setEmail: db.prepare("UPDATE accounts SET kind = 'email', email_hash = ? WHERE id = ?"),
    upsertCode: db.prepare('INSERT INTO email_codes (email_hash, code_hash, expires_at, attempts) VALUES (?, ?, ?, 0) ON CONFLICT(email_hash) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0'),
    getCode: db.prepare('SELECT code_hash, expires_at, attempts FROM email_codes WHERE email_hash = ?'),
    failCode: db.prepare('UPDATE email_codes SET attempts = attempts + 1 WHERE email_hash = ?'),
    deleteCode: db.prepare('DELETE FROM email_codes WHERE email_hash = ?'),
    account: db.prepare('SELECT id, kind, created_at, last_seen_at FROM accounts WHERE id = ?'),
  };
  db.exec('PRAGMA foreign_keys = ON');

  const issueToken = (accountId) => {
    const token = randomBytes(32).toString('base64url');
    const now = Date.now();
    q.insertToken.run(sha(token), accountId, now, now);
    return token;
  };

  function send(res, status, body, headers = {}) {
    const data = body === undefined ? '' : JSON.stringify(body);
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers });
    res.end(data);
  }

  async function readJson(req) {
    if (!(req.headers['content-type'] ?? '').includes('application/json')) throw Object.assign(new Error('Se espera JSON'), { status: 415 });
    let size = 0;
    const chunks = [];
    for await (const c of req) {
      size += c.length;
      if (size > MAX_BODY) throw Object.assign(new Error('Cuerpo demasiado grande'), { status: 413 });
      chunks.push(c);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { throw Object.assign(new Error('JSON inválido'), { status: 400 }); }
  }

  function auth(req) {
    const m = /^Bearer ([A-Za-z0-9_-]{20,})$/.exec(req.headers.authorization ?? '');
    if (!m) return null;
    const h = sha(m[1]);
    const row = q.tokenAccount.get(h);
    if (row) q.touch.run(Date.now(), h);
    return row ?? null;
  }

  const normEmail = (e) => (typeof e === 'string' && /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(e.trim()) ? e.trim().toLowerCase() : null);

  async function handle(req, res) {
    const origin = req.headers.origin;
    const cors = origin && origins.includes(origin)
      ? { 'access-control-allow-origin': origin, vary: 'Origin', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS', 'access-control-max-age': '600' }
      : {};
    if (req.method === 'OPTIONS') { res.writeHead(origin && !cors['access-control-allow-origin'] ? 403 : 204, cors); res.end(); return; }
    const ip = req.socket.remoteAddress ?? '?';
    const now = Date.now();
    const bucket = hits.get(ip) ?? { start: now, n: 0 };
    if (now - bucket.start > RATE.windowMs) { bucket.start = now; bucket.n = 0; }
    bucket.n++;
    hits.set(ip, bucket);
    if (bucket.n > RATE.max) return send(res, 429, { error: 'too_many_requests' }, { ...cors, 'retry-after': '60' });

    const url = new URL(req.url ?? '/', 'http://localhost');
    const route = `${req.method} ${url.pathname}`;
    try {
      if (route === 'GET /health') return send(res, 200, { ok: true }, cors);
      if (route === 'POST /v1/accounts/guest') {
        await readJson(req);
        const id = randomUUID();
        q.insertAccount.run(id, 'guest', null, now, now);
        return send(res, 201, { accountId: id, token: issueToken(id) }, cors);
      }
      if (route === 'POST /v1/accounts/email/start') {
        const email = normEmail((await readJson(req)).email);
        if (!email) return send(res, 400, { error: 'invalid_email' }, cors);
        const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
        q.upsertCode.run(sha(email), sha(code), now + 10 * 60_000);
        await sendCode(email, code);
        return send(res, 202, dev ? { sent: true, devCode: code } : { sent: true }, cors);
      }
      if (route === 'POST /v1/accounts/email/verify') {
        const body = await readJson(req);
        const email = normEmail(body.email);
        const code = typeof body.code === 'string' ? body.code : '';
        if (!email) return send(res, 400, { error: 'invalid_email' }, cors);
        const eh = sha(email);
        const row = q.getCode.get(eh);
        const good = row && row.expires_at > now && row.attempts < 5
          && timingSafeEqual(Buffer.from(row.code_hash, 'hex'), Buffer.from(sha(code), 'hex'));
        if (!good) { if (row) q.failCode.run(eh); return send(res, 401, { error: 'invalid_code' }, cors); }
        q.deleteCode.run(eh);
        const existing = q.accountByEmail.get(eh);
        let id = existing?.id;
        if (!id) {
          // Si ya hay sesión de invitado, se convierte en cuenta con email (conserva el progreso).
          const current = auth(req);
          if (current) { id = current.id; q.setEmail.run(eh, id); } else { id = randomUUID(); q.insertAccount.run(id, 'email', eh, now, now); }
        }
        return send(res, 200, { accountId: id, token: issueToken(id) }, cors);
      }
      if (req.method === 'POST' && /^\/v1\/accounts\/oauth\/(google|apple)$/.test(url.pathname)) {
        return send(res, 501, { error: 'not_configured', message: 'Configura el cliente OAuth (docs/18-publicacion.md §3.3).' }, cors);
      }

      const account = auth(req);
      if (!account) return send(res, 401, { error: 'unauthorized' }, cors);
      if (route === 'GET /v1/profile') {
        const p = q.getProfile.get(account.id);
        if (!p) return send(res, 404, { error: 'not_found' }, cors);
        return send(res, 200, { version: p.version, data: JSON.parse(p.data), updatedAt: p.updated_at }, cors);
      }
      if (route === 'PUT /v1/profile') {
        const body = await readJson(req);
        if (!Number.isInteger(body.baseVersion) || body.baseVersion < 0 || typeof body.data !== 'object' || body.data === null || Array.isArray(body.data)) {
          return send(res, 400, { error: 'invalid_body' }, cors);
        }
        const data = JSON.stringify(body.data);
        const current = q.getProfile.get(account.id);
        if (!current && body.baseVersion === 0) { q.insertProfile.run(account.id, data, now); return send(res, 200, { version: 1 }, cors); }
        if (current && q.updateProfile.run(data, now, account.id, body.baseVersion).changes === 1) return send(res, 200, { version: body.baseVersion + 1 }, cors);
        const latest = q.getProfile.get(account.id);
        return send(res, 409, latest ? { version: latest.version, data: JSON.parse(latest.data) } : { version: 0, data: null }, cors);
      }
      if (route === 'GET /v1/export') {
        const p = q.getProfile.get(account.id);
        return send(res, 200, { account: q.account.get(account.id), profile: p ? { version: p.version, data: JSON.parse(p.data), updatedAt: p.updated_at } : null }, { ...cors, 'content-disposition': 'attachment; filename="kavalo-export.json"' });
      }
      if (route === 'DELETE /v1/account') {
        q.deleteAccount.run(account.id);
        res.writeHead(204, cors);
        res.end();
        return;
      }
      return send(res, 404, { error: 'not_found' }, cors);
    } catch (e) {
      const status = e.status ?? 500;
      if (status === 500) console.error(e);
      return send(res, status, { error: status === 500 ? 'internal_error' : e.message }, cors);
    }
  }

  const server = createServer((req, res) => { void handle(req, res); });
  server.on('close', () => db.close());
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 8787);
  createSyncServer().listen(port, () => console.log(`Kavalo sync en http://localhost:${port}`));
}
