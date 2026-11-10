// Alimenta o painel (app.js) com os lançamentos feitos no sistema, por cima da base das planilhas.
// Carregado depois de dados-painel.js e antes de app.js.
// O painel trabalha com "anos" numéricos; aqui cada ciclo vira um desses períodos, com a chave de
// S.chavePainel (2025, 2026 para as planilhas; 20270101 etc. para os ciclos novos) e o nome do ciclo.
(function () {
  const R = window.SAVA_REGRAS;
  const S = window.SAVA_STORE;
  if (!R || !S || !window.JORNADA_SAVA_PANEL_DATA) return;

  const original = JSON.parse(JSON.stringify(window.JORNADA_SAVA_PANEL_DATA));
  const selosDoPainel = new Set(["happy", "bright", "inspire"]);
  const reguaSelo = { adm: { bright: 1500, inspire: 2000 }, adv: { bright: 1900, inspire: 2000 } };

  function montar() {
    const dados = JSON.parse(JSON.stringify(original));
    const db = S.lerDb();
    if (!db) return dados;
    const ciclos = S.listarCiclos();
    if (!ciclos.length) return dados;
    const anos = {};
    ciclos.forEach((ciclo) => {
      const chave = S.chavePainel(ciclo);
      const doCiclo = S.lancamentosDoCiclo(ciclo.id);
      const base = ciclo.anoBase ? dados.years[String(ciclo.anoBase)] : null;
      anos[chave] = {
        ...(base || { source: "Lançamentos do sistema", highlights: [], notes: [] }),
        year: chave,
        label: S.rotuloCiclo(ciclo),
        updatedAt: doCiclo.length || !base ? db.atualizadoEm : base.updatedAt,
        people: pessoasDoCiclo(ciclo),
      };
    });
    dados.years = anos;
    return dados;
  }

  function pessoasDoCiclo(ciclo) {
    return S.calcularCiclo(ciclo.id).map((linha) => {
      const { pessoa, base, sistema } = linha;
      const badgeScores = { ...linha.badgeScores };
      linha.selos.forEach((selo) => {
        if (badgeScores[selo] == null && reguaSelo[pessoa.categoria]?.[selo]) {
          badgeScores[selo] = reguaSelo[pessoa.categoria][selo];
        }
      });
      return {
        name: pessoa.nome,
        key: pessoa.chaveBase || S.normalizar(pessoa.nome),
        category: R.categorias[pessoa.categoria] || "Sem avaliação",
        score: linha.score,
        levelScore: linha.levelScore,
        felicidade: base.felicidade + sistema.felicidade,
        eventos: base.eventos + sistema.eventos,
        tecnica: base.tecnica + sistema.tecnica,
        socio: base.socio + sistema.socio,
        competencias: base.competencias + sistema.competencias,
        badges: [...linha.selos].filter((s) => selosDoPainel.has(s)),
        badgeScores,
      };
    });
  }

  // painel.js espera esta promessa antes de ler JORNADA_SAVA_PANEL_DATA.
  window.SAVA_PAINEL_PRONTO = S.garantirDb()
    .then(() => (window.JORNADA_SAVA_PANEL_DATA = montar()))
    .catch(() => {});

  // Tempo real: quando alguém grava algo no sistema, o painel se atualiza sozinho.
  S.ouvir(async () => {
    window.JORNADA_SAVA_PANEL_DATA = montar();
    if (typeof loadAllWorkbooks !== "function" || typeof render !== "function") return;
    state.years.clear();
    await loadAllWorkbooks();
    render();
  });
})();
