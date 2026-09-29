# 07 · Datos

Principio: **eventos de aprendizaje como fuente de verdad** (append‑only, sincronizables offline) + **agregados recalculables** (perfil, ADN, dominio). Si cambia un algoritmo, se reprocesan los eventos.

## 1. Esquema PostgreSQL

```sql
-- ============ Identidad y cuenta ============
CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           citext UNIQUE,                 -- NULL para invitados
  display_name    text NOT NULL,
  locale          text NOT NULL DEFAULT 'es',
  birth_year      smallint,                      -- solo para protección infantil
  account_type    text NOT NULL CHECK (account_type IN ('guest','standard','child')),
  guardian_id     uuid REFERENCES users(id),     -- cuentas infantiles
  created_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz                    -- borrado lógico → purga a 30 días
);

CREATE TABLE auth_identities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider    text NOT NULL CHECK (provider IN ('email','google','apple')),
  subject     text NOT NULL,
  password_hash text,                            -- Argon2id, solo provider='email'
  UNIQUE (provider, subject)
);

CREATE TABLE user_settings (
  user_id         uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mode            text NOT NULL DEFAULT 'adult' CHECK (mode IN ('adult','kids')),
  coach_style     text NOT NULL DEFAULT 'mentor',
  piece_set       text NOT NULL DEFAULT 'royal-modern',
  board_theme     text NOT NULL DEFAULT 'slate-ivory',
  theme           text NOT NULL DEFAULT 'system',
  a11y            jsonb NOT NULL DEFAULT '{}',   -- contraste, daltonismo, texto, motion, sonido, vibración
  daily_minutes   smallint NOT NULL DEFAULT 20,
  goals           text[] NOT NULL DEFAULT '{}',
  consents        jsonb NOT NULL DEFAULT '{}',   -- analítica, IA, parental
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============ Contenido pedagógico ============
CREATE TABLE concepts (
  id           text PRIMARY KEY,                 -- 'tactics.fork', 'endgame.lucena'
  section      text NOT NULL,                    -- fundamentals, vision, tactics, …
  level_min    smallint NOT NULL,
  prerequisites text[] NOT NULL DEFAULT '{}',
  i18n         jsonb NOT NULL                    -- títulos/resúmenes por idioma
);

CREATE TABLE lessons (
  id           text PRIMARY KEY,
  concept_id   text NOT NULL REFERENCES concepts(id),
  version      int  NOT NULL,
  steps        jsonb NOT NULL,                   -- EMPCRAE: explain/show/practice/…
  locale_keys  text[] NOT NULL
);

CREATE TABLE puzzles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fen          text NOT NULL,
  solution     text[] NOT NULL,                  -- UCI
  concepts     text[] NOT NULL,
  motifs       text[] NOT NULL,
  rating       int  NOT NULL DEFAULT 1200,
  rating_rd    int  NOT NULL DEFAULT 350,
  source       text NOT NULL CHECK (source IN ('original','user_game','generated')),
  owner_id     uuid REFERENCES users(id) ON DELETE CASCADE,  -- puzzles personales
  origin_game_id uuid,
  verified_at  timestamptz                       -- puzzle-verify OK
);
CREATE INDEX ON puzzles USING gin (concepts);
CREATE INDEX ON puzzles (rating) WHERE owner_id IS NULL;

CREATE TABLE openings (
  id          text PRIMARY KEY,                  -- 'italian', 'caro-kann'
  eco         text[],
  character   jsonb NOT NULL,                    -- vector para compatibilidad con ADN
  content     jsonb NOT NULL                     -- objetivo, estructura, planes, trampas…
);

-- ============ Partidas y análisis ============
CREATE TABLE games (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source        text NOT NULL CHECK (source IN ('bot','import','friend')),
  opponent      jsonb NOT NULL,                  -- {bot:'leo', level:3} | {name:'…'}
  user_color    char(1) NOT NULL CHECK (user_color IN ('w','b')),
  mode          text NOT NULL,                   -- free, educational, thematic, coach…
  time_control  text,                            -- '15+10', NULL = sin reloj
  start_fen     text,
  pgn           text NOT NULL,
  result        text CHECK (result IN ('1-0','0-1','1/2-1/2','*')),
  termination   text,                            -- mate, resign, timeout, stalemate, 50-move…
  opening_id    text REFERENCES openings(id),
  played_at     timestamptz NOT NULL,
  analysis_status text NOT NULL DEFAULT 'pending'
);
CREATE INDEX ON games (user_id, played_at DESC);

CREATE TABLE game_moves (
  game_id     uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  ply         smallint NOT NULL,
  san         text NOT NULL,
  uci         text NOT NULL,
  fen_before  text NOT NULL,
  clock_ms    int,
  time_spent_ms int,
  eval_before_cp int, eval_after_cp int, mate_in smallint,
  best_uci    text,
  win_prob_loss real,
  move_class  text,                              -- best, excellent, …, blunder, brilliant
  hints_used  smallint NOT NULL DEFAULT 0,
  facts       jsonb,                             -- hechos del ExplanationEngine
  PRIMARY KEY (game_id, ply)
);

CREATE TABLE position_evals (                    -- caché persistente
  fen_key     text NOT NULL,
  depth       smallint NOT NULL,
  multipv     jsonb NOT NULL,
  engine      text NOT NULL,
  PRIMARY KEY (fen_key, depth)
);

-- ============ Aprendizaje ============
CREATE TABLE learning_events (                   -- fuente de verdad, append-only
  id          uuid PRIMARY KEY,                  -- generado en cliente (offline)
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        text NOT NULL,                     -- lesson_step, puzzle_attempt, hint, move_eval, review…
  concept_id  text REFERENCES concepts(id),
  ref_id      text,                              -- puzzle/lesson/game
  correct     boolean,
  hints       smallint,
  duration_ms int,
  context     text,                              -- guided, puzzle, personal_puzzle, game
  payload     jsonb,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON learning_events (user_id, occurred_at);
CREATE INDEX ON learning_events (user_id, concept_id, occurred_at);

CREATE TABLE concept_mastery (
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id   text NOT NULL REFERENCES concepts(id),
  state        text NOT NULL CHECK (state IN ('locked','introduced','learning','understood','mastered','mastery')),
  p_known      real NOT NULL DEFAULT 0.1,        -- BKT
  contexts     text[] NOT NULL DEFAULT '{}',     -- contextos donde se demostró
  memory_stage smallint NOT NULL DEFAULT 1,      -- memoria pedagógica 1..4
  last_evidence_at timestamptz,
  PRIMARY KEY (user_id, concept_id)
);

CREATE TABLE review_cards (                      -- repetición espaciada
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id   text NOT NULL REFERENCES concepts(id),
  item_type    text NOT NULL,                    -- puzzle, question, position
  item_id      text NOT NULL,
  step         smallint NOT NULL DEFAULT 0,
  ease         real NOT NULL DEFAULT 2.3,
  interval_days smallint NOT NULL DEFAULT 1,
  lapses       smallint NOT NULL DEFAULT 0,
  due_at       timestamptz NOT NULL
);
CREATE INDEX ON review_cards (user_id, due_at);

CREATE TABLE mistakes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id      uuid REFERENCES games(id) ON DELETE CASCADE,
  ply          smallint,
  category     text NOT NULL,                    -- hanging_piece, missed_threat, …
  concept_id   text REFERENCES concepts(id),
  severity     real NOT NULL,                    -- ΔW
  is_slip      boolean NOT NULL DEFAULT false,   -- sistema de confianza
  puzzle_id    uuid REFERENCES puzzles(id),
  occurred_at  timestamptz NOT NULL
);
CREATE INDEX ON mistakes (user_id, category, occurred_at);

-- ============ Perfil agregado ============
CREATE TABLE ratings (
  user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind      text NOT NULL,                       -- game, puzzle, tactical, strategy, endgame, opening, calculation
  rating    real NOT NULL, rd real NOT NULL, volatility real NOT NULL,   -- Glicko-2
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, kind)
);
CREATE TABLE rating_history (user_id uuid, kind text, rating real, at timestamptz);

CREATE TABLE dna_snapshots (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  taken_at    date NOT NULL,
  games_used  smallint NOT NULL,
  dimensions  jsonb NOT NULL,                    -- {attack:{v:78,lo:70,hi:85}, …}
  preferences jsonb NOT NULL,
  PRIMARY KEY (user_id, taken_at)
);

CREATE TABLE training_plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  for_date    date NOT NULL,
  minutes     smallint NOT NULL,
  blocks      jsonb NOT NULL,                    -- [{minutes, activity, refId, reason}]
  rationale   jsonb NOT NULL,                    -- explicación "¿Por qué?"
  completed   jsonb
);

-- ============ Gamificación ============
CREATE TABLE xp_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount int NOT NULL, reason text NOT NULL, ref_id text, at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE achievements_unlocked (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL, unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);
CREATE TABLE streaks (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current int NOT NULL DEFAULT 0, best int NOT NULL DEFAULT 0,
  last_learning_day date, freezes_available smallint NOT NULL DEFAULT 1
);
```

