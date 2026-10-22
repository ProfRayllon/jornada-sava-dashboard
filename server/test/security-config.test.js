const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

// Isola a configuração e a criação inicial: nenhum teste acessa banco ou rede.
function carregarConfig(env) {
  const contexto = {
    process: { env },
    __dirname: path.join(__dirname, "../src"),
    require,
    module: { exports: {} },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../src/config.js"), "utf8"), contexto);
  return contexto.module.exports;
}

function carregarBanco(config, administradores) {
  const consultas = [];
  const hashes = [];
  class Pool {
    async query(sql, valores) {
      consultas.push({ sql, valores });
      return { rows: [{ n: sql.includes("FROM pessoas") ? 1 : administradores }] };
    }
  }
  const contexto = {
    __dirname: path.join(__dirname, "../src"),
    console: { log() {} },
    module: { exports: {} },
    require(nome) {
      if (nome === "pg") return { Pool };
      if (nome === "./config") return config;
      if (nome === "./regras") return { anoAtual: 2026 };
      if (nome === "./senha") return {
        async gerarHash(valor) {
          hashes.push(valor);
          return "hash-ficticio-do-teste";
        },
      };
      return require(nome);
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../src/db.js"), "utf8"), contexto);
  return { banco: contexto.module.exports, consultas, hashes };
}

test("recusa conexão ausente ou vazia sem recorrer a credenciais públicas", () => {
  for (const env of [{}, { DATABASE_URL: "" }, { DATABASE_URL: "   " }]) {
    assert.throws(() => carregarConfig(env), /Defina DATABASE_URL/);
  }
});

test("preserva a conexão e a senha fornecidas pelo ambiente", () => {
  const env = {
    DATABASE_URL: "postgresql://usuario:valor%40ficticio@db:5432/teste",
    ADMIN_EMAIL: "ADMIN@EXAMPLE.COM",
    ADMIN_PASSWORD: "valor-ficticio-apenas-para-teste",
    NODE_ENV: "production",
  };
  const config = carregarConfig(env);
  assert.equal(config.DATABASE_URL, env.DATABASE_URL);
  assert.equal(config.ADMIN_SENHA, env.ADMIN_PASSWORD);
  assert.equal(config.ADMIN_EMAIL, "admin@example.com");
  assert.equal(config.PRODUCAO, true);
});

test("não altera administrador existente quando falta senha de criação inicial", async () => {
  const config = carregarConfig({ DATABASE_URL: "postgresql://localhost/teste" });
  assert.equal(config.ADMIN_SENHA, "");
  const { banco, consultas, hashes } = carregarBanco(config, 1);
  await banco.semear();
  assert.equal(consultas.length, 2);
  assert.equal(hashes.length, 0);
});

test("recusa criar administrador sem uma senha explícita", async () => {
  for (const ADMIN_SENHA of ["", "   "]) {
    const { banco, consultas, hashes } = carregarBanco({ ADMIN_SENHA }, 0);
    await assert.rejects(banco.semear(), /Defina ADMIN_PASSWORD/);
    assert.equal(consultas.length, 1);
    assert.equal(hashes.length, 0);
  }
});

test("cria o primeiro administrador usando o hash da senha configurada", async () => {
  const config = carregarConfig({
    DATABASE_URL: "postgresql://localhost/teste",
    ADMIN_EMAIL: "admin@example.com",
    ADMIN_PASSWORD: "valor-ficticio-apenas-para-teste",
  });
  const { banco, consultas, hashes } = carregarBanco(config, 0);
  await banco.semear();
  assert.equal(consultas.length, 3);
  assert.equal(hashes[0], config.ADMIN_SENHA);
  assert.equal(consultas[1].valores[1], config.ADMIN_EMAIL);
  assert.equal(consultas[1].valores[2], "hash-ficticio-do-teste");
  assert.ok(!consultas[1].valores.includes(config.ADMIN_SENHA));
});
