-- Enunciados oficiais das perguntas da avaliação ("Como você avalia o desempenho do(a)…").
-- Só preenche a orientação das perguntas padrão que ainda estão sem texto no modelo salvo;
-- o que o administrador já escreveu não muda. Sem modelo salvo, o padrão já traz os enunciados.
WITH enunciados (id, descricao) AS (
  VALUES
    ('responsabilidade', 'Como você avalia o desempenho do(a) advogado(a) em relação à gestão do tempo, ao cumprimento das atividades e à manutenção de elevados padrões éticos?'),
    ('relacionamentos', 'Como você avalia o desempenho do(a) advogado(a) em relação à interação respeitosa e eficaz com clientes, colegas e superiores?'),
    ('conhecimentos', 'Como você avalia o desempenho do(a) advogado(a) em relação à aplicação ágil e precisa dos conhecimentos jurídicos e à qualidade técnica das soluções apresentadas?'),
    ('proatividadeEstrategica', 'Como você avalia o desempenho do(a) advogado(a) em relação à capacidade de antecipar desafios, resolver conflitos e propor soluções estratégicas?'),
    ('qualidade', 'Como você avalia o desempenho do(a) colaborador(a) em relação à clareza, precisão e excelência na execução de documentos e processos?'),
    ('eficiencia', 'Como você avalia o desempenho do(a) colaborador(a) em relação à pontualidade, cordialidade e capacidade de resolver demandas dos clientes de maneira eficaz?'),
    ('ferramentas', 'Como você avalia o desempenho do(a) colaborador(a) em relação ao uso produtivo e eficiente de softwares e sistemas internos?'),
    ('proatividade', 'Como você avalia o desempenho do(a) colaborador(a) em relação à iniciativa em projetos, à apresentação de sugestões de melhorias e à adoção de atitudes construtivas?'),
    ('inteligencia', 'Como você avalia o desempenho do(a) colaborador(a) em relação à empatia, comunicação eficaz e manutenção de bons relacionamentos interpessoais?'),
    ('autogestao', 'Como você avalia o desempenho do(a) colaborador(a) em relação à organização, ao foco e à responsabilidade no cumprimento de suas entregas?')
)
UPDATE meta
SET valor = COALESCE((
  SELECT jsonb_object_agg(
    cat,
    CASE
      WHEN jsonb_typeof(m -> 'perguntas') = 'array' THEN jsonb_set(m, '{perguntas}', COALESCE((
        SELECT jsonb_agg(
          CASE WHEN COALESCE(q ->> 'descricao', '') = '' AND e.descricao IS NOT NULL
            THEN q || jsonb_build_object('descricao', e.descricao) ELSE q END
          ORDER BY ord)
        FROM jsonb_array_elements(m -> 'perguntas') WITH ORDINALITY AS x (q, ord)
        LEFT JOIN enunciados e ON e.id = q ->> 'id'
      ), '[]'::jsonb))
      ELSE m
    END)::text
  FROM jsonb_each(meta.valor::jsonb) AS t (cat, m)
), valor)
WHERE chave = 'modelo_avaliacao' AND valor ~ '^\s*\{';
