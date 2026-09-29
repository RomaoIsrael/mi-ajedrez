-- Esquema del servicio de sincronización (docs/18-publicacion.md §3).
-- SQLite en el servidor mínimo; los mismos conceptos que el esquema PostgreSQL de docs/07-datos.md.
-- Mínima recopilación (brief §77): no se guarda el email en claro ni la IP.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounts (
  id            TEXT PRIMARY KEY,               -- UUID aleatorio
  kind          TEXT NOT NULL CHECK (kind IN ('guest', 'email', 'google', 'apple')),
  email_hash    TEXT UNIQUE,                    -- SHA-256 del email normalizado (solo cuentas con email)
  created_at    INTEGER NOT NULL,
  last_seen_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tokens (
  token_hash    TEXT PRIMARY KEY,               -- SHA-256 del token; el token en claro solo lo tiene el cliente
  account_id    TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at    INTEGER NOT NULL,
  last_used_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  account_id    TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  version       INTEGER NOT NULL,               -- control de concurrencia optimista
  data          TEXT NOT NULL,                  -- UserChessProfile (JSON)
  updated_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS email_codes (
  email_hash    TEXT PRIMARY KEY,
  code_hash     TEXT NOT NULL,
  expires_at    INTEGER NOT NULL,
  attempts      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS tokens_account ON tokens(account_id);
