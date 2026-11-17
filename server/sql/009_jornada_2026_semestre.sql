-- A "Jornada 2026" (ciclo da base das planilhas) passa a ir só até 30/06/2026, para abrir
-- um ciclo novo no 2º semestre de 2026. Só encurta se o ciclo ainda vai até 31/12.
-- Se já houver evento ou lançamento depois de 30/06, cria o "2º semestre de 2026" (com o período
-- de avaliação aberto) para que nada fique fora de ciclo.
UPDATE ciclos SET fim = '2026-06-30' WHERE ano_base = 2026 AND fim = '2026-12-31';

INSERT INTO ciclos (id, nome, inicio, fim)
SELECT 'c20260701', '2º semestre de 2026', '2026-07-01', '2026-12-31'
WHERE EXISTS (SELECT 1 FROM ciclos WHERE ano_base = 2026 AND fim = '2026-06-30')
  AND NOT EXISTS (SELECT 1 FROM ciclos WHERE inicio <= '2026-12-31' AND fim >= '2026-07-01')
  AND (
    EXISTS (SELECT 1 FROM lancamentos WHERE dados->>'data' BETWEEN '2026-07-01' AND '2026-12-31')
    OR EXISTS (SELECT 1 FROM atividades WHERE data BETWEEN '2026-07-01' AND '2026-12-31')
  );

INSERT INTO atividades (id, ano, tipo, titulo, data, pontos, descricao)
SELECT 'a20260701', 2026, 'avaliacao', 'Avaliação · 2º semestre de 2026', '2026-07-01', NULL, ''
WHERE EXISTS (SELECT 1 FROM ciclos WHERE id = 'c20260701')
  AND NOT EXISTS (SELECT 1 FROM atividades WHERE tipo = 'avaliacao' AND data BETWEEN '2026-07-01' AND '2026-12-31');
