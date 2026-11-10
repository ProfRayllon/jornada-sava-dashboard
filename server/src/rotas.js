const express = require("express");
const R = require("./regras");
const db = require("./db");
const auth = require("./auth");
const { gerarHash, conferir } = require("./senha");

const { pool, uid, normalizar, transacao, tocar, usuarioPublico, pessoaDoBanco, lancamentoDoBanco, atividadeDoBanco } = db;
const rotas = express.Router();

const PERFIS = ["admin", "rh", "lider"];
const TIPOS_POR_PERFIL = {
  admin: ["felicidade", "evento", "avaliacao", "indicacao", "missao", "protagonista"],
  rh: ["felicidade", "evento", "avaliacao", "indicacao", "missao", "protagonista"],
  lider: ["avaliacao", "protagonista"],
};

class ErroDeUso extends Error {
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.status = status;
  }
}

const texto = (v, max = 2000) => String(v ?? "").trim().slice(0, max);
const assincrono = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// ---------- Tempo real (SSE) ----------
const conexoes = new Set();

function avisarTodos() {
  for (const res of conexoes) res.write("event: atualizado\ndata: {}\n\n");
}

rotas.get("/eventos", auth.exigir(), (req, res) => {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders();
  res.write("retry: 5000\n\n");
  conexoes.add(res);
  const pulso = setInterval(() => res.write(": ping\n\n"), 25000);
  req.on("close", () => {
    clearInterval(pulso);
    conexoes.delete(res);
  });
});

// ---------- Leitura ----------
rotas.get("/saude", assincrono(async (req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true });
}));

async function lerTudo() {
  const [pessoas, lancamentos, atualizadoEm] = await Promise.all([
    pool.query("SELECT p.*, f.atualizado_em AS foto_em FROM pessoas p LEFT JOIN pessoa_fotos f ON f.pessoa_id = p.id ORDER BY p.nome"),
    pool.query("SELECT * FROM lancamentos ORDER BY criado_em"),
    db.atualizadoEm(),
  ]);
  return { pessoas: pessoas.rows.map(pessoaDoBanco), lancamentos: lancamentos.rows.map(lancamentoDoBanco), atualizadoEm };
}

async function lerAnosPublicados(c = pool) {
  const { rows } = await c.query("SELECT valor FROM meta WHERE chave = 'anos_publicados'");
  try {
    const anos = JSON.parse(rows[0]?.valor || "[]");
    return Array.isArray(anos) ? anos.map(Number).filter(Boolean).sort((a, b) => a - b) : [];
  } catch {
    return [];
  }
}

// ---------- Modelo de avaliação (questionário editável pelo administrador) ----------
async function lerModeloAvaliacao(c = pool) {
  const { rows } = await c.query("SELECT valor FROM meta WHERE chave = 'modelo_avaliacao'");
  try {
    const modelo = JSON.parse(rows[0]?.valor || "null");
    if (modelo?.adm && modelo?.adv) return modelo;
  } catch {
    // modelo corrompido: usa o padrão
  }
  return R.modeloPadrao();
}

