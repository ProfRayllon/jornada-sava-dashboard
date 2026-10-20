// Camada de dados da Jornada SAVA.
// Os dados ficam no PostgreSQL, atrás da API em /api (pasta server/). Este arquivo mantém uma cópia
// em memória do estado, para que as telas continuem lendo de forma síncrona; toda escrita vai para a
// API e, em seguida, o estado é recarregado. Mudanças feitas por outros usuários chegam por SSE.
(function () {
  const R = window.SAVA_REGRAS;
  const LEGADO_KEY = "sava.v1.db"; // base antiga, salva no navegador antes do PostgreSQL
  const ouvintes = new Set();

  let db = null; // { usuarios, pessoas, lancamentos, atualizadoEm }
  let eu = null; // usuário logado (null na homepage pública)
  let carregando = null;
  let eventos = null;

  const categoriaPorRotulo = {
    "Advogados Associados": "adv",
    "Controladoria e Administrativo": "adm",
  };

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

  async function api(caminho, { metodo = "GET", corpo } = {}) {
    let resp;
    try {
      resp = await fetch(`api/${caminho}`, {
        method: metodo,
        credentials: "same-origin",
        headers: corpo ? { "Content-Type": "application/json" } : undefined,
        body: corpo ? JSON.stringify(corpo) : undefined,
      });
    } catch {
      throw new Error("Sem conexão com o servidor. Tente novamente.");
    }
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const erro = new Error(json.erro || "Não foi possível concluir a operação.");
      erro.status = resp.status;
      throw erro;
    }
    return json;
  }

  async function recarregar() {
    let estado;
    try {
      estado = await api("estado");
    } catch (err) {
      if (err.status !== 401) throw err;
      estado = await api("publico");
    }
    eu = estado.eu || null;
    db = { usuarios: estado.usuarios || [], pessoas: estado.pessoas || [], lancamentos: estado.lancamentos || [], atualizadoEm: estado.atualizadoEm };
    return db;
  }

  async function garantirDb() {
    if (db) return db;
    carregando ||= recarregar().finally(() => (carregando = null));
    await carregando;
    if (eu) iniciarTempoReal();
    if (eu?.perfil === "admin") await migrarBaseDoNavegador();
    return db;
  }

  function lerDb() {
    return db;
  }

  async function aposEscrita() {
    await recarregar();
    ouvintes.forEach((fn) => fn());
  }

  // Tempo real: o servidor avisa quando qualquer usuário grava algo.
  function iniciarTempoReal() {
    if (eventos || !("EventSource" in window)) return;
    eventos = new EventSource("api/eventos");
    eventos.addEventListener("atualizado", async () => {
      try {
        await recarregar();
      } catch {
        return;
      }
      ouvintes.forEach((fn) => fn());
    });
  }

  function ouvir(fn) {
    ouvintes.add(fn);
  }

  // Leva para o PostgreSQL o que foi registrado quando os dados ficavam no navegador.
  async function migrarBaseDoNavegador() {
    let legado;
    try {
      legado = JSON.parse(localStorage.getItem(LEGADO_KEY) || "null");
    } catch {
      return;
    }
    if (!legado?.lancamentos?.length && !legado?.usuarios?.length) return;
    if (db.lancamentos.length) return; // o servidor já tem dados: não mistura bases
    const msg = `Encontramos ${legado.lancamentos.length} lançamento(s) e ${legado.usuarios.length} acesso(s) salvos neste navegador, de antes do banco de dados.\n\nDeseja enviar esses dados para o servidor agora?`;
    if (!confirm(msg)) return;
    try {
      await api("importar", { metodo: "POST", corpo: legado });
      localStorage.removeItem(LEGADO_KEY);
      await recarregar();
      alert("Dados enviados para o servidor.");
    } catch (err) {
      alert(`Não foi possível importar: ${err.message}`);
    }
  }

  // ---------- Sessão ----------
  async function entrar(email, senha) {
    const { usuario } = await api("entrar", { metodo: "POST", corpo: { email, senha } });
    db = null;
    return usuario;
  }

  async function sair() {
    eventos?.close();
    eventos = null;
    try {
      await api("sair", { metodo: "POST" });
    } catch {}
    db = null;
    eu = null;
  }

  function usuarioAtual() {
    return eu;
  }

  async function trocarSenha(senha) {
    await api("minha-senha", { metodo: "POST", corpo: { senha } });
    await aposEscrita();
  }

  // ---------- Usuários (equipe) ----------
  function listarUsuarios() {
    return db?.usuarios || [];
  }

  async function salvarUsuario(dados) {
    const { usuario } = await api(dados.id ? `usuarios/${encodeURIComponent(dados.id)}` : "usuarios", {
      metodo: dados.id ? "PUT" : "POST",
      corpo: dados,
    });
    await aposEscrita();
    return usuario;
  }

  // ---------- Pessoas avaliadas ----------
  function listarPessoas() {
    return db?.pessoas || [];
  }

  async function salvarPessoa(dados) {
    const { pessoa } = await api(dados.id ? `pessoas/${encodeURIComponent(dados.id)}` : "pessoas", {
      metodo: dados.id ? "PUT" : "POST",
      corpo: dados,
    });
    await aposEscrita();
    return pessoa;
  }

  // ---------- Lançamentos ----------
  function listarLancamentos() {
    return db?.lancamentos || [];
  }

  async function registrarLancamento(dados) {
    const { lancamento } = await api("lancamentos", { metodo: "POST", corpo: dados });
    await aposEscrita();
    return lancamento;
  }

  async function excluirLancamento(id) {
    await api(`lancamentos/${encodeURIComponent(id)}`, { metodo: "DELETE" });
    await aposEscrita();
  }

  const pontosDoLancamento = R.pontosDoLancamento;

  // Une a base importada das planilhas com os lançamentos do sistema para um ano.
  function calcularAno(ano) {
    const dados = db || { pessoas: [], lancamentos: [] };
    const base = dadosBase(ano);
    const basePorChave = new Map((base?.people || []).map((p) => [p.key || normalizar(p.name), p]));
    const lancamentos = dados.lancamentos.filter((l) => l.ano === Number(ano));
    const pilares = ["felicidade", "eventos", "tecnica", "socio", "competencias", "extras"];

    const pessoas = dados.pessoas.length
      ? dados.pessoas
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
    normalizar,
    garantirDb,
    lerDb,
    ouvir,
    entrar,
    sair,
    usuarioAtual,
    trocarSenha,
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
