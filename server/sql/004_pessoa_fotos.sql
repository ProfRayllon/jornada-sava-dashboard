-- Foto de perfil de cada colaborador (PNG/WebP sem fundo), usada na apresentação do resultado.
-- Fica numa tabela própria para não pesar a leitura do estado do sistema.
CREATE TABLE pessoa_fotos (
  pessoa_id      TEXT PRIMARY KEY REFERENCES pessoas (id) ON DELETE CASCADE,
  tipo           TEXT NOT NULL,
  dados          BYTEA NOT NULL,
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