// Confere e limpa o modelo enviado pelo administrador.
function validarModelo(b) {
  const modelo = {};
  for (const cat of R.categoriasPontuaveis) {
    const m = b?.[cat];
    if (!m || !Array.isArray(m.areas) || !Array.isArray(m.perguntas)) throw new ErroDeUso("Modelo de avaliação inválido.");
    const nomeCat = R.categorias[cat];
    const areas = m.areas.map((a) => ({ id: texto(a.id, 60), nome: texto(a.nome, 120), grupo: a.grupo }));
    if (!areas.length) throw new ErroDeUso(`${nomeCat}: crie ao menos uma área.`);
    for (const a of areas) {
      if (!a.id || !a.nome) throw new ErroDeUso(`${nomeCat}: dê um nome a todas as áreas.`);
      if (!R.grupos[a.grupo]) throw new ErroDeUso(`${nomeCat}: escolha se a área “${a.nome}” é técnica ou socioemocional.`);
    }
    if (new Set(areas.map((a) => a.id)).size !== areas.length) throw new ErroDeUso("Áreas repetidas no modelo.");
    const idsAreas = new Set(areas.map((a) => a.id));
    const perguntas = m.perguntas.map((q) => ({
      id: texto(q.id, 60),
      areaId: texto(q.areaId, 60),
      texto: texto(q.texto, 400),
      descricao: texto(q.descricao, 600),
      valores: Array.isArray(q.valores) ? q.valores.map((v) => Math.round(Number(v))) : [],
    }));
    if (!perguntas.length) throw new ErroDeUso(`${nomeCat}: o questionário precisa de ao menos uma pergunta.`);
    for (const q of perguntas) {
      if (!q.id || !idsAreas.has(q.areaId)) throw new ErroDeUso(`${nomeCat}: há pergunta sem área.`);
      if (!q.texto) throw new ErroDeUso(`${nomeCat}: escreva o texto de todas as perguntas.`);
      const v = q.valores;
      if (v.length !== R.rotulosNota.length || v.some((n) => !Number.isFinite(n) || n < 0) || v.some((n, i) => i && n <= v[i - 1]))
        throw new ErroDeUso(`${nomeCat}: em “${q.texto.slice(0, 60)}”, os Savacoins dos 4 níveis precisam ser crescentes.`);
    }
    if (new Set(perguntas.map((q) => q.id)).size !== perguntas.length) throw new ErroDeUso("Perguntas repetidas no modelo.");
    modelo[cat] = { areas, perguntas };
  }
  return modelo;
}

rotas.put("/modelo-avaliacao", auth.exigir("admin"), assincrono(async (req, res) => {
  const modelo = req.body?.restaurar ? R.modeloPadrao() : validarModelo(req.body?.modelo);
  await transacao(async (c) => {
    await c.query(
      "INSERT INTO meta (chave, valor) VALUES ('modelo_avaliacao', $1) ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor",
      [JSON.stringify(modelo)],
    );
    await tocar(c);
  });
  avisarTodos();
  res.json({ modelo });
}));

// Homepage pública: só o necessário para somar o ranking, sem notas, feedbacks nem autores,
// e só dos anos que o administrador publicou no site.
rotas.get("/publico", assincrono(async (req, res) => {
  const { pessoas, lancamentos, atualizadoEm } = await lerTudo();
  const anosPublicados = await lerAnosPublicados();
  res.json({
    anosPublicados,
    pessoas: pessoas.map(({ id, nome, chaveBase, categoria, ativo }) => ({ id, nome, chaveBase, categoria, ativo })),
    lancamentos: lancamentos.filter((l) => anosPublicados.includes(l.ano)).map((l) => {
      const { selos, ...pontos } = R.pontosDoLancamento({ ...l, pessoaId: undefined, pessoaIds: undefined }, null);
      return { id: l.id, ano: l.ano, bimestre: l.bimestre, pessoaId: l.pessoaId, pessoaIds: l.pessoaIds, tipo: "resumo", resumo: { ...pontos, selos } };
    }),
    atualizadoEm,
  });
}));

rotas.get("/estado", auth.exigir(), assincrono(async (req, res) => {
  const tudo = await lerTudo();
  const { rows: atividades } = await pool.query("SELECT * FROM atividades ORDER BY data DESC, criado_em DESC");
  tudo.atividades = atividades.map(atividadeDoBanco);
  tudo.anosPublicados = await lerAnosPublicados();
  let usuarios = [];
  if (req.usuario.perfil === "admin") {
    const { rows } = await pool.query("SELECT * FROM usuarios ORDER BY nome");
    usuarios = rows.map(usuarioPublico);
  }
  // Coordenadores (logins com perfil "lider"), para o cadastro de colaboradores (admin e RH).
  let coordenadores = [];
  if (["admin", "rh"].includes(req.usuario.perfil)) {
    const { rows } = await pool.query("SELECT id, nome, ativo FROM usuarios WHERE perfil = 'lider' ORDER BY nome");
    coordenadores = rows;
  }
  const modeloAvaliacao = await lerModeloAvaliacao();
  res.json({ eu: req.usuario, usuarios, coordenadores, modeloAvaliacao, ...tudo });
}));

