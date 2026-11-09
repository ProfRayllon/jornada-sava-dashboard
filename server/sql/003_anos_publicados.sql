-- Anos da Jornada que aparecem na homepage pública (ranking, números e vencedor).
-- 2025 e 2026 já estavam no ar; anos novos começam ocultos até o administrador publicar.
INSERT INTO meta (chave, valor) VALUES ('anos_publicados', '[2025,2026]') ON CONFLICT (chave) DO NOTHING;
