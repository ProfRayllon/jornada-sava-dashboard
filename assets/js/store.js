// Camada de dados da Jornada SAVA.
// Versão inicial: persiste no localStorage do navegador. Toda leitura/escrita passa por
// SAVA_STORE, para que a troca por um backend compartilhado (ex.: Supabase) fique isolada aqui.
(function () {
  const R = window.SAVA_REGRAS;
  const DB_KEY = "sava.v1.db";
  const SESSION_KEY = "sava.v1.sessao";
  const SESSION_HOURS = 8;
  const canal = "BroadcastChannel" in window ? new BroadcastChannel("sava-db") : null;
  const ouvintes = new Set();

  const ADMIN_PADRAO = { email: "admin@sava.adv.br", senha: "" };

  const categoriaPorRotulo = {
    "Advogados Associados": "adv",
    "Controladoria e Administrativo": "adm",
  };

  const uid = (prefixo) => `${prefixo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

  function normalizar(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  // Cópia intocada da base das planilhas: a ponte do painel substitui JORNADA_SAVA_PANEL_DATA
  // pelos dados já somados, então os cálculos nunca devem ler de lá depois do carregamento.
  const BASE_PLANILHAS = window.JORNADA_SAVA_PANEL_DATA ? JSON.parse(JSON.stringify(window.JORNADA_SAVA_PANEL_DATA)) : null;

  function dadosBase(ano) {
    return BASE_PLANILHAS?.years?.[String(ano)] || null;
  }

  async function hashSenha(senha, salt) {
    const bytes = new TextEncoder().encode(`${salt}:${senha}`);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function lerDb() {
    try {
      const bruto = localStorage.getItem(DB_KEY);
      return bruto ? JSON.parse(bruto) : null;
    } catch {
      return null;
    }
  }

  function gravarDb(db) {
    db.atualizadoEm = new Date().toISOString();
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    canal?.postMessage({ tipo: "db-atualizado" });
    ouvintes.forEach((fn) => fn());
  }

  async function garantirDb() {
    let db = lerDb();
    if (db) return db;

    const salt = uid("s");
    db = {
      versao: 1,
      criadoEm: new Date().toISOString(),
      usuarios: [
        {
          id: uid("u"),
          nome: "Administrador",
          email: ADMIN_PADRAO.email,
          perfil: "admin",
          salt,
          senhaHash: await hashSenha(ADMIN_PADRAO.senha, salt),
          ativo: true,
          trocarSenha: true,
          criadoEm: new Date().toISOString(),
        },
      ],
      pessoas: pessoasIniciais(),
      lancamentos: [],
    };
    gravarDb(db);
    return db;
  }

  // Importa as pessoas da base tratada do ano atual (planilhas) como ponto de partida.
  function pessoasIniciais() {
    const base = dadosBase(R.anoAtual);
    if (!base) return [];
    return base.people.map((p) => ({
      id: uid("p"),
      nome: p.name,
      chaveBase: p.key || normalizar(p.name),
      categoria: categoriaPorRotulo[p.category] || null,
      setor: "",
      ativo: true,
      origem: "base",
      criadoEm: new Date().toISOString(),
    }));
  }

  function ouvir(fn) {
    ouvintes.add(fn);
    canal?.addEventListener("message", fn);
    window.addEventListener("storage", (e) => {
      if (e.key === DB_KEY) fn();
    });
  }

  // ---------- Sessão ----------
  async function entrar(email, senha) {
    const db = await garantirDb();
    const usuario = db.usuarios.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase());
    if (!usuario || !usuario.ativo) throw new Error("Usuário ou senha inválidos.");
    const hash = await hashSenha(senha, usuario.salt);
    if (hash !== usuario.senhaHash) throw new Error("Usuário ou senha inválidos.");
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ usuarioId: usuario.id, expira: Date.now() + SESSION_HOURS * 3600 * 1000 }),
    );
    return publico(usuario);
  }

  function sair() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function usuarioAtual() {
    try {
      const sessao = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
      if (!sessao || sessao.expira < Date.now()) return null;
      const usuario = lerDb()?.usuarios.find((u) => u.id === sessao.usuarioId && u.ativo);
      return usuario ? publico(usuario) : null;
    } catch {
      return null;
    }
  }

  function publico(u) {
    const { salt, senhaHash, ...resto } = u;
    return resto;
  }

  // ---------- Usuários (equipe) ----------
  function listarUsuarios() {
    return (lerDb()?.usuarios || []).map(publico);
  }

  async function salvarUsuario(dados) {
    const db = await garantirDb();
    const email = dados.email.trim().toLowerCase();
    const duplicado = db.usuarios.find((u) => u.email === email && u.id !== dados.id);
    if (duplicado) throw new Error("Já existe um usuário com este e-mail.");

    let usuario = db.usuarios.find((u) => u.id === dados.id);
    if (!usuario) {
      if (!dados.senha) throw new Error("Defina uma senha inicial.");
      usuario = { id: uid("u"), criadoEm: new Date().toISOString(), ativo: true, salt: uid("s") };
      db.usuarios.push(usuario);
    }
    Object.assign(usuario, { nome: dados.nome.trim(), email, perfil: dados.perfil, area: dados.area || "" });
    if (typeof dados.ativo === "boolean") usuario.ativo = dados.ativo;
    if (dados.senha) {
      usuario.senhaHash = await hashSenha(dados.senha, usuario.salt);
      usuario.trocarSenha = Boolean(dados.trocarSenha);
    }
    if (!db.usuarios.some((u) => u.perfil === "admin" && u.ativo)) {
      throw new Error("O sistema precisa de pelo menos um administrador ativo.");
    }
    gravarDb(db);
    return publico(usuario);
  }

  // ---------- Pessoas avaliadas ----------
  function listarPessoas() {
    return lerDb()?.pessoas || [];
  }

  async function salvarPessoa(dados) {
    const db = await garantirDb();
    let pessoa = db.pessoas.find((p) => p.id === dados.id);
    if (!pessoa) {
      const nome = normalizar(dados.nome);
      if (db.pessoas.some((p) => normalizar(p.nome) === nome)) throw new Error("Esta pessoa já está cadastrada.");
      pessoa = { id: uid("p"), origem: "sistema", ativo: true, criadoEm: new Date().toISOString() };
      db.pessoas.push(pessoa);
    }
    Object.assign(pessoa, {
      nome: dados.nome.trim().toUpperCase(),
      categoria: dados.categoria,
      setor: dados.setor || "",
      ativo: dados.ativo ?? pessoa.ativo,
    });
    gravarDb(db);
    return pessoa;
  }

  // ---------- Lançamentos ----------
  function listarLancamentos() {
    return lerDb()?.lancamentos || [];
  }

  async function registrarLancamento(dados, autor) {
    const db = await garantirDb();
    const bimestre = R.bimestreDaData(dados.data);
    const lancamento = {
      id: uid("l"),
      ano: Number(dados.data.slice(0, 4)),
      bimestre: bimestre?.id || null,
      criadoEm: new Date().toISOString(),
      autorId: autor.id,
      autorNome: autor.nome,
      ...dados,
    };
    db.lancamentos.push(lancamento);
    gravarDb(db);
    return lancamento;
  }

  async function excluirLancamento(id) {
    const db = await garantirDb();
    db.lancamentos = db.lancamentos.filter((l) => l.id !== id);
    gravarDb(db);
  }

  // Pontos que um lançamento gera para cada pessoa, separados por pilar.
  function pontosDoLancamento(l, pessoaId) {
    const vazio = { felicidade: 0, eventos: 0, tecnica: 0, socio: 0, competencias: 0, extras: 0, selos: [] };
    if (l.pessoaIds && !l.pessoaIds.includes(pessoaId)) return vazio;
    if (l.pessoaId && l.pessoaId !== pessoaId) return vazio;

    switch (l.tipo) {
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
          R.criterios[l.categoria].filter((c) => c.grupo === grupo).reduce((t, c) => t + Number(l.notas[c.id] || 0), 0);
        const selos = R.selosDaAvaliacao(l.categoria, l.notas);
        if (l.categoria === "adv") return { ...vazio, competencias: soma("tecnica") + soma("socio"), selos };
        return { ...vazio, tecnica: soma("tecnica"), socio: soma("socio"), selos };
      }
      default:
        return vazio;
    }
  }

  // Une a base importada das planilhas com os lançamentos do sistema para um ano.
  function calcularAno(ano) {
    const db = lerDb() || { pessoas: [], lancamentos: [] };
    const base = dadosBase(ano);
    const basePorChave = new Map((base?.people || []).map((p) => [p.key || normalizar(p.name), p]));
    const lancamentos = db.lancamentos.filter((l) => l.ano === Number(ano));
    const pilares = ["felicidade", "eventos", "tecnica", "socio", "competencias", "extras"];

    const pessoas = db.pessoas.length
      ? db.pessoas
      : (base?.people || []).map((p) => ({ id: p.key, nome: p.name, chaveBase: p.key, categoria: categoriaPorRotulo[p.category] || null, ativo: true }));

    return pessoas
      .filter((p) => p.ativo)
      .map((pessoa) => {
        const b = basePorChave.get(pessoa.chaveBase);
        const linha = {
          pessoa,
          base: {
            score: b?.score || 0,
            levelScore: b?.levelScore || 0,
            felicidade: b?.felicidade || 0,
            eventos: b?.eventos || 0,
            tecnica: b?.tecnica || 0,
            socio: b?.socio || 0,
            competencias: b?.competencias || 0,
          },
          sistema: Object.fromEntries(pilares.map((k) => [k, 0])),
          porBimestre: {},
          lancamentos: [],
          selos: new Set(b?.badges || []),
          badgeScores: { ...(b?.badgeScores || {}) },
        };

        lancamentos.forEach((l) => {
          const pts = pontosDoLancamento(l, pessoa.id);
          const total = pilares.reduce((t, k) => t + pts[k], 0);
          if (!total && !pts.selos.length) return;
          linha.lancamentos.push(l);
          const bim = (linha.porBimestre[l.bimestre || 0] ||= Object.fromEntries(pilares.map((k) => [k, 0])));
          pilares.forEach((k) => {
            linha.sistema[k] += pts[k];
            bim[k] += pts[k];
          });
          pts.selos.forEach((s) => linha.selos.add(s));
        });

        const somaSistema = pilares.reduce((t, k) => t + linha.sistema[k], 0);
        linha.score = linha.base.score + somaSistema;
        linha.levelScore = (linha.base.levelScore || linha.base.score) + somaSistema;
        linha.felicidadeTotal = linha.base.felicidade + linha.sistema.felicidade;
        if (linha.felicidadeTotal >= R.maxFelicidadeCiclo) {
          linha.selos.add("happy");
          linha.badgeScores.happy = linha.felicidadeTotal;
        }
        linha.nivel = R.nivelPorPontos(linha.levelScore);
        return linha;
      })
      .sort((a, b) => b.score - a.score || a.pessoa.nome.localeCompare(b.pessoa.nome));
  }

  window.SAVA_STORE = {
    ADMIN_PADRAO,
    normalizar,
    garantirDb,
    lerDb,
    ouvir,
    entrar,
    sair,
    usuarioAtual,
    listarUsuarios,
    salvarUsuario,
    listarPessoas,
    salvarPessoa,
    listarLancamentos,
    registrarLancamento,
    excluirLancamento,
    pontosDoLancamento,
    calcularAno,
  };
})();
