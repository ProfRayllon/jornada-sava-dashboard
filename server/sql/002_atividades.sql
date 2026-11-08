-- Eventos da Jornada (aba "Eventos" do sistema): encontros do Programa de Felicidade, eventos
-- institucionais, missões secretas e ciclos de avaliação. Os lançamentos de pontos apontam para
-- um evento (dados->>'atividadeId') e herdam dele a data e o ano.
CREATE TABLE atividades (
  id          TEXT PRIMARY KEY,
  ano         INTEGER NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('felicidade', 'evento', 'missao', 'avaliacao')),
  titulo      TEXT NOT NULL,
  data        TEXT NOT NULL CHECK (data ~ '^\d{4}-\d{2}-\d{2}$'),
  pontos      INTEGER,
  descricao   TEXT NOT NULL DEFAULT '',
  autor_id    TEXT REFERENCES usuarios (id) ON DELETE SET NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX atividades_ano_idx ON atividades (ano);
CREATE INDEX lancamentos_atividade_idx ON lancamentos ((dados->>'atividadeId'));