// Publica ou oculta um ano na homepage (só administrador).
rotas.put("/anos-publicados/:ano", auth.exigir("admin"), assincrono(async (req, res) => {
  const ano = Number(req.params.ano);
  if (!Number.isInteger(ano) || ano < 2025 || ano > new Date().getFullYear() + 1) throw new ErroDeUso("Ano inválido.");
  const anosPublicados = await transacao(async (c) => {
    const atuais = new Set(await lerAnosPublicados(c));
    if (req.body?.publicado) atuais.add(ano);
    else atuais.delete(ano);
    const lista = [...atuais].sort((a, b) => a - b);
    await c.query(
      "INSERT INTO meta (chave, valor) VALUES ('anos_publicados', $1) ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor",
      [JSON.stringify(lista)],
    );
    await tocar(c);
    return lista;
  });
  avisarTodos();
  res.json({ anosPublicados });
}));

// ---------- Sessão ----------
rotas.post("/entrar", assincrono(async (req, res) => {
  const ip = req.ip;
  if (auth.loginBloqueado(ip)) throw new ErroDeUso("Muitas tentativas. Aguarde alguns minutos e tente novamente.", 429);
  const email = texto(req.body.email, 200).toLowerCase();
  const { rows } = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
  const usuario = rows[0];
  const conferencia = usuario?.ativo ? await conferir(req.body.senha || "", usuario.senha_hash) : { ok: false };
  if (!conferencia.ok) {
    auth.registrarFalha(ip);
    throw new ErroDeUso("Usuário ou senha inválidos.", 401);
  }
  auth.limparFalhas(ip);
  if (conferencia.precisaRefazer) {
    await pool.query("UPDATE usuarios SET senha_hash = $1 WHERE id = $2", [await gerarHash(req.body.senha), usuario.id]);
  }
  await auth.criarSessao(res, usuario.id);
  res.json({ usuario: usuarioPublico(usuario) });
}));

rotas.post("/sair", assincrono(async (req, res) => {
  await auth.encerrarSessao(req, res);
  res.json({ ok: true });
}));

rotas.post("/minha-senha", auth.exigir(), assincrono(async (req, res) => {
  const senha = String(req.body.senha || "");
  if (senha.length < 6) throw new ErroDeUso("Use pelo menos 6 caracteres.");
  await pool.query("UPDATE usuarios SET senha_hash = $1, trocar_senha = FALSE WHERE id = $2", [await gerarHash(senha), req.usuario.id]);
  res.json({ ok: true });
}));

// ---------- Usuários (equipe) ----------
async function salvarUsuario(req, res) {
  const b = req.body;
  const id = req.params.id || null;
  const nome = texto(b.nome, 120);
  const email = texto(b.email, 200).toLowerCase();
  if (!nome || !email) throw new ErroDeUso("Preencha nome e e-mail.");
  if (!PERFIS.includes(b.perfil)) throw new ErroDeUso("Perfil inválido.");
  if (b.senha && String(b.senha).length < 6) throw new ErroDeUso("A senha precisa de pelo menos 6 caracteres.");
  if (!id && !b.senha) throw new ErroDeUso("Defina uma senha inicial.");

  const usuario = await transacao(async (c) => {
    const dup = await c.query("SELECT 1 FROM usuarios WHERE email = $1 AND id <> COALESCE($2, '')", [email, id]);
    if (dup.rowCount) throw new ErroDeUso("Já existe um usuário com este e-mail.");

    let linha;
    if (id) {
      const r = await c.query(
        `UPDATE usuarios SET nome = $2, email = $3, perfil = $4, area = $5, ativo = COALESCE($6, ativo)
         WHERE id = $1 RETURNING *`,
        [id, nome, email, b.perfil, texto(b.area, 120), typeof b.ativo === "boolean" ? b.ativo : null],
      );
      if (!r.rowCount) throw new ErroDeUso("Usuário não encontrado.", 404);
      linha = r.rows[0];
    } else {
      const r = await c.query("INSERT INTO usuarios (id, nome, email, perfil, area, senha_hash) VALUES ($1, $2, $3, $4, $5, '') RETURNING *", [
        uid("u"), nome, email, b.perfil, texto(b.area, 120),
      ]);
      linha = r.rows[0];
    }
    if (b.senha) {
      const r = await c.query("UPDATE usuarios SET senha_hash = $2, trocar_senha = $3 WHERE id = $1 RETURNING *", [linha.id, await gerarHash(b.senha), Boolean(b.trocarSenha)]);
      linha = r.rows[0];
    }
    if (!linha.ativo) await c.query("DELETE FROM sessoes WHERE usuario_id = $1", [linha.id]);
    // Quem deixou de ser coordenador sai como coordenador dos colaboradores.
    if (linha.perfil !== "lider") await c.query("UPDATE pessoas SET coordenador_id = NULL WHERE coordenador_id = $1", [linha.id]);

    const admins = await c.query("SELECT count(*)::int AS n FROM usuarios WHERE perfil = 'admin' AND ativo");
    if (!admins.rows[0].n) throw new ErroDeUso("O sistema precisa de pelo menos um administrador ativo.");
    await tocar(c);
    return usuarioPublico(linha);
  });
  avisarTodos();
  res.json({ usuario });
}