Redis: `eval:*` (caché de motor), `session:*`, `rl:*` (rate limiting), colas BullMQ `analysis`, `puzzle-gen`, `reports`.

## 2. UserChessProfile

Vista agregada (calculada, cacheada) que consumen Coach, ExplanationEngine y UI.

```ts
// packages/profile/src/types.ts
export type Score = { value: number; low: number; high: number }; // 0–100 con intervalo

export interface Rating { rating: number; rd: number; }           // Glicko-2

export interface UserChessProfile {
  userId: string;
  level: LevelId;                                  // 'novice' | 'apprentice' | … | 'master_training'
  overallRating: Rating;
  gameRating: Rating;
  puzzleRating: Rating;
  tacticalRating: Rating;
  strategyRating: Rating;
  endgameRating: Rating;
  openingKnowledge: Rating;
  calculationRating: Rating;

  tacticalStrength: Score;
  strategicStrength: Score;
  openingStrength: Score;
  endgameStrength: Score;
  calculationStrength: Score;
  boardVision: Score;
  defensiveStrength: Score;
  attackingStrength: Score;
  timeManagement: Score;

  commonMistakes: Array<{
    category: ErrorCategory;
    perGame: number;
    baselinePerGame: number | null;
    errorReductionRate: number | null;             // null si no hay datos suficientes
    lastSeenAt: string;
  }>;
  preferredOpenings: Array<{ openingId: string; color: 'w' | 'b'; games: number; score: number }>;
  weakStructures: string[];                        // 'isolated_pawn', 'hanging_pawns', …
  trainingHistory: Array<{ date: string; minutes: number; activities: string[] }>;
  recentGames: string[];                           // ids
  conceptMastery: Record<ConceptId, { state: MasteryState; pKnown: number }>;

  chessDNA: {
    basedOnGames: number;
    confidence: 'building' | 'low' | 'medium' | 'high';
    dimensions: Record<DnaDimension, Score>;
    preferences: {
      openVsClosed: number;                        // −1 cerrado … +1 abierto
      sacrificesPerGame: number;
      tradePropensity: number;
      withAdvantage: { conversionRate: number };
      underPressure: { accuracyDelta: number };
      timeUsage: { avgMoveMs: number; timeTroubleRate: number };
    };
    previous?: { takenAt: string; dimensions: Record<DnaDimension, Score> };
  };

  learningSpeed: number;                           // sesiones medianas hasta 'understood'
  independenceIndex: number;                       // 0–1
  recommendedTopics: Array<{ conceptId: ConceptId; score: number; reason: string }>;
  goals: Goal[];
  dailyMinutes: number;
  updatedAt: string;
}
```

## 3. Sincronización offline

1. El cliente escribe `learning_events` y `games` localmente con UUID v7 generado en cliente.
2. Cola de subida idempotente (`POST /sync/events` con lote; el servidor ignora IDs repetidos).
3. El servidor recalcula agregados (mastery, SRS, perfil, ADN) y devuelve un **snapshot** versionado.
4. El cliente reemplaza su caché de agregados con el snapshot (el cálculo local provisional se descarta).
5. Ajustes: *last‑writer‑wins* por campo con `updated_at`.

## 4. Privacidad de datos

Exportación (`GET /me/export` → ZIP con JSON + PGN) · Eliminación (`DELETE /me` → borrado lógico inmediato, purga completa a 30 días, incluidos backups rotados) · Minimización (año de nacimiento, no fecha completa) · Datos de menores sin analítica de terceros.
