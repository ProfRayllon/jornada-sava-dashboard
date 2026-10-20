// Regras da Jornada SAVA (fonte: "Orientação Jornada SAVA.pdf" + formulário de avaliação 2026).
// Compartilhado pela homepage, pelo sistema e pela ponte do painel.
(function () {
  const opcoes = (valores) => {
    const rotulos = ["Abaixo do esperado", "Em desenvolvimento", "Atende", "Supera as expectativas"];
    return valores.map((valor, i) => ({ valor, rotulo: rotulos[i] }));
  };

  const categorias = {
    adm: "Controladoria e Administrativo",
    adv: "Advogados Associados",
  };

  // Pontos por critério e opções de nota, conforme as respostas do formulário 2026.
  const criterios = {
    adm: [
      { id: "qualidade", nome: "Qualidade técnica nos serviços", grupo: "tecnica", max: 500, opcoes: opcoes([125, 250, 375, 500]) },
      { id: "eficiencia", nome: "Eficiência no atendimento ao cliente", grupo: "tecnica", max: 500, opcoes: opcoes([125, 250, 375, 500]) },
      { id: "ferramentas", nome: "Domínio de ferramentas tecnológicas", grupo: "tecnica", max: 500, opcoes: opcoes([125, 250, 375, 500]) },
      { id: "proatividade", nome: "Proatividade", grupo: "socio", max: 600, opcoes: opcoes([150, 300, 450, 600]) },
      { id: "inteligencia", nome: "Inteligência emocional e social", grupo: "socio", max: 600, opcoes: opcoes([150, 300, 450, 600]) },
      { id: "autogestao", nome: "Autogestão", grupo: "socio", max: 800, opcoes: opcoes([200, 400, 600, 800]) },
    ],
    adv: [
      { id: "responsabilidade", nome: "Responsabilidade", grupo: "socio", max: 800, opcoes: opcoes([200, 400, 600, 800]) },
      { id: "relacionamentos", nome: "Relacionamentos colaborativos", grupo: "socio", max: 800, opcoes: opcoes([200, 400, 600, 800]) },
      { id: "conhecimentos", nome: "Conhecimentos jurídicos", grupo: "tecnica", max: 950, opcoes: opcoes([200, 450, 700, 950]) },
      { id: "proatividadeEstrategica", nome: "Proatividade estratégica", grupo: "tecnica", max: 950, opcoes: opcoes([200, 450, 700, 950]) },
    ],
  };

  const pontuacaoBimestral = {
    adm: [
      { nome: "Participação no Programa de Felicidade", desc: "Ações de bem-estar, qualidade de vida e engajamento.", pontos: 2300, prefixo: "até", medicao: "Frequência nas atividades (RH)", icone: "heart" },
      { nome: "Eventos institucionais", desc: "Participação em eventos, treinamentos e iniciativas.", pontos: 700, prefixo: "até", medicao: "Frequência nas atividades (RH)", icone: "calendar" },
      { nome: "Avaliação técnica", desc: "Desempenho e qualidade nas entregas.", pontos: 1500, prefixo: "até", medicao: "Avaliação dos líderes", icone: "chart" },
      { nome: "Avaliação socioemocional", desc: "Comportamento, colaboração e atitudes.", pontos: 2500, prefixo: "até", medicao: "Avaliação dos líderes", icone: "users" },
    ],
    adv: [
      { nome: "Participação no Programa de Felicidade", desc: "Ações de bem-estar, qualidade de vida e engajamento.", pontos: 2300, prefixo: "até", medicao: "Frequência nas atividades (RH)", icone: "heart" },
      { nome: "Eventos institucionais", desc: "Participação em eventos, treinamentos e iniciativas.", pontos: 700, prefixo: "até", medicao: "Frequência nas atividades (RH)", icone: "calendar" },
      { nome: "Indicação de negócio (ADV)", desc: "Indicação de novos negócios e oportunidades.", pontos: 500, prefixo: "", medicao: "Informação dos sócios", icone: "briefcase" },
      { nome: "Acompanhamento de competências", desc: "Evolução técnica, desempenho e desenvolvimento.", pontos: 3500, prefixo: "até", medicao: "Avaliação dos líderes", icone: "trending" },
    ],
  };

  const niveis = [
    { nome: "Explorador SAVA", min: 0, max: 6000, faixa: "até 6.000", slug: "explorador" },
    { nome: "Protagonista SAVA", min: 6001, max: 13000, faixa: "6.001 a 13.000", slug: "protagonista" },
    { nome: "Líder SAVA", min: 13001, max: 23000, faixa: "13.001 a 23.000", slug: "lider" },
    { nome: "Guardião SAVA", min: 23001, max: Infinity, faixa: "a definir", slug: "guardiao" },
    { nome: "Mestre SAVA", min: null, max: null, faixa: "a definir", slug: "mestre" },
    { nome: "Lenda SAVA", min: null, max: null, faixa: "a definir", slug: "lenda" },
  ];

  const selos = [
    { id: "happy", nome: "Sou feliz!", criterio: "Nota máxima no Programa de Felicidade", descricao: "Engajamento com o bem-estar coletivo.", imagem: "assets/icones/selos/1.png" },
    { id: "bright", nome: "Mente Brilhante", criterio: "Nota máxima em habilidades técnicas", descricao: "Excelência técnica e aprendizado contínuo.", imagem: "assets/icones/selos/2.png" },
    { id: "inspire", nome: "Eu inspiro pessoas!", criterio: "Nota máxima em habilidades socioemocionais", descricao: "Inspiração, exemplo e impacto positivo.", imagem: "assets/icones/selos/3.png" },
  ];

  const indicadores = [
    {
      id: "comportamentais", titulo: "Comportamentais", publico: "Controladoria e Administrativo", icone: "users",
      itens: [
        { nome: "Proatividade", desc: "Iniciativa e atitude para fazer acontecer.", icone: "heart" },
        { nome: "Autogestão", desc: "Organização e responsabilidade.", icone: "user" },
        { nome: "Habilidades interpessoais", desc: "Comunicação, empatia e trabalho em equipe.", icone: "people" },
      ],
    },
    {
      id: "tecnicos", titulo: "Técnicos / Operacionais", publico: "Controladoria e Administrativo", icone: "wrench",
      itens: [
        { nome: "Qualidade técnica nos serviços", desc: "Precisão, profundidade e confiabilidade.", icone: "gear" },
        { nome: "Eficiência no atendimento", desc: "Agilidade e foco em soluções.", icone: "clock" },
        { nome: "Domínio de ferramentas tecnológicas", desc: "Uso eficaz das ferramentas e sistemas.", icone: "gear" },
      ],
    },
    {
      id: "competencias", titulo: "Acompanhamento de competências", publico: "Advogados Associados", icone: "scale",
      itens: [
        { nome: "Autogestão e ética profissional", desc: "Disciplina, responsabilidade e conduta.", icone: "clock" },
        { nome: "Habilidades interpessoais", desc: "Relacionamento e atuação colaborativa.", icone: "people" },
        { nome: "Eficiência técnico-jurídica", desc: "Qualidade e profundidade das entregas.", icone: "scale" },
        { nome: "Resolução de problemas e gestão de conflitos", desc: "Análise crítica e capacidade de negociação.", icone: "handshake" },
      ],
    },
  ];

  // Pontuação de fevereiro a novembro; dezembro e janeiro não pontuam.
  const bimestres = [
    { id: 1, nome: "1º bimestre", meses: [2, 3], premiacao: "Março" },
    { id: 2, nome: "2º bimestre", meses: [4, 5], premiacao: "Maio" },
    { id: 3, nome: "3º bimestre", meses: [6, 7], premiacao: "Julho" },
    { id: 4, nome: "4º bimestre", meses: [8, 9], premiacao: "Setembro" },
    { id: 5, nome: "5º bimestre", meses: [10, 11], premiacao: "Novembro" },
  ];

  function bimestreDaData(data) {
    const mes = new Date(`${data}T12:00:00`).getMonth() + 1;
    return bimestres.find((b) => b.meses.includes(mes)) || null;
  }

  function nivelPorPontos(pontos) {
    return niveis.find((n) => n.min !== null && pontos >= n.min && pontos <= n.max) || niveis[0];
  }

  function proximoNivel(pontos) {
    const atual = nivelPorPontos(pontos);
    const idx = niveis.indexOf(atual);
    const prox = niveis[idx + 1];
    if (!prox || prox.min === null) return null;
    return { nivel: prox, faltam: prox.min - pontos, progresso: (pontos - atual.min) / (prox.min - atual.min) };
  }

  // Selos conquistados por uma avaliação isolada (nota máxima no grupo).
  function selosDaAvaliacao(categoria, notas) {
    const soma = (grupo) =>
      criterios[categoria].filter((c) => c.grupo === grupo).reduce((t, c) => t + Number(notas[c.id] || 0), 0);
    const max = (grupo) => criterios[categoria].filter((c) => c.grupo === grupo).reduce((t, c) => t + c.max, 0);
    const ganhos = [];
    if (soma("tecnica") >= max("tecnica")) ganhos.push("bright");
    if (soma("socio") >= max("socio")) ganhos.push("inspire");
    return ganhos;
  }

  // Pontos que um lançamento gera para cada pessoa, separados por pilar.
  // "resumo" é a forma já calculada que o servidor entrega para a homepage pública (sem notas nem textos).
  function pontosDoLancamento(l, pessoaId) {
    const vazio = { felicidade: 0, eventos: 0, tecnica: 0, socio: 0, competencias: 0, extras: 0, selos: [] };
    if (l.pessoaIds && !l.pessoaIds.includes(pessoaId)) return vazio;
    if (l.pessoaId && l.pessoaId !== pessoaId) return vazio;

    switch (l.tipo) {
      case "resumo":
        return { ...vazio, ...l.resumo };
      case "felicidade":
        return { ...vazio, felicidade: Number(l.pontos) };
      case "evento":
        return { ...vazio, eventos: Number(l.pontos) };
      case "indicacao":
      case "missao":
        return { ...vazio, extras: Number(l.pontos) };
      case "protagonista":
        return { ...vazio, selos: ["protagonista"] };
      case "avaliacao": {
        const soma = (grupo) =>
          criterios[l.categoria].filter((c) => c.grupo === grupo).reduce((t, c) => t + Number(l.notas[c.id] || 0), 0);
        const selos = selosDaAvaliacao(l.categoria, l.notas);
        if (l.categoria === "adv") return { ...vazio, competencias: soma("tecnica") + soma("socio"), selos };
        return { ...vazio, tecnica: soma("tecnica"), socio: soma("socio"), selos };
      }
      default:
        return vazio;
    }
  }

  window.SAVA_REGRAS = {
    anoAtual: 2026,
    pontosPorEncontroFelicidade: 575,
    maxFelicidadeCiclo: 2300,
    maxEventosBimestre: 700,
    pontosIndicacao: 500,
    categorias,
    criterios,
    pontuacaoBimestral,
    indicadores,
    niveis,
    selos,
    bimestres,
    mesesPremiacao: [3, 5, 7, 9, 11],
    mesesSemPontuacao: [12, 1],
    mesPremiacaoAnual: 1,
    premiacaoAnual: [
      { criterio: "Jornada SAVA", peso: 60, fonte: "Pontuação anual" },
      { criterio: "Avaliação de Desempenho", peso: 40, fonte: "Avaliações semestrais" },
      { criterio: "Pontuação Extra", peso: 20, fonte: "RH e líderes" },
    ],
    bimestreDaData,
    nivelPorPontos,
    proximoNivel,
    selosDaAvaliacao,
    pontosDoLancamento,
  };
})();
