// Alimenta o painel (app.js) com os lançamentos feitos no sistema, por cima da base das planilhas.
// Carregado depois de dados-painel.js e antes de app.js.
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
    const ano = String(R.anoAtual);
    if (!db || !dados.years[ano]) return dados;

    dados.years[ano].people = S.calcularAno(R.anoAtual).map((linha) => {
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

    if (db.lancamentos.length) dados.years[ano].updatedAt = db.atualizadoEm;
    return dados;
  }

  window.JORNADA_SAVA_PANEL_DATA = montar();

  // Tempo real: quando o sistema grava algo (outra aba/janela), o painel se atualiza sozinho.
  S.ouvir(async () => {
    window.JORNADA_SAVA_PANEL_DATA = montar();
    if (typeof loadAllWorkbooks !== "function" || typeof render !== "function") return;
    state.years.clear();
    await loadAllWorkbooks();
    render();
  });
})();
