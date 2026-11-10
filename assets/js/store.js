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
    db = { usuarios: estado.usuarios || [], pessoas: estado.pessoas || [], lancamentos: estado.lancamentos || [], atividades: estado.atividades || [], anosPublicados: estado.anosPublicados || null, atualizadoEm: estado.atualizadoEm };
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

  // Foto do colaborador: URL com a versão (data de envio) para o navegador não usar a antiga.
  function fotoUrl(pessoa) {
    return pessoa?.fotoEm ? `api/pessoas/${encodeURIComponent(pessoa.id)}/foto?v=${Date.parse(pessoa.fotoEm) || 1}` : null;
  }

  // Reduz a foto no navegador (lado maior até 1000 px) mantendo a transparência; devolve um data URL.
  function prepararFoto(arquivo) {
    return new Promise((resolve, reject) => {
      if (!/^image\//.test(arquivo?.type || "")) return reject(new Error("Escolha um arquivo de imagem (PNG, WebP ou JPG)."));
      const url = URL.createObjectURL(arquivo);
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, 1000 / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.naturalWidth * escala);
        canvas.height = Math.round(img.naturalHeight * escala);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        let dados = canvas.toDataURL("image/webp", 0.9);
        if (!dados.startsWith("data:image/webp")) dados = canvas.toDataURL("image/png");
        resolve(dados);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Não foi possível ler a imagem."));
      };
      img.src = url;
    });
  }

  async function salvarFoto(id, dataUrl) {
    await api(`pessoas/${encodeURIComponent(id)}/foto`, { metodo: "PUT", corpo: { dados: dataUrl } });
    await aposEscrita();
  }

  async function removerFoto(id) {
    await api(`pessoas/${encodeURIComponent(id)}/foto`, { metodo: "DELETE" });
    await aposEscrita();
  }

  async function excluirPessoa(id) {
    const r = await api(`pessoas/${encodeURIComponent(id)}`, { metodo: "DELETE" });
    await aposEscrita();
    return r;
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

  // ---------- Anos publicados na homepage ----------
  function anosPublicados() {
    return db?.anosPublicados || [];
  }

  async function publicarAno(ano, publicado) {
    await api(`anos-publicados/${Number(ano)}`, { metodo: "PUT", corpo: { publicado } });
    await aposEscrita();
  }

  // ---------- Eventos (encontros, eventos, missões e ciclos de avaliação) ----------
  function listarAtividades() {
    return db?.atividades || [];
  }

  async function salvarAtividade(dados) {
    const { atividade } = await api(dados.id ? `atividades/${encodeURIComponent(dados.id)}` : "atividades", {
      metodo: dados.id ? "PUT" : "POST",
      corpo: dados,
    });
    await aposEscrita();
    return atividade;
  }

  async function excluirAtividade(id) {
    await api(`atividades/${encodeURIComponent(id)}`, { metodo: "DELETE" });
    await aposEscrita();
  }

  const pontosDoLancamento = R.pontosDoLancamento;

  // Anos com dados: os da base das planilhas, os que já têm lançamento e o ano de referência.
  function anosDisponiveis() {
    const anos = new Set([R.anoAtual, ...Object.keys(BASE_PLANILHAS?.years || {}).map(Number)]);
    (db?.lancamentos || []).forEach((l) => l.ano && anos.add(Number(l.ano)));
    (db?.atividades || []).forEach((a) => a.ano && anos.add(Number(a.ano)));
    return [...anos].filter(Boolean).sort((a, b) => b - a);
  }

  // Ano da Jornada em andamento: o mais recente que tem dados (ex.: 2027 assim que houver um lançamento em 2027).
  function anoVigente() {
    return anosDisponiveis()[0];
  }

  // Une a base importada das planilhas com os lançamentos do sistema para um ano.
  // Num ano sem planilha (ex.: 2027), a pontuação do ano começa do zero, mas o nível
  // continua acumulando a partir do ano anterior.
  function calcularAno(ano) {
    ano = Number(ano);
    const dados = db || { pessoas: [], lancamentos: [] };
    const base = dadosBase(ano);
    const menorAno = Math.min(...anosDisponiveis());
    const nivelAnterior = new Map();
    if (!base && ano - 1 >= menorAno) {
      calcularAno(ano - 1).forEach((l) => nivelAnterior.set(l.pessoa.id, l.levelScore));
    }
    const basePorChave = new Map((base?.people || []).map((p) => [p.key || normalizar(p.name), p]));
    const lancamentos = dados.lancamentos.filter((l) => l.ano === Number(ano));
    const pilares = ["felicidade", "eventos", "tecnica", "socio", "competencias", "extras"];

    const daPlanilha = (p) => {
      const chave = p.key || normalizar(p.name);
      return { id: `base:${chave}`, nome: p.name, chaveBase: chave, categoria: categoriaPorRotulo[p.category] || null, ativo: true, daPlanilha: true };
    };

    let pessoas;
    if (!dados.pessoas.length) {
      pessoas = (base?.people || []).map(daPlanilha);
    } else if (base && ano !== R.anoAtual) {
      // Ano fechado vindo de planilha (ex.: 2025): a planilha é a referência, porque o cadastro do
      // sistema foi importado da planilha de 2026 e os nomes mudam de um ano para o outro
      // ("DAVI DE ASSIS PINHEIRO DA SILVA" em 2025, "DAVI DE ASSIS" em 2026). Cada linha é ligada
      // ao colaborador cadastrado quando o nome bate; quem não está mais no cadastro aparece igual.
      const usados = new Set();
      const acharCadastro = (bp) => {
        const n = normalizar(bp.name);
        return dados.pessoas.find((p) => {
          if (usados.has(p.id)) return false;
          const m = normalizar(p.nome);
          return p.chaveBase === bp.key || m === n || n.startsWith(`${m} `) || m.startsWith(`${n} `);
        });
      };
      pessoas = base.people.map((bp) => {
        const cadastro = acharCadastro(bp);
        if (!cadastro) return daPlanilha(bp);
        usados.add(cadastro.id);
        return { ...cadastro, chaveBase: bp.key || normalizar(bp.name), ativo: true };
      });
      // Colaboradores com lançamentos nesse ano que não constam na planilha.
      dados.pessoas
        .filter((p) => p.ativo && !usados.has(p.id) && lancamentos.some((l) => l.pessoaId === p.id || l.pessoaIds?.includes(p.id)))
        .forEach((p) => pessoas.push(p));
    } else {
      pessoas = dados.pessoas;
    }

    return pessoas
      .filter((p) => p.ativo && R.participaDaJornada(p))
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
        const nivelBase = base ? linha.base.levelScore || linha.base.score : nivelAnterior.get(pessoa.id) || 0;
        linha.levelScore = nivelBase + somaSistema;
        linha.felicidadeTotal = linha.base.felicidade + linha.sistema.felicidade;
        if (linha.felicidadeTotal >= R.maxFelicidadeAno) {
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
    excluirPessoa,
    fotoUrl,
    prepararFoto,
    salvarFoto,
    removerFoto,
    listarLancamentos,
    registrarLancamento,
    excluirLancamento,
    anosPublicados,
    publicarAno,
    listarAtividades,
    salvarAtividade,
    excluirAtividade,
    pontosDoLancamento,
    anosDisponiveis,
    anoVigente,
    temBase: (ano) => Boolean(dadosBase(ano)),
    calcularAno,
  };
})();
