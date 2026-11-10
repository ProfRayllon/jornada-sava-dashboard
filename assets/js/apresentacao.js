// Apresentação do resultado do ciclo (aba "Apresentação" do sistema).
// Cenas: abertura → números → níveis → um selo por cena → destaques → suspense → vencedor.
// Navegação por setas/espaço/clique, pontos de progresso e tela cheia.
(function () {
  const R = window.SAVA_REGRAS;
  const S = window.SAVA_STORE;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const fmt = (n) => Number(n || 0).toLocaleString("pt-BR");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const reduzMovimento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Ícones dos números (traço fino, herdam a cor do texto).
  const ICONES = {
    pessoas: '<path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3.5"/><path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 4.6a3.5 3.5 0 0 1 0 6.8"/>',
    moedas: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6.4" opacity=".55"/><path d="M14.2 9.9c-.4-.8-1.2-1.2-2.2-1.2-1.3 0-2.2.7-2.2 1.7 0 2.4 4.6 1.3 4.6 3.6 0 1-1 1.8-2.4 1.8-1 0-1.9-.5-2.3-1.3M12 7.4v1.3M12 15.3v1.3"/>',
    media: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    avaliacao: '<rect x="5" y="4.5" width="14" height="16.5" rx="2.5"/><path d="M9 4.5V3h6v1.5"/><path d="M9 13l2 2 4-4"/>',
    agenda: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h3M8 17h6"/>',
    selo: '<circle cx="12" cy="9" r="5.5"/><path d="M8.6 13.4L7.5 21l4.5-2.5 4.5 2.5-1.1-7.6"/>',
  };
  const icone = (nome) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome]}</svg>`;

  const st = { ciclo: null, cena: -1 };
  let raiz = null;
  let teclasLigadas = false;
  let cenas = [];

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

  // Avatar redondo pequeno: foto (recortada no rosto) ou iniciais.
  function avatar(pessoa, classe = "") {
    const url = pessoa.daPlanilha ? null : S.fotoUrl(pessoa);
    return url
      ? `<span class="ap-av com-foto ${classe}"><img src="${url}" alt="" /></span>`
      : `<span class="ap-av ${classe}">${esc(iniciais(pessoa.nome))}</span>`;
  }

  // ---------- Dados do ciclo ----------
  // "ano" guarda o nome curto do ciclo ("2026" ou "1º semestre de 2027"), usado nos textos.
  function dadosDoCiclo(id) {
    const linhas = S.calcularCiclo(id);
    const lancs = S.lancamentosDoCiclo(id);
    const atividades = S.atividadesDoCiclo(id);
    const ano = S.rotuloCiclo(S.cicloPorId(id));
    const total = linhas.reduce((t, l) => t + l.score, 0);
    const pontuados = linhas.filter((l) => l.score > 0);
    const avaliados = new Set(lancs.filter((l) => l.tipo === "avaliacao").map((l) => l.pessoaId));
    linhas.forEach((l) => l.base.tecnica + l.base.socio + l.base.competencias > 0 && avaliados.add(l.pessoa.id));
    const somaArea = (cat) => linhas.filter((l) => l.pessoa.categoria === cat).reduce((t, l) => t + l.score, 0);
    const topo = linhas[0]?.score || 0;
    const selos = R.selos.map((s) => ({ ...s, pessoas: linhas.filter((l) => l.selos.has(s.id)) }));
    return {
      ano,
      linhas,
      total,
      pessoas: linhas.length,
      pontuados: pontuados.length,
      media: pontuados.length ? Math.round(total / pontuados.length) : 0,
      avaliados: avaliados.size,
      agenda: atividades.filter((a) => a.tipo !== "avaliacao").length,
      totalAdm: somaArea("adm"),
      totalAdv: somaArea("adv"),
      niveis: R.niveis.filter((n) => n.min !== null).map((n) => ({ n, qtd: linhas.filter((l) => l.nivel.slug === n.slug).length })),
      selos,
      totalSelos: selos.reduce((t, s) => t + s.pessoas.length, 0),
      vencedores: topo > 0 ? linhas.filter((l) => l.score === topo) : [],
      destaques: topo > 0 ? linhas.filter((l) => l.score !== topo && l.score > 0).slice(0, 4) : [],
    };
  }

  // Sequência de cenas do ano: um selo por cena (só os que alguém conquistou).
  function montarRoteiro(d) {
    const comSelo = d.selos.filter((s) => s.pessoas.length);
    return [
      { id: "abertura", nome: "Abertura" },
      { id: "numeros", nome: "O ciclo em números" },
      { id: "niveis", nome: "Níveis" },
      ...(comSelo.length ? comSelo.map((s) => ({ id: "selo", nome: `Selo ${s.nome}`, selo: s.id })) : [{ id: "selo", nome: "Selos", selo: null }]),
      { id: "destaques", nome: "Destaques" },
      { id: "suspense", nome: "Suspense" },
      { id: "vencedor", nome: "Vencedor" },
    ];
  }

  // ---------- Estrutura ----------
  function render(el, ctx = {}) {
    raiz = el;
    if (!S.cicloPorId(st.ciclo)) st.ciclo = ctx.ciclo || S.cicloVigente()?.id;
    ligarTeclas();
    if (st.cena < 0) return renderInicio();
    renderPalco();
  }

  function renderInicio() {
    const ciclos = S.listarCiclos();
    const d = dadosDoCiclo(st.ciclo);
    raiz.innerHTML = `
      <section class="apre apre-inicio">
        ${fundo()}
        <div class="apre-inicio-box">
          <img class="apre-simbolo-sm" src="assets/logo/sava-simbolo.png" alt="" />
          <p class="apre-kicker">Apresentação do resultado</p>
          <h2>Jornada SAVA</h2>
          <p class="apre-sub">Escolha o ciclo e inicie. Avance com as setas do teclado, a barra de espaço ou um clique.</p>
          <label class="apre-ano-campo"><span>Ciclo</span>
            <select id="apreAno">${ciclos.map((c) => `<option value="${esc(c.id)}" ${c.id === st.ciclo ? "selected" : ""}>${esc(c.nome)}</option>`).join("")}</select>
          </label>
          <p class="apre-resumo">${d.pontuados ? `${fmt(d.pessoas)} colaboradores · ${fmt(d.total)} Savacoins · ${fmt(d.totalSelos)} selos` : "Este ciclo ainda não tem pontuação."}</p>
          <div class="apre-acoes">
            <button type="button" class="apre-btn apre-btn-ouro" id="apreIniciar">Iniciar apresentação</button>
            <button type="button" class="apre-btn" id="apreIniciarCheia">Iniciar em tela cheia</button>
          </div>
        </div>
        ${rodape()}
      </section>`;
    $("#apreAno", raiz).addEventListener("change", (e) => {
      st.ciclo = e.target.value;
      renderInicio();
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

  function rodape(texto = "Programa de reconhecimento de talentos") {
    return `<footer class="apre-assinatura" aria-hidden="true">
      <span class="apre-marca-txt">JORNADA <b>SAVA</b></span>
      <span class="apre-sep"></span>
      <img src="assets/logo/sava-logo.png" alt="" />
      <small>${texto}</small>
    </footer>`;
  }

  function renderPalco() {
    const d = dadosDoCiclo(st.ciclo);
    cenas = montarRoteiro(d);
    st.cena = Math.min(st.cena, cenas.length - 1);
    const cena = cenas[st.cena];
    const intenso = ["suspense", "vencedor"].includes(cena.id);
    raiz.innerHTML = `
      <section class="apre apre-palco cena-${cena.id}" id="aprePalco" tabindex="-1">
        ${fundo(intenso)}
        <header class="apre-topo">
          <span class="apre-marca-txt">JORNADA <b>SAVA</b></span>
          <span class="apre-ano-tag">Resultado ${S.rotuloCiclo(S.cicloPorId(st.ciclo))}</span>
        </header>
        <div class="apre-cena" id="apreCena">${montarCena(cena, d)}</div>
        <nav class="apre-nav" aria-label="Navegação da apresentação">
          <button type="button" class="apre-nav-btn" data-nav="sair" title="Voltar ao início (Esc)" aria-label="Voltar ao início">✕</button>
          <button type="button" class="apre-nav-btn" data-nav="ant" title="Anterior (←)" aria-label="Cena anterior" ${st.cena === 0 ? "disabled" : ""}>‹</button>
          <div class="apre-dots">${cenas.map((c, i) => `<button type="button" class="${i === st.cena ? "on" : ""}" data-ir="${i}" title="${esc(c.nome)}" aria-label="${esc(c.nome)}"></button>`).join("")}</div>
          <button type="button" class="apre-nav-btn" data-nav="prox" title="Próxima (→ ou espaço)" aria-label="Próxima cena" ${st.cena === cenas.length - 1 ? "disabled" : ""}>›</button>
          <button type="button" class="apre-nav-btn" data-nav="cheia" title="Tela cheia (F)" aria-label="Tela cheia">⛶</button>
        </nav>
        ${rodape(cena.id === "vencedor" ? `Destaque oficial ${S.rotuloCiclo(S.cicloPorId(st.ciclo))}` : undefined)}
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
  function montarCena(cena, d) {
    const id = cena.id;
    if (id === "abertura") {
      return `<div class="c-abertura">
        <div class="halo"><span class="arco a1"></span><span class="arco a2"></span><img src="assets/logo/sava-simbolo.png" alt="" /></div>
        <p class="apre-kicker">Resultado do ciclo</p>
        <h1>Jornada SAVA <span>${d.ano}</span></h1>
        <p class="apre-sub">Fortalecendo a valorização, o engajamento e o desenvolvimento dos nossos talentos.</p>
      </div>`;
    }

    if (id === "numeros") {
      const blocos = [
        { v: d.pessoas, r: "talentos na Jornada", i: "pessoas" },
        { v: d.total, r: "Savacoins conquistados", i: "moedas", grande: true },
        { v: d.media, r: "Savacoins em média por pessoa", i: "media" },
        { v: d.avaliados, r: "colaboradores avaliados", i: "avaliacao" },
        { v: d.agenda, r: "encontros, eventos e missões", i: "agenda", some: !d.agenda },
        { v: d.totalSelos, r: "selos conquistados", i: "selo" },
      ].filter((b) => !b.some);
      const somaAreas = d.totalAdm + d.totalAdv || 1;
      return `<div class="c-numeros">
        <p class="apre-kicker">Jornada SAVA ${d.ano} em números</p>
        <h2 class="apre-titulo">Um ciclo de conquistas</h2>
        <div class="ap-num-grid">
          ${blocos
            .map(
              (b, i) => `<div class="ap-num ${b.grande ? "grande" : ""}" style="--i:${i}">
              <span class="ap-num-ico">${icone(b.i)}</span>
              <div><strong data-count="${b.v}">0</strong><span>${b.r}</span></div>
            </div>`,
            )
            .join("")}
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

    if (id === "selo") {
      const s = d.selos.find((x) => x.id === cena.selo);
      if (!s) return `<div class="c-abertura"><p class="apre-kicker">Reconhecimentos</p><h2 class="apre-titulo">Nenhum selo conquistado em ${d.ano}</h2></div>`;
      const n = s.pessoas.length;
      return `<div class="c-selo">
        <div class="selo-destaque">
          <div class="selo-brilho"><span class="selo-raios"></span><img src="${s.imagem}" alt="" /></div>
          <p class="apre-kicker">Selo conquistado</p>
          <h2>${s.nome}</h2>
          <p class="selo-crit">${s.criterio}</p>
          <p class="selo-qtd"><strong data-count="${n}">0</strong> ${n === 1 ? "pessoa conquistou" : "pessoas conquistaram"}</p>
        </div>
        <ul class="selo-pessoas ${n > 18 ? "compacta" : ""}">
          ${s.pessoas
            .map((l, i) => `<li style="--i:${Math.min(i, 30)}"><span class="ap-av">${esc(iniciais(l.pessoa.nome))}</span><span><b>${esc(nomeBonito(l.pessoa.nome))}</b><small>${R.categorias[l.pessoa.categoria] || ""}</small></span></li>`)
            .join("")}
        </ul>
      </div>`;
    }

    if (id === "destaques") {
      if (!d.destaques.length) return vazio(d);
      const lista = [...d.destaques].reverse();
      const primeira = d.destaques.length + 1;
      return `<div class="c-destaques">
        <p class="apre-kicker">Ranking ${d.ano}</p>
        <h2 class="apre-titulo">Os destaques do ciclo</h2>
        <div class="dest-lista">
          ${lista
            .map((l, i) => `<div class="dest" style="--i:${i}">
                <span class="dest-pos">${primeira - i}º</span>
                ${avatar(l.pessoa, "dest-av")}
                <span class="dest-nome"><b>${esc(nomeBonito(l.pessoa.nome))}</b><small>${R.categorias[l.pessoa.categoria] || ""}</small></span>
                <span class="dest-pts"><strong data-count="${l.score}">0</strong><small>Savacoins</small></span>
              </div>`)
            .join("")}
          <div class="dest dest-misterio" style="--i:${lista.length}">
            <span class="dest-pos">1º</span>
            <span class="ap-av dest-av">?</span>
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
        <h2>E o grande destaque do ciclo é…</h2>
        <p class="apre-sub">Avance para revelar</p>
      </div>`;
    }

    if (id === "vencedor") {
      if (!d.vencedores.length) return vazio(d);
      const v = d.vencedores;
      const p = v[0];
      const selosDoVencedor = R.selos.filter((s) => v.some((l) => l.selos.has(s.id)));
      const retratos = v
        .slice(0, 3)
        .map((l) => {
          const url = l.pessoa.daPlanilha ? null : S.fotoUrl(l.pessoa);
          return url ? `<img class="v-foto" src="${url}" alt="${esc(nomeBonito(l.pessoa.nome))}" />` : `<span class="v-medalha">${esc(iniciais(l.pessoa.nome))}</span>`;
        })
        .join("");
      return `<div class="c-vencedor ${v.length > 1 ? "empate" : ""}">
        <div class="particulas" id="apreParticulas" aria-hidden="true"></div>
        <div class="v-retrato">
          <div class="v-luz" aria-hidden="true"><img class="v-simbolo" src="assets/logo/sava-simbolo.png" alt="" /></div>
          <div class="v-pessoas">${retratos}</div>
        </div>
        <div class="v-info">
          <p class="apre-kicker">${v.length > 1 ? "Grandes destaques" : "Grande destaque"} · Jornada SAVA ${d.ano}</p>
          <h1 class="v-nome">${v.map((l) => esc(nomeBonito(l.pessoa.nome))).join("<br>")}</h1>
          <p class="v-area">${[...new Set(v.map((l) => R.categorias[l.pessoa.categoria] || ""))].join(" · ")}</p>
          <div class="v-pontos"><strong data-count="${p.score}" data-atraso="2300">0</strong><span>Savacoins em ${d.ano}</span></div>
          <div class="v-dados">
            <span><small>Nível</small><strong>${p.nivel.nome}</strong></span>
            <span><small>Acumulados</small><strong data-count="${p.levelScore}" data-atraso="2600">0</strong></span>
          </div>
          ${
            selosDoVencedor.length
              ? `<div class="v-selos"><small>Selos conquistados</small><div>${selosDoVencedor.map((s) => `<span class="v-selo"><img src="${s.imagem}" alt="" /><b>${s.nome}</b></span>`).join("")}</div></div>`
              : ""
          }
        </div>
      </div>`;
    }
    return "";
  }

  function vazio(d) {
    return `<div class="c-abertura"><p class="apre-kicker">Jornada SAVA ${d.ano}</p><h2 class="apre-titulo">Ainda não há pontuação neste ciclo</h2><p class="apre-sub">Os destaques aparecem aqui assim que houver lançamentos.</p></div>`;
  }

  // ---------- Efeitos ----------
  function animarContadores() {
    $$("[data-count]", raiz).forEach((el, i) => {
      const alvo = Number(el.dataset.count) || 0;
      if (reduzMovimento() || !alvo) return (el.textContent = fmt(alvo));
      const atraso = Number(el.dataset.atraso) || 250 + i * 90;
      const duracao = 1300;
      setTimeout(() => {
        const inicio = performance.now();
        const passo = (agora) => {
          const t = Math.min(1, (agora - inicio) / duracao);
          el.textContent = fmt(Math.round(alvo * (1 - Math.pow(1 - t, 3))));
          if (t < 1 && el.isConnected) requestAnimationFrame(passo);
        };
        requestAnimationFrame(passo);
      }, atraso);
    });
  }

  function soltarParticulas() {
    const caixa = $("#apreParticulas", raiz);
    if (!caixa || reduzMovimento()) return;
    caixa.innerHTML = Array.from({ length: 60 }, () => {
      const tam = 3 + Math.random() * 5;
      return `<i style="left:${Math.random() * 100}%;width:${tam}px;height:${tam}px;--dur:${5 + Math.random() * 6}s;--atraso:${1.2 + Math.random() * 6}s;--deriva:${(Math.random() - 0.5) * 120}px"></i>`;
    }).join("");
  }

  // ---------- Navegação ----------
  function irCena(i) {
    if (!cenas.length) cenas = montarRoteiro(dadosDoCiclo(st.ciclo));
    st.cena = Math.max(0, Math.min(cenas.length - 1, i));
    renderPalco();
    $("#aprePalco", raiz)?.focus({ preventScroll: true });
  }

  function proxima() {
    if (st.cena < cenas.length - 1) irCena(st.cena + 1);
  }

  function anterior() {
    if (st.cena > 0) irCena(st.cena - 1);
  }

  function sair() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    st.cena = -1;
    cenas = [];
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
