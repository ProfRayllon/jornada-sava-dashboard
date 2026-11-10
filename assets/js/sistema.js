(function () {
  const R = window.SAVA_REGRAS;
  const S = window.SAVA_STORE;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const fmt = (n) => Number(n || 0).toLocaleString("pt-BR");
  const esc = (t) =>
    String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const hojeIso = () => new Date().toISOString().slice(0, 10);
  const dataBr = (iso) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—");

  const ICONES = {
    visao: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    painel: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v1.5A3.5 3.5 0 0 1 16.5 10M7 5H4v1.5A3.5 3.5 0 0 0 7.5 10"/>',
    lancar: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    apresentacao: '<rect x="3" y="4" width="18" height="12.5" rx="2"/><path d="M12 16.5V20M8.5 20h7"/><path d="M10 8.2v4.6l4-2.3z"/>',
    camera: '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
    eventos: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M12 13v5M9.5 15.5h5"/>',
    historico: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 3.5v5h5M12 7.5V12l3 2"/>',
    pessoas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20a6.5 6.5 0 0 0-3.5-5.8"/>',
    equipe: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
    senha: '<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M16 7l3 3M14 9l2 2"/>',
    site: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    sair: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3"/>',
    lua: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    recolher: '<path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/>',
    felicidade: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.1a4.3 4.3 0 0 1 7.5 2.7C19.5 15.4 12 20 12 20z"/>',
    evento: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14.5h3M8 17h6"/>',
    avaliacao: '<rect x="5" y="4.5" width="14" height="16.5" rx="2.5"/><path d="M9 4.5V3h6v1.5"/><path d="M9 13l2 2 4-4"/>',
    indicacao: '<rect x="3" y="7.5" width="18" height="12.5" rx="2.5"/><path d="M9 7.5V5.5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18M12 12v2"/>',
    missao: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    protagonista: '<circle cx="12" cy="9" r="5.5"/><path d="M8.6 13.4L7.5 21l4.5-2.5 4.5 2.5-1.1-7.6"/>',
    lancamentos: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8.5 15l2.3 2.3 4.7-4.6"/>',
    ver: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    subir: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    editar: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
    excluir: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  };
  const ico = (nome) =>
    `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome]}</svg>`;
  // Botões de ação das tabelas (Editar / Excluir) como ícones, iguais em todas as telas.
  const btnIcone = (icone, rotulo, atributo, id, perigo = false) =>
    `<button type="button" class="icon-btn${perigo ? " danger" : ""}" ${atributo}="${esc(id)}" title="${rotulo}" aria-label="${rotulo}">${ico(icone)}</button>`;
  const btnEditar = (atributo, id) => btnIcone("editar", "Editar", atributo, id);
  const btnExcluir = (atributo, id) => btnIcone("excluir", "Excluir", atributo, id, true);
  const tamanhoKb = (bytes) => `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("pt-BR")} KB`;
  const bytesDoDataUrl = (url) => Math.floor(((url.split(",")[1] || "").length * 3) / 4);

  const perfis = {
    admin: { nome: "Administrador", tipos: ["felicidade", "evento", "avaliacao", "indicacao", "missao"] },
    rh: { nome: "RH", tipos: ["felicidade", "evento", "avaliacao", "indicacao", "missao"] },
    lider: { nome: "Coordenador", tipos: ["avaliacao"] },
  };

  const tipos = {
    felicidade: { nome: "Programa de Felicidade", desc: "Presença nos encontros cadastrados (até 2.300 Savacoins no ano).", cor: "#9d2824", icone: ico("felicidade") },
    evento: { nome: "Evento institucional", desc: "Participação nos eventos cadastrados (até 700 Savacoins no ano).", cor: "#3a3c39", icone: ico("evento") },
    avaliacao: { nome: "Avaliação do coordenador", desc: "Por ciclo de avaliação: técnica e socioemocional (ADM) ou competências (ADV).", cor: "#1e66b2", icone: ico("avaliacao") },
    indicacao: { nome: "Indicação de negócio", desc: "Bônus de 500 Savacoins, exclusivo dos advogados.", cor: "#2f7a5b", icone: ico("indicacao") },
    missao: { nome: "Missão secreta", desc: "Missões cadastradas e divulgadas pelo RH.", cor: "#7c2ba8", icone: ico("missao") },
    protagonista: { nome: "Selo Sou Protagonista", desc: "Indicação do coordenador por inovação, melhoria ou inspiração.", cor: "#b08a3e", icone: ico("protagonista") },
  };

  // Tipos de evento cadastrados na aba Eventos e o valor sugerido por pessoa.
  const tiposAtividade = {
    felicidade: { nome: "Encontro do Programa de Felicidade", curto: "Encontro", pontos: R.pontosPorEncontroFelicidade },
    evento: { nome: "Evento institucional", curto: "Evento", pontos: 350 },
    missao: { nome: "Missão secreta", curto: "Missão", pontos: 200 },
    avaliacao: { nome: "Ciclo de avaliação do coordenador", curto: "Ciclo de avaliação", pontos: null },
  };

  const pilares = [
    { id: "felicidade", nome: "Felicidade", cor: "#c0504d" },
    { id: "eventos", nome: "Eventos", cor: "#6b6d68" },
    { id: "avaliacao", nome: "Avaliação", cor: "#d4b26f" },
    { id: "extras", nome: "Extras", cor: "#7c5cc4" },
  ];

  const views = {
    visao: { nome: "Visão geral", kicker: "Acompanhamento da Jornada", render: renderVisao },
    painel: { nome: "Painel da Jornada", kicker: "Ranking, destaque e selos ao vivo", render: renderPainel },
    apresentacao: { nome: "Apresentação", kicker: "Resultado do ano", render: (el) => window.SAVA_APRESENTACAO.render(el, { ano: state.ano }) },
    lancamentos: { nome: "Lançamentos", kicker: "Eventos, pontuação e histórico", render: renderLancamentos },
    pessoas: { nome: "Colaboradores", kicker: "Pessoas avaliadas", render: renderPessoas, perfis: ["admin", "rh"] },
    equipe: { nome: "Equipe e acessos", kicker: "Administração", render: renderEquipe, perfis: ["admin"] },
  };

  const state = { usuario: null, ano: null, view: "visao", filtros: { busca: "", area: "all", nivel: "all" }, hist: { tipo: "all", busca: "", todosAnos: true }, ev: { tipo: "all" }, lanc: { aba: "eventos", aberto: null } };

  document.addEventListener("DOMContentLoaded", async () => {
    await S.garantirDb();
    state.usuario = S.usuarioAtual();
    if (!state.usuario) return location.replace("login.html");
    state.ano = S.anoVigente();

    let hash = location.hash.slice(1);
    if (hash === "historico") state.lanc.aba = "historico";
    if (["eventos", "lancar", "historico"].includes(hash)) hash = "lancamentos";
    if (views[hash] && podeVer(hash)) state.view = hash;

    montarShell();
    render();
    if (state.usuario.trocarSenha) abrirTrocaSenha(true);

    S.ouvir(() => {
      state.usuario = S.usuarioAtual();
      if (!state.usuario) return location.replace("login.html");
      if (!S.anosDisponiveis().includes(state.ano)) state.ano = S.anoVigente();
      if (!$("#modal").classList.contains("open") && !["painel", "apresentacao"].includes(state.view) && !(state.view === "lancamentos" && state.lanc.aberto)) render();
    });
  });

  // ---------------- Shell ----------------
  function podeVer(view) {
    return !views[view].perfis || views[view].perfis.includes(state.usuario.perfil);
  }

  function montarShell() {
    const u = state.usuario;
    $("#sideUser").innerHTML = `
      <span class="avatar" title="${esc(u.nome)}">${esc(iniciais(u.nome))}</span>
      <div class="side-label"><strong>${esc(u.nome)}</strong><small>${perfis[u.perfil].nome}</small></div>`;

    $("#sideNav").innerHTML = Object.entries(views)
      .filter(([id]) => podeVer(id))
      .map(([id, v]) => `<button type="button" data-view="${id}" title="${v.nome}">${ico(id)}<span class="side-label">${v.nome}</span></button>`)
      .join("");

    $("#sideFoot").innerHTML = `
      <button type="button" id="temaBtn" role="switch">${ico("lua")}<span class="side-label">Tema escuro</span><span class="mini-switch" aria-hidden="true"></span></button>
      <button type="button" id="trocarSenhaBtn" title="Alterar senha">${ico("senha")}<span class="side-label">Alterar senha</span></button>
      <a href="index.html" title="Ver site da Jornada">${ico("site")}<span class="side-label">Ver site da Jornada</span></a>
      <button type="button" id="logoutBtn" title="Sair">${ico("sair")}<span class="side-label">Sair</span></button>`;
    $("#trocarSenhaBtn").addEventListener("click", () => abrirTrocaSenha(false));
    $("#temaBtn").addEventListener("click", () => aplicarTema(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
    aplicarTema(document.documentElement.dataset.theme || "light");

    $("#collapseBtn").innerHTML = ico("recolher");
    $("#collapseBtn").addEventListener("click", () => {
      const recolhida = document.documentElement.classList.toggle("side-collapsed");
      try { localStorage.setItem("jornada-sava-lateral", recolhida ? "recolhida" : "aberta"); } catch (e) {}
      atualizarRecolher();
    });
    atualizarRecolher();
    $("#sideNav").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-view]");
      if (!btn) return;
      state.lanc.aberto = null;
      irPara(btn.dataset.view);
    });

    $("#logoutBtn").addEventListener("click", async () => {
      await S.sair();
      location.replace("login.html");
    });
    $("#menuBtn").addEventListener("click", () => document.body.classList.toggle("nav-open"));
    $("#modal").addEventListener("click", (e) => e.target.closest("[data-close]") && fecharModal());
    $("#drawer").addEventListener("click", (e) => e.target.closest("[data-close-drawer]") && fecharDrawer());
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if ($("#modal").classList.contains("open") && !$("#modal").dataset.locked) fecharModal();
      fecharDrawer();
    });
  }

  // Um só tema para todas as páginas do sistema, inclusive o painel (que roda num iframe).
  function aplicarTema(tema) {
    document.documentElement.dataset.theme = tema;
    try { localStorage.setItem("jornada-sava-theme", tema); } catch (e) {}
    const escuro = tema === "dark";
    const btn = $("#temaBtn");
    btn.setAttribute("aria-checked", String(escuro));
    btn.title = escuro ? "Mudar para o tema claro" : "Mudar para o tema escuro";
    btn.querySelector(".ico").outerHTML = ico(escuro ? "sol" : "lua");
    const painel = $("#painelFrame")?.contentWindow;
    if (painel && typeof painel.setTheme === "function") painel.setTheme(tema);
  }

  function atualizarRecolher() {
    const recolhida = document.documentElement.classList.contains("side-collapsed");
    const btn = $("#collapseBtn");
    btn.setAttribute("aria-expanded", String(!recolhida));
    btn.title = recolhida ? "Expandir menu" : "Recolher menu";
    btn.setAttribute("aria-label", btn.title);
  }

  function irPara(view, extra = {}) {
    state.view = view;
    Object.assign(state, extra);
    history.replaceState(null, "", `#${view}`);
    document.body.classList.remove("nav-open");
    render();
    window.scrollTo({ top: 0 });
  }

  function render() {
    if (!podeVer(state.view)) state.view = "visao";
    const v = views[state.view];
    $("#viewTitle").textContent = v.nome;
    $("#viewKicker").textContent = v.kicker;
    $$("#sideNav [data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === state.view));
    $("#content").classList.toggle("content-full", ["painel", "apresentacao"].includes(state.view));
    v.render($("#content"));
  }

  // ---------------- Painel (ranking oficial, alimentado pelos lançamentos) ----------------
  function renderPainel(el) {
    if ($("#painelFrame", el)?.dataset.ano === String(state.ano)) return;
    el.innerHTML = `<iframe id="painelFrame" class="painel-frame" src="painel.html?year=${state.ano}" data-ano="${state.ano}" title="Painel da Jornada SAVA"></iframe>`;
  }

  // ---------------- Ano da Jornada ----------------
  // O sistema mostra o ano mais recente com dados; o seletor permite consultar os anteriores.
  function seletorAno(id) {
    return `<select id="${id}" class="year-select" aria-label="Ano da Jornada">${S.anosDisponiveis()
      .map((a) => `<option value="${a}" ${a === state.ano ? "selected" : ""}>Jornada ${a}</option>`)
      .join("")}</select>`;
  }

  function ligarSeletorAno(el, id, rerender) {
    $(`#${id}`, el)?.addEventListener("change", (e) => {
      state.ano = Number(e.target.value);
      rerender(el);
    });
  }

  // Quantas avaliações a pessoa já recebeu no ano (para numerar 1ª, 2ª… avaliação).
  function avaliacoesNoAno(pessoaId, ano) {
    return S.listarLancamentos()
      .filter((l) => l.tipo === "avaliacao" && l.pessoaId === pessoaId && l.ano === ano)
      .sort((a, b) => a.data.localeCompare(b.data) || a.criadoEm.localeCompare(b.criadoEm));
  }

  // Soma do que cada pessoa já recebeu no ano num tipo de lançamento coletivo.
  function somaNoAno(tipo, pessoaId, ano) {
    return S.listarLancamentos()
      .filter((l) => l.tipo === tipo && l.ano === ano && l.pessoaIds?.includes(pessoaId))
      .reduce((t, l) => t + Number(l.pontos || 0), 0);
  }

  // ---------------- Visão geral ----------------
  // Em camadas: indicadores → ranking (página inteira, com rolagem) → distribuição por nível
  // com o total de pessoas sem avaliação ao lado.
  function renderVisao(el) {
    const ano = state.ano;
    const linhas = S.calcularAno(ano);
    const lancs = S.listarLancamentos().filter((l) => l.ano === ano);
    const avaliacoes = lancs.filter((l) => l.tipo === "avaliacao");
    const avaliados = new Set(avaliacoes.map((l) => l.pessoaId));
    // Avaliações que vieram das planilhas (ex.: 2025 e 1º semestre de 2026) também contam.
    linhas.forEach((l) => l.base.tecnica + l.base.socio + l.base.competencias > 0 && avaliados.add(l.pessoa.id));
    const avaliaveis = linhas.filter((l) => l.pessoa.categoria);
    const pendentes = avaliaveis.filter((l) => !avaliados.has(l.pessoa.id));
    const totalCoins = linhas.reduce((t, l) => t + l.score, 0);
    const cobertura = avaliaveis.length ? Math.round(((avaliaveis.length - pendentes.length) / avaliaveis.length) * 100) : 0;
    const f = state.filtros;

    const filtradas = linhas.filter((l) => {
      if (f.area !== "all" && l.pessoa.categoria !== f.area) return false;
      if (f.nivel !== "all" && l.nivel.slug !== f.nivel) return false;
      return !f.busca || S.normalizar(l.pessoa.nome).includes(S.normalizar(f.busca));
    });

    const niveis = R.niveis.filter((n) => n.min !== null);
    const porNivel = niveis.map((n) => ({ n, qtd: linhas.filter((l) => l.nivel.slug === n.slug).length }));
    const maxNivel = Math.max(1, ...porNivel.map((x) => x.qtd));
    const maior = [...porNivel].sort((a, b) => b.qtd - a.qtd)[0];

    const podeAvaliar = perfis[state.usuario.perfil].tipos.includes("avaliacao");
    const tagArea = (cat) => (cat ? `<span class="area-tag area-${cat}">${cat === "adv" ? "ADV" : "ADM"}</span>` : "");

    el.innerHTML = `
      <section class="kpis">
        ${kpi("Colaboradores na jornada", fmt(linhas.length), `${linhas.filter((l) => l.pessoa.categoria === "adv").length} ADV · ${linhas.filter((l) => l.pessoa.categoria === "adm").length} ADM`)}
        ${kpi(`Savacoins em ${ano}`, fmt(totalCoins), `${fmt(lancs.length)} lançamentos no sistema`)}
        ${kpi(`Avaliações em ${ano}`, fmt(avaliacoes.length), `${fmt(avaliados.size)} pessoa(s) avaliada(s)`)}
        ${kpi("Cobertura de avaliações", `${cobertura}%`, `${pendentes.length} sem avaliação em ${ano}`, cobertura)}
      </section>

      <section class="card" id="rankingCard">
        <div class="card-head">
          <div><h2>Ranking ao vivo · ${ano}</h2><p class="muted">${S.temBase(ano) ? "Base das planilhas + lançamentos do sistema" : "Lançamentos feitos no sistema"}. Clique numa pessoa para ver o progresso.</p>${statusPublicacao(ano)}</div>
          <div class="filters">
            ${seletorAno("fAno")}
            <input type="search" id="fBusca" placeholder="Buscar pessoa" value="${esc(f.busca)}" />
            <select id="fArea" aria-label="Área">
              <option value="all">Todas as áreas</option>
              <option value="adv" ${f.area === "adv" ? "selected" : ""}>Advogados Associados</option>
              <option value="adm" ${f.area === "adm" ? "selected" : ""}>Controladoria e Adm.</option>
            </select>
            <select id="fNivel" aria-label="Nível">
              <option value="all">Todos os níveis</option>
              ${niveis.map((n) => `<option value="${n.slug}" ${f.nivel === n.slug ? "selected" : ""}>${n.nome}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="ranking-bar">
          <div class="legend">${pilares.map((p) => `<span><i style="background:${p.cor}"></i>${p.nome}</span>`).join("")}</div>
          <span class="muted small">${fmt(filtradas.length)} de ${fmt(linhas.length)} pessoa(s)</span>
        </div>
        <div class="table-wrap ranking-scroll">
          <table class="table ranking">
            <thead><tr><th>#</th><th>Nome</th><th>Nível</th><th>Composição</th><th class="num">Savacoins</th><th>Selos</th></tr></thead>
            <tbody>
              ${filtradas
                .map((l) => {
                  const pos = linhas.indexOf(l) + 1;
                  return `
                <tr data-pessoa="${l.pessoa.id}" tabindex="0">
                  <td><span class="pos pos-${pos <= 3 ? pos : "n"}">${pos}</span></td>
                  <td><strong>${esc(nomeBonito(l.pessoa.nome))}</strong><small>${tagArea(l.pessoa.categoria)}${R.categorias[l.pessoa.categoria] || "Sem área"}</small>${l.score > 0 && l.score === linhas[0].score ? fotoVencedor(l) : ""}</td>
                  <td><span class="level level-${l.nivel.slug}">${l.nivel.nome}</span></td>
                  <td class="comp-cell">${barraComposicao(l, linhas[0]?.score || 1)}</td>
                  <td class="num"><strong>${fmt(l.score)}</strong>${l.score !== l.base.score ? `<small class="delta">+${fmt(l.score - l.base.score)} no sistema</small>` : ""}</td>
                  <td>${selosHtml(l.selos)}</td>
                </tr>`;
                })
                .join("") || `<tr><td colspan="6" class="empty">Nenhuma pessoa encontrada.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>

      <section class="grid-niveis">
        <div class="card lv-card">
          <div class="card-head">
            <div><h2>Distribuição por nível</h2><p class="muted">${maior && maior.qtd ? `${fmt(maior.qtd)} de ${fmt(linhas.length)} pessoas estão em <b>${maior.n.nome}</b>. Clique num nível para filtrar o ranking.` : "Ainda sem pontuação."}</p></div>
          </div>
          <div class="lv-chart" role="list">
            ${porNivel
              .map(({ n, qtd }) => {
                const pct = linhas.length ? Math.round((qtd / linhas.length) * 100) : 0;
                const dica = `${n.nome}: ${fmt(qtd)} pessoa(s), ${pct}% · faixa ${n.faixa} Savacoins acumulados`;
                return `<button type="button" class="lv-bar ${f.nivel === n.slug ? "active" : ""}" data-nivel="${n.slug}" role="listitem" title="${dica}" aria-label="${dica}">
                  <span class="lv-name"><span class="level level-${n.slug}">${n.nome}</span><small>${n.faixa}</small></span>
                  <span class="lv-plot"><i class="level-bg-${n.slug}" style="width:${qtd ? Math.max(1.5, (qtd / maxNivel) * 100) : 0}%"></i></span>
                  <span class="lv-val"><b>${fmt(qtd)}</b><small>${pct}%</small></span>
                </button>`;
              })
              .join("")}
          </div>
        </div>

        <div class="card pend-card">
          <span class="pend-kicker">Sem avaliação em ${ano}</span>
          <strong class="pend-num">${fmt(pendentes.length)}</strong>
          <p class="muted small">${pendentes.length ? `de ${fmt(avaliaveis.length)} colaboradores ainda não receberam nenhuma avaliação no ano.` : "Todos os colaboradores já têm avaliação no ano ✓"}</p>
          <div class="pend-split">
            <span><b>${fmt(pendentes.filter((l) => l.pessoa.categoria === "adm").length)}</b> ADM</span>
            <span><b>${fmt(pendentes.filter((l) => l.pessoa.categoria === "adv").length)}</b> ADV</span>
          </div>
          ${podeAvaliar ? `<button type="button" class="btn btn-gold" id="irAvaliar">Avaliar</button>` : ""}
        </div>
      </section>`;

    $("#fBusca", el).addEventListener("input", (e) => {
      f.busca = e.target.value;
      const pos = e.target.selectionStart;
      const rolagem = $(".ranking-scroll", el).scrollTop;
      renderVisao(el);
      const input = $("#fBusca", el);
      input.focus();
      input.setSelectionRange(pos, pos);
      $(".ranking-scroll", el).scrollTop = rolagem;
    });
    $("#fArea", el).addEventListener("change", (e) => {
      f.area = e.target.value;
      renderVisao(el);
    });
    $("#fNivel", el).addEventListener("change", (e) => {
      f.nivel = e.target.value;
      renderVisao(el);
    });
    ligarSeletorAno(el, "fAno", renderVisao);
    $("#pubAno", el)?.addEventListener("click", () => alternarPublicacao(ano));
    $$("[data-foto-vencedor]", el).forEach((input) => {
      // O clique na foto não deve abrir a ficha da pessoa (a linha inteira é clicável).
      input.closest(".foto-venc").addEventListener("click", (e) => e.stopPropagation());
      input.addEventListener("change", () => enviarFotoVencedor(input, linhas, el));
    });
    $$("[data-nivel]", el).forEach((b) =>
      b.addEventListener("click", () => {
        f.nivel = f.nivel === b.dataset.nivel ? "all" : b.dataset.nivel;
        renderVisao(el);
        $("#rankingCard", el).scrollIntoView({ behavior: "smooth", block: "start" });
      }),
    );
    $("#irAvaliar", el)?.addEventListener("click", () => {
      state.ev.tipo = "avaliacao";
      irPara("lancamentos", { lanc: { aba: "eventos", aberto: null } });
    });
    const tbody = el.querySelector(".ranking tbody");
    tbody.addEventListener("click", (e) => {
      const tr = e.target.closest("[data-pessoa]");
      if (tr) abrirPessoa(tr.dataset.pessoa);
    });
    tbody.addEventListener("keydown", (e) => {
      const tr = e.target.closest("[data-pessoa]");
      if (tr && e.key === "Enter") abrirPessoa(tr.dataset.pessoa);
    });
  }

  // Foto do vencedor do ano (aparece no último slide da Apresentação). Fica salva no banco.
  // Quem só existe numa planilha antiga (ex.: vencedor de 2025 fora do cadastro atual) ganha um
  // cadastro inativo só para guardar a foto: não entra nos rankings dos anos atuais.
  function fotoVencedor(l) {
    const url = l.pessoa.daPlanilha ? null : S.fotoUrl(l.pessoa);
    const pode = ["admin", "rh"].includes(state.usuario.perfil);
    if (!pode) return url ? `<span class="foto-venc so-ver"><img src="${url}" alt="" /> Foto do vencedor</span>` : "";
    return `<label class="foto-venc" title="Foto usada no último slide da Apresentação">
      ${url ? `<img src="${url}" alt="" /> Trocar foto do vencedor` : `${ico("camera")} Adicionar foto do vencedor`}
      <input type="file" accept="image/png,image/webp,image/jpeg" hidden data-foto-vencedor="${esc(l.pessoa.id)}" />
    </label>`;
  }

  async function enviarFotoVencedor(input, linhas, el) {
    const arquivo = input.files?.[0];
    const l = linhas.find((x) => x.pessoa.id === input.dataset.fotoVencedor);
    if (!arquivo || !l) return;
    const nome = nomeBonito(l.pessoa.nome);
    const r = await executar(
      async () => {
        const dados = await S.prepararFoto(arquivo);
        let id = l.pessoa.id;
        if (l.pessoa.daPlanilha) {
          const nova = await S.salvarPessoa({ nome: l.pessoa.nome, categoria: l.pessoa.categoria || "adm", setor: "" });
          await S.salvarPessoa({ id: nova.id, nome: nova.nome, categoria: nova.categoria, setor: "", ativo: false });
          id = nova.id;
        }
        await S.salvarFoto(id, dados);
      },
      { carregando: "Enviando foto…", concluido: "Foto do vencedor salva", detalhe: `<b>${esc(nome)}</b><br>Ela aparece no último slide da Apresentação.` },
    );
    if (r.ok) renderVisao(el);
  }

  // Publicação no site: o ranking, os números e o vencedor de um ano só aparecem na página
  // inicial depois que o administrador publica aquele ano.
  function statusPublicacao(ano) {
    const publicado = S.anosPublicados().includes(ano);
    const admin = state.usuario.perfil === "admin";
    return `<div class="pub-status ${publicado ? "on" : ""}">
      <span class="pub-dot" aria-hidden="true"></span>
      <span>${publicado ? `Jornada ${ano} <b>publicada</b> no site` : `Jornada ${ano} <b>oculta</b> no site`}</span>
      ${admin ? `<button type="button" class="btn btn-sm ${publicado ? "btn-ghost" : "btn-gold"}" id="pubAno">${publicado ? "Despublicar" : "Publicar no site"}</button>` : ""}
    </div>`;
  }

  async function alternarPublicacao(ano) {
    const publicar = !S.anosPublicados().includes(ano);
    const sim = await confirmar(
      publicar
        ? {
            titulo: `Publicar a Jornada ${ano}?`,
            mensagem: `O ranking, os números e o <b>destaque do ano</b> de ${ano} vão aparecer na página inicial do site.`,
            detalhe: "Os pontos continuam sendo atualizados no site a cada novo lançamento. Você pode despublicar quando quiser.",
            acao: "Publicar",
          }
        : {
            titulo: `Despublicar a Jornada ${ano}?`,
            mensagem: `A Jornada ${ano} deixa de aparecer na página inicial do site.`,
            detalhe: "Nada é apagado: os dados continuam no sistema e no painel interno.",
            acao: "Despublicar",
          },
    );
    if (!sim) return;
    const r = await executar(() => S.publicarAno(ano, publicar), {
      carregando: publicar ? "Publicando no site…" : "Despublicando…",
      concluido: publicar ? `Jornada ${ano} publicada` : `Jornada ${ano} oculta no site`,
      detalhe: publicar ? "Já aparece na página inicial." : "Não aparece mais na página inicial.",
    });
    if (r.ok) render();
  }

  function kpi(rotulo, valor, sub, progresso) {
    return `<article class="kpi"><span>${rotulo}</span><strong>${valor}</strong><small>${sub}</small>${
      progresso != null ? `<div class="kpi-bar"><i style="width:${progresso}%"></i></div>` : ""
    }</article>`;
  }

  function valoresPilares(l) {
    return {
      felicidade: l.base.felicidade + l.sistema.felicidade,
      eventos: l.base.eventos + l.sistema.eventos,
      avaliacao: l.base.tecnica + l.base.socio + l.base.competencias + l.sistema.tecnica + l.sistema.socio + l.sistema.competencias,
      extras: Math.max(0, l.score - (l.base.felicidade + l.base.eventos + l.base.tecnica + l.base.socio + l.base.competencias) - (l.sistema.felicidade + l.sistema.eventos + l.sistema.tecnica + l.sistema.socio + l.sistema.competencias)),
    };
  }

  function barraComposicao(l, maximo) {
    const v = valoresPilares(l);
    return `<div class="comp" title="${pilares.map((p) => `${p.nome}: ${fmt(v[p.id])}`).join(" · ")}">${pilares
      .filter((p) => v[p.id] > 0)
      .map((p) => `<i style="width:${(v[p.id] / maximo) * 100}%;background:${p.cor}"></i>`)
      .join("")}</div>`;
  }

  function selosHtml(selos) {
    return `<span class="seals">${R.selos
      .filter((s) => selos.has(s.id))
      .map((s) => (s.imagem ? `<img src="${s.imagem}" alt="${s.nome}" title="${s.nome}" />` : `<b class="seal-prot" title="${s.nome}">P</b>`))
      .join("")}</span>`;
  }

  // ---------------- Ficha da pessoa ----------------
  function abrirPessoa(id) {
    const linhas = S.calcularAno(state.ano);
    const l = linhas.find((x) => x.pessoa.id === id);
    if (!l) return;
    const pos = linhas.indexOf(l) + 1;
    const prox = R.proximoNivel(l.levelScore);
    const v = valoresPilares(l);
    const cat = l.pessoa.categoria;

    $("#drawerPanel").innerHTML = `
      <header class="drawer-head">
        <button class="icon-btn" type="button" data-close-drawer aria-label="Fechar">×</button>
        <span class="avatar avatar-lg">${esc(iniciais(l.pessoa.nome))}</span>
        <div>
          <h2>${esc(nomeBonito(l.pessoa.nome))}</h2>
          <p class="muted">${R.categorias[cat] || "Sem área definida"}${l.pessoa.setor ? ` · ${esc(l.pessoa.setor)}` : ""}</p>
        </div>
      </header>
      <section class="drawer-stats">
        <div><span>Posição</span><strong>${pos}º</strong></div>
        <div><span>Savacoins ${state.ano}</span><strong>${fmt(l.score)}</strong></div>
        <div><span>Total acumulado</span><strong>${fmt(l.levelScore)}</strong></div>
      </section>
      <section class="drawer-sec">
        <div class="level-progress">
          <div><span class="level level-${l.nivel.slug}">${l.nivel.nome}</span>${prox ? `<small>faltam ${fmt(prox.faltam)} para ${prox.nivel.nome}</small>` : "<small>Nível máximo definido</small>"}</div>
          <div class="lv-track big"><i class="level-bg-${l.nivel.slug}" style="width:${prox ? Math.min(100, prox.progresso * 100) : 100}%"></i></div>
        </div>
      </section>
      <section class="drawer-sec">
        <h3>Composição da pontuação no ano</h3>
        ${pilares
          .map(
            (p) => `<div class="pillar"><header><span><i style="background:${p.cor}"></i>${p.nome}</span><b>${fmt(v[p.id])}</b></header>
            <div class="lv-track"><i style="width:${l.score ? (v[p.id] / l.score) * 100 : 0}%;background:${p.cor}"></i></div></div>`,
          )
          .join("")}
        <p class="muted small">${S.temBase(state.ano) ? "Inclui a base importada das planilhas e os lançamentos do sistema." : `Pontos lançados no sistema em ${state.ano}. O total acumulado soma os anos anteriores.`}</p>
      </section>
      <section class="drawer-sec">
        <h3>Selos conquistados</h3>
        <div class="seal-row">${R.selos
          .map((s) => `<div class="seal-item ${l.selos.has(s.id) ? "on" : ""}">${s.imagem ? `<img src="${s.imagem}" alt="" />` : `<b class="seal-prot big">P</b>`}<small>${s.nome}</small></div>`)
          .join("")}</div>
      </section>
      <section class="drawer-sec">
        <h3>Histórico no sistema</h3>
        <ul class="timeline">
          ${[...l.lancamentos]
            .sort((a, b) => b.data.localeCompare(a.data))
            .map((x) => {
              const pts = S.pontosDoLancamento(x, l.pessoa.id);
              const total = pts.felicidade + pts.eventos + pts.tecnica + pts.socio + pts.competencias + pts.extras;
              return `<li><span class="type-dot" style="background:${tipos[x.tipo].cor}">${tipos[x.tipo].icone}</span>
                <div><strong>${tipos[x.tipo].nome}${x.titulo ? ` · ${esc(x.titulo)}` : ""}</strong>
                <small>${dataBr(x.data)} · ${esc(x.autorNome)}${total ? ` · <b>+${fmt(total)}</b>` : ""}</small>
                ${x.feedback ? `<p>“${esc(x.feedback)}”</p>` : ""}${x.justificativa ? `<p>${esc(x.justificativa)}</p>` : ""}</div></li>`;
            })
            .join("") || `<li class="muted small">Sem lançamentos no sistema ainda.</li>`}
        </ul>
      </section>`;
    $("#drawer").classList.add("open");
    $("#drawer").setAttribute("aria-hidden", "false");
  }

  function fecharDrawer() {
    $("#drawer").classList.remove("open");
    $("#drawer").setAttribute("aria-hidden", "true");
  }

  // ---------------- Lançamentos (eventos + lançar/avaliar + histórico) ----------------
  // Uma página só: a aba Eventos lista o que foi cadastrado; o olho abre o evento para lançar
  // pontos ou avaliar; a aba Histórico mostra tudo o que já foi registrado.
  function renderLancamentos(el) {
    if (state.lanc.aberto) return renderLancamentoAberto(el);
    const aba = state.lanc.aba;
    el.innerHTML = `
      <div class="seg page-tabs" role="tablist" aria-label="Lançamentos">
        <button type="button" role="tab" data-aba="eventos" class="${aba === "eventos" ? "active" : ""}" aria-selected="${aba === "eventos"}">Eventos</button>
        <button type="button" role="tab" data-aba="historico" class="${aba === "historico" ? "active" : ""}" aria-selected="${aba === "historico"}">Histórico</button>
      </div>
      <div id="lancCorpo"></div>`;
    $$("[data-aba]", el).forEach((b) =>
      b.addEventListener("click", () => {
        state.lanc.aba = b.dataset.aba;
        renderLancamentos(el);
      }),
    );
    (aba === "historico" ? renderHistorico : renderEventos)($("#lancCorpo", el));
  }

  function abrirLancamento(aberto) {
    state.lanc.aberto = aberto;
    render();
    window.scrollTo({ top: 0 });
  }

  // Tela de um evento (ou de um lançamento avulso, ex.: indicação): cabeçalho colorido do tipo,
  // formulário (participantes ou questionário) e o que já foi lançado nele.
  function renderLancamentoAberto(el) {
    if (state.lanc.aberto === "modelo") return renderModeloAvaliacao(el);
    const avulso = state.lanc.aberto.startsWith("avulso:") ? state.lanc.aberto.slice(7) : null;
    const evento = avulso ? null : S.listarAtividades().find((a) => a.id === state.lanc.aberto);
    const tipo = avulso || evento?.tipo;
    if (!tipo || !perfis[state.usuario.perfil].tipos.includes(tipo)) {
      state.lanc.aberto = null;
      return renderLancamentos(el);
    }
    el.innerHTML = `
      <div class="lanc-voltar"><button type="button" class="btn btn-ghost btn-sm" id="voltarLanc">← Voltar para lançamentos</button></div>
      ${cabecalhoLancamento(tipo, evento)}
      <form class="card form-card" id="lancForm" novalidate></form>
      ${evento ? `<div id="lancFeitos"></div>` : ""}`;
    $("#voltarLanc", el).addEventListener("click", () => abrirLancamento(null));
    $("#editarModelo", el)?.addEventListener("click", () => abrirLancamento("modelo"));
    montarFormulario($("#lancForm", el), tipo, evento);
    if (evento) renderHistorico($("#lancFeitos", el), { atividadeId: evento.id });
  }

  // Faixa no topo da tela do evento, na cor e com o ícone do tipo.
  function cabecalhoLancamento(tipo, evento) {
    const t = tipos[tipo];
    const n = evento ? pontuadosNaAtividade(evento.id).size : 0;
    const dados = evento
      ? [
          ["Data", dataBr(evento.data)],
          ["Jornada", evento.ano],
          tipo === "avaliacao" ? ["Pontuação", "Questionário"] : ["Savacoins por pessoa", fmt(evento.pontos)],
          [tipo === "avaliacao" ? "Avaliados" : "Pontuados", fmt(n)],
        ]
      : tipo === "indicacao"
        ? [["Bônus", `${fmt(R.pontosIndicacao)} Savacoins`], ["Quem recebe", "Advogados"]]
        : [];
    const admin = state.usuario.perfil === "admin";
    return `
      <section class="ev-banner" style="--c:${t.cor}">
        <span class="ev-banner-ico">${t.icone}</span>
        <div class="ev-banner-txt">
          <small>${evento ? tiposAtividade[tipo].nome : "Lançamento avulso"}</small>
          <h2>${esc(evento ? evento.titulo : t.nome)}</h2>
          <p>${esc(evento?.descricao || t.desc)}</p>
          ${tipo === "avaliacao" && admin ? `<button type="button" class="ev-banner-link" id="editarModelo">${ico("editar")} Editar perguntas do questionário</button>` : ""}
        </div>
        ${dados.length ? `<dl class="ev-banner-dados">${dados.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>` : ""}
      </section>`;
  }

  function pessoasAtivas(categoria) {
    return S.listarPessoas()
      .filter((p) => p.ativo && R.participaDaJornada(p) && (!categoria || p.categoria === categoria))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  // Anos em que se pode lançar: os que já têm dados e o próximo (para abrir a Jornada seguinte).
  function anosParaLancar() {
    const proximo = Number(hojeIso().slice(0, 4)) + 1;
    return [...new Set([proximo, ...S.anosDisponiveis()])].filter((a) => a >= 2025 && a <= proximo).sort((a, b) => b - a);
  }

  // Data sugerida dentro do ano escolhido: hoje, se for o ano corrente; senão o início ou o fim do ano.
  function dataPadrao(ano) {
    const hoje = hojeIso();
    const anoHoje = Number(hoje.slice(0, 4));
    return ano === anoHoje ? hoje : ano > anoHoje ? `${ano}-01-01` : `${ano}-12-31`;
  }

  function campoData() {
    const ano = anosParaLancar().includes(state.ano) ? state.ano : anosParaLancar()[0];
    return `
      <label class="field"><span>Jornada (ano)</span><select name="anoJornada" class="year-pick">${anosParaLancar()
        .map((a) => `<option value="${a}" ${a === ano ? "selected" : ""}>Jornada ${a}</option>`)
        .join("")}</select></label>
      <label class="field"><span>Data</span><input type="date" name="data" required value="${dataPadrao(ano)}" min="${ano}-01-01" max="${ano}-12-31" /><small class="field-hint" id="dataInfo"></small></label>`;
  }

  // Mostra em que ano da Jornada a pontuação vai entrar.
  function ligarData(form) {
    const input = $('input[name="data"]', form);
    const info = $("#dataInfo", form);
    const anoSel = $('select[name="anoJornada"]', form);
    if (!input || !info || !anoSel) return;
    const atualizar = () => {
      const fora = input.value && input.value.slice(0, 4) !== anoSel.value;
      info.classList.toggle("warn", Boolean(fora));
      info.textContent = !input.value ? "" : fora ? `A data precisa ser de ${anoSel.value}.` : `Entra na Jornada ${anoSel.value}`;
    };
    anoSel.addEventListener("change", () => {
      const ano = Number(anoSel.value);
      state.ano = ano;
      input.min = `${ano}-01-01`;
      input.max = `${ano}-12-31`;
      input.value = dataPadrao(ano);
      atualizar();
    });
    input.addEventListener("input", atualizar);
    atualizar();
  }

  // ---------------- Eventos (base dos lançamentos) ----------------
  // Tipos que dependem de um evento cadastrado: a data e o ano vêm dele.
  const TIPOS_COM_EVENTO = ["felicidade", "evento", "missao", "avaliacao"];

  // Quem já recebeu pontos num evento (pessoa → Savacoins).
  function pontuadosNaAtividade(id) {
    const mapa = new Map();
    S.listarLancamentos()
      .filter((l) => l.atividadeId === id)
      .forEach((l) => (l.pessoaIds || [l.pessoaId]).forEach((p) => mapa.set(p, l.pontos)));
    return mapa;
  }

  function podeCadastrarEventos() {
    return ["admin", "rh"].includes(state.usuario.perfil);
  }

  function renderEventos(el) {
    const ano = state.ano;
    const f = state.ev;
    const gerencia = podeCadastrarEventos();
    const permitidos = perfis[state.usuario.perfil].tipos;
    const tiposVisiveis = Object.keys(tiposAtividade).filter((t) => permitidos.includes(t));
    const avulsos = permitidos.filter((t) => !TIPOS_COM_EVENTO.includes(t));
    if (f.tipo !== "all" && !tiposVisiveis.includes(f.tipo)) f.tipo = "all";
    const lista = S.listarAtividades()
      .filter((a) => a.ano === ano && tiposVisiveis.includes(a.tipo) && (f.tipo === "all" || a.tipo === f.tipo))
      .sort((a, b) => a.data.localeCompare(b.data) || a.titulo.localeCompare(b.titulo));

    el.innerHTML = `
      <div class="card">
        <div class="card-head">
          <div><h2>Eventos da Jornada ${ano}</h2><p class="muted">${gerencia ? "Cadastre encontros, eventos, missões e ciclos de avaliação. Clique no olho para lançar os pontos ou avaliar." : "Clique no olho de um ciclo para avaliar os colaboradores."}</p></div>
          <div class="filters">
            ${seletorAno("eAno")}
            ${tiposVisiveis.length > 1 ? `<select id="eTipo" aria-label="Tipo de evento"><option value="all">Todos os tipos</option>${tiposVisiveis
              .map((id) => `<option value="${id}" ${f.tipo === id ? "selected" : ""}>${tiposAtividade[id].nome}</option>`)
              .join("")}</select>` : ""}
            ${avulsos.map((t) => `<button class="btn btn-ghost" data-avulso="${t}">+ ${tipos[t].nome}</button>`).join("")}
            ${state.usuario.perfil === "admin" ? `<button class="btn btn-ghost" id="abrirModelo">${ico("avaliacao")} Modelo de avaliação</button>` : ""}
            ${gerencia ? `<button class="btn btn-gold" id="novoEvento">+ Novo evento</button>` : ""}
          </div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Data</th><th>Evento</th><th class="num">Savacoins por pessoa</th><th class="num">Pontuados</th><th></th></tr></thead>
            <tbody>
              ${lista
                .map((a) => {
                  const n = pontuadosNaAtividade(a.id).size;
                  return `<tr class="ev-linha" data-abrir-linha="${a.id}">
                    <td>${dataBr(a.data)}</td>
                    <td><span class="type-tag" style="--c:${tipos[a.tipo].cor}">${tipos[a.tipo].icone} ${tiposAtividade[a.tipo].curto}</span><strong class="ev-nome">${esc(a.titulo)}</strong>${a.descricao ? `<small>${esc(a.descricao)}</small>` : ""}</td>
                    <td class="num">${a.pontos ? fmt(a.pontos) : "<small>Notas do coordenador</small>"}</td>
                    <td class="num">${fmt(n)}</td>
                    <td><div class="row-actions">
                      ${btnIcone("ver", a.tipo === "avaliacao" ? "Abrir para avaliar" : "Abrir para lançar pontos", "data-abrir", a.id)}
                      ${gerencia ? btnEditar("data-editar", a.id) : ""}
                      ${gerencia && !n ? btnExcluir("data-excluir", a.id) : ""}
                    </div></td>
                  </tr>`;
                })
                .join("") || `<tr><td colspan="5" class="empty">Nenhum evento em ${ano}.${gerencia ? " Clique em “+ Novo evento”." : ""}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;

    ligarSeletorAno(el, "eAno", renderEventos);
    $("#eTipo", el)?.addEventListener("change", (e) => {
      f.tipo = e.target.value;
      renderEventos(el);
    });
    $("#novoEvento", el)?.addEventListener("click", () => formAtividade({ tipo: f.tipo !== "all" ? f.tipo : "felicidade" }));
    $$("[data-avulso]", el).forEach((b) => b.addEventListener("click", () => abrirLancamento(`avulso:${b.dataset.avulso}`)));
    $("#abrirModelo", el)?.addEventListener("click", () => abrirLancamento("modelo"));
    $$("[data-abrir]", el).forEach((b) => b.addEventListener("click", () => abrirLancamento(b.dataset.abrir)));
    // A linha inteira também abre o evento (menos os botões de editar/excluir).
    $$("[data-abrir-linha]", el).forEach((tr) =>
      tr.addEventListener("click", (e) => {
        if (!e.target.closest("button")) abrirLancamento(tr.dataset.abrirLinha);
      }),
    );
    $$("[data-editar]", el).forEach((b) => b.addEventListener("click", () => formAtividade(S.listarAtividades().find((a) => a.id === b.dataset.editar))));
    $$("[data-excluir]", el).forEach((b) =>
      b.addEventListener("click", async () => {
        const a = S.listarAtividades().find((x) => x.id === b.dataset.excluir);
        const sim = await confirmar({
          titulo: "Excluir evento?",
          mensagem: `<b>${esc(a?.titulo || "")}</b> · ${a ? dataBr(a.data) : ""}<br>Esta ação não pode ser desfeita.`,
          acao: "Excluir",
          perigo: true,
        });
        if (!sim) return;
        const r = await executar(() => S.excluirAtividade(b.dataset.excluir), { carregando: "Excluindo evento…", concluido: "Evento excluído" });
        if (r.ok) renderEventos(el);
      }),
    );
  }

  function formAtividade(a = {}) {
    const tipoInicial = a.tipo || "felicidade";
    abrirModal(
      a.id ? "Editar evento" : "Novo evento",
      `<form class="form-grid" id="atvForm" novalidate>
        <label class="field field-full"><span>Tipo</span><select name="tipo">${Object.entries(tiposAtividade)
          .map(([id, t]) => `<option value="${id}" ${tipoInicial === id ? "selected" : ""}>${t.nome}</option>`)
          .join("")}</select></label>
        <label class="field field-full"><span>Nome</span><input name="titulo" required value="${esc(a.titulo || "")}" placeholder="Ex.: Café da felicidade de março" /></label>
        <label class="field"><span>Data</span><input type="date" name="data" required value="${a.data || dataPadrao(state.ano)}" /><small class="field-hint" id="atvAno"></small></label>
        <label class="field" id="atvPontos"><span>Savacoins por pessoa</span><input type="number" name="pontos" min="1" step="25" value="${a.pontos ?? tiposAtividade[tipoInicial].pontos ?? ""}" /></label>
        <label class="field field-full"><span>Descrição (opcional)</span><input name="descricao" value="${esc(a.descricao || "")}" placeholder="Ex.: local, tema ou regra da missão" /></label>
        <p class="form-error field-full" id="atvErro"></p>
        <div class="form-actions field-full"><button class="btn btn-ghost" type="button" data-close>Cancelar</button><button class="btn btn-gold" type="submit">Salvar evento</button></div>
      </form>`,
    );
    const form = $("#atvForm");
    const campo = (nome) => form.elements.namedItem(nome);
    const sincronizar = () => {
      $("#atvPontos").hidden = campo("tipo").value === "avaliacao";
      const d = campo("data").value;
      $("#atvAno").textContent = d ? `Entra na Jornada ${d.slice(0, 4)}` : "";
    };
    campo("tipo").addEventListener("change", () => {
      if (!a.id) campo("pontos").value = tiposAtividade[campo("tipo").value].pontos ?? "";
      sincronizar();
    });
    campo("data").addEventListener("input", sincronizar);
    sincronizar();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const tipo = campo("tipo").value;
      const titulo = campo("titulo").value.trim();
      const data = campo("data").value;
      const pontos = tipo === "avaliacao" ? null : Number(campo("pontos").value);
      if (!titulo) return ($("#atvErro").textContent = "Informe o nome do evento.");
      if (!data) return ($("#atvErro").textContent = "Informe a data.");
      if (tipo !== "avaliacao" && (!pontos || pontos < 1)) return ($("#atvErro").textContent = "Informe os Savacoins por pessoa.");
      const r = await executar(() => S.salvarAtividade({ id: a.id, tipo, titulo, data, pontos, descricao: campo("descricao").value }), {
        carregando: a.id ? "Salvando evento…" : "Cadastrando evento…",
        concluido: a.id ? "Evento atualizado" : "Evento cadastrado",
        detalhe: (salvo) => `<b>${esc(salvo.titulo)}</b><br>${dataBr(salvo.data)} · Jornada ${salvo.ano}`,
      });
      if (!r.ok) return ($("#atvErro").textContent = r.erro.message);
      state.ano = r.resultado.ano;
      fecharModal();
      render();
    });
  }

  // Evento do lançamento: fixo (escolhido pelo olho na lista); data, ano e nome aparecem no cabeçalho.
  function campoAtividade(atual) {
    return { atual, html: `<input type="hidden" name="atividadeId" value="${esc(atual.id)}" />` };
  }

  // Lista de participantes com filtro por área e Savacoins por pessoa (pontuação em lote).
  function campoParticipantes(atividade) {
    const ja = pontuadosNaAtividade(atividade.id);
    const padrao = atividade.pontos || "";
    return `
      <div class="field field-full">
        <span>Participantes <em id="selCount"></em></span>
        <div class="checklist-tools">
          <input type="search" id="ckBusca" placeholder="Buscar nome" />
          <div class="seg seg-sm" id="ckArea" role="group" aria-label="Filtrar por área">
            <button type="button" data-area="all" class="active">Todos</button>
            <button type="button" data-area="adm">ADM</button>
            <button type="button" data-area="adv">ADV</button>
          </div>
          <button type="button" class="link-btn" id="ckTodos">Marcar visíveis</button>
          <button type="button" class="link-btn" id="ckNenhum">Limpar</button>
          <span class="ck-padrao">Savacoins <input type="number" id="ckPadrao" min="1" step="25" value="${padrao}" aria-label="Savacoins padrão" /><button type="button" class="link-btn" id="ckAplicar">Aplicar aos marcados</button></span>
        </div>
        <div class="score-list" id="checklist">
          ${pessoasAtivas()
            .map((p) => {
              const feito = ja.get(p.id);
              const area = p.categoria === "adv" ? "ADV" : p.categoria === "adm" ? "ADM" : "";
              return `<div class="score-line${feito != null ? " done" : ""}" data-nome="${esc(S.normalizar(p.nome))}" data-area="${p.categoria || ""}">
                <label><input type="checkbox" value="${p.id}" ${feito != null ? "disabled" : ""} /><span>${esc(nomeBonito(p.nome))}</span><small>${area}</small></label>
                ${feito != null ? `<span class="done-tag">já pontuado · ${fmt(feito)}</span>` : `<input type="number" class="pts" min="1" step="25" value="${padrao}" aria-label="Savacoins de ${esc(nomeBonito(p.nome))}" />`}
              </div>`;
            })
            .join("")}
        </div>
        <p class="muted small">Marque quem participou. Para dar um valor diferente a alguém, é só mudar o número ao lado do nome. Quem já foi pontuado neste evento aparece bloqueado.</p>
      </div>`;
  }

  function ligarParticipantes(form) {
    const linhas = $$(".score-line", form);
    const caixa = (l) => $('input[type="checkbox"]', l);
    let area = "all";
    let busca = "";
    const filtrar = () => linhas.forEach((l) => (l.hidden = (area !== "all" && l.dataset.area !== area) || (busca && !l.dataset.nome.includes(busca))));
    const resumo = () => {
      const marcadas = linhas.filter((l) => caixa(l).checked);
      const total = marcadas.reduce((t, l) => t + Number($(".pts", l)?.value || 0), 0);
      $("#selCount", form).textContent = `${marcadas.length} selecionado(s) · ${fmt(total)} Savacoins`;
    };
    $("#ckBusca", form).addEventListener("input", (e) => {
      busca = S.normalizar(e.target.value);
      filtrar();
    });
    $$("#ckArea [data-area]", form).forEach((b) =>
      b.addEventListener("click", () => {
        area = b.dataset.area;
        $$("#ckArea [data-area]", form).forEach((x) => x.classList.toggle("active", x === b));
        filtrar();
      }),
    );
    $("#ckTodos", form).addEventListener("click", () => {
      linhas.filter((l) => !l.hidden && !caixa(l).disabled).forEach((l) => (caixa(l).checked = true));
      resumo();
    });
    $("#ckNenhum", form).addEventListener("click", () => {
      linhas.forEach((l) => (caixa(l).checked = false));
      resumo();
    });
    // O valor padrão vale para quem ainda não foi marcado; "Aplicar" leva o valor aos já marcados.
    $("#ckPadrao", form).addEventListener("input", (e) => {
      linhas.filter((l) => !caixa(l).checked && $(".pts", l)).forEach((l) => ($(".pts", l).value = e.target.value));
    });
    $("#ckAplicar", form).addEventListener("click", () => {
      const v = $("#ckPadrao", form).value;
      linhas.filter((l) => caixa(l).checked && $(".pts", l)).forEach((l) => ($(".pts", l).value = v));
      resumo();
    });
    $("#checklist", form).addEventListener("input", (e) => {
      if (e.target.matches(".pts")) caixa(e.target.closest(".score-line")).checked = true;
      resumo();
    });
    $("#checklist", form).addEventListener("change", resumo);
    resumo();
  }

  function campoPessoa(categoria, rotulo = "Colaborador(a)", bloqueados = new Map()) {
    const lista = pessoasAtivas(categoria);
    return `<label class="field"><span>${rotulo}</span><select name="pessoaId" required>
      <option value="">Selecione…</option>
      ${lista
        .map((p) => {
          const feito = bloqueados.has(p.id);
          return `<option value="${p.id}" ${feito ? "disabled" : state.pessoaPreSelecionada === p.id ? "selected" : ""}>${esc(nomeBonito(p.nome))}${feito ? " — já avaliado(a) neste ciclo" : ""}</option>`;
        })
        .join("")}
    </select></label>`;
  }

  function montarFormulario(form, tipo, evento = null) {
    const t = tipos[tipo];
    let corpo = "";
    const atv = TIPOS_COM_EVENTO.includes(tipo) && evento ? campoAtividade(evento) : null;

    if (["felicidade", "evento", "missao"].includes(tipo)) {
      corpo = `${atv.html}${campoParticipantes(atv.atual)}`;
    } else if (tipo === "indicacao") {
      corpo = `${campoData()}${campoPessoa("adv", "Advogado(a)")}
        <div class="field"><span>Pontuação</span><div class="static-value">Bônus de ${fmt(R.pontosIndicacao)} Savacoins</div></div>
        <label class="field field-full"><span>Descrição da indicação</span><textarea name="justificativa" rows="3" placeholder="Cliente/negócio indicado e sócio que validou"></textarea></label>`;
    } else if (tipo === "protagonista") {
      corpo = `${campoData()}${campoPessoa(null)}
        <label class="field field-full"><span>Por que é protagonista?</span><textarea name="justificativa" rows="3" required placeholder="Inovação, melhoria ou inspiração que motivou a indicação"></textarea></label>`;
    } else if (tipo === "avaliacao") {
      corpo = `${atv.html}${questionarioAvaliacao(form, evento)}`;
    }

    const titulos = {
      felicidade: ["Quem participou?", "Marque os participantes. O valor padrão vem do evento e pode ser ajustado por pessoa."],
      evento: ["Quem participou?", "Marque os participantes. O valor padrão vem do evento e pode ser ajustado por pessoa."],
      missao: ["Quem cumpriu a missão?", "Marque quem cumpriu. O valor padrão vem do evento e pode ser ajustado por pessoa."],
      avaliacao: ["Questionário de avaliação", "Escolha o colaborador e marque um nível em cada pergunta. A pontuação é somada automaticamente."],
    };
    const [titulo, subtitulo] = titulos[tipo] || [t.nome, t.desc];

    form.innerHTML = `
      <div class="card-head"><div><h2>${titulo}</h2><p class="muted">${subtitulo}</p></div></div>
      <div class="form-grid">${corpo}</div>
      <p class="form-error" id="formError" role="alert"></p>
      <div class="form-actions"><button type="submit" class="btn btn-gold">${tipo === "avaliacao" ? "Registrar avaliação" : "Registrar lançamento"}</button></div>`;

    if ($("#checklist", form)) ligarParticipantes(form);
    ligarData(form);
    if (tipo === "avaliacao" && atv) ligarQuestionario(form, tipo, evento);
    form.onsubmit = (e) => {
      e.preventDefault();
      enviarLancamento(form, tipo);
    };
  }

  // ---------------- Questionário de avaliação ----------------
  // Perguntas do modelo atual (editável pelo administrador) para o perfil avaliado.
  const perguntasAvaliacao = (cat) => R.perguntasDoModelo(S.modeloAvaliacao(), cat);

  // Colaborador avaliado: o coordenador vê primeiro a própria equipe; quem já foi avaliado no ciclo fica bloqueado.
  function campoAvaliado(evento) {
    const feitos = pontuadosNaAtividade(evento.id);
    const todos = pessoasAtivas();
    const u = state.usuario;
    const equipe = u.perfil === "lider" ? todos.filter((p) => p.coordenadorId === u.id) : [];
    const opcao = (p) => {
      const feito = feitos.has(p.id);
      return `<option value="${p.id}" ${feito ? "disabled" : state.pessoaPreSelecionada === p.id ? "selected" : ""}>${esc(nomeBonito(p.nome))}${feito ? " — já avaliado(a) neste ciclo" : ""}</option>`;
    };
    const grupo = (rotulo, lista) => (lista.length ? `<optgroup label="${rotulo}">${lista.map(opcao).join("")}</optgroup>` : "");
    const resto = todos.filter((p) => !equipe.includes(p));
    return `<label class="field field-wide"><span>Colaborador(a) avaliado(a)</span><select name="pessoaId" id="avaliado" required>
      <option value="">Escolha quem será avaliado…</option>
      ${grupo("Minha equipe", equipe)}
      ${grupo(R.categorias.adm, resto.filter((p) => p.categoria === "adm"))}
      ${grupo(R.categorias.adv, resto.filter((p) => p.categoria === "adv"))}
      ${grupo("Sem perfil definido", resto.filter((p) => !p.categoria))}
    </select></label>`;
  }

  function questionarioAvaliacao(form, evento) {
    const pessoa = state.pessoaPreSelecionada && S.listarPessoas().find((p) => p.id === state.pessoaPreSelecionada);
    const cat = pessoa ? pessoa.categoria || form.dataset.cat || "" : "";
    form.dataset.cat = cat;
    const cabeca = `
      ${campoAvaliado(evento)}
      <label class="field"><span>${cat === "adv" ? "Área de atuação" : "Setor"}</span><input name="area" placeholder="${cat === "adv" ? "Ex.: Trabalhista, Energisa PB" : "Ex.: Controladoria"}" value="${esc(pessoa?.setor || "")}" /></label>`;
    if (!pessoa) return `${cabeca}<div class="quiz-vazio field-full">${ico("avaliacao")}<p><b>Escolha o colaborador para abrir o questionário.</b><br>As perguntas aparecem de acordo com o perfil (Controladoria e Administrativo ou Advogados Associados).</p></div>`;

    const seletorPerfil = pessoa.categoria
      ? ""
      : `<div class="field field-full"><span>Este colaborador ainda não tem perfil. Qual questionário usar?</span>
          <div class="seg">${R.categoriasPontuaveis.map((c) => `<button type="button" data-cat="${c}" class="${cat === c ? "active" : ""}">${R.categorias[c]}</button>`).join("")}</div></div>`;
    if (!cat) return cabeca + seletorPerfil;

    const perguntas = perguntasAvaliacao(cat);
    const areas = S.modeloAvaliacao()[cat].areas.filter((a) => perguntas.some((q) => q.areaId === a.id));
    let n = 0;
    return `${cabeca}${seletorPerfil}
      <div class="field-full quiz">
        <div class="quiz-progresso" id="quizProg" aria-live="polite"></div>
        ${areas
          .map((a) => {
            const qs = perguntas.filter((q) => q.areaId === a.id);
            return `<section class="quiz-area" data-grupo="${a.grupo}">
              <header><div><small>${R.grupos[a.grupo]}</small><h3>${esc(a.nome)}</h3></div><span class="quiz-area-soma" data-area-soma="${esc(a.id)}"></span></header>
              ${qs
                .map((q) => {
                  n += 1;
                  return `<fieldset class="quiz-q" data-q="${esc(q.id)}" data-area="${esc(a.id)}">
                    <legend><span class="quiz-n">${n}</span><span class="quiz-enunciado"><b>${esc(q.texto)}</b>${q.descricao ? `<small>${esc(q.descricao)}</small>` : ""}</span></legend>
                    <div class="quiz-escala">
                      ${q.valores
                        .map((v, nivel) => `<label class="nivel-${nivel}"><input type="radio" name="n_${esc(q.id)}" value="${v}" /><span><i aria-hidden="true"></i><b>${R.rotulosNota[nivel]}</b><em>${fmt(v)} Savacoins</em></span></label>`)
                        .join("")}
                    </div>
                  </fieldset>`;
                })
                .join("")}
            </section>`;
          })
          .join("")}
      </div>
      <label class="field field-full"><span>Mensagem de feedback para o colaborador</span><textarea name="feedback" rows="3" placeholder="O que foi muito bem e o que pode melhorar no período"></textarea></label>
      <label class="field field-full"><span>Merece algum destaque especial? Descreva</span><textarea name="destaque" rows="2"></textarea></label>`;
  }

  function ligarQuestionario(form, tipo, evento) {
    $("#avaliado", form)?.addEventListener("change", (e) => {
      state.pessoaPreSelecionada = e.target.value || null;
      form.dataset.cat = "";
      montarFormulario(form, tipo, evento);
      $(".quiz-q", form)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    $$("[data-cat]", form).forEach((b) =>
      b.addEventListener("click", () => {
        form.dataset.cat = b.dataset.cat;
        montarFormulario(form, tipo, evento);
      }),
    );
    form.onchange = null;
    if (!$(".quiz", form)) return;
    // Ao responder, a pergunta fica marcada e a tela segue para a próxima ainda sem resposta.
    form.onchange = (e) => {
      const q = e.target.closest(".quiz-q");
      if (!q) return;
      const primeira = !q.classList.contains("ok");
      q.classList.add("ok");
      q.classList.remove("falta");
      resumoAvaliacao(form);
      if (primeira) {
        const proxima = $$(".quiz-q", form).find((x) => !x.classList.contains("ok"));
        proxima?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    resumoAvaliacao(form);
  }

  function lerNotas(form) {
    const notas = {};
    perguntasAvaliacao(form.dataset.cat).forEach((q) => {
      const marcado = $$(`input[type="radio"]`, form).find((i) => i.name === `n_${q.id}` && i.checked);
      if (marcado) notas[q.id] = Number(marcado.value);
    });
    return notas;
  }

  // Barra de progresso fixa: respondidas, Savacoins até agora e selos que a avaliação vai render.
  function resumoAvaliacao(form) {
    const perguntas = perguntasAvaliacao(form.dataset.cat);
    const notas = lerNotas(form);
    const respostas = perguntas.filter((q) => q.id in notas).map((q) => ({ grupo: q.grupo, valor: notas[q.id], max: q.max }));
    const feitas = respostas.length;
    const total = respostas.reduce((t, r) => t + r.valor, 0);
    const maximo = perguntas.reduce((t, q) => t + q.max, 0);
    const completo = feitas === perguntas.length;
    const selos = completo ? R.selosDaAvaliacao({ respostas: perguntas.map((q) => ({ grupo: q.grupo, valor: notas[q.id], max: q.max })) }) : [];
    $("#quizProg", form).innerHTML = `
      <div class="quiz-prog-txt"><b>${feitas} de ${perguntas.length}</b> respondidas</div>
      <div class="quiz-barra"><i style="width:${perguntas.length ? (feitas / perguntas.length) * 100 : 0}%"></i></div>
      <div class="quiz-prog-pts"><b>${fmt(total)}</b> <small>/ ${fmt(maximo)} Savacoins</small></div>
      ${selos.length ? `<div class="quiz-selos">${selos.map((s) => `<span>${R.selos.find((x) => x.id === s).nome}</span>`).join("")}</div>` : ""}`;
    $("#quizProg", form).classList.toggle("completo", completo);
    $$("[data-area-soma]", form).forEach((elSoma) => {
      const qs = perguntas.filter((q) => q.areaId === elSoma.dataset.areaSoma);
      elSoma.textContent = `${fmt(qs.reduce((t, q) => t + (notas[q.id] || 0), 0))} / ${fmt(qs.reduce((t, q) => t + q.max, 0))}`;
    });
  }

  // ---------------- Modelo de avaliação (editor do administrador) ----------------
  // Edita uma cópia (rascunho) e só grava ao clicar em "Salvar modelo". As avaliações já registradas
  // guardam as perguntas respondidas, então mudar o modelo vale só para as próximas.
  const novoId = (prefixo) => `${prefixo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  function renderModeloAvaliacao(el) {
    if (state.usuario.perfil !== "admin") {
      state.lanc.aberto = null;
      return renderLancamentos(el);
    }
    const ed = (state.modeloEd ||= { cat: "adm", rascunho: structuredClone(S.modeloAvaliacao()), alterado: false });
    const m = ed.rascunho[ed.cat];
    const perguntasDaArea = (id) => m.perguntas.filter((q) => q.areaId === id);
    const maxGrupo = (g) =>
      m.perguntas.filter((q) => m.areas.find((a) => a.id === q.areaId)?.grupo === g).reduce((t, q) => t + Math.max(0, ...q.valores.map(Number)), 0);
    let n = 0;

    el.innerHTML = `
      <div class="lanc-voltar"><button type="button" class="btn btn-ghost btn-sm" id="voltarLanc">← Voltar para lançamentos</button></div>
      <section class="ev-banner" style="--c:${tipos.avaliacao.cor}">
        <span class="ev-banner-ico">${tipos.avaliacao.icone}</span>
        <div class="ev-banner-txt"><small>Ciclo de avaliação</small><h2>Modelo do questionário</h2><p>Organize as perguntas por área. Cada área conta para o grupo Técnico ou Socioemocional (que definem os selos), e cada pergunta tem 4 níveis de resposta com os Savacoins de cada um.</p></div>
        <dl class="ev-banner-dados">
          <div><dt>Perguntas</dt><dd>${m.perguntas.length}</dd></div>
          <div><dt>Técnico (máx.)</dt><dd>${fmt(maxGrupo("tecnica"))}</dd></div>
          <div><dt>Socioemocional (máx.)</dt><dd>${fmt(maxGrupo("socio"))}</dd></div>
          <div><dt>Total (máx.)</dt><dd>${fmt(maxGrupo("tecnica") + maxGrupo("socio"))}</dd></div>
        </dl>
      </section>
      <div class="modelo-topo">
        <div class="seg" role="tablist">${R.categoriasPontuaveis.map((c) => `<button type="button" data-mcat="${c}" class="${ed.cat === c ? "active" : ""}">${R.categorias[c]}</button>`).join("")}</div>
        <span class="muted small">As mudanças valem para as próximas avaliações; as já registradas não mudam.</span>
      </div>
      <div id="modeloAreas">
        ${m.areas
          .map(
            (a, ia) => `<section class="card modelo-area" data-area="${esc(a.id)}">
              <header class="modelo-area-head">
                <input class="modelo-area-nome" data-campo="nome" value="${esc(a.nome)}" placeholder="Nome da área (ex.: Domínio técnico)" aria-label="Nome da área" />
                <select data-campo="grupo" aria-label="Grupo da área">${Object.entries(R.grupos).map(([g, nome]) => `<option value="${g}" ${a.grupo === g ? "selected" : ""}>${nome}</option>`).join("")}</select>
                <div class="row-actions">
                  ${ia ? btnIcone("subir", "Subir área", "data-area-subir", a.id) : ""}
                  ${btnExcluir("data-area-excluir", a.id)}
                </div>
              </header>
              <div class="modelo-perguntas">
                ${perguntasDaArea(a.id)
                  .map((q, iq) => {
                    n += 1;
                    return `<div class="modelo-q" data-q="${esc(q.id)}">
                      <span class="quiz-n">${n}</span>
                      <div class="modelo-q-corpo">
                        <input data-campo="texto" value="${esc(q.texto)}" placeholder="Pergunta (ex.: Entrega os trabalhos com qualidade técnica?)" aria-label="Texto da pergunta" />
                        <input data-campo="descricao" class="modelo-q-desc" value="${esc(q.descricao || "")}" placeholder="Orientação para quem avalia (opcional)" aria-label="Orientação da pergunta" />
                        <div class="modelo-valores">
                          ${q.valores.map((v, i) => `<label class="nivel-${i}"><span>${R.rotulosNota[i]}</span><input type="number" min="0" step="25" data-valor="${i}" value="${v}" /></label>`).join("")}
                        </div>
                      </div>
                      <div class="row-actions modelo-q-acoes">
                        ${iq ? btnIcone("subir", "Subir pergunta", "data-q-subir", q.id) : ""}
                        ${btnExcluir("data-q-excluir", q.id)}
                      </div>
                    </div>`;
                  })
                  .join("") || `<p class="muted small modelo-vazio">Nenhuma pergunta nesta área ainda.</p>`}
              </div>
              <button type="button" class="btn btn-ghost btn-sm" data-q-nova="${esc(a.id)}">+ Adicionar pergunta</button>
            </section>`,
          )
          .join("")}
      </div>
      <button type="button" class="btn btn-ghost modelo-nova-area" id="novaArea">+ Nova área</button>
      <div class="modelo-rodape">
        <button type="button" class="link-btn danger" id="modeloPadrao">Restaurar modelo padrão</button>
        <span class="modelo-status">${ed.alterado ? "Alterações não salvas" : "Tudo salvo"}</span>
        <button type="button" class="btn btn-ghost" id="modeloDescartar" ${ed.alterado ? "" : "disabled"}>Descartar</button>
        <button type="button" class="btn btn-gold" id="modeloSalvar" ${ed.alterado ? "" : "disabled"}>Salvar modelo</button>
      </div>`;

    const redesenhar = () => {
      ed.alterado = true;
      const y = window.scrollY;
      renderModeloAvaliacao(el);
      window.scrollTo({ top: y });
    };
    const marcarAlterado = () => {
      if (ed.alterado) return;
      ed.alterado = true;
      $(".modelo-status", el).textContent = "Alterações não salvas";
      $("#modeloSalvar", el).disabled = false;
      $("#modeloDescartar", el).disabled = false;
    };
    const sair = async () => {
      if (ed.alterado && !(await confirmar({ titulo: "Sair sem salvar?", mensagem: "As alterações no modelo serão descartadas.", acao: "Sair sem salvar", perigo: true }))) return;
      state.modeloEd = null;
      abrirLancamento(null);
    };
    $("#voltarLanc", el).addEventListener("click", sair);
    $$("[data-mcat]", el).forEach((b) => b.addEventListener("click", () => ((ed.cat = b.dataset.mcat), renderModeloAvaliacao(el))));

    // Digitação: atualiza o rascunho sem redesenhar (o cursor não pula).
    $("#modeloAreas", el).addEventListener("input", (e) => {
      const area = m.areas.find((a) => a.id === e.target.closest("[data-area]")?.dataset.area);
      const q = m.perguntas.find((x) => x.id === e.target.closest("[data-q]")?.dataset.q);
      if (q && e.target.dataset.valor != null) q.valores[Number(e.target.dataset.valor)] = Number(e.target.value);
      else if (q && e.target.dataset.campo) q[e.target.dataset.campo] = e.target.value;
      else if (area && e.target.dataset.campo) area[e.target.dataset.campo] = e.target.value;
      marcarAlterado();
    });
    $("#modeloAreas", el).addEventListener("change", (e) => {
      if (e.target.dataset.campo === "grupo" || e.target.dataset.valor != null) redesenhar(); // atualiza os totais
    });

    const mover = (lista, i) => i > 0 && ([lista[i - 1], lista[i]] = [lista[i], lista[i - 1]]);
    $$("[data-area-subir]", el).forEach((b) => b.addEventListener("click", () => (mover(m.areas, m.areas.findIndex((a) => a.id === b.dataset.areaSubir)), redesenhar())));
    $$("[data-q-subir]", el).forEach((b) =>
      b.addEventListener("click", () => {
        const q = m.perguntas.find((x) => x.id === b.dataset.qSubir);
        const irmas = m.perguntas.filter((x) => x.areaId === q.areaId);
        const anterior = irmas[irmas.indexOf(q) - 1];
        const i = m.perguntas.indexOf(q);
        const j = m.perguntas.indexOf(anterior);
        [m.perguntas[i], m.perguntas[j]] = [m.perguntas[j], m.perguntas[i]];
        redesenhar();
      }),
    );
    $$("[data-q-excluir]", el).forEach((b) =>
      b.addEventListener("click", () => {
        m.perguntas = m.perguntas.filter((q) => q.id !== b.dataset.qExcluir);
        redesenhar();
      }),
    );
    $$("[data-area-excluir]", el).forEach((b) =>
      b.addEventListener("click", async () => {
        const area = m.areas.find((a) => a.id === b.dataset.areaExcluir);
        const qtd = perguntasDaArea(area.id).length;
        if (qtd && !(await confirmar({ titulo: "Excluir área?", mensagem: `<b>${esc(area.nome || "Área sem nome")}</b> e suas ${qtd} pergunta(s) saem do modelo.`, acao: "Excluir", perigo: true }))) return;
        m.areas = m.areas.filter((a) => a.id !== area.id);
        m.perguntas = m.perguntas.filter((q) => q.areaId !== area.id);
        redesenhar();
      }),
    );
    $$("[data-q-nova]", el).forEach((b) =>
      b.addEventListener("click", () => {
        const ultima = perguntasDaArea(b.dataset.qNova).at(-1);
        m.perguntas.push({ id: novoId("q"), areaId: b.dataset.qNova, texto: "", descricao: "", valores: ultima ? [...ultima.valores] : [125, 250, 375, 500] });
        redesenhar();
        $$(`[data-area="${b.dataset.qNova}"] .modelo-q input[data-campo="texto"]`, el).at(-1)?.focus();
      }),
    );
    $("#novaArea", el).addEventListener("click", () => {
      m.areas.push({ id: novoId("a"), nome: "", grupo: "tecnica" });
      redesenhar();
      $$(".modelo-area-nome", el).at(-1)?.focus();
    });
    $("#modeloDescartar", el).addEventListener("click", () => {
      state.modeloEd = null;
      renderModeloAvaliacao(el);
    });
    $("#modeloPadrao", el).addEventListener("click", async () => {
      const sim = await confirmar({ titulo: "Restaurar modelo padrão?", mensagem: "As perguntas voltam a ser as do formulário 2026, nos dois perfis.", acao: "Restaurar", perigo: true });
      if (!sim) return;
      const r = await executar(() => S.salvarModeloAvaliacao(null, { restaurar: true }), { carregando: "Restaurando modelo…", concluido: "Modelo padrão restaurado" });
      if (r.ok) {
        state.modeloEd = null;
        renderModeloAvaliacao(el);
      }
    });
    $("#modeloSalvar", el).addEventListener("click", async () => {
      const r = await executar(() => S.salvarModeloAvaliacao(ed.rascunho), {
        carregando: "Salvando modelo…",
        concluido: "Modelo de avaliação salvo",
        detalhe: "As próximas avaliações já usam as novas perguntas.",
      });
      if (r.ok) {
        state.modeloEd = null;
        renderModeloAvaliacao(el);
      }
    });
  }

  async function enviarLancamento(form, tipo) {
    const erro = $("#formError", form);
    erro.textContent = "";
    const fd = new FormData(form);
    const avisos = [];
    let dados;
    let ano;

    if (TIPOS_COM_EVENTO.includes(tipo)) {
      const atv = S.listarAtividades().find((a) => a.id === fd.get("atividadeId"));
      if (!atv) return (erro.textContent = "Selecione o evento.");
      ano = atv.ano;
      dados = { tipo, atividadeId: atv.id };
    } else {
      const data = fd.get("data");
      if (!data) return (erro.textContent = "Informe a data.");
      ano = Number(data.slice(0, 4));
      if (String(ano) !== fd.get("anoJornada")) return (erro.textContent = `A data precisa ser de ${fd.get("anoJornada")}, o ano da Jornada escolhido.`);
      dados = { tipo, data, titulo: "" };
    }

    let qtd = 1;
    if (["felicidade", "evento", "missao"].includes(tipo)) {
      const pessoas = $$(".score-line", form)
        .filter((l) => $('input[type="checkbox"]', l).checked)
        .map((l) => ({ id: $('input[type="checkbox"]', l).value, pontos: Number($(".pts", l)?.value) }));
      if (!pessoas.length) return (erro.textContent = "Marque ao menos um participante.");
      if (pessoas.some((p) => !p.pontos || p.pontos < 1)) return (erro.textContent = "Informe os Savacoins de todos os participantes marcados.");
      dados.pessoas = pessoas;
      qtd = pessoas.length;

      const limite = tipo === "felicidade" ? R.maxFelicidadeAno : tipo === "evento" ? R.maxEventosAno : null;
      if (limite) {
        const acima = pessoas.filter((p) => somaNoAno(tipo, p.id, ano) + p.pontos > limite);
        if (acima.length) avisos.push(`${acima.length} pessoa(s) passariam do teto de ${fmt(limite)} Savacoins de ${tipos[tipo].nome.toLowerCase()} em ${ano}.`);
      }
    } else {
      dados.pessoaId = fd.get("pessoaId");
      if (!dados.pessoaId) return (erro.textContent = "Selecione o colaborador.");
      dados.justificativa = (fd.get("justificativa") || "").trim();
      if (tipo === "protagonista" && !dados.justificativa) return (erro.textContent = "Descreva o motivo da indicação.");
      if (tipo === "avaliacao") {
        dados.categoria = form.dataset.cat;
        if (!dados.categoria) return (erro.textContent = "Escolha qual questionário usar para este colaborador.");
        dados.notas = lerNotas(form);
        const faltam = $$(".quiz-q", form).filter((q) => !q.classList.contains("ok"));
        if (faltam.length) {
          faltam.forEach((q) => q.classList.add("falta"));
          faltam[0].scrollIntoView({ behavior: "smooth", block: "center" });
          return (erro.textContent = `Faltam ${faltam.length} pergunta(s) para responder.`);
        }
        dados.area = (fd.get("area") || "").trim();
        dados.feedback = (fd.get("feedback") || "").trim();
        dados.destaque = (fd.get("destaque") || "").trim();
      }
    }

    if (avisos.length && !(await confirmar({ titulo: "Atenção ao teto anual", mensagem: avisos.map(esc).join("<br>"), acao: "Registrar mesmo assim" }))) return;

    const nomePessoa = dados.pessoaId ? nomeBonito(S.listarPessoas().find((p) => p.id === dados.pessoaId)?.nome || "") : "";
    const evento = dados.atividadeId ? S.listarAtividades().find((a) => a.id === dados.atividadeId) : null;
    const r = await executar(() => S.registrarLancamento(dados), {
      carregando: "Registrando lançamento…",
      concluido: "Lançamento concluído",
      detalhe: `${tipos[tipo].nome}${evento ? ` · ${esc(evento.titulo)}` : ""}<br><b>${qtd > 1 ? `${qtd} pessoas pontuadas` : esc(nomePessoa) || "Registrado"}</b> na Jornada ${ano}`,
    });
    if (!r.ok) return (erro.textContent = r.erro.message);
    state.pessoaPreSelecionada = null;
    state.ano = ano;
    render();
  }

  // ---------------- Histórico ----------------
  // Com { atividadeId }, mostra só o que foi lançado naquele evento (tela aberta pelo olho), sem filtros.
  function renderHistorico(el, opcoes = {}) {
    const u = state.usuario;
    const doEvento = opcoes.atividadeId || null;
    const pessoas = new Map(S.listarPessoas().map((p) => [p.id, p]));
    const todos = S.listarLancamentos()
      .filter((l) => (doEvento ? l.atividadeId === doEvento : state.hist.todosAnos || l.ano === state.ano))
      .sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm));
    const f = state.hist;
    const lista = todos.filter((l) => {
      if (doEvento) return true;
      if (f.tipo !== "all" && l.tipo !== f.tipo) return false;
      if (f.busca) {
        const q = S.normalizar(f.busca);
        const nomes = (l.pessoaIds || [l.pessoaId]).map((id) => pessoas.get(id)?.nome || "").join(" ");
        if (!S.normalizar(`${nomes} ${l.titulo || ""} ${l.autorNome}`).includes(q)) return false;
      }
      return true;
    });

    el.innerHTML = `
      <div class="card">
        <div class="card-head">
          <div><h2>${doEvento ? `Já lançados neste evento · ${fmt(lista.length)}` : `${fmt(lista.length)} lançamento(s)`}</h2><p class="muted">${doEvento ? "Para corrigir um lançamento, exclua e registre de novo." : `Registros gravados no sistema ${state.hist.todosAnos ? "em todos os anos" : `em ${state.ano}`}.`}</p></div>
          ${doEvento ? "" : `<div class="filters">
            <select id="hAno" class="year-select" aria-label="Ano da Jornada"><option value="all" ${state.hist.todosAnos ? "selected" : ""}>Todos os anos</option>${S.anosDisponiveis()
              .map((a) => `<option value="${a}" ${!state.hist.todosAnos && a === state.ano ? "selected" : ""}>Jornada ${a}</option>`)
              .join("")}</select>
            <input type="search" id="hBusca" placeholder="Pessoa, título ou autor" value="${esc(f.busca)}" />
            <select id="hTipo"><option value="all">Todos os tipos</option>${Object.entries(tipos).map(([id, t]) => `<option value="${id}" ${f.tipo === id ? "selected" : ""}>${t.nome}</option>`).join("")}</select>
          </div>`}
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Data</th><th>Tipo</th><th>Pessoa(s)</th><th class="num">Savacoins</th><th>Registrado por</th><th></th></tr></thead>
            <tbody>
              ${lista
                .map((l) => {
                  const podeExcluir = u.perfil !== "lider" || l.autorId === u.id;
                  const nomes = (l.pessoaIds || [l.pessoaId]).map((id) => nomeBonito(pessoas.get(id)?.nome || "Removido"));
                  return `<tr>
                    <td>${dataBr(l.data)}</td>
                    <td><span class="type-tag" style="--c:${tipos[l.tipo].cor}">${tipos[l.tipo].icone} ${tipos[l.tipo].nome}</span>${l.tipo === "avaliacao" ? `<small>${avaliacoesNoAno(l.pessoaId, l.ano).findIndex((x) => x.id === l.id) + 1}ª avaliação do ano</small>` : ""}${l.titulo ? `<small>${esc(l.titulo)}</small>` : ""}</td>
                    <td>${nomes.length > 2 ? `<span title="${esc(nomes.join(", "))}">${esc(nomes.slice(0, 2).join(", "))} +${nomes.length - 2}</span>` : esc(nomes.join(", "))}
                      ${l.feedback ? `<small class="clip">“${esc(l.feedback)}”</small>` : ""}${l.justificativa ? `<small class="clip">${esc(l.justificativa)}</small>` : ""}</td>
                    <td class="num">${l.pontos ? `${fmt(l.pontos)}${l.pessoaIds?.length > 1 ? `<small>por pessoa</small>` : ""}` : "Selo"}</td>
                    <td>${esc(l.autorNome)}<small>${new Date(l.criadoEm).toLocaleString("pt-BR")}</small></td>
                    <td><div class="row-actions">${podeExcluir ? btnExcluir("data-excluir", l.id) : ""}</div></td>
                  </tr>`;
                })
                .join("") || `<tr><td colspan="6" class="empty">Nenhum lançamento encontrado.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;

    $("#hBusca", el)?.addEventListener("change", (e) => ((f.busca = e.target.value), renderHistorico(el)));
    $("#hTipo", el)?.addEventListener("change", (e) => ((f.tipo = e.target.value), renderHistorico(el)));
    $("#hAno", el)?.addEventListener("change", (e) => {
      state.hist.todosAnos = e.target.value === "all";
      if (!state.hist.todosAnos) state.ano = Number(e.target.value);
      renderHistorico(el);
    });
    $$("[data-excluir]", el).forEach((b) =>
      b.addEventListener("click", async () => {
        const l = S.listarLancamentos().find((x) => x.id === b.dataset.excluir);
        const sim = await confirmar({
          titulo: "Excluir lançamento?",
          mensagem: `<b>${l ? tipos[l.tipo].nome : ""}${l?.titulo ? ` · ${esc(l.titulo)}` : ""}</b><br>${l ? `${esc(resumoPessoas(l))} · ${dataBr(l.data)}` : ""}`,
          detalhe: "A pontuação será removida do ranking e do painel. Esta ação não pode ser desfeita.",
          acao: "Excluir",
          perigo: true,
        });
        if (!sim) return;
        const r = await executar(() => S.excluirLancamento(b.dataset.excluir), { carregando: "Excluindo lançamento…", concluido: "Lançamento excluído", detalhe: "Ranking e painel atualizados." });
        if (r.ok) render();
      }),
    );
  }

  // ---------------- Pessoas ----------------
  function renderPessoas(el) {
    const lista = S.listarPessoas().sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome));
    const coordPorId = new Map(S.listarCoordenadores().map((c) => [c.id, c]));
    el.innerHTML = `
      <div class="card">
        <div class="card-head">
          <div><h2>${lista.filter((p) => p.ativo).length} colaboradores ativos</h2><p class="muted">Pessoas que participam da Jornada e recebem pontuação.</p></div>
          <button class="btn btn-gold" id="novaPessoa">+ Novo colaborador</button>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Foto</th><th>Nome</th><th>Perfil</th><th>Setor / área</th><th>Coordenador</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${lista
                .map(
                  (p) => `<tr class="${p.ativo ? "" : "inactive"}">
                  <td>${S.fotoUrl(p) ? `<img class="pessoa-foto" src="${S.fotoUrl(p)}" alt="" loading="lazy" />` : `<span class="avatar sm">${esc(iniciais(p.nome))}</span>`}</td>
                  <td><strong>${esc(nomeBonito(p.nome))}</strong></td>
                  <td>${R.categorias[p.categoria] || `<span class="warn">Definir perfil</span>`}</td>
                  <td>${esc(p.setor || "—")}</td>
                  <td>${coordPorId.get(p.coordenadorId) ? esc(coordPorId.get(p.coordenadorId).nome) : "—"}</td>
                  <td><span class="status ${p.ativo ? "on" : ""}">${p.ativo ? "Ativo" : "Inativo"}</span></td>
                  <td><div class="row-actions">${btnEditar("data-editar", p.id)}${state.usuario.perfil === "admin" ? btnExcluir("data-excluir-pessoa", p.id) : ""}</div></td>
                </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>`;
    $("#novaPessoa", el).addEventListener("click", () => formPessoa());
    $$("[data-excluir-pessoa]", el).forEach((b) => b.addEventListener("click", () => excluirPessoa(b.dataset.excluirPessoa)));
    $$("[data-editar]", el).forEach((b) => b.addEventListener("click", () => formPessoa(S.listarPessoas().find((p) => p.id === b.dataset.editar))));
  }

  // Exclusão definitiva (só administrador). Avisa quantos lançamentos com pontos da pessoa serão afetados.
  async function excluirPessoa(id) {
    const p = S.listarPessoas().find((x) => x.id === id);
    if (!p) return;
    const lancs = S.listarLancamentos().filter((l) => l.pessoaId === id || l.pessoaIds?.includes(id));
    const nome = nomeBonito(p.nome);
    const sim = await confirmar({
      titulo: "Excluir colaborador?",
      mensagem: `<b>${esc(nome)}</b> será removido(a) da Jornada. Esta ação não pode ser desfeita.`,
      detalhe: lancs.length
        ? `Esta pessoa tem <b>${lancs.length} lançamento(s)</b> com pontos, que também serão apagados. Para só tirar da Jornada mantendo o histórico, use <b>Editar</b> e desmarque “ativo”.`
        : "",
      acao: "Excluir",
      perigo: true,
    });
    if (!sim) return;
    const r = await executar(() => S.excluirPessoa(id), { carregando: "Excluindo colaborador…", concluido: "Colaborador excluído", detalhe: esc(nome) });
    if (r.ok) render();
  }

  // A redução da foto (mantendo a transparência) fica na camada de dados, compartilhada com a apresentação.
  const prepararFoto = (arquivo) => S.prepararFoto(arquivo);

  function formPessoa(p = {}) {
    const coordenadores = S.listarCoordenadores().filter((c) => c.ativo || c.id === p.coordenadorId);
    const temCoordenador = (cat) => R.categoriasPontuaveis.includes(cat);
    abrirModal(
      p.id ? "Editar colaborador" : "Novo colaborador",
      `<form class="form-grid" id="pessoaForm" novalidate>
        <div class="field field-full"><span>Foto (aparece na apresentação do resultado)</span>
          <div class="foto-linha">
            <div class="foto-prev" id="fotoPrev">${S.fotoUrl(p) ? `<img src="${S.fotoUrl(p)}" alt="" />` : `<b>${esc(iniciais(p.nome || "?"))}</b>`}</div>
            <div class="foto-acoes">
              <div class="foto-botoes">
                <label class="btn btn-ghost btn-sm">${S.fotoUrl(p) ? "Trocar foto" : "Escolher foto"}<input type="file" id="fotoArq" accept="image/png,image/webp,image/jpeg" hidden /></label>
                <button type="button" class="link-btn danger" id="fotoRemover" ${S.fotoUrl(p) ? "" : "hidden"}>Remover foto</button>
              </div>
              <small class="foto-tamanho" id="fotoTamanho"></small>
              <small class="muted">De preferência PNG com fundo transparente. A imagem é reduzida automaticamente antes de enviar.</small>
            </div>
          </div>
        </div>
        <label class="field field-full"><span>Nome completo</span><input name="nome" required value="${esc(p.nome ? nomeBonito(p.nome) : "")}" /></label>
        <label class="field"><span>Perfil</span><select name="categoria" required>
          <option value="">Selecione…</option>
          ${Object.entries(R.categorias).filter(([id]) => R.categoriasPontuaveis.includes(id) || p.categoria === id).map(([id, n]) => `<option value="${id}" ${p.categoria === id ? "selected" : ""}>${n}</option>`).join("")}
        </select></label>
        <label class="field"><span>Setor / área de atuação</span><input name="setor" value="${esc(p.setor || "")}" /></label>
        <label class="field field-full"><span>Coordenador (opcional)</span><select name="coordenadorId">
          <option value="">Sem coordenador</option>
          ${coordenadores.map((c) => `<option value="${esc(c.id)}" ${p.coordenadorId === c.id ? "selected" : ""}>${esc(c.nome)}${c.ativo ? "" : " (bloqueado)"}</option>`).join("")}
        </select>${coordenadores.length ? "" : `<small class="muted">Nenhum coordenador cadastrado ainda. Cadastre em Equipe e acessos, com o perfil “Coordenador”.</small>`}</label>
        ${p.id ? `<label class="check-line field-full"><input type="checkbox" name="ativo" ${p.ativo ? "checked" : ""} /> Participa da jornada (ativo)</label>` : ""}
        <p class="form-error field-full" id="pfErro"></p>
        <div class="form-actions field-full"><button class="btn btn-ghost" type="button" data-close>Cancelar</button><button class="btn btn-gold" type="submit">Salvar</button></div>
      </form>`,
    );
    let novaFoto = null;
    let tirarFoto = false;
    const mostrarTamanho = (texto) => ($("#fotoTamanho").textContent = texto || "");
    // Tamanho da foto já salva (o navegador reaproveita a imagem em cache).
    if (S.fotoUrl(p)) {
      fetch(S.fotoUrl(p), { credentials: "same-origin" })
        .then((r) => (r.ok ? r.blob() : null))
        .then((b) => b && !novaFoto && !tirarFoto && mostrarTamanho(`Foto atual: ${tamanhoKb(b.size)}`))
        .catch(() => {});
    }
    $("#fotoArq").addEventListener("change", async (e) => {
      const arquivo = e.target.files?.[0];
      if (!arquivo) return;
      try {
        novaFoto = await prepararFoto(arquivo);
      } catch (err) {
        return ($("#pfErro").textContent = err.message);
      }
      tirarFoto = false;
      $("#fotoPrev").innerHTML = `<img src="${novaFoto}" alt="" />`;
      $("#fotoRemover").hidden = false;
      mostrarTamanho(`Original: ${tamanhoKb(arquivo.size)} → reduzida: ${tamanhoKb(bytesDoDataUrl(novaFoto))}`);
    });
    $("#fotoRemover").addEventListener("click", () => {
      novaFoto = null;
      tirarFoto = true;
      $("#fotoPrev").innerHTML = `<b>${esc(iniciais(p.nome || "?"))}</b>`;
      $("#fotoRemover").hidden = true;
      mostrarTamanho("");
    });
    $("#pessoaForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      if (!fd.get("nome").trim() || !fd.get("categoria")) return ($("#pfErro").textContent = "Preencha nome e perfil.");
      const r = await executar(
        async () => {
          const categoria = fd.get("categoria");
          const coordenadorId = temCoordenador(categoria) ? fd.get("coordenadorId") || null : null;
          const salvo = await S.salvarPessoa({ id: p.id, nome: fd.get("nome"), categoria, setor: fd.get("setor"), coordenadorId, ativo: p.id ? fd.get("ativo") === "on" : true });
          if (novaFoto) await S.salvarFoto(salvo.id, novaFoto);
          else if (tirarFoto && p.id) await S.removerFoto(p.id);
          return salvo;
        },
        { carregando: "Salvando colaborador…", concluido: p.id ? "Colaborador atualizado" : "Colaborador cadastrado", detalhe: esc(fd.get("nome")) },
      );
      if (!r.ok) return ($("#pfErro").textContent = r.erro.message);
      fecharModal();
      render();
    });
  }

  // ---------------- Equipe ----------------
  function renderEquipe(el) {
    const lista = S.listarUsuarios();
    el.innerHTML = `
      <div class="card">
        <div class="card-head">
          <div><h2>Equipe de acompanhamento</h2><p class="muted">Quem pode acessar o sistema e registrar pontuações.</p></div>
          <button class="btn btn-gold" id="novoUsuario">+ Novo acesso</button>
        </div>
        <div class="roles">
          <div><b>Administrador</b><small>Tudo, inclusive equipe e acessos.</small></div>
          <div><b>RH</b><small>Presenças, eventos, missões, indicações, avaliações e cadastro de colaboradores.</small></div>
          <div><b>Coordenador</b><small>Avaliações dos colaboradores ao longo do ano.</small></div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Área</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${lista
                .map(
                  (u) => `<tr class="${u.ativo ? "" : "inactive"}">
                  <td><span class="avatar sm">${esc(iniciais(u.nome))}</span><strong>${esc(u.nome)}</strong></td>
                  <td>${esc(u.email)}</td>
                  <td>${perfis[u.perfil]?.nome || u.perfil}</td>
                  <td>${esc(u.area || "—")}</td>
                  <td><span class="status ${u.ativo ? "on" : ""}">${u.ativo ? "Ativo" : "Bloqueado"}</span></td>
                  <td><div class="row-actions">${btnEditar("data-editar", u.id)}</div></td>
                </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>`;
    $("#novoUsuario", el).addEventListener("click", () => formUsuario());
    $$("[data-editar]", el).forEach((b) => b.addEventListener("click", () => formUsuario(lista.find((u) => u.id === b.dataset.editar))));
  }

  function formUsuario(u = {}) {
    abrirModal(
      u.id ? "Editar acesso" : "Novo acesso",
      `<form class="form-grid" id="userForm" novalidate>
        <label class="field"><span>Nome</span><input name="nome" required value="${esc(u.nome || "")}" /></label>
        <label class="field"><span>E-mail</span><input type="email" name="email" required value="${esc(u.email || "")}" /></label>
        <label class="field"><span>Perfil</span><select name="perfil">${Object.entries(perfis).map(([id, p]) => `<option value="${id}" ${u.perfil === id ? "selected" : ""}>${p.nome}</option>`).join("")}</select></label>
        <label class="field"><span>Área / equipe</span><input name="area" value="${esc(u.area || "")}" placeholder="Ex.: Trabalhista" /></label>
        <label class="field field-full"><span>${u.id ? "Nova senha (deixe em branco para manter)" : "Senha inicial"}</span><input type="text" name="senha" minlength="6" autocomplete="new-password" /></label>
        <label class="check-line field-full"><input type="checkbox" name="trocarSenha" checked /> Pedir troca de senha no próximo acesso</label>
        ${u.id ? `<label class="check-line field-full"><input type="checkbox" name="ativo" ${u.ativo ? "checked" : ""} /> Acesso ativo</label>` : ""}
        <p class="form-error field-full" id="ufErro"></p>
        <div class="form-actions field-full"><button class="btn btn-ghost" type="button" data-close>Cancelar</button><button class="btn btn-gold" type="submit">Salvar</button></div>
      </form>`,
    );
    $("#userForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const senha = fd.get("senha");
      if (!fd.get("nome").trim() || !fd.get("email").trim()) return ($("#ufErro").textContent = "Preencha nome e e-mail.");
      if (senha && senha.length < 6) return ($("#ufErro").textContent = "A senha precisa de pelo menos 6 caracteres.");
      const r = await executar(
        () =>
          S.salvarUsuario({
            id: u.id,
            nome: fd.get("nome"),
            email: fd.get("email"),
            perfil: fd.get("perfil"),
            area: fd.get("area"),
            senha,
            trocarSenha: fd.get("trocarSenha") === "on",
            ativo: u.id ? fd.get("ativo") === "on" : true,
          }),
        { carregando: "Salvando acesso…", concluido: u.id ? "Acesso atualizado" : "Acesso criado", detalhe: esc(fd.get("email")) },
      );
      if (!r.ok) return ($("#ufErro").textContent = r.erro.message);
      fecharModal();
      render();
    });
  }

  function abrirTrocaSenha(obrigatoria) {
    abrirModal(
      obrigatoria ? "Defina sua nova senha" : "Alterar senha",
      `<form class="form-grid" id="senhaForm" novalidate>
        ${obrigatoria ? `<p class="muted field-full">Por segurança, troque a senha inicial antes de continuar.</p>` : ""}
        <label class="field field-full"><span>Nova senha</span><input type="password" name="s1" minlength="6" required autocomplete="new-password" /></label>
        <label class="field field-full"><span>Confirme a senha</span><input type="password" name="s2" minlength="6" required autocomplete="new-password" /></label>
        <p class="form-error field-full" id="sfErro"></p>
        <div class="form-actions field-full">${obrigatoria ? "" : `<button class="btn btn-ghost" type="button" data-close>Cancelar</button>`}<button class="btn btn-gold" type="submit">Salvar senha</button></div>
      </form>`,
      obrigatoria,
    );
    $("#senhaForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      if (fd.get("s1").length < 6) return ($("#sfErro").textContent = "Use pelo menos 6 caracteres.");
      if (fd.get("s1") !== fd.get("s2")) return ($("#sfErro").textContent = "As senhas não conferem.");
      try {
        await S.trocarSenha(fd.get("s1"));
      } catch (err) {
        return ($("#sfErro").textContent = err.message);
      }
      state.usuario = S.usuarioAtual();
      fecharModal();
      toast("Senha atualizada.");
    });
  }

  // ---------------- Utilitários de UI ----------------
  function abrirModal(titulo, html, travado = false) {
    $("#modalTitle").textContent = titulo;
    $("#modalBody").innerHTML = html;
    const modal = $("#modal");
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    if (travado) modal.dataset.locked = "1";
    else delete modal.dataset.locked;
    $$("button[data-close]", modal).forEach((b) => (b.hidden = travado));
    setTimeout(() => $("#modalBody input, #modalBody select")?.focus(), 50);
  }

  function fecharModal() {
    const modal = $("#modal");
    if (modal.dataset.locked && state.usuario?.trocarSenha) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    delete modal.dataset.locked;
  }

  // ---------------- Janela de status (centro da tela) ----------------
  // confirmar(): pergunta antes de uma ação (ex.: excluir). executar(): mostra "carregando" enquanto
  // grava no banco e depois "concluído" (ou o erro), para o resultado ficar bem visível.
  const ICONE_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const ICONE_LIXO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';
  const ICONE_ALERTA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8v5M12 16.5v.5"/><path d="M10.3 3.9L2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';
  let statusTimer;

  function janelaStatus() {
    let el = $("#statusOverlay");
    if (!el) {
      el = document.createElement("div");
      el.id = "statusOverlay";
      el.className = "status-overlay";
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "true");
      el.setAttribute("aria-live", "assertive");
      document.body.appendChild(el);
    }
    clearTimeout(statusTimer);
    return el;
  }

  function fecharStatus() {
    clearTimeout(statusTimer);
    $("#statusOverlay")?.classList.remove("open");
  }

  function confirmar({ titulo, mensagem, detalhe = "", acao = "Confirmar", perigo = false }) {
    return new Promise((resolve) => {
      const el = janelaStatus();
      el.innerHTML = `<div class="status-card">
        <span class="status-icon ${perigo ? "is-danger" : "is-warn"}">${perigo ? ICONE_LIXO : ICONE_ALERTA}</span>
        <h3>${titulo}</h3>
        <p>${mensagem}</p>
        ${detalhe ? `<p class="status-detail">${detalhe}</p>` : ""}
        <div class="status-actions">
          <button type="button" class="btn btn-ghost" data-resposta="nao">Cancelar</button>
          <button type="button" class="btn ${perigo ? "btn-danger" : "btn-gold"}" data-resposta="sim">${acao}</button>
        </div>
      </div>`;
      el.classList.add("open");
      const fim = (sim) => {
        document.removeEventListener("keydown", tecla, true);
        fecharStatus();
        resolve(sim);
      };
      const tecla = (e) => {
        if (e.key !== "Escape") return;
        e.stopPropagation();
        fim(false);
      };
      document.addEventListener("keydown", tecla, true);
      $$("[data-resposta]", el).forEach((b) => b.addEventListener("click", () => fim(b.dataset.resposta === "sim")));
      // Numa exclusão, o foco começa em "Cancelar" para um Enter distraído não apagar nada.
      $(`[data-resposta="${perigo ? "nao" : "sim"}"]`, el).focus();
    });
  }

  async function executar(acao, { carregando, concluido, detalhe = "" }) {
    const el = janelaStatus();
    el.innerHTML = `<div class="status-card">
      <span class="status-spinner" aria-hidden="true"></span>
      <h3>${carregando}</h3>
      <p>Aguarde, gravando no banco de dados…</p>
    </div>`;
    el.classList.add("open");
    const inicio = Date.now();
    try {
      const resultado = await acao();
      // Deixa o "carregando" visível por um instante, mesmo quando o servidor responde muito rápido.
      await new Promise((r) => setTimeout(r, Math.max(0, 700 - (Date.now() - inicio))));
      const texto = typeof detalhe === "function" ? detalhe(resultado) : detalhe;
      el.innerHTML = `<div class="status-card">
        <span class="status-icon is-ok">${ICONE_OK}</span>
        <h3>${concluido}</h3>
        ${texto ? `<p>${texto}</p>` : ""}
        <div class="status-actions"><button type="button" class="btn btn-gold" data-fechar>OK</button></div>
      </div>`;
      $("[data-fechar]", el).addEventListener("click", fecharStatus);
      $("[data-fechar]", el).focus();
      statusTimer = setTimeout(fecharStatus, 2600);
      return { ok: true, resultado };
    } catch (err) {
      el.innerHTML = `<div class="status-card">
        <span class="status-icon is-danger">${ICONE_ALERTA}</span>
        <h3>Não foi possível concluir</h3>
        <p>${esc(err.message)}</p>
        <div class="status-actions"><button type="button" class="btn btn-ghost" data-fechar>Fechar</button></div>
      </div>`;
      $("[data-fechar]", el).addEventListener("click", fecharStatus);
      $("[data-fechar]", el).focus();
      return { ok: false, erro: err };
    }
  }

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
  }

  function resumoPessoas(l) {
    const pessoas = S.listarPessoas();
    if (l.pessoaIds) return l.pessoaIds.length === 1 ? nomeBonito(pessoas.find((p) => p.id === l.pessoaIds[0])?.nome) : `${l.pessoaIds.length} pessoas`;
    return nomeBonito(pessoas.find((p) => p.id === l.pessoaId)?.nome || "");
  }

  function iniciais(nome) {
    const partes = String(nome || "?").trim().split(/\s+/);
    return ((partes[0]?.[0] || "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
  }

  function nomeBonito(nome) {
    const minusculas = new Set(["de", "da", "do", "das", "dos", "e"]);
    return String(nome || "")
      .toLowerCase()
      .split(" ")
      .map((p, i) => (i > 0 && minusculas.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
      .join(" ");
  }
})();
