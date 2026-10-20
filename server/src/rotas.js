const express = require("express");
const R = require("./regras");
const db = require("./db");
const auth = require("./auth");
const { gerarHash, conferir } = require("./senha");

const { pool, uid, normalizar, transacao, tocar, usuarioPublico, pessoaDoBanco, lancamentoDoBanco } = db;
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
    pool.query("SELECT * FROM pessoas ORDER BY nome"),
    pool.query("SELECT * FROM lancamentos ORDER BY criado_em"),
    db.atualizadoEm(),
  ]);
  return { pessoas: pessoas.rows.map(pessoaDoBanco), lancamentos: lancamentos.rows.map(lancamentoDoBanco), atualizadoEm };
}

// Homepage pública: só o necessário para somar o ranking, sem notas, feedbacks nem autores.
rotas.get("/publico", assincrono(async (req, res) => {
  const { pessoas, lancamentos, atualizadoEm } = await lerTudo();
  res.json({
    pessoas: pessoas.map(({ id, nome, chaveBase, categoria, ativo }) => ({ id, nome, chaveBase, categoria, ativo })),
    lancamentos: lancamentos.map((l) => {
      const { selos, ...pontos } = R.pontosDoLancamento({ ...l, pessoaId: undefined, pessoaIds: undefined }, null);
      return { id: l.id, ano: l.ano, bimestre: l.bimestre, pessoaId: l.pessoaId, pessoaIds: l.pessoaIds, tipo: "resumo", resumo: { ...pontos, selos } };
    }),
    atualizadoEm,
  });
}));

rotas.get("/estado", auth.exigir(), assincrono(async (req, res) => {
  const tudo = await lerTudo();
  let usuarios = [];
  if (req.usuario.perfil === "admin") {
    const { rows } = await pool.query("SELECT * FROM usuarios ORDER BY nome");
    usuarios = rows.map(usuarioPublico);
  }
  res.json({ eu: req.usuario, usuarios, ...tudo });
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

    let r;
    if (id) {
      r = await c.query("UPDATE pessoas SET nome = $2, categoria = $3, setor = $4, ativo = COALESCE($5, ativo) WHERE id = $1 RETURNING *", [
        id, nome, b.categoria, texto(b.setor, 120), typeof b.ativo === "boolean" ? b.ativo : null,
      ]);
      if (!r.rowCount) throw new ErroDeUso("Colaborador não encontrado.", 404);
    } else {
      r = await c.query("INSERT INTO pessoas (id, nome, categoria, setor) VALUES ($1, $2, $3, $4) RETURNING *", [uid("p"), nome, b.categoria, texto(b.setor, 120)]);
    }
    await tocar(c);
    return pessoaDoBanco(r.rows[0]);
  });
  avisarTodos();
  res.json({ pessoa });
}

rotas.post("/pessoas", auth.exigir("admin", "rh"), assincrono(salvarPessoa));
rotas.put("/pessoas/:id", auth.exigir("admin", "rh"), assincrono(salvarPessoa));

// ---------- Lançamentos ----------
// Confere e normaliza o lançamento enviado pelo front-end (as mesmas regras de sistema.js).
async function validarLancamento(b, usuario) {
  const tipo = b.tipo;
  if (!TIPOS_POR_PERFIL[usuario.perfil].includes(tipo)) throw new ErroDeUso("Seu perfil não pode registrar este tipo de lançamento.", 403);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.data || "")) || Number.isNaN(Date.parse(b.data))) throw new ErroDeUso("Informe a data.");
  const bimestre = R.bimestreDaData(b.data);
  if (!bimestre) throw new ErroDeUso("Dezembro e janeiro são meses sem pontuação na Jornada SAVA.");

  const { rows } = await pool.query("SELECT id FROM pessoas");
  const existentes = new Set(rows.map((r) => r.id));
  const dados = { tipo, data: b.data, titulo: texto(b.titulo, 200), bimestre: bimestre.id };

  if (["felicidade", "evento", "missao"].includes(tipo)) {
    dados.pessoaIds = [...new Set(Array.isArray(b.pessoaIds) ? b.pessoaIds.map(String) : [])];
    if (!dados.pessoaIds.length) throw new ErroDeUso("Selecione ao menos um participante.");
    if (dados.pessoaIds.some((id) => !existentes.has(id))) throw new ErroDeUso("Participante não encontrado.");
    dados.pontos = tipo === "felicidade" ? R.pontosPorEncontroFelicidade : Math.round(Number(b.pontos));
    if (!Number.isFinite(dados.pontos) || dados.pontos < 1) throw new ErroDeUso("Informe a pontuação.");
    if (tipo !== "felicidade" && !dados.titulo) throw new ErroDeUso("Informe o nome.");
    return dados;
  }

  dados.pessoaId = String(b.pessoaId || "");
  if (!existentes.has(dados.pessoaId)) throw new ErroDeUso("Selecione o colaborador.");
  dados.justificativa = texto(b.justificativa);
  if (tipo === "indicacao") dados.pontos = R.pontosIndicacao;
  if (tipo === "protagonista" && !dados.justificativa) throw new ErroDeUso("Descreva o motivo da indicação.");
  if (tipo === "avaliacao") {
    const criterios = R.criterios[b.categoria];
    if (!criterios) throw new ErroDeUso("Categoria da avaliação inválida.");
    dados.categoria = b.categoria;
    dados.notas = {};
    for (const c of criterios) {
      const nota = Number(b.notas?.[c.id]);
      if (!c.opcoes.some((o) => o.valor === nota)) throw new ErroDeUso("Preencha a nota de todos os critérios.");
      dados.notas[c.id] = nota;
    }
    dados.area = texto(b.area, 120);
    dados.feedback = texto(b.feedback);
    dados.destaque = texto(b.destaque);
    dados.pontos = Object.values(dados.notas).reduce((a, n) => a + n, 0);
  }
  return dados;
}

rotas.post("/lancamentos", auth.exigir(), assincrono(async (req, res) => {
  const dados = await validarLancamento(req.body, req.usuario);
  const id = uid("l");
  const ano = Number(dados.data.slice(0, 4));
  const conteudo = { ...dados, autorNome: req.usuario.nome };
  const lancamento = await transacao(async (c) => {
    const { rows } = await c.query("INSERT INTO lancamentos (id, ano, tipo, autor_id, dados) VALUES ($1, $2, $3, $4, $5) RETURNING *", [
      id, ano, dados.tipo, req.usuario.id, conteudo,
    ]);
    await tocar(c);
    return lancamentoDoBanco(rows[0]);
  });
  avisarTodos();
  res.json({ lancamento });
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