rotas.post("/usuarios", auth.exigir("admin"), assincrono(salvarUsuario));
rotas.put("/usuarios/:id", auth.exigir("admin"), assincrono(salvarUsuario));

// ---------- Pessoas avaliadas ----------
async function salvarPessoa(req, res) {
  const b = req.body;
  const id = req.params.id || null;
  const nome = texto(b.nome, 160).toUpperCase();
  if (!nome) throw new ErroDeUso("Preencha o nome.");
  if (!R.categorias[b.categoria]) throw new ErroDeUso("Selecione o perfil do colaborador.");

  const pessoa = await transacao(async (c) => {
    const { rows: todas } = await c.query("SELECT id, nome FROM pessoas");
    if (todas.some((p) => p.id !== id && normalizar(p.nome) === normalizar(nome))) throw new ErroDeUso("Esta pessoa já está cadastrada.");

    // Coordenador (opcional): só para quem pontua, e precisa ser um login com perfil Coordenador.
    const coordenadorId = R.categoriasPontuaveis.includes(b.categoria) && b.coordenadorId ? String(b.coordenadorId) : null;
    if (coordenadorId) {
      const { rows: coord } = await c.query("SELECT perfil FROM usuarios WHERE id = $1", [coordenadorId]);
      if (coord[0]?.perfil !== "lider") throw new ErroDeUso("Escolha um coordenador válido.");
    }

    let r;
    if (id) {
      r = await c.query("UPDATE pessoas SET nome = $2, categoria = $3, setor = $4, ativo = COALESCE($5, ativo), coordenador_id = $6 WHERE id = $1 RETURNING *", [
        id, nome, b.categoria, texto(b.setor, 120), typeof b.ativo === "boolean" ? b.ativo : null, coordenadorId,
      ]);
      if (!r.rowCount) throw new ErroDeUso("Colaborador não encontrado.", 404);
    } else {
      r = await c.query("INSERT INTO pessoas (id, nome, categoria, setor, coordenador_id) VALUES ($1, $2, $3, $4, $5) RETURNING *", [uid("p"), nome, b.categoria, texto(b.setor, 120), coordenadorId]);
    }
    await tocar(c);
    return pessoaDoBanco(r.rows[0]);
  });
  avisarTodos();
  res.json({ pessoa });
}

rotas.post("/pessoas", auth.exigir("admin", "rh"), assincrono(salvarPessoa));
rotas.put("/pessoas/:id", auth.exigir("admin", "rh"), assincrono(salvarPessoa));

// ---------- Foto do colaborador ----------
const TIPOS_FOTO = { "image/png": true, "image/webp": true, "image/jpeg": true };

rotas.get("/pessoas/:id/foto", auth.exigir(), assincrono(async (req, res) => {
  const { rows } = await pool.query("SELECT tipo, dados FROM pessoa_fotos WHERE pessoa_id = $1", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ erro: "Sem foto." });
  res.set({ "Content-Type": rows[0].tipo, "Cache-Control": "private, max-age=604800" });
  res.send(rows[0].dados);
}));

