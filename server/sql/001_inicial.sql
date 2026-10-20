-- Estrutura inicial da Jornada SAVA.

CREATE TABLE usuarios (
  id            TEXT PRIMARY KEY,
  nome          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  perfil        TEXT NOT NULL CHECK (perfil IN ('admin', 'rh', 'lider')),
  area          TEXT NOT NULL DEFAULT '',
  senha_hash    TEXT NOT NULL,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  trocar_senha  BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessoes (
  token_hash  TEXT PRIMARY KEY,
  usuario_id  TEXT NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em   TIMESTAMPTZ NOT NULL
);
CREATE INDEX sessoes_usuario_idx ON sessoes (usuario_id);

-- Pessoas avaliadas na jornada (colaboradores).
CREATE TABLE pessoas (
  id          TEXT PRIMARY KEY,
  nome        TEXT NOT NULL,
  chave_base  TEXT,
  categoria   TEXT CHECK (categoria IN ('adm', 'adv')),
  setor       TEXT NOT NULL DEFAULT '',
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  origem      TEXT NOT NULL DEFAULT 'sistema',
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lançamentos de pontuação. Os campos de cada tipo (notas, participantes, feedback…) ficam em "dados".
CREATE TABLE lancamentos (
  id          TEXT PRIMARY KEY,
  ano         INTEGER NOT NULL,
  tipo        TEXT NOT NULL,
  autor_id    TEXT REFERENCES usuarios (id) ON DELETE SET NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  dados       JSONB NOT NULL
);
CREATE INDEX lancamentos_ano_idx ON lancamentos (ano);

CREATE TABLE meta (
  chave  TEXT PRIMARY KEY,
  valor  TEXT NOT NULL
);
INSERT INTO meta (chave, valor) VALUES ('atualizado_em', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
