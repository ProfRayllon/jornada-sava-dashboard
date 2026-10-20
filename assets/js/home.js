(function () {
  const R = window.SAVA_REGRAS;
  const S = window.SAVA_STORE;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const fmt = (n) => Number(n || 0).toLocaleString("pt-BR");
  const icon = (id) => `<svg class="ico" aria-hidden="true"><use href="#i-${id}" /></svg>`;
  const reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fotosVencedores = { 2025: "assets/img/vencedores/2025.png", 2026: "assets/img/vencedores/2026.jpeg" };

  const fluxo = [
    { icone: "coins", titulo: "Atividades e desempenho geram pontuação", texto: "Suas ações, participações e resultados viram Savacoins." },
    { icone: "clipboard", titulo: "Líderes e RH indicam e validam", texto: "Com base nos critérios definidos do programa." },
    { icone: "database", titulo: "RH consolida os dados", texto: "As informações são organizadas e conferidas." },
    { icone: "megaphone", titulo: "Resultados bimestrais divulgados", texto: "Você acompanha sua evolução e conquistas." },
    { icone: "trophy", titulo: "Destaques são reconhecidos e premiados", texto: "Seu empenho gera visibilidade e celebrações." },
  ];

  const experiencias = [
    { icone: "plane", rotulo: "Viagem com acompanhante", titulo: "Viva conquistas inesquecíveis", texto: "Uma experiência única para celebrar com quem você ama.", imagem: "assets/img/premios/viagem.jpg" },
    { icone: "bed", rotulo: "Hospedagem e gastronomia", titulo: "Descanso com sabor de conquista", texto: "Momentos de descanso e boa mesa em lugares especiais.", imagem: "assets/img/premios/hospedagem.jpg" },
    { icone: "compass", rotulo: "Experiência temática", titulo: "Aventura, cultura ou bem-estar", texto: "Uma experiência escolhida por você para celebrar essa conquista.", imagem: "assets/img/premios/experiencia.jpg" },
  ];

  const iconesNivel = ["compass", "star", "award", "shield", "gem", "crown"];

  document.addEventListener("DOMContentLoaded", () => {
    $$("[data-ano-atual]").forEach((el) => (el.textContent = R.anoAtual));
    iniciarHeader();
    montarNumeros();
    montarFluxo();
    montarPontuacao();
    montarIndicadores();
    montarSelos();
    montarExcelencia();
    montarPesos();
    montarNiveis();
    montarHall();
    iniciarReveal();
  });

  // ---------- Header ----------
  function iniciarHeader() {
    const header = $("#siteHeader");
    const nav = $("#mainNav");
    const toggle = $("#menuToggle");
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    toggle.addEventListener("click", () => toggle.setAttribute("aria-expanded", String(nav.classList.toggle("open"))));
    nav.addEventListener("click", (e) => {
      if (!e.target.closest("a")) return;
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });

    const links = $$('a[href^="#"]', nav);
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`));
        }),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    links.forEach((a) => {
      const alvo = $(a.getAttribute("href"));
      if (alvo) observer.observe(alvo);
    });
  }

  // ---------- Números ----------
  function rankingDoAno(ano) {
    if (Number(ano) === R.anoAtual && S?.lerDb()) {
      return S.calcularAno(ano).map((l) => ({
        name: l.pessoa.nome,
        category: R.categorias[l.pessoa.categoria] || "",
        score: l.score,
        levelScore: l.levelScore,
        badges: [...l.selos],
      }));
    }
    const base = window.JORNADA_SAVA_PANEL_DATA?.years?.[String(ano)];
    return [...(base?.people || [])].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }

  function montarNumeros() {
    const ranking = rankingDoAno(R.anoAtual);
    // Sem a base de dados (ex.: clone do repositório sem a pasta base/), a faixa de números some.
    if (!ranking.length) return ($(".numbers").hidden = true);
    $("#statPessoas").textContent = ranking.length;
    $("#statCoins").textContent = Math.floor(ranking.reduce((t, p) => t + (p.score || 0), 0) / 1000);
    $("#statSelos").textContent = ranking.reduce((t, p) => t + (p.badges?.length || 0), 0);
    $("#statNiveis").textContent = R.niveis.length;

    const alvo = $(".numbers-card");
    quandoVisivel(alvo, () => $$("[data-count]", alvo).forEach((el) => contar(el, Number(el.textContent))), 0.4);
  }

  function contar(el, final) {
    if (reduzMovimento) return;
    const inicio = performance.now();
    const passo = (agora) => {
      const t = Math.min(1, (agora - inicio) / 1600);
      el.textContent = fmt(Math.round(final * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  // ---------- Como funciona ----------
  function montarFluxo() {
    const lista = $("#flow");
    lista.innerHTML = fluxo
      .map(
        (f, i) => `
        <li class="flow-step reveal" style="transition-delay:${i * 120}ms">
          <div class="flow-circle"><span class="flow-num">${i + 1}</span>${icon(f.icone)}</div>
          <h3>${f.titulo}</h3>
          <p>${f.texto}</p>
        </li>`,
      )
      .join("");

    // A linha dourada avança etapa por etapa, mostrando o ciclo.
    const passos = $$(".flow-step", lista);
    const progresso = $("#flowProgress");
    let atual = 0;
    const marcar = (i) => {
      passos.forEach((p, j) => p.classList.toggle("active", j <= i));
      progresso.style.width = `${(i / (passos.length - 1)) * 100}%`;
    };
    quandoVisivel(lista, () => {
      marcar(0);
      if (reduzMovimento) return marcar(passos.length - 1);
      setInterval(() => marcar((atual = (atual + 1) % passos.length)), 2000);
    });
  }

  // ---------- Pontuação ----------
  function montarPontuacao() {
    const blocos = [
      { id: "adm", titulo: "Controladoria e Administrativo", icone: "users", classe: "" },
      { id: "adv", titulo: "Advogados Associados", icone: "scale", classe: "gold" },
    ];
    $("#scoreGrid").innerHTML = blocos
      .map((b) => {
        const itens = R.pontuacaoBimestral[b.id];
        const total = itens.reduce((t, i) => t + i.pontos, 0);
        return `
        <article class="score-card reveal">
          <header class="score-head ${b.classe}">${icon(b.icone)}<h3>${b.titulo}</h3></header>
          ${itens
            .map(
              (i, n) => `
            <div class="score-row" style="--d:${n}">
              ${icon(i.icone)}
              <div><h4>${i.nome}</h4><p>${i.desc}</p></div>
              <div class="score-value"><small>${i.prefixo ? "até" : "&nbsp;"}</small><b>${fmt(i.pontos)}</b> <small>Savacoins</small></div>
            </div>`,
            )
            .join("")}
          <footer class="score-total" style="--d:${itens.length}"><span>${icon("coins")}Total possível no bimestre</span><b>${fmt(total)}<small>Savacoins</small></b></footer>
        </article>`;
      })
      .join("");
  }

  // ---------- Indicadores ----------
  function montarIndicadores() {
    $("#indGrid").innerHTML = R.indicadores
      .map(
        (g, i) => `
        <article class="ind-card reveal" style="transition-delay:${i * 100}ms">
          <header>
            <span class="icon-badge">${icon(g.icone)}</span>
            <div><h3>${g.titulo}</h3><small>${g.publico}</small></div>
          </header>
          <ul>${g.itens.map((it) => `<li><b>${it.nome}</b><span>${it.desc}</span></li>`).join("")}</ul>
        </article>`,
      )
      .join("");
  }

  // ---------- Conquistas ----------
  function montarSelos() {
    $("#sealGrid").innerHTML = R.selos
      .map(
        (s, i) => `
        <article class="seal reveal" style="transition-delay:${i * 100}ms">
          <img src="${s.imagem}" alt="Selo ${s.nome}" loading="lazy" />
          <div><h3>${s.nome}</h3><span class="seal-crit">${s.criterio}</span><p>${s.descricao}</p></div>
        </article>`,
      )
      .join("");
  }

  // ---------- SAVA Excelência (carrossel de experiências) ----------
  function montarExcelencia() {
    const carrossel = $("#excCarousel");
    const duracao = 6000;
    carrossel.style.setProperty("--dur", `${duracao}ms`);

    $("#excStage").innerHTML = experiencias
      .map(
        (x, i) => `
        <div class="exc-slide ${i === 0 ? "active" : ""}" aria-hidden="${i !== 0}">
          <img src="${x.imagem}" alt="${x.rotulo}" ${i ? 'loading="lazy"' : ""} />
          <div class="exc-slide-copy">
            <span class="tag">${icon(x.icone)}${x.rotulo}</span>
            <h3>${x.titulo}</h3>
            <p>${x.texto}</p>
          </div>
        </div>`,
      )
      .join("");
    $("#excThumbs").innerHTML = experiencias
      .map(
        (x, i) => `
        <button class="exc-thumb ${i === 0 ? "active" : ""}" type="button" role="tab" aria-selected="${i === 0}" data-slide="${i}">
          <img src="${x.imagem}" alt="" loading="lazy" />
          <span>${x.rotulo}</span><i></i>
        </button>`,
      )
      .join("");

    const slides = $$(".exc-slide", carrossel);
    const thumbs = $$(".exc-thumb", carrossel);
    let atual = 0;
    let timer;

    const ir = (i) => {
      atual = (i + slides.length) % slides.length;
      slides.forEach((s, j) => {
        s.classList.toggle("active", j === atual);
        s.setAttribute("aria-hidden", String(j !== atual));
      });
      thumbs.forEach((t, j) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", String(j === atual));
      });
      void thumbs[atual].offsetWidth; // reinicia a barra de progresso
      thumbs[atual].classList.add("active");
      clearTimeout(timer);
      if (!reduzMovimento && !carrossel.classList.contains("paused")) timer = setTimeout(() => ir(atual + 1), duracao);
    };

    $$(".car-arrow", carrossel).forEach((b) => b.addEventListener("click", () => ir(atual + Number(b.dataset.dir))));
    thumbs.forEach((t) => t.addEventListener("click", () => ir(Number(t.dataset.slide))));
    carrossel.addEventListener("mouseenter", () => {
      carrossel.classList.add("paused");
      clearTimeout(timer);
    });
    carrossel.addEventListener("mouseleave", () => {
      carrossel.classList.remove("paused");
      ir(atual);
    });
    habilitarSwipe($("#excStage"), (dir) => ir(atual + dir));
    quandoVisivel(carrossel, () => ir(0));
  }

  function montarPesos() {
    const el = $("#weights");
    el.innerHTML = R.premiacaoAnual
      .map(
        (p) => `
        <div class="weight-row">
          <header><div>${p.criterio} <span>· ${p.fonte}</span></div><strong>${p.peso}%</strong></header>
          <div class="weight-track"><i style="width:${p.peso / 0.6}%"></i></div>
        </div>`,
      )
      .join("");
    quandoVisivel(el, () => el.classList.add("visible"));
  }

  // ---------- Níveis ----------
  function montarNiveis() {
    $("#levels").innerHTML = R.niveis
      .map((n, i) => {
        const bloqueado = n.faixa === "a definir";
        return `
        <li class="level reveal ${bloqueado ? "locked" : ""}" style="--i:${i}">
          <span class="level-icon">${icon(bloqueado ? "lock" : iconesNivel[i])}</span>
          <span class="level-step">Nível ${i + 1}</span>
          <h3>${n.nome}</h3>
          <p>${bloqueado ? "A definir" : `${n.faixa} Savacoins`}</p>
        </li>`;
      })
      .join("");
  }

  // ---------- Hall da fama: campeão em destaque e o próximo ao lado, desfocado ----------
  function nomeBonito(nome) {
    const minusculas = new Set(["de", "da", "do", "das", "dos", "e"]);
    return String(nome || "")
      .toLowerCase()
      .split(" ")
      .map((p, i) => (i > 0 && minusculas.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
      .join(" ");
  }

  function montarHall() {
    const anos = Object.keys(window.JORNADA_SAVA_PANEL_DATA?.years || {})
      .map(Number)
      .sort((a, b) => b - a);
    const campeoes = anos.map((ano) => ({ ano, p: rankingDoAno(ano)[0] })).filter((c) => c.p);
    if (!campeoes.length) {
      $("#vencedores").hidden = true;
      $$('a[href="#vencedores"]').forEach((a) => (a.hidden = true));
      return;
    }
    const stage = $("#hallStage");
    const dots = $("#hallDots");

    stage.innerHTML = campeoes
      .map(
        ({ ano, p }, i) => `
        <article class="champion" data-i="${i}" aria-label="Campeão ${ano}">
          <div class="champion-photo">
            <img src="${fotosVencedores[ano] || "assets/logo/sava-simbolo.png"}" alt="${nomeBonito(p.name)}" loading="lazy" />
            <span class="crown">${icon("trophy")}</span>
          </div>
          <div>
            <div class="champion-year">${ano}</div>
            <span class="champion-tag">${ano >= R.anoAtual ? "Destaque do ano · parcial" : "Campeão do ano"}</span>
            <h3>${nomeBonito(p.name)}</h3>
            <p class="champion-area">${p.category || ""}</p>
            <div class="champion-score"><strong>${fmt(p.score)}</strong><small>Savacoins</small></div>
            <p class="champion-level">${icon("award")}${R.nivelPorPontos(p.levelScore || p.score).nome}</p>
          </div>
        </article>`,
      )
      .join("");
    dots.innerHTML = campeoes.map((c, i) => `<button type="button" aria-label="Campeão ${c.ano}" data-i="${i}"></button>`).join("");

    const cards = $$(".champion", stage);
    let atual = 0;
    let timer;
    const posicionar = () => {
      const n = cards.length;
      cards.forEach((card, i) => {
        let d = i - atual;
        if (n > 2) {
          if (d > n / 2) d -= n;
          if (d < -n / 2) d += n;
        }
        const ativo = d === 0;
        card.classList.toggle("is-active", ativo);
        card.style.transform = `translateX(calc(-50% + ${d * 78}%)) scale(${ativo ? 1 : 0.84})`;
        card.style.filter = ativo ? "none" : "blur(3px)";
        card.style.opacity = Math.abs(d) > 1 ? "0" : ativo ? "1" : "0.4";
        card.style.zIndex = String(10 - Math.abs(d));
      });
      $$("button", dots).forEach((b, j) => b.classList.toggle("active", j === atual));
    };
    const ir = (i) => {
      atual = (i + cards.length) % cards.length;
      posicionar();
      clearTimeout(timer);
      if (!reduzMovimento && cards.length > 1) timer = setTimeout(() => ir(atual + 1), 7000);
    };

    stage.addEventListener("click", (e) => {
      const card = e.target.closest(".champion");
      if (card && !card.classList.contains("is-active")) ir(Number(card.dataset.i));
    });
    dots.addEventListener("click", (e) => e.target.dataset.i && ir(Number(e.target.dataset.i)));
    stage.addEventListener("mouseenter", () => clearTimeout(timer));
    stage.addEventListener("mouseleave", () => ir(atual));
    habilitarSwipe(stage, (dir) => ir(atual + dir));
    ir(0);
  }

  // ---------- Utilitários ----------
  function habilitarSwipe(el, aoDeslizar) {
    let x0 = null;
    el.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
    el.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) aoDeslizar(dx < 0 ? 1 : -1);
      x0 = null;
    });
  }

  function quandoVisivel(el, fn, threshold = 0.3) {
    new IntersectionObserver(
      ([entry], obs) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        fn();
      },
      { threshold },
    ).observe(el);
  }

  function iniciarReveal() {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }),
      { threshold: 0.12 },
    );
    $$(".reveal").forEach((el) => observer.observe(el));
  }
})();