rotas.put("/pessoas/:id/foto", auth.exigir("admin", "rh"), assincrono(async (req, res) => {
  const m = /^data:(image\/(?:png|webp|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.dados || ""));
  if (!m || !TIPOS_FOTO[m[1]]) throw new ErroDeUso("Envie uma imagem PNG, WebP ou JPG.");
  const dados = Buffer.from(m[2], "base64");
  if (dados.length > 3 * 1024 * 1024) throw new ErroDeUso("A foto ficou grande demais (máximo de 3 MB).");
  await transacao(async (c) => {
    const existe = await c.query("SELECT 1 FROM pessoas WHERE id = $1", [req.params.id]);
    if (!existe.rowCount) throw new ErroDeUso("Colaborador não encontrado.", 404);
    await c.query(
      `INSERT INTO pessoa_fotos (pessoa_id, tipo, dados, atualizado_em) VALUES ($1, $2, $3, now())
       ON CONFLICT (pessoa_id) DO UPDATE SET tipo = EXCLUDED.tipo, dados = EXCLUDED.dados, atualizado_em = now()`,
      [req.params.id, m[1], dados],
    );
    await tocar(c);
  });
  avisarTodos();
  res.json({ ok: true });
}));

rotas.delete("/pessoas/:id/foto", auth.exigir("admin", "rh"), assincrono(async (req, res) => {
  await transacao(async (c) => {
    await c.query("DELETE FROM pessoa_fotos WHERE pessoa_id = $1", [req.params.id]);
    await tocar(c);
  });
  avisarTodos();
  res.json({ ok: true });
}));

// Exclusão definitiva (só administrador). Os pontos da pessoa saem junto: lançamentos individuais
// dela são apagados e, nos coletivos, ela é retirada da lista (o lançamento some se ficar vazio).
rotas.delete("/pessoas/:id", auth.exigir("admin"), assincrono(async (req, res) => {
  const id = req.params.id;
  const resumo = await transacao(async (c) => {
    const existe = await c.query("SELECT 1 FROM pessoas WHERE id = $1", [id]);
    if (!existe.rowCount) throw new ErroDeUso("Colaborador não encontrado.", 404);
    const individuais = await c.query("DELETE FROM lancamentos WHERE dados->>'pessoaId' = $1", [id]);
    const coletivos = await c.query(
      "UPDATE lancamentos SET dados = jsonb_set(dados, '{pessoaIds}', (dados->'pessoaIds') - $1::text) WHERE dados->'pessoaIds' ? $1",
      [id],
    );
    const vazios = await c.query("DELETE FROM lancamentos WHERE jsonb_typeof(dados->'pessoaIds') = 'array' AND jsonb_array_length(dados->'pessoaIds') = 0");
    await c.query("DELETE FROM pessoas WHERE id = $1", [id]);
    await tocar(c);
    return { lancamentosRemovidos: individuais.rowCount + vazios.rowCount, lancamentosAjustados: coletivos.rowCount - vazios.rowCount };
  });
  avisarTodos();
  res.json({ ok: true, ...resumo });
}));

// ---------- Eventos (atividades) ----------
// Encontros, eventos, missões e ciclos de avaliação. Todo lançamento desses tipos aponta para um
// evento e herda dele a data e o ano, então não há como lançar no ano errado.
const TIPOS_ATIVIDADE = ["felicidade", "evento", "missao", "avaliacao"];

function conferirData(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data || "")) || Number.isNaN(Date.parse(data))) throw new ErroDeUso("Informe a data.");
  // Do primeiro ano da Jornada até o ano seguinte ao atual (para já abrir a próxima Jornada).
  const ano = Number(data.slice(0, 4));
  const limiteAno = new Date().getFullYear() + 1;
  if (ano < 2025 || ano > limiteAno) throw new ErroDeUso(`Data fora do período da Jornada (2025 a ${limiteAno}). Confira o ano digitado.`);
  return ano;
}

