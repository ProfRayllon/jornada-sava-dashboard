// Camada de dados da Jornada SAVA.
// Os dados ficam no PostgreSQL, atrás da API em /api (pasta server/). Este arquivo mantém uma cópia
// em memória do estado, para que as telas continuem lendo de forma síncrona; toda escrita vai para a
// API e, em seguida, o estado é recarregado. Mudanças feitas por outros usuários chegam por SSE.
(function () {
  const R = window.SAVA_REGRAS;
  const LEGADO_KEY = "sava.v1.db"; // base antiga, salva no navegador antes do PostgreSQL
  const ouvintes = new Set();

  let db = null; // { usuarios, pessoas, lancamentos, atividades, ciclos, atualizadoEm }
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
    db = { usuarios: estado.usuarios || [], coordenadores: estado.coordenadores || [], modeloAvaliacao: estado.modeloAvaliacao || null, pessoas: estado.pessoas || [], lancamentos: estado.lancamentos || [], atividades: estado.atividades || [], ciclos: estado.ciclos || null, atualizadoEm: estado.atualizadoEm };
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
  // Modelo de avaliação (áreas e perguntas). Sem servidor, usa o padrão das regras.
  function modeloAvaliacao() {
    return db?.modeloAvaliacao || R.modeloPadrao();
  }

  async function salvarModeloAvaliacao(modelo, { restaurar = false } = {}) {
    const r = await api("modelo-avaliacao", { metodo: "PUT", corpo: restaurar ? { restaurar: true } : { modelo } });
    await aposEscrita();
    return r.modelo;
  }

  // Logins com perfil Coordenador (id interno "lider"), para o cadastro de colaboradores.
  function listarCoordenadores() {
    return db?.coordenadores || [];
  }

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

  // ---------- Ciclos ----------
  // Períodos definidos pelo administrador (ex.: "1º semestre de 2027"). Todo lançamento entra no
  // ciclo que contém a sua data. Sem servidor (homepage sem API), os anos da base das planilhas
  // viram ciclos anuais.
  function ciclosDaBase() {
    return Object.keys(BASE_PLANILHAS?.years || {})
      .map(Number)
      .map((a) => ({ id: `c${a}`, nome: `Jornada ${a}`, inicio: `${a}-01-01`, fim: `${a}-12-31`, tetoFelicidade: R.maxFelicidadeAno, tetoEventos: R.maxEventosAno, publicado: true, anoBase: a }));
  }

  // Do mais recente para o mais antigo.
  function listarCiclos() {
    const lista = db?.ciclos ? db.ciclos : ciclosDaBase(); // lista vazia do servidor = nenhum ciclo
    return [...lista].sort((a, b) => b.inicio.localeCompare(a.inicio));
  }

  const cicloPorId = (id) => (id && typeof id === "object" ? id : listarCiclos().find((c) => c.id === id) || null);
  const noCiclo = (c, data) => Boolean(c && data && data >= c.inicio && data <= c.fim);
  const cicloDaData = (data) => listarCiclos().find((c) => noCiclo(c, data)) || null;
  const ciclosPublicados = () => listarCiclos().filter((c) => c.publicado);
  // Nome curto: os ciclos das planilhas aparecem só com o ano ("2026").
  const rotuloCiclo = (c) => (c ? (c.anoBase ? String(c.anoBase) : c.nome) : "");
  // Chave numérica do ciclo no painel (que ordena por número): os ciclos das planilhas mantêm o
  // ano (2025, 2026) e os outros usam a data de início (20270101), sempre em ordem cronológica.
  const chavePainel = (id) => {
    const c = cicloPorId(id);
    return c ? c.anoBase || Number(c.inicio.replace(/-/g, "")) : null;
  };
  const lancamentosDoCiclo = (id) => (db?.lancamentos || []).filter((l) => noCiclo(cicloPorId(id), l.data));
  const atividadesDoCiclo = (id) => (db?.atividades || []).filter((a) => noCiclo(cicloPorId(id), a.data));

  // Ciclo em andamento: o que contém a data de hoje; senão o último que já começou.
  function cicloVigente() {
    const hoje = new Date().toISOString().slice(0, 10);
    const lista = listarCiclos();
    return cicloDaData(hoje) || lista.find((c) => c.inicio <= hoje) || lista.at(-1) || null;
  }

  async function salvarCiclo(dados) {
    const { ciclo } = await api(dados.id ? `ciclos/${encodeURIComponent(dados.id)}` : "ciclos", { metodo: dados.id ? "PUT" : "POST", corpo: dados });
    await aposEscrita();
    return ciclo;
  }

  async function publicarCiclo(id, publicado) {
    await api(`ciclos/${encodeURIComponent(id)}/publicado`, { metodo: "PUT", corpo: { publicado } });
    await aposEscrita();
  }

  async function excluirCiclo(id) {
    await api(`ciclos/${encodeURIComponent(id)}`, { metodo: "DELETE" });
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

  // Une a base importada das planilhas com os lançamentos do sistema para um ciclo.
  // Num ciclo sem planilha, a pontuação começa do zero, mas o nível continua acumulando a partir
  // do ciclo anterior. O selo "Sou feliz!" usa o teto de Felicidade do próprio ciclo.
  function calcularCiclo(id) {
    const ciclo = cicloPorId(id);
    if (!ciclo) return [];
    const dados = db || { pessoas: [], lancamentos: [] };
    const base = ciclo.anoBase ? dadosBase(ciclo.anoBase) : null;
    const anterior = listarCiclos().find((c) => c.inicio < ciclo.inicio);
    const nivelAnterior = new Map();
    if (!base && anterior) {
      calcularCiclo(anterior).forEach((l) => nivelAnterior.set(l.pessoa.id, l.levelScore));
    }
    const basePorChave = new Map((base?.people || []).map((p) => [p.key || normalizar(p.name), p]));
    const lancamentos = dados.lancamentos.filter((l) => noCiclo(ciclo, l.data));
    const pilares = ["felicidade", "eventos", "tecnica", "socio", "competencias", "extras"];
    const tetoFelicidade = ciclo.tetoFelicidade ?? R.maxFelicidadeAno;

    const daPlanilha = (p) => {
      const chave = p.key || normalizar(p.name);
      return { id: `base:${chave}`, nome: p.name, chaveBase: chave, categoria: categoriaPorRotulo[p.category] || null, ativo: true, daPlanilha: true };
    };

    let pessoas;
    if (!dados.pessoas.length) {
      pessoas = (base?.people || []).map(daPlanilha);
    } else if (base && ciclo.anoBase !== R.anoAtual) {
      // Ciclo fechado vindo de planilha (ex.: 2025): a planilha é a referência, porque o cadastro do
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
      // Colaboradores com lançamentos nesse ciclo que não constam na planilha.
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
        if (tetoFelicidade > 0 && linha.felicidadeTotal >= tetoFelicidade) {
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
    listarCoordenadores,
    modeloAvaliacao,
    salvarModeloAvaliacao,
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
    listarCiclos,
    cicloPorId,
    cicloDaData,
    cicloVigente,
    ciclosPublicados,
    rotuloCiclo,
    chavePainel,
    salvarCiclo,
    publicarCiclo,
    excluirCiclo,
    lancamentosDoCiclo,
    atividadesDoCiclo,
    listarAtividades,
    salvarAtividade,
    excluirAtividade,
    pontosDoLancamento,
    temBase: (id) => Boolean(cicloPorId(id)?.anoBase && dadosBase(cicloPorId(id).anoBase)),
    calcularCiclo,
  };
})();
