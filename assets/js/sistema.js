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

  const perfis = {
    admin: { nome: "Administrador", tipos: ["felicidade", "evento", "avaliacao", "indicacao", "missao"] },
    rh: { nome: "RH", tipos: ["felicidade", "evento", "avaliacao", "indicacao", "missao"] },
    lider: { nome: "Líder avaliador", tipos: ["avaliacao"] },
  };

  const tipos = {
    felicidade: { nome: "Programa de Felicidade", desc: "Presença nos encontros (575 Savacoins por encontro).", cor: "#9d2824", icone: "♥" },
    evento: { nome: "Evento institucional", desc: "Frequência em eventos (até 700 Savacoins no bimestre).", cor: "#3a3c39", icone: "◆" },
    avaliacao: { nome: "Avaliação do líder", desc: "Técnica e socioemocional (ADM) ou competências (ADV).", cor: "#1e66b2", icone: "★" },
    indicacao: { nome: "Indicação de negócio", desc: "Informada pelos sócios — 500 Savacoins (ADV).", cor: "#2f7a5b", icone: "↗" },
    missao: { nome: "Missão secreta", desc: "Missões divulgadas previamente pelo RH.", cor: "#7c2ba8", icone: "✦" },
    protagonista: { nome: "Selo Sou Protagonista", desc: "Indicação do líder por inovação, melhoria ou inspiração.", cor: "#b08a3e", icone: "◎" },
  };

  const pilares = [
    { id: "felicidade", nome: "Felicidade", cor: "#c0504d" },
    { id: "eventos", nome: "Eventos", cor: "#6b6d68" },
    { id: "avaliacao", nome: "Avaliação", cor: "#d4b26f" },
    { id: "extras", nome: "Extras", cor: "#7c5cc4" },
  ];

  const views = {
    visao: { nome: "Visão geral", kicker: "Acompanhamento em tempo real", render: renderVisao },
    painel: { nome: "Painel da Jornada", kicker: "Ranking, destaque e selos ao vivo", render: renderPainel },
    lancar: { nome: "Novo lançamento", kicker: "Registrar pontuação", render: renderLancar },
    historico: { nome: "Lançamentos", kicker: "Histórico do ano", render: renderHistorico },
    pessoas: { nome: "Colaboradores", kicker: "Pessoas avaliadas", render: renderPessoas, perfis: ["admin", "rh"] },
    equipe: { nome: "Equipe e acessos", kicker: "Administração", render: renderEquipe, perfis: ["admin"] },
  };

  const state = { usuario: null, view: "visao", filtros: { busca: "", area: "all" }, hist: { tipo: "all", bimestre: "all", busca: "" }, tipoLancamento: null };

  document.addEventListener("DOMContentLoaded", async () => {
    await S.garantirDb();
    state.usuario = S.usuarioAtual();
    if (!state.usuario) return location.replace("login.html");

    const hash = location.hash.slice(1);
    if (views[hash] && podeVer(hash)) state.view = hash;

    montarShell();
    render();
    if (state.usuario.trocarSenha) abrirTrocaSenha(true);

    S.ouvir(() => {
      state.usuario = S.usuarioAtual();
      if (!state.usuario) return location.replace("login.html");
      if (!$("#modal").classList.contains("open") && !["lancar", "painel"].includes(state.view)) render();
    });
  });

  // ---------------- Shell ----------------
  function podeVer(view) {
    return !views[view].perfis || views[view].perfis.includes(state.usuario.perfil);
  }

  function montarShell() {
    const u = state.usuario;
    $("#sideUser").innerHTML = `
      <span class="avatar">${esc(iniciais(u.nome))}</span>
      <div><strong>${esc(u.nome)}</strong><small>${perfis[u.perfil].nome}</small></div>
      <button class="link-btn" type="button" id="trocarSenhaBtn" title="Alterar senha">Senha</button>`;
    $("#trocarSenhaBtn").addEventListener("click", () => abrirTrocaSenha(false));

    $("#sideNav").innerHTML = Object.entries(views)
      .filter(([id]) => podeVer(id))
      .map(([id, v]) => `<button type="button" data-view="${id}">${v.nome}</button>`)
      .join("");
    $("#sideNav").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-view]");
      if (!btn) return;
      irPara(btn.dataset.view);
    });

    $("#logoutBtn").addEventListener("click", () => {
      S.sair();
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

    const bim = R.bimestreDaData(hojeIso());
    $("#bimestreChip").textContent = bim ? `${bim.nome} · premiação em ${bim.premiacao.toLowerCase()}` : "Período sem pontuação";
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
    $("#content").classList.toggle("content-full", state.view === "painel");
    v.render($("#content"));
  }

  // ---------------- Painel (ranking oficial, alimentado pelos lançamentos) ----------------
  function renderPainel(el) {
    if ($("#painelFrame", el)) return;
    el.innerHTML = `<iframe id="painelFrame" class="painel-frame" src="painel.html" title="Painel da Jornada SAVA"></iframe>`;
  }

  // ---------------- Visão geral ----------------
  function renderVisao(el) {
    const ano = R.anoAtual;
    const linhas = S.calcularAno(ano);
    const bimAtual = R.bimestreDaData(hojeIso());
    const lancs = S.listarLancamentos().filter((l) => l.ano === ano);
    const doBim = bimAtual ? lancs.filter((l) => l.bimestre === bimAtual.id) : [];
    const avaliados = new Set(doBim.filter((l) => l.tipo === "avaliacao").map((l) => l.pessoaId));
    const avaliaveis = linhas.filter((l) => l.pessoa.categoria);
    const pendentes = avaliaveis.filter((l) => !avaliados.has(l.pessoa.id));
    const totalCoins = linhas.reduce((t, l) => t + l.score, 0);
    const cobertura = avaliaveis.length ? Math.round(((avaliaveis.length - pendentes.length) / avaliaveis.length) * 100) : 0;

    const filtradas = linhas.filter((l) => {
      if (state.filtros.area !== "all" && l.pessoa.categoria !== state.filtros.area) return false;
      return !state.filtros.busca || S.normalizar(l.pessoa.nome).includes(S.normalizar(state.filtros.busca));
    });

    const porNivel = R.niveis.filter((n) => n.min !== null).map((n) => ({ n, qtd: linhas.filter((l) => l.nivel.slug === n.slug).length }));
    const maxNivel = Math.max(1, ...porNivel.map((x) => x.qtd));

    el.innerHTML = `
      <section class="kpis">
        ${kpi("Colaboradores na jornada", fmt(linhas.length), `${linhas.filter((l) => l.pessoa.categoria === "adv").length} ADV · ${linhas.filter((l) => l.pessoa.categoria === "adm").length} ADM`)}
        ${kpi(`Savacoins em ${ano}`, fmt(totalCoins), `${fmt(lancs.length)} lançamentos no sistema`)}
        ${kpi("Lançamentos no bimestre", fmt(doBim.length), bimAtual ? bimAtual.nome : "Fora do período")}
        ${kpi("Cobertura de avaliações", `${cobertura}%`, `${pendentes.length} pendente(s) no bimestre`, cobertura)}
      </section>

      <section class="grid-main">
        <div class="card">
          <div class="card-head">
            <div><h2>Ranking ao vivo · ${ano}</h2><p class="muted">Base das planilhas + lançamentos do sistema. Clique para ver o progresso.</p></div>
            <div class="filters">
              <input type="search" id="fBusca" placeholder="Buscar pessoa" value="${esc(state.filtros.busca)}" />
              <select id="fArea">
                <option value="all">Todas as áreas</option>
                <option value="adv" ${state.filtros.area === "adv" ? "selected" : ""}>Advogados Associados</option>
                <option value="adm" ${state.filtros.area === "adm" ? "selected" : ""}>Controladoria e Adm.</option>
              </select>
            </div>
          </div>
          <div class="legend">${pilares.map((p) => `<span><i style="background:${p.cor}"></i>${p.nome}</span>`).join("")}</div>
          <div class="table-wrap">
            <table class="table ranking">
              <thead><tr><th>#</th><th>Nome</th><th>Nível</th><th>Composição</th><th class="num">Savacoins</th><th>Selos</th></tr></thead>
              <tbody>
                ${filtradas
                  .map((l) => {
                    const pos = linhas.indexOf(l) + 1;
                    return `
                  <tr data-pessoa="${l.pessoa.id}" tabindex="0">
                    <td><span class="pos pos-${pos <= 3 ? pos : "n"}">${pos}</span></td>
                    <td><strong>${esc(nomeBonito(l.pessoa.nome))}</strong><small>${R.categorias[l.pessoa.categoria] || "Sem área"}</small></td>
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
        </div>

        <div class="stack">
          <div class="card">
            <div class="card-head"><h2>Pendências do bimestre</h2><span class="chip">${pendentes.length}</span></div>
            <p class="muted small">Colaboradores ainda sem avaliação ${bimAtual ? `no ${bimAtual.nome}` : ""}.</p>
            <ul class="mini-list">
              ${pendentes
                .slice(0, 8)
                .map(
                  (l) => `<li><span>${esc(nomeBonito(l.pessoa.nome))}<small>${l.pessoa.categoria === "adv" ? "ADV" : "ADM"}</small></span>
                  ${perfis[state.usuario.perfil].tipos.includes("avaliacao") ? `<button class="link-btn" data-avaliar="${l.pessoa.id}">Avaliar</button>` : ""}</li>`,
                )
                .join("") || `<li class="ok">Todas as avaliações em dia ✓</li>`}
            </ul>
            ${pendentes.length > 8 ? `<p class="muted small">+ ${pendentes.length - 8} pessoa(s)</p>` : ""}
          </div>

          <div class="card">
            <div class="card-head"><h2>Distribuição por nível</h2></div>
            <div class="levels-bars">
              ${porNivel
                .map(
                  ({ n, qtd }) => `<div class="lv-row"><span>${n.nome}</span><div class="lv-track"><i class="level-bg-${n.slug}" style="width:${(qtd / maxNivel) * 100}%"></i></div><b>${qtd}</b></div>`,
                )
                .join("")}
            </div>
          </div>

          <div class="card">
            <div class="card-head"><h2>Atividade recente</h2></div>
            <ul class="activity">
              ${[...lancs]
                .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
                .slice(0, 6)
                .map((l) => `<li><span class="type-dot" style="background:${tipos[l.tipo].cor}">${tipos[l.tipo].icone}</span><div><strong>${tipos[l.tipo].nome}</strong><small>${esc(resumoPessoas(l))} · ${esc(l.autorNome)} · ${dataBr(l.data)}</small></div></li>`)
                .join("") || `<li class="muted small">Nenhum lançamento ainda. Os registros feitos aqui aparecem no painel em tempo real.</li>`}
            </ul>
          </div>
        </div>
      </section>`;

    $("#fBusca", el).addEventListener("input", (e) => {
      state.filtros.busca = e.target.value;
      const pos = e.target.selectionStart;
      renderVisao(el);
      const input = $("#fBusca", el);
      input.focus();
      input.setSelectionRange(pos, pos);
    });
    $("#fArea", el).addEventListener("change", (e) => {
      state.filtros.area = e.target.value;
      renderVisao(el);
    });
    el.querySelector("tbody").addEventListener("click", (e) => {
      const tr = e.target.closest("[data-pessoa]");
      if (tr) abrirPessoa(tr.dataset.pessoa);
    });
    el.querySelector("tbody").addEventListener("keydown", (e) => {
      const tr = e.target.closest("[data-pessoa]");
      if (tr && e.key === "Enter") abrirPessoa(tr.dataset.pessoa);
    });
    $$("[data-avaliar]", el).forEach((b) =>
      b.addEventListener("click", () => irPara("lancar", { tipoLancamento: "avaliacao", pessoaPreSelecionada: b.dataset.avaliar })),
    );
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
    const linhas = S.calcularAno(R.anoAtual);
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
        <div><span>Savacoins ${R.anoAtual}</span><strong>${fmt(l.score)}</strong></div>
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
        <p class="muted small">Inclui a base importada das planilhas (até 07/2026) e os lançamentos do sistema.</p>
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

  // ---------------- Lançamentos ----------------
  function renderLancar(el) {
    const permitidos = perfis[state.usuario.perfil].tipos;
    if (!state.tipoLancamento || !permitidos.includes(state.tipoLancamento)) state.tipoLancamento = permitidos[0];

    el.innerHTML = `
      <section class="type-picker">
        ${permitidos
          .map(
            (t) => `<button type="button" class="type-card ${t === state.tipoLancamento ? "active" : ""}" data-tipo="${t}" style="--c:${tipos[t].cor}">
              <span class="type-dot">${tipos[t].icone}</span><strong>${tipos[t].nome}</strong><small>${tipos[t].desc}</small></button>`,
          )
          .join("")}
      </section>
      <form class="card form-card" id="lancForm" novalidate></form>`;

    $$(".type-card", el).forEach((b) =>
      b.addEventListener("click", () => {
        state.tipoLancamento = b.dataset.tipo;
        state.pessoaPreSelecionada = null;
        renderLancar(el);
      }),
    );
    montarFormulario($("#lancForm", el), state.tipoLancamento);
  }

  function pessoasAtivas(categoria) {
    return S.listarPessoas()
      .filter((p) => p.ativo && (!categoria || p.categoria === categoria))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  function campoData() {
    return `<label class="field"><span>Data</span><input type="date" name="data" required value="${hojeIso()}" /></label>`;
  }

  function campoChecklist() {
    const lista = pessoasAtivas();
    return `
      <div class="field field-full">
        <span>Participantes <em id="selCount">0 selecionado(s)</em></span>
        <div class="checklist-tools">
          <input type="search" id="ckBusca" placeholder="Filtrar nomes" />
          <button type="button" class="link-btn" id="ckTodos">Marcar visíveis</button>
          <button type="button" class="link-btn" id="ckNenhum">Limpar</button>
        </div>
        <div class="checklist" id="checklist">
          ${lista.map((p) => `<label data-nome="${esc(S.normalizar(p.nome))}"><input type="checkbox" name="pessoas" value="${p.id}" /><span>${esc(nomeBonito(p.nome))}</span><small>${p.categoria === "adv" ? "ADV" : p.categoria === "adm" ? "ADM" : ""}</small></label>`).join("")}
        </div>
      </div>`;
  }

  function campoPessoa(categoria, rotulo = "Colaborador(a)") {
    const lista = pessoasAtivas(categoria);
    return `<label class="field"><span>${rotulo}</span><select name="pessoaId" required>
      <option value="">Selecione…</option>
      ${lista.map((p) => `<option value="${p.id}" ${state.pessoaPreSelecionada === p.id ? "selected" : ""}>${esc(nomeBonito(p.nome))}</option>`).join("")}
    </select></label>`;
  }

  function montarFormulario(form, tipo) {
    const t = tipos[tipo];
    let corpo = "";
    if (tipo === "felicidade") {
      corpo = `${campoData()}
        <label class="field"><span>Encontro</span><input name="titulo" placeholder="Ex.: Café da felicidade" /></label>
        <div class="field"><span>Pontuação por pessoa</span><div class="static-value">${fmt(R.pontosPorEncontroFelicidade)} Savacoins</div></div>
        ${campoChecklist()}`;
    } else if (tipo === "evento") {
      corpo = `${campoData()}
        <label class="field"><span>Nome do evento</span><input name="titulo" required placeholder="Ex.: Aniversariante do Mês" /></label>
        <label class="field"><span>Savacoins por pessoa</span><input type="number" name="pontos" min="1" max="${R.maxEventosBimestre}" step="25" required value="350" /></label>
        ${campoChecklist()}`;
    } else if (tipo === "missao") {
      corpo = `${campoData()}
        <label class="field"><span>Missão</span><input name="titulo" required placeholder="Nome da missão secreta" /></label>
        <label class="field"><span>Savacoins por pessoa</span><input type="number" name="pontos" min="1" step="25" required value="200" /></label>
        ${campoChecklist()}`;
    } else if (tipo === "indicacao") {
      corpo = `${campoData()}${campoPessoa("adv", "Advogado(a)")}
        <div class="field"><span>Pontuação</span><div class="static-value">${fmt(R.pontosIndicacao)} Savacoins</div></div>
        <label class="field field-full"><span>Descrição da indicação</span><textarea name="justificativa" rows="3" placeholder="Cliente/negócio indicado e sócio que validou"></textarea></label>`;
    } else if (tipo === "protagonista") {
      corpo = `${campoData()}${campoPessoa(null)}
        <label class="field field-full"><span>Por que é protagonista?</span><textarea name="justificativa" rows="3" required placeholder="Inovação, melhoria ou inspiração que motivou a indicação"></textarea></label>`;
    } else if (tipo === "avaliacao") {
      const pre = state.pessoaPreSelecionada && S.listarPessoas().find((p) => p.id === state.pessoaPreSelecionada);
      const cat = form.dataset.cat || pre?.categoria || "adm";
      form.dataset.cat = cat;
      corpo = `
        <div class="field field-full"><span>Perfil avaliado</span>
          <div class="seg">
            <button type="button" data-cat="adm" class="${cat === "adm" ? "active" : ""}">Controladoria e Administrativo</button>
            <button type="button" data-cat="adv" class="${cat === "adv" ? "active" : ""}">Advogados Associados</button>
          </div>
        </div>
        ${campoPessoa(cat)}${campoData()}
        <label class="field"><span>${cat === "adv" ? "Área de atuação" : "Setor"}</span><input name="area" placeholder="${cat === "adv" ? "Ex.: Trabalhista, Energisa PB" : "Ex.: Controladoria"}" value="${esc(pre?.setor || "")}" /></label>
        <div class="field field-full criteria">
          ${R.criterios[cat]
            .map(
              (c) => `
            <fieldset class="criterion">
              <legend>${c.nome}<small>${c.grupo === "tecnica" ? "Técnico" : "Socioemocional"} · até ${fmt(c.max)}</small></legend>
              <div class="options">
                ${c.opcoes.map((o) => `<label><input type="radio" name="n_${c.id}" value="${o.valor}" required /><span><b>${fmt(o.valor)}</b>${o.rotulo}</span></label>`).join("")}
              </div>
            </fieldset>`,
            )
            .join("")}
        </div>
        <div class="field field-full eval-summary" id="evalSummary"></div>
        <label class="field field-full"><span>Mensagem de feedback para o colaborador</span><textarea name="feedback" rows="3"></textarea></label>
        <label class="field field-full"><span>Merece algum destaque especial? Descreva</span><textarea name="destaque" rows="2"></textarea></label>`;
    }

    form.innerHTML = `
      <div class="card-head"><div><h2>${t.nome}</h2><p class="muted">${t.desc}</p></div></div>
      <div class="form-grid">${corpo}</div>
      <p class="form-error" id="formError" role="alert"></p>
      <div class="form-actions"><button type="submit" class="btn btn-gold">Registrar lançamento</button></div>`;

    if ($("#checklist", form)) ligarChecklist(form);
    if (tipo === "avaliacao") {
      $$("[data-cat]", form).forEach((b) =>
        b.addEventListener("click", () => {
          form.dataset.cat = b.dataset.cat;
          state.pessoaPreSelecionada = null;
          montarFormulario(form, tipo);
        }),
      );
      const atualizar = () => resumoAvaliacao(form);
      form.addEventListener("change", atualizar);
      atualizar();
    }
    form.onsubmit = (e) => {
      e.preventDefault();
      enviarLancamento(form, tipo);
    };
  }

  function ligarChecklist(form) {
    const atualizarContagem = () => ($("#selCount", form).textContent = `${$$('input[name="pessoas"]:checked', form).length} selecionado(s)`);
    $("#ckBusca", form).addEventListener("input", (e) => {
      const q = S.normalizar(e.target.value);
      $$("#checklist label", form).forEach((l) => (l.hidden = q && !l.dataset.nome.includes(q)));
    });
    $("#ckTodos", form).addEventListener("click", () => {
      $$("#checklist label:not([hidden]) input", form).forEach((i) => (i.checked = true));
      atualizarContagem();
    });
    $("#ckNenhum", form).addEventListener("click", () => {
      $$("#checklist input", form).forEach((i) => (i.checked = false));
      atualizarContagem();
    });
    $("#checklist", form).addEventListener("change", atualizarContagem);
  }

  function lerNotas(form) {
    const cat = form.dataset.cat;
    const notas = {};
    R.criterios[cat].forEach((c) => {
      const marcado = $(`input[name="n_${c.id}"]:checked`, form);
      if (marcado) notas[c.id] = Number(marcado.value);
    });
    return notas;
  }

  function resumoAvaliacao(form) {
    const cat = form.dataset.cat;
    const notas = lerNotas(form);
    const grupo = (g) => R.criterios[cat].filter((c) => c.grupo === g);
    const soma = (g) => grupo(g).reduce((t, c) => t + (notas[c.id] || 0), 0);
    const max = (g) => grupo(g).reduce((t, c) => t + c.max, 0);
    const completos = Object.keys(notas).length === R.criterios[cat].length;
    const selos = completos ? R.selosDaAvaliacao(cat, notas) : [];
    $("#evalSummary", form).innerHTML = `
      <div class="sum-item"><span>Técnico</span><b>${fmt(soma("tecnica"))} / ${fmt(max("tecnica"))}</b></div>
      <div class="sum-item"><span>Socioemocional</span><b>${fmt(soma("socio"))} / ${fmt(max("socio"))}</b></div>
      <div class="sum-item total"><span>Total do lançamento</span><b>${fmt(soma("tecnica") + soma("socio"))} Savacoins</b></div>
      <div class="sum-item"><span>Selos</span><b>${selos.length ? selos.map((s) => R.selos.find((x) => x.id === s).nome).join(", ") : "—"}</b></div>`;
  }

  async function enviarLancamento(form, tipo) {
    const erro = $("#formError", form);
    erro.textContent = "";
    const fd = new FormData(form);
    const data = fd.get("data");
    if (!data) return (erro.textContent = "Informe a data.");
    const bim = R.bimestreDaData(data);
    if (!bim) return (erro.textContent = "Dezembro e janeiro são meses sem pontuação na Jornada SAVA.");

    const dados = { tipo, data, titulo: (fd.get("titulo") || "").trim() };
    const lancsBim = S.listarLancamentos().filter((l) => l.ano === Number(data.slice(0, 4)) && l.bimestre === bim.id);
    const avisos = [];

    if (["felicidade", "evento", "missao"].includes(tipo)) {
      dados.pessoaIds = fd.getAll("pessoas");
      if (!dados.pessoaIds.length) return (erro.textContent = "Selecione ao menos um participante.");
      dados.pontos = tipo === "felicidade" ? R.pontosPorEncontroFelicidade : Number(fd.get("pontos"));
      if (!dados.pontos || dados.pontos < 1) return (erro.textContent = "Informe a pontuação.");
      if (tipo !== "felicidade" && !dados.titulo) return (erro.textContent = "Informe o nome.");

      const limite = tipo === "felicidade" ? R.maxFelicidadeCiclo : tipo === "evento" ? R.maxEventosBimestre : null;
      if (limite) {
        const acima = dados.pessoaIds.filter((id) => {
          const ja = lancsBim.filter((l) => l.tipo === tipo && l.pessoaIds?.includes(id)).reduce((t, l) => t + l.pontos, 0);
          return ja + dados.pontos > limite;
        });
        if (acima.length) avisos.push(`${acima.length} pessoa(s) ultrapassariam o limite de ${fmt(limite)} Savacoins de ${tipos[tipo].nome.toLowerCase()} no ${bim.nome}.`);
      }
    } else {
      dados.pessoaId = fd.get("pessoaId");
      if (!dados.pessoaId) return (erro.textContent = "Selecione o colaborador.");
      dados.justificativa = (fd.get("justificativa") || "").trim();
      if (tipo === "indicacao") dados.pontos = R.pontosIndicacao;
      if (tipo === "protagonista" && !dados.justificativa) return (erro.textContent = "Descreva o motivo da indicação.");
      if (tipo === "avaliacao") {
        dados.categoria = form.dataset.cat;
        dados.notas = lerNotas(form);
        if (Object.keys(dados.notas).length < R.criterios[dados.categoria].length) return (erro.textContent = "Preencha a nota de todos os critérios.");
        dados.area = (fd.get("area") || "").trim();
        dados.feedback = (fd.get("feedback") || "").trim();
        dados.destaque = (fd.get("destaque") || "").trim();
        dados.pontos = Object.values(dados.notas).reduce((a, b) => a + b, 0);
        if (lancsBim.some((l) => l.tipo === "avaliacao" && l.pessoaId === dados.pessoaId)) {
          avisos.push(`Esta pessoa já tem avaliação registrada no ${bim.nome}.`);
        }
      }
    }

    if (avisos.length && !confirm(`${avisos.join("\n")}\n\nDeseja registrar mesmo assim?`)) return;

    await S.registrarLancamento(dados, state.usuario);
    state.pessoaPreSelecionada = null;
    toast(`${tipos[tipo].nome} registrado. Painel atualizado.`);
    renderLancar($("#content"));
  }

  // ---------------- Histórico ----------------
  function renderHistorico(el) {
    const u = state.usuario;
    const pessoas = new Map(S.listarPessoas().map((p) => [p.id, p]));
    const todos = S.listarLancamentos()
      .filter((l) => l.ano === R.anoAtual)
      .sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm));
    const f = state.hist;
    const lista = todos.filter((l) => {
      if (f.tipo !== "all" && l.tipo !== f.tipo) return false;
      if (f.bimestre !== "all" && String(l.bimestre) !== f.bimestre) return false;
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
          <div><h2>${fmt(lista.length)} lançamento(s)</h2><p class="muted">Registros feitos pelo sistema em ${R.anoAtual}.</p></div>
          <div class="filters">
            <input type="search" id="hBusca" placeholder="Pessoa, título ou autor" value="${esc(f.busca)}" />
            <select id="hTipo"><option value="all">Todos os tipos</option>${Object.entries(tipos).map(([id, t]) => `<option value="${id}" ${f.tipo === id ? "selected" : ""}>${t.nome}</option>`).join("")}</select>
            <select id="hBim"><option value="all">Todos os bimestres</option>${R.bimestres.map((b) => `<option value="${b.id}" ${f.bimestre === String(b.id) ? "selected" : ""}>${b.nome}</option>`).join("")}</select>
          </div>
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
                    <td>${dataBr(l.data)}<small>${R.bimestres.find((b) => b.id === l.bimestre)?.nome || ""}</small></td>
                    <td><span class="type-tag" style="--c:${tipos[l.tipo].cor}">${tipos[l.tipo].icone} ${tipos[l.tipo].nome}</span>${l.titulo ? `<small>${esc(l.titulo)}</small>` : ""}</td>
                    <td>${nomes.length > 2 ? `<span title="${esc(nomes.join(", "))}">${esc(nomes.slice(0, 2).join(", "))} +${nomes.length - 2}</span>` : esc(nomes.join(", "))}
                      ${l.feedback ? `<small class="clip">“${esc(l.feedback)}”</small>` : ""}${l.justificativa ? `<small class="clip">${esc(l.justificativa)}</small>` : ""}</td>
                    <td class="num">${l.pontos ? `${fmt(l.pontos)}${l.pessoaIds?.length > 1 ? `<small>por pessoa</small>` : ""}` : "Selo"}</td>
                    <td>${esc(l.autorNome)}<small>${new Date(l.criadoEm).toLocaleString("pt-BR")}</small></td>
                    <td>${podeExcluir ? `<button class="link-btn danger" data-excluir="${l.id}">Excluir</button>` : ""}</td>
                  </tr>`;
                })
                .join("") || `<tr><td colspan="6" class="empty">Nenhum lançamento encontrado.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;

    $("#hBusca", el).addEventListener("change", (e) => ((f.busca = e.target.value), renderHistorico(el)));
    $("#hTipo", el).addEventListener("change", (e) => ((f.tipo = e.target.value), renderHistorico(el)));
    $("#hBim", el).addEventListener("change", (e) => ((f.bimestre = e.target.value), renderHistorico(el)));
    $$("[data-excluir]", el).forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Excluir este lançamento? A pontuação será removida do painel.")) return;
        await S.excluirLancamento(b.dataset.excluir);
        toast("Lançamento excluído.");
        renderHistorico(el);
      }),
    );
  }

  // ---------------- Pessoas ----------------
  function renderPessoas(el) {
    const lista = S.listarPessoas().sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome));
    el.innerHTML = `
      <div class="card">
        <div class="card-head">
          <div><h2>${lista.filter((p) => p.ativo).length} colaboradores ativos</h2><p class="muted">Pessoas que participam da Jornada e recebem pontuação.</p></div>
          <button class="btn btn-gold" id="novaPessoa">+ Novo colaborador</button>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Nome</th><th>Perfil</th><th>Setor / área</th><th>Origem</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${lista
                .map(
                  (p) => `<tr class="${p.ativo ? "" : "inactive"}">
                  <td><strong>${esc(nomeBonito(p.nome))}</strong></td>
                  <td>${R.categorias[p.categoria] || `<span class="warn">Definir perfil</span>`}</td>
                  <td>${esc(p.setor || "—")}</td>
                  <td>${p.origem === "base" ? "Planilha 2026" : "Sistema"}</td>
                  <td><span class="status ${p.ativo ? "on" : ""}">${p.ativo ? "Ativo" : "Inativo"}</span></td>
                  <td><button class="link-btn" data-editar="${p.id}">Editar</button></td>
                </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>`;
    $("#novaPessoa", el).addEventListener("click", () => formPessoa());
    $$("[data-editar]", el).forEach((b) => b.addEventListener("click", () => formPessoa(S.listarPessoas().find((p) => p.id === b.dataset.editar))));
  }

  function formPessoa(p = {}) {
    abrirModal(
      p.id ? "Editar colaborador" : "Novo colaborador",
      `<form class="form-grid" id="pessoaForm" novalidate>
        <label class="field field-full"><span>Nome completo</span><input name="nome" required value="${esc(p.nome ? nomeBonito(p.nome) : "")}" /></label>
        <label class="field"><span>Perfil</span><select name="categoria" required>
          <option value="">Selecione…</option>
          ${Object.entries(R.categorias).map(([id, n]) => `<option value="${id}" ${p.categoria === id ? "selected" : ""}>${n}</option>`).join("")}
        </select></label>
        <label class="field"><span>Setor / área de atuação</span><input name="setor" value="${esc(p.setor || "")}" /></label>
        ${p.id ? `<label class="check-line field-full"><input type="checkbox" name="ativo" ${p.ativo ? "checked" : ""} /> Participa da jornada (ativo)</label>` : ""}
        <p class="form-error field-full" id="pfErro"></p>
        <div class="form-actions field-full"><button class="btn btn-ghost" type="button" data-close>Cancelar</button><button class="btn btn-gold" type="submit">Salvar</button></div>
      </form>`,
    );
    $("#pessoaForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      if (!fd.get("nome").trim() || !fd.get("categoria")) return ($("#pfErro").textContent = "Preencha nome e perfil.");
      try {
        await S.salvarPessoa({ id: p.id, nome: fd.get("nome"), categoria: fd.get("categoria"), setor: fd.get("setor"), ativo: p.id ? fd.get("ativo") === "on" : true });
        fecharModal();
        toast("Colaborador salvo.");
        render();
      } catch (err) {
        $("#pfErro").textContent = err.message;
      }
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
          <div><b>Líder avaliador</b><small>Avaliações bimestrais dos colaboradores.</small></div>
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
                  <td><button class="link-btn" data-editar="${u.id}">Editar</button></td>
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
      try {
        await S.salvarUsuario({
          id: u.id,
          nome: fd.get("nome"),
          email: fd.get("email"),
          perfil: fd.get("perfil"),
          area: fd.get("area"),
          senha,
          trocarSenha: fd.get("trocarSenha") === "on",
          ativo: u.id ? fd.get("ativo") === "on" : true,
        });
        fecharModal();
        toast("Acesso salvo.");
        render();
      } catch (err) {
        $("#ufErro").textContent = err.message;
      }
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
      const u = state.usuario;
      await S.salvarUsuario({ ...u, senha: fd.get("s1"), trocarSenha: false });
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