async function salvarAtividade(req, res) {
  const b = req.body;
  const id = req.params.id || null;
  if (!TIPOS_ATIVIDADE.includes(b.tipo)) throw new ErroDeUso("Escolha o tipo do evento.");
  const titulo = texto(b.titulo, 200);
  if (!titulo) throw new ErroDeUso("Informe o nome do evento.");
  const ano = conferirData(b.data);
  let pontos = null;
  if (b.tipo !== "avaliacao") {
    pontos = Math.round(Number(b.pontos));
    if (!Number.isFinite(pontos) || pontos < 1) throw new ErroDeUso("Informe os Savacoins por pessoa.");
  }

  const atividade = await transacao(async (c) => {
    let r;
    if (id) {
      const atual = await c.query("SELECT tipo FROM atividades WHERE id = $1", [id]);
      if (!atual.rowCount) throw new ErroDeUso("Evento não encontrado.", 404);
      const usados = await c.query("SELECT count(*)::int AS n FROM lancamentos WHERE dados->>'atividadeId' = $1", [id]);
      if (usados.rows[0].n && atual.rows[0].tipo !== b.tipo) throw new ErroDeUso("Este evento já tem pontos lançados; o tipo não pode mudar.");
      r = await c.query("UPDATE atividades SET ano = $2, tipo = $3, titulo = $4, data = $5, pontos = $6, descricao = $7 WHERE id = $1 RETURNING *", [
        id, ano, b.tipo, titulo, b.data, pontos, texto(b.descricao, 1000),
      ]);
      // Os lançamentos do evento acompanham a nova data, o ano e o nome.
      await c.query(
        `UPDATE lancamentos SET ano = $2, dados = dados || jsonb_build_object('data', $3::text, 'titulo', $4::text)
         WHERE dados->>'atividadeId' = $1`,
        [id, ano, b.data, titulo],
      );
    } else {
      r = await c.query("INSERT INTO atividades (id, ano, tipo, titulo, data, pontos, descricao, autor_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *", [
        uid("a"), ano, b.tipo, titulo, b.data, pontos, texto(b.descricao, 1000), req.usuario.id,
      ]);
    }
    await tocar(c);
    return atividadeDoBanco(r.rows[0]);
  });
  avisarTodos();
  res.json({ atividade });
}

rotas.post("/atividades", auth.exigir("admin", "rh"), assincrono(salvarAtividade));
rotas.put("/atividades/:id", auth.exigir("admin", "rh"), assincrono(salvarAtividade));

rotas.delete("/atividades/:id", auth.exigir("admin", "rh"), assincrono(async (req, res) => {
  await transacao(async (c) => {
    const usados = await c.query("SELECT count(*)::int AS n FROM lancamentos WHERE dados->>'atividadeId' = $1", [req.params.id]);
    if (usados.rows[0].n) throw new ErroDeUso(`Este evento tem ${usados.rows[0].n} lançamento(s). Exclua os lançamentos antes de excluir o evento.`, 409);
    const r = await c.query("DELETE FROM atividades WHERE id = $1", [req.params.id]);
    if (!r.rowCount) throw new ErroDeUso("Evento não encontrado.", 404);
    await tocar(c);
  });
  avisarTodos();
  res.json({ ok: true });
}));

