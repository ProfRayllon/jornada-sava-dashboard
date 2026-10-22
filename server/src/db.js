const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { Pool } = require("pg");
const config = require("./config");
const R = require("./regras");
const { gerarHash } = require("./senha");

const pool = new Pool({ connectionString: config.DATABASE_URL });

const uid = (prefixo) => `${prefixo}_${Date.now().toString(36)}${crypto.randomBytes(4).toString("hex")}`;

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

async function transacao(fn) {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const resultado = await fn(cliente);
    await cliente.query("COMMIT");
    return resultado;
  } catch (err) {
    await cliente.query("ROLLBACK");
    throw err;
  } finally {
    cliente.release();
  }
}

// Aplica, em ordem, os arquivos de server/sql que ainda não rodaram neste banco.
async function migrar() {
  await pool.query("CREATE TABLE IF NOT EXISTS migracoes (nome TEXT PRIMARY KEY, aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now())");
  const pasta = path.join(__dirname, "../sql");
  const arquivos = fs.readdirSync(pasta).filter((f) => f.endsWith(".sql")).sort();
  const { rows } = await pool.query("SELECT nome FROM migracoes");
  const feitas = new Set(rows.map((r) => r.nome));
  for (const nome of arquivos.filter((f) => !feitas.has(f))) {
    await transacao(async (c) => {
      await c.query(fs.readFileSync(path.join(pasta, nome), "utf8"));
      await c.query("INSERT INTO migracoes (nome) VALUES ($1)", [nome]);
    });
    console.log(`Migração aplicada: ${nome}`);
  }
}

// Primeiro start: cria o administrador e importa as pessoas da base tratada do ano atual.
async function semear() {
  const { rows: u } = await pool.query("SELECT count(*)::int AS n FROM usuarios");
  if (!u[0].n) {
    if (!config.ADMIN_SENHA || !config.ADMIN_SENHA.trim()) {
      throw new Error("Defina ADMIN_PASSWORD no ambiente para criar o primeiro administrador.");
    }
    await pool.query(
      "INSERT INTO usuarios (id, nome, email, perfil, senha_hash, trocar_senha) VALUES ($1, 'Administrador', $2, 'admin', $3, TRUE)",
      [uid("u"), config.ADMIN_EMAIL, await gerarHash(config.ADMIN_SENHA)],
    );
    console.log(`Administrador criado: ${config.ADMIN_EMAIL}`);
  }

  const { rows: p } = await pool.query("SELECT count(*)::int AS n FROM pessoas");
  if (p[0].n) return;
  const pessoas = lerBase()?.years?.[String(R.anoAtual)]?.people || [];
  for (const pessoa of pessoas) {
    await pool.query("INSERT INTO pessoas (id, nome, chave_base, categoria, origem) VALUES ($1, $2, $3, $4, 'base')", [
      uid("p"),
      pessoa.name,
      pessoa.key || normalizar(pessoa.name),
      categoriaPorRotulo[pessoa.category] || null,
    ]);
  }
  if (pessoas.length) console.log(`${pessoas.length} pessoas importadas da base ${R.anoAtual}.`);
}

function lerBase() {
  try {
    return JSON.parse(fs.readFileSync(path.join(config.RAIZ, "base/dados-painel.json"), "utf8"));
  } catch {
    return null;
  }
}

async function tocar(c = pool) {
  await c.query("UPDATE meta SET valor = $1 WHERE chave = 'atualizado_em'", [new Date().toISOString()]);
}

async function atualizadoEm() {
  const { rows } = await pool.query("SELECT valor FROM meta WHERE chave = 'atualizado_em'");
  return rows[0]?.valor || null;
}

// ---------- Conversão linha → objeto usado pelo front-end ----------
const usuarioPublico = (r) => ({
  id: r.id,
  nome: r.nome,
  email: r.email,
  perfil: r.perfil,
  area: r.area,
  ativo: r.ativo,
  trocarSenha: r.trocar_senha,
  criadoEm: r.criado_em,
});

const pessoaDoBanco = (r) => ({
  id: r.id,
  nome: r.nome,
  chaveBase: r.chave_base,
  categoria: r.categoria,
  setor: r.setor,
  ativo: r.ativo,
  origem: r.origem,
  criadoEm: r.criado_em,
});

const lancamentoDoBanco = (r) => ({ ...r.dados, id: r.id, ano: r.ano, tipo: r.tipo, autorId: r.autor_id, criadoEm: r.criado_em });

module.exports = {
  pool,
  uid,
  normalizar,
  transacao,
  migrar,
  semear,
  tocar,
  atualizadoEm,
  usuarioPublico,
  pessoaDoBanco,
  lancamentoDoBanco,
};
