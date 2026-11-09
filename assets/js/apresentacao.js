// Apresentação do resultado do ano (aba "Apresentação" do sistema).
// Uma sequência de cenas em tela cheia: abertura → números → níveis → selos → destaques →
// suspense → vencedor. Navegação por setas/espaço, pontos de progresso e botão de tela cheia.
(function () {
  const R = window.SAVA_REGRAS;
  const S = window.SAVA_STORE;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const fmt = (n) => Number(n || 0).toLocaleString("pt-BR");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const reduzMovimento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CHAVE_PREMIO = "jornada-sava-premio";

  const CENAS = [
    { id: "abertura", nome: "Abertura" },
    { id: "numeros", nome: "O ano em números" },
    { id: "niveis", nome: "Níveis" },
    { id: "selos", nome: "Selos" },
    { id: "destaques", nome: "Destaques" },
    { id: "suspense", nome: "Suspense" },
    { id: "vencedor", nome: "Vencedor" },
  ];

  const st = { ano: null, cena: -1, premio: "" };
  let raiz = null;
  let teclasLigadas = false;

  function nomeBonito(nome) {
    const minusculas = new Set(["de", "da", "do", "das", "dos", "e"]);
    return String(nome || "")
      .toLowerCase()
      .split(" ")
      .map((p, i) => (i > 0 && minusculas.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
      .join(" ");
  }

  function iniciais(nome) {
    const partes = String(nome || "?").trim().split(/\s+/);
    return ((partes[0]?.[0] || "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
  }

  function lerPremio() {
    try {
      return localStorage.getItem(CHAVE_PREMIO) || "Viagem com acompanhante";
    } catch {
      return "Viagem com acompanhante";
    }
  }

  function salvarPremio(valor) {
    try {
      localStorage.setItem(CHAVE_PREMIO, valor);
    } catch {}
  }

  // ---------- Dados do ano ----------
  function dadosDoAno(ano) {
    const linhas = S.calcularAno(ano);
    const lancs = S.listarLancamentos().filter((l) => l.ano === ano);
    const atividades = S.listarAtividades().filter((a) => a.ano === ano);
    const total = linhas.reduce((t, l) => t + l.score, 0);
    const pontuados = linhas.filter((l) => l.score > 0);
    const avaliados = new Set(lancs.filter((l) => l.tipo === "avaliacao").map((l) => l.pessoaId));
    linhas.forEach((l) => l.base.tecnica + l.base.socio + l.base.competencias > 0 && avaliados.add(l.pessoa.id));
    const somaArea = (cat) => linhas.filter((l) => l.pessoa.categoria === cat).reduce((t, l) => t + l.score, 0);
    const niveis = R.niveis.filter((n) => n.min !== null).map((n) => ({ n, qtd: linhas.filter((l) => l.nivel.slug === n.slug).length }));
    const selos = R.selos.map((s) => ({ ...s, pessoas: linhas.filter((l) => l.selos.has(s.id)) }));
    const topo = linhas[0]?.score || 0;
    return {
      ano,
      linhas,
      total,
      pessoas: linhas.length,
      pontuados: pontuados.length,
      media: pontuados.length ? Math.round(total / pontuados.length) : 0,
      avaliados: avaliados.size,
      encontros: atividades.filter((a) => a.tipo === "felicidade").length,
      eventos: atividades.filter((a) => a.tipo === "evento").length,
      missoes: atividades.filter((a) => a.tipo === "missao").length,
      lancamentos: lancs.length,
      totalAdm: somaArea("adm"),
      totalAdv: somaArea("adv"),
      niveis,
      selos,
      totalSelos: selos.reduce((t, s) => t + s.pessoas.length, 0),
      vencedores: topo > 0 ? linhas.filter((l) => l.score === topo) : [],
      destaques: topo > 0 ? linhas.filter((l) => l.score !== topo && l.score > 0).slice(0, 4) : [],
    };
  }

  // ---------- Estrutura ----------
  function render(el, ctx = {}) {
    raiz = el;
    if (!st.ano) st.ano = ctx.ano || S.anoVigente();
    if (!st.premio) st.premio = lerPremio();
    ligarTeclas();
    if (st.cena < 0) return renderInicio();
    renderPalco();
  }

  function renderInicio() {
    const anos = S.anosDisponiveis();
    const d = dadosDoAno(st.ano);
    raiz.innerHTML = `
      <section class="apre apre-inicio">
        ${fundo()}
        <div class="apre-inicio-box">
          <img class="apre-simbolo-sm" src="assets/logo/sava-simbolo.png" alt="" />
          <p class="apre-kicker">Apresentação do resultado</p>
          <h2>Jornada SAVA</h2>
          <p class="apre-sub">Escolha o ano e inicie. Use as setas do teclado (ou os botões) para avançar entre as cenas.</p>
          <div class="apre-form">
            <label><span>Ano</span>
              <select id="apreAno">${anos.map((a) => `<option value="${a}" ${a === st.ano ? "selected" : ""}>Jornada ${a}</option>`).join("")}</select>
            </label>
            <label><span>Prêmio do vencedor</span>
              <input id="aprePremio" value="${esc(st.premio)}" maxlength="80" placeholder="Ex.: Viagem com acompanhante" />
            </label>
          </div>
          <p class="apre-resumo">${d.pontuados ? `${fmt(d.pessoas)} colaboradores · ${fmt(d.total)} Savacoins · ${fmt(d.totalSelos)} selos` : "Este ano ainda não tem pontuação."}</p>
          <div class="apre-acoes">
            <button type="button" class="apre-btn apre-btn-ouro" id="apreIniciar">Iniciar apresentação</button>
            <button type="button" class="apre-btn" id="apreIniciarCheia">Iniciar em tela cheia</button>
          </div>
        </div>
        ${rodape()}
      </section>`;
    $("#apreAno", raiz).addEventListener("change", (e) => {
      st.ano = Number(e.target.value);
      renderInicio();
    });
    $("#aprePremio", raiz).addEventListener("input", (e) => {
      st.premio = e.target.value;
      salvarPremio(st.premio);
    });
    $("#apreIniciar", raiz).addEventListener("click", () => irCena(0));
    $("#apreIniciarCheia", raiz).addEventListener("click", () => {
      irCena(0);
      telaCheia(true);
    });
  }

  function fundo(intenso = false) {
    return `<div class="apre-fundo ${intenso ? "intenso" : ""}" aria-hidden="true">
      <span class="fumaca f1"></span><span class="fumaca f2"></span><span class="fumaca f3"></span><span class="fumaca f4"></span>
      <span class="vinheta"></span>
    </div>`;
  }

  function rodape() {
    return `<footer class="apre-assinatura" aria-hidden="true">
      <span class="apre-marca-txt">JORNADA <b>SAVA</b></span>
      <span class="apre-sep"></span>
      <img src="assets/logo/sava-logo.png" alt="" />
      <small>Programa de reconhecimento de talentos</small>
    </footer>`;
  }

  function renderPalco() {
    const d = dadosDoAno(st.ano);
    const cena = CENAS[st.cena];
    const intenso = ["suspense", "vencedor"].includes(cena.id);
    raiz.innerHTML = `
      <section class="apre apre-palco cena-${cena.id}" id="aprePalco" tabindex="-1">
        ${fundo(intenso)}
        <header class="apre-topo">
          <span class="apre-marca-txt">JORNADA <b>SAVA</b></span>
          <span class="apre-ano-tag">Resultado ${st.ano}</span>
        </header>
        <div class="apre-cena" id="apreCena">${montarCena(cena.id, d)}</div>
        <nav class="apre-nav" aria-label="Navegação da apresentação">
          <button type="button" class="apre-nav-btn" data-nav="sair" title="Voltar ao início (Esc)" aria-label="Voltar ao início">✕</button>
          <button type="button" class="apre-nav-btn" data-nav="ant" title="Anterior (←)" aria-label="Cena anterior" ${st.cena === 0 ? "disabled" : ""}>‹</button>
          <div class="apre-dots">${CENAS.map((c, i) => `<button type="button" class="${i === st.cena ? "on" : ""}" data-ir="${i}" title="${c.nome}" aria-label="${c.nome}"></button>`).join("")}</div>
          <button type="button" class="apre-nav-btn" data-nav="prox" title="Próxima (→ ou espaço)" aria-label="Próxima cena" ${st.cena === CENAS.length - 1 ? "disabled" : ""}>›</button>
          <button type="button" class="apre-nav-btn" data-nav="cheia" title="Tela cheia (F)" aria-label="Tela cheia">⛶</button>
        </nav>
        ${cena.id === "vencedor" ? "" : rodape()}
      </section>`;

    $$("[data-nav]", raiz).forEach((b) =>
      b.addEventListener("click", () => {
        const acao = b.dataset.nav;
        if (acao === "prox") proxima();
        if (acao === "ant") anterior();
        if (acao === "sair") sair();
        if (acao === "cheia") telaCheia(!document.fullscreenElement);
      }),
    );
    $$("[data-ir]", raiz).forEach((b) => b.addEventListener("click", () => irCena(Number(b.dataset.ir))));
    $("#apreCena", raiz).addEventListener("click", (e) => {
      if (e.target.closest("button, a, input, select")) return;
      proxima();
    });
    animarContadores();
    if (cena.id === "vencedor") soltarParticulas();
  }

  // ---------- Cenas ----------
  function montarCena(id, d) {
    if (id === "abertura") {
      return `<div class="c-abertura">
        <div class="halo"><span class="arco a1"></span><span class="arco a2"></span><img src="assets/logo/sava-simbolo.png" alt="" /></div>
        <p class="apre-kicker">Resultado do ano</p>
        <h1>Jornada SAVA <span>${d.ano}</span></h1>
        <p class="apre-sub">Fortalecendo a valorização, o engajamento e o desenvolvimento dos nossos talentos.</p>
      </div>`;
    }

    if (id === "numeros") {
      const blocos = [
        { v: d.pessoas, r: "colaboradores na Jornada" },
        { v: d.total, r: "Savacoins distribuídos", grande: true },
        { v: d.media, r: "Savacoins em média por pessoa" },
        { v: d.avaliados, r: "colaboradores avaliados" },
        { v: d.encontros + d.eventos + d.missoes, r: "encontros, eventos e missões", some: !(d.encontros + d.eventos + d.missoes) },
        { v: d.totalSelos, r: "selos conquistados" },
      ].filter((b) => !b.some);
      const somaAreas = d.totalAdm + d.totalAdv || 1;
      return `<div class="c-numeros">
        <p class="apre-kicker">${d.ano}</p>
        <h2 class="apre-titulo">O ano em números</h2>
        <div class="num-grid">
          ${blocos.map((b, i) => `<div class="num ${b.grande ? "grande" : ""}" style="--i:${i}"><strong data-count="${b.v}">0</strong><span>${b.r}</span></div>`).join("")}
        </div>
        <div class="areas" style="--i:${blocos.length}">
          <div class="areas-rot"><span>Controladoria e Administrativo <b>${fmt(d.totalAdm)}</b></span><span>Advogados Associados <b>${fmt(d.totalAdv)}</b></span></div>
          <div class="areas-barra"><i style="--w:${(d.totalAdm / somaAreas) * 100}%"></i><i style="--w:${(d.totalAdv / somaAreas) * 100}%"></i></div>
        </div>
      </div>`;
    }

    if (id === "niveis") {
      const max = Math.max(1, ...d.niveis.map((x) => x.qtd));
      return `<div class="c-niveis">
        <p class="apre-kicker">Evolução</p>
        <h2 class="apre-titulo">Como a equipe chegou em ${d.ano}</h2>
        <div class="niv-lista">
          ${d.niveis
            .map(
              ({ n, qtd }, i) => `<div class="niv" style="--i:${i}">
              <span class="niv-nome"><b class="level level-${n.slug}">${n.nome}</b><small>${n.faixa} Savacoins acumulados</small></span>
              <span class="niv-trilho"><i class="level-bg-${n.slug}" style="--w:${qtd ? Math.max(2, (qtd / max) * 100) : 0}%"></i></span>
              <span class="niv-num"><strong data-count="${qtd}">0</strong><small>${d.pessoas ? Math.round((qtd / d.pessoas) * 100) : 0}%</small></span>
            </div>`,
            )
            .join("")}
        </div>
      </div>`;
    }

    if (id === "selos") {
      return `<div class="c-selos">
        <p class="apre-kicker">Reconhecimentos</p>
        <h2 class="apre-titulo">Selos conquistados</h2>
        <div class="selo-grid">
          ${d.selos
            .map(
              (s, i) => `<article class="selo" style="--i:${i}">
              <div class="selo-img"><img src="${s.imagem}" alt="" /></div>
              <h3>${s.nome}</h3>
              <p class="selo-crit">${s.criterio}</p>
              <p class="selo-qtd"><strong data-count="${s.pessoas.length}">0</strong> ${s.pessoas.length === 1 ? "conquista" : "conquistas"}</p>
              <ul class="selo-nomes">${s.pessoas
                .slice(0, 8)
                .map((l) => `<li>${esc(nomeBonito(l.pessoa.nome))}</li>`)
                .join("")}${s.pessoas.length > 8 ? `<li class="mais">+${s.pessoas.length - 8}</li>` : ""}</ul>
            </article>`,
            )
            .join("")}
        </div>
      </div>`;
    }

    if (id === "destaques") {
      if (!d.destaques.length) return vazio(d);
      const lista = [...d.destaques].reverse();
      const primeira = d.destaques.length + 1;
      return `<div class="c-destaques">
        <p class="apre-kicker">Ranking ${d.ano}</p>
        <h2 class="apre-titulo">Os destaques do ano</h2>
        <div class="dest-lista">
          ${lista
            .map((l, i) => {
              const pos = primeira - i;
              return `<div class="dest" style="--i:${i}">
                <span class="dest-pos">${pos}º</span>
                <span class="dest-av">${esc(iniciais(l.pessoa.nome))}</span>
                <span class="dest-nome"><b>${esc(nomeBonito(l.pessoa.nome))}</b><small>${R.categorias[l.pessoa.categoria] || ""}</small></span>
                <span class="dest-pts"><strong data-count="${l.score}">0</strong><small>Savacoins</small></span>
              </div>`;
            })
            .join("")}
          <div class="dest dest-misterio" style="--i:${lista.length}">
            <span class="dest-pos">1º</span>
            <span class="dest-av">?</span>
            <span class="dest-nome"><b>Revelado a seguir</b><small>O grande destaque de ${d.ano}</small></span>
            <span class="dest-pts"><strong>???</strong></span>
          </div>
        </div>
      </div>`;
    }

    if (id === "suspense") {
      if (!d.vencedores.length) return vazio(d);
      return `<div class="c-suspense">
        <div class="halo grande"><span class="arco a1"></span><span class="arco a2"></span><span class="arco a3"></span><img src="assets/logo/sava-simbolo.png" alt="" /></div>
        <p class="apre-kicker">Jornada SAVA ${d.ano}</p>
        <h2>E o grande destaque do ano é…</h2>
        <p class="apre-sub">Avance para revelar</p>
      </div>`;
    }

    if (id === "vencedor") {
      if (!d.vencedores.length) return vazio(d);
      const v = d.vencedores;
      return `<div class="c-vencedor">
        <div class="luz" aria-hidden="true"><span class="swoosh s1"></span><span class="swoosh s2"></span><img class="marca-fundo" src="assets/logo/sava-simbolo.png" alt="" /></div>
        <div class="particulas" id="apreParticulas" aria-hidden="true"></div>
        <div class="venc-conteudo">
          <p class="apre-kicker">${v.length > 1 ? "Grandes destaques" : "Grande destaque"} · Jornada SAVA ${d.ano}</p>
          <div class="venc-medalhas">${v.map((l) => `<span class="venc-medalha">${esc(iniciais(l.pessoa.nome))}</span>`).join("")}</div>
          <h1 class="venc-nome">${v.map((l) => esc(nomeBonito(l.pessoa.nome))).join("<br>")}</h1>
          <p class="venc-area">${[...new Set(v.map((l) => R.categorias[l.pessoa.categoria] || ""))].join(" · ")}</p>
          <div class="venc-dados">
            <span><strong data-count="${v[0].score}">0</strong><small>Savacoins em ${d.ano}</small></span>
            <span><strong>${v[0].nivel.nome}</strong><small>nível</small></span>
            <span><strong data-count="${v[0].levelScore}">0</strong><small>acumulados</small></span>
          </div>
          ${st.premio ? `<p class="venc-premio"><span>Prêmio</span>${esc(st.premio)}</p>` : ""}
        </div>
        <footer class="apre-assinatura venc-assinatura" aria-hidden="true">
          <span class="apre-marca-txt">JORNADA <b>SAVA</b></span>
          <span class="apre-sep"></span>
          <img src="assets/logo/sava-logo.png" alt="" />
          <small>Destaque oficial ${d.ano}</small>
        </footer>
      </div>`;
    }
    return "";
  }

  function vazio(d) {
    return `<div class="c-abertura"><p class="apre-kicker">Jornada SAVA ${d.ano}</p><h2 class="apre-titulo">Ainda não há pontuação neste ano</h2><p class="apre-sub">Os destaques aparecem aqui assim que houver lançamentos.</p></div>`;
  }

  // ---------- Efeitos ----------
  function animarContadores() {
    $$("[data-count]", raiz).forEach((el, i) => {
      const alvo = Number(el.dataset.count) || 0;
      if (reduzMovimento() || !alvo) return (el.textContent = fmt(alvo));
      const atraso = 250 + i * 90;
      const duracao = 1300;
      setTimeout(() => {
        const inicio = performance.now();
        const passo = (agora) => {
          const t = Math.min(1, (agora - inicio) / duracao);
          const suave = 1 - Math.pow(1 - t, 3);
          el.textContent = fmt(Math.round(alvo * suave));
          if (t < 1 && el.isConnected) requestAnimationFrame(passo);
        };
        requestAnimationFrame(passo);
      }, atraso);
    });
  }

  function soltarParticulas() {
    const caixa = $("#apreParticulas", raiz);
    if (!caixa || reduzMovimento()) return;
    caixa.innerHTML = Array.from({ length: 70 }, () => {
      const x = Math.random() * 100;
      const tam = 3 + Math.random() * 6;
      const dur = 5 + Math.random() * 6;
      const atraso = Math.random() * 6;
      const deriva = (Math.random() - 0.5) * 120;
      return `<i style="left:${x}%;width:${tam}px;height:${tam}px;--dur:${dur}s;--atraso:${atraso}s;--deriva:${deriva}px"></i>`;
    }).join("");
  }

  // ---------- Navegação ----------
  function irCena(i) {
    st.cena = Math.max(0, Math.min(CENAS.length - 1, i));
    renderPalco();
    $("#aprePalco", raiz)?.focus({ preventScroll: true });
  }

  function proxima() {
    if (st.cena < CENAS.length - 1) irCena(st.cena + 1);
  }

  function anterior() {
    if (st.cena > 0) irCena(st.cena - 1);
  }

  function sair() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    st.cena = -1;
    renderInicio();
  }

  function telaCheia(ligar) {
    const alvo = raiz?.closest(".content") || raiz;
    if (ligar && !document.fullscreenElement) alvo?.requestFullscreen?.().catch(() => {});
    if (!ligar && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  function ligarTeclas() {
    if (teclasLigadas) return;
    teclasLigadas = true;
    document.addEventListener("keydown", (e) => {
      if (!raiz || !raiz.isConnected || st.cena < 0 || !$("#aprePalco", raiz)) return;
      if (e.target.closest?.("input, select, textarea")) return;
      if (["ArrowRight", "PageDown", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        proxima();
      } else if (["ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        anterior();
      } else if (e.key.toLowerCase() === "f") {
        telaCheia(!document.fullscreenElement);
      } else if (e.key === "Escape" && !document.fullscreenElement) {
        sair();
      }
    });
  }

  window.SAVA_APRESENTACAO = { render };
})();