// ---------- Lançamentos ----------
// Confere e normaliza o lançamento enviado pelo front-end (as mesmas regras de sistema.js).
// Devolve uma lista: na pontuação em lote, quem recebeu valores diferentes vira lançamentos separados.
async function validarLancamento(b, usuario) {
  const tipo = b.tipo;
  if (!TIPOS_POR_PERFIL[usuario.perfil].includes(tipo)) throw new ErroDeUso("Seu perfil não pode registrar este tipo de lançamento.", 403);

  const { rows } = await pool.query("SELECT id FROM pessoas");
  const existentes = new Set(rows.map((r) => r.id));

  // Tipos ligados a um evento: data, ano e nome vêm do evento cadastrado.
  let atividade = null;
  let jaPontuados = new Set();
  if (TIPOS_ATIVIDADE.includes(tipo)) {
    const r = await pool.query("SELECT * FROM atividades WHERE id = $1", [String(b.atividadeId || "")]);
    atividade = r.rows[0] && atividadeDoBanco(r.rows[0]);
    if (!atividade) throw new ErroDeUso("Selecione o evento cadastrado.");
    if (atividade.tipo !== tipo) throw new ErroDeUso("O evento escolhido é de outro tipo.");
    const { rows: ja } = await pool.query("SELECT dados FROM lancamentos WHERE dados->>'atividadeId' = $1", [atividade.id]);
    jaPontuados = new Set(ja.flatMap((l) => l.dados.pessoaIds || [l.dados.pessoaId]));
  }
  const data = atividade ? atividade.data : String(b.data || "");
  conferirData(data);
  const bimestre = R.bimestreDaData(data);
  const dados = { tipo, data, titulo: atividade ? atividade.titulo : texto(b.titulo, 200), bimestre: bimestre?.id || null };
  if (atividade) dados.atividadeId = atividade.id;

  if (["felicidade", "evento", "missao"].includes(tipo)) {
    const lista = Array.isArray(b.pessoas) ? b.pessoas : [];
    const porPessoa = new Map();
    for (const item of lista) {
      const id = String(item?.id || "");
      const pontos = Math.round(Number(item?.pontos));
      if (!existentes.has(id)) throw new ErroDeUso("Participante não encontrado.");
      if (!Number.isFinite(pontos) || pontos < 1) throw new ErroDeUso("Informe os Savacoins de cada participante marcado.");
      porPessoa.set(id, pontos);
    }
    if (!porPessoa.size) throw new ErroDeUso("Selecione ao menos um participante.");
    const repetidos = [...porPessoa.keys()].filter((id) => jaPontuados.has(id));
    if (repetidos.length) throw new ErroDeUso(`${repetidos.length} pessoa(s) já foram pontuadas neste evento.`);

    const grupos = new Map();
    porPessoa.forEach((pontos, id) => grupos.set(pontos, [...(grupos.get(pontos) || []), id]));
    return [...grupos].map(([pontos, pessoaIds]) => ({ ...dados, pessoaIds, pontos }));
  }

  dados.pessoaId = String(b.pessoaId || "");
  if (!existentes.has(dados.pessoaId)) throw new ErroDeUso("Selecione o colaborador.");
  if (atividade && jaPontuados.has(dados.pessoaId)) throw new ErroDeUso("Esta pessoa já foi avaliada neste ciclo.");
  dados.justificativa = texto(b.justificativa);
  if (tipo === "indicacao") dados.pontos = R.pontosIndicacao;
  if (tipo === "protagonista" && !dados.justificativa) throw new ErroDeUso("Descreva o motivo da indicação.");
  if (tipo === "avaliacao") {
    if (!R.criterios[b.categoria]) throw new ErroDeUso("Categoria da avaliação inválida.");
    // As perguntas vêm do modelo atual; o lançamento guarda uma cópia do que foi respondido,
    // para que mudanças futuras no modelo não alterem avaliações já feitas.
    const perguntas = R.perguntasDoModelo(await lerModeloAvaliacao(), b.categoria);
    dados.categoria = b.categoria;
    dados.notas = {};
    dados.respostas = [];
    for (const q of perguntas) {
      const nota = Number(b.notas?.[q.id]);
      const nivel = q.valores.indexOf(nota);
      if (nivel < 0) throw new ErroDeUso("Responda todas as perguntas da avaliação.");
      dados.notas[q.id] = nota;
      dados.respostas.push({ id: q.id, texto: q.texto, area: q.area.nome, grupo: q.grupo, nivel, valor: nota, max: q.max });
    }
    dados.area = texto(b.area, 120);
    dados.feedback = texto(b.feedback);
    dados.destaque = texto(b.destaque);
    dados.pontos = Object.values(dados.notas).reduce((a, n) => a + n, 0);
  }
  return [dados];
}

rotas.post("/lancamentos", auth.exigir(), assincrono(async (req, res) => {
  const lista = await validarLancamento(req.body, req.usuario);
  const lancamentos = await transacao(async (c) => {
    const gravados = [];
    for (const dados of lista) {
      const ano = Number(dados.data.slice(0, 4));
      const { rows } = await c.query("INSERT INTO lancamentos (id, ano, tipo, autor_id, dados) VALUES ($1, $2, $3, $4, $5) RETURNING *", [
        uid("l"), ano, dados.tipo, req.usuario.id, { ...dados, autorNome: req.usuario.nome },
      ]);
      gravados.push(lancamentoDoBanco(rows[0]));
    }
    await tocar(c);
    return gravados;
  });
  avisarTodos();
  res.json({ lancamentos, lancamento: lancamentos[0] });
}));

