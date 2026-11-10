-- Ciclos da Jornada: períodos definidos pelo administrador (ex.: "1º semestre de 2027", de janeiro a
-- julho). Ranking, painel, apresentação e site passam a ser por ciclo, e não mais por ano: todo
-- lançamento entra no ciclo que contém a sua data. Os tetos (Programa de Felicidade e Eventos) são
-- de cada ciclo; o nível continua acumulando de um ciclo para o outro.
-- "ano_base" liga o ciclo à base das planilhas (2025 e 2026), por isso as datas desses não mudam.
CREATE TABLE ciclos (
  id               TEXT PRIMARY KEY,
  nome             TEXT NOT NULL,
  inicio           TEXT NOT NULL CHECK (inicio ~ '^\d{4}-\d{2}-\d{2}$'),
  fim              TEXT NOT NULL CHECK (fim ~ '^\d{4}-\d{2}-\d{2}$'),
  teto_felicidade  INTEGER NOT NULL DEFAULT 2300,
  teto_eventos     INTEGER NOT NULL DEFAULT 700,
  publicado        BOOLEAN NOT NULL DEFAULT FALSE,
  ano_base         INTEGER,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fim >= inicio)
);

-- Os anos que já existiam viram ciclos anuais (nada se perde); a publicação no site é mantida.
INSERT INTO ciclos (id, nome, inicio, fim, publicado, ano_base)
SELECT
  'c' || a,
  'Jornada ' || a,
  a || '-01-01',
  a || '-12-31',
  COALESCE((SELECT valor::jsonb FROM meta WHERE chave = 'anos_publicados') @> to_jsonb(a), FALSE),
  CASE WHEN a IN (2025, 2026) THEN a END
FROM (
  SELECT 2025 AS a UNION SELECT 2026
  UNION SELECT DISTINCT ano FROM lancamentos
  UNION SELECT DISTINCT ano FROM atividades
) anos
WHERE a >= 2025;