rotas.delete("/lancamentos/:id", auth.exigir(), assincrono(async (req, res) => {
  await transacao(async (c) => {
    const { rows } = await c.query("SELECT autor_id FROM lancamentos WHERE id = $1", [req.params.id]);
    if (!rows[0]) throw new ErroDeUso("Lançamento não encontrado.", 404);
    if (req.usuario.perfil === "lider" && rows[0].autor_id !== req.usuario.id) throw new ErroDeUso("Você só pode excluir os seus lançamentos.", 403);
    await c.query("DELETE FROM lancamentos WHERE id = $1", [req.params.id]);
    await tocar(c);
  });
  avisarTodos();
  res.json({ ok: true });
}));

// ---------- Importação da base antiga do navegador (localStorage) ----------
rotas.post("/importar", auth.exigir("admin"), assincrono(async (req, res) => {
  const legado = req.body || {};
  const pessoas = Array.isArray(legado.pessoas) ? legado.pessoas : [];
  const lancamentos = Array.isArray(legado.lancamentos) ? legado.lancamentos : [];
  const usuarios = Array.isArray(legado.usuarios) ? legado.usuarios : [];

  const resumo = await transacao(async (c) => {
    const { rows: ja } = await c.query("SELECT count(*)::int AS n FROM lancamentos");
    if (ja[0].n) throw new ErroDeUso("O servidor já tem lançamentos; a importação só é feita em um banco sem lançamentos.", 409);

    // Usuários: quem já existe (mesmo e-mail) é mantido; os demais entram com o hash antigo,
    // que é refeito no primeiro login.
    const idPorLegado = new Map();
    let novosUsuarios = 0;
    for (const u of usuarios) {
      const email = texto(u.email, 200).toLowerCase();
      if (!email || !PERFIS.includes(u.perfil)) continue;
      const { rows } = await c.query("SELECT id FROM usuarios WHERE email = $1", [email]);
      if (rows[0]) {
        idPorLegado.set(u.id, rows[0].id);
        continue;
      }
      const novoId = uid("u");
      await c.query(
        "INSERT INTO usuarios (id, nome, email, perfil, area, senha_hash, ativo, trocar_senha, criado_em) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9::timestamptz, now()))",
        [novoId, texto(u.nome, 120) || email, email, u.perfil, texto(u.area, 120), `sha256$${u.salt}$${u.senhaHash}`, u.ativo !== false, Boolean(u.trocarSenha), u.criadoEm || null],
      );
      idPorLegado.set(u.id, novoId);
      novosUsuarios += 1;
    }

    // Pessoas: os lançamentos antigos apontam para os ids do navegador, então eles substituem a lista.
    if (pessoas.length) {
      await c.query("DELETE FROM pessoas");
      for (const p of pessoas) {
        await c.query(
          "INSERT INTO pessoas (id, nome, chave_base, categoria, setor, ativo, origem, criado_em) VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamptz, now()))",
          [String(p.id), texto(p.nome, 160).toUpperCase(), p.chaveBase || null, R.categorias[p.categoria] ? p.categoria : null, texto(p.setor, 120), p.ativo !== false, p.origem || "sistema", p.criadoEm || null],
        );
      }
    }

    for (const l of lancamentos) {
      const { id, ano, tipo, autorId, criadoEm, ...dados } = l;
      if (!id || !tipo || !dados.data) continue;
      await c.query("INSERT INTO lancamentos (id, ano, tipo, autor_id, criado_em, dados) VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, now()), $6)", [
        String(id), Number(ano) || Number(String(dados.data).slice(0, 4)), tipo, idPorLegado.get(autorId) || null, criadoEm || null, dados,
      ]);
    }
    await tocar(c);
    return { usuarios: novosUsuarios, pessoas: pessoas.length, lancamentos: lancamentos.length };
  });
  avisarTodos();
  res.json({ ok: true, importados: resumo });
}));

// ---------- Erros ----------
rotas.use((req, res) => res.status(404).json({ erro: "Rota não encontrada." }));

// eslint-disable-next-line no-unused-vars
rotas.use((err, req, res, next) => {
  if (err instanceof ErroDeUso) return res.status(err.status).json({ erro: err.message });
  if (err.type === "entity.too.large") return res.status(413).json({ erro: "Dados grandes demais." });
  console.error(err);
  res.status(500).json({ erro: "Erro interno do servidor." });
});

module.exports = rotas;
