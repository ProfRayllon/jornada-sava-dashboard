const path = require("node:path");
const express = require("express");
const config = require("./config");
const db = require("./db");
const auth = require("./auth");
const rotas = require("./rotas");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", "loopback, uniquelocal"); // atrás do Caddy

app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "X-Frame-Options": "SAMEORIGIN",
  });
  next();
});

// Pedidos que alteram dados só valem vindos do próprio site.
app.use("/api", (req, res, next) => {
  if (req.method === "GET") return next();
  const origem = req.get("origin");
  if (origem && new URL(origem).host !== req.get("host")) return res.status(403).json({ erro: "Origem não permitida." });
  next();
});
app.use("/api", express.json({ limit: "5mb" }), rotas);

// ---------- Site ----------
const raiz = (arquivo) => path.join(config.RAIZ, arquivo);
const enviar = (arquivo) => (req, res) => res.sendFile(raiz(arquivo));

// Sistema e painel só abrem com sessão ativa.
const comSessao = (arquivo) => async (req, res, next) => {
  try {
    if (!(await auth.usuarioDaSessao(req))) return res.redirect("/login.html");
    res.set("Cache-Control", "no-store");
    res.sendFile(raiz(arquivo));
  } catch (err) {
    next(err);
  }
};

app.get(["/", "/index.html"], enviar("index.html"));
app.get("/login.html", enviar("login.html"));
app.get("/sistema.html", comSessao("sistema.html"));
app.get("/painel.html", comSessao("painel.html"));
app.get("/favicon.ico", enviar("favicon.ico"));
app.use("/assets", express.static(raiz("assets"), { maxAge: "1h", fallthrough: false }));

// Da pasta base/ só sai a base tratada do painel; planilhas e respostas brutas ficam no servidor.
const basePublica = ["dados-painel.js", "dados-painel.json", "dados-jornada.js"];
app.get("/base/:arquivo", (req, res) => {
  if (!basePublica.includes(req.params.arquivo)) return res.sendStatus(404);
  res.set("Cache-Control", "no-cache");
  res.sendFile(raiz(`base/${req.params.arquivo}`), (err) => err && !res.headersSent && res.sendStatus(404));
});

app.use((req, res) => res.status(404).send("Página não encontrada."));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.status === 404) return res.sendStatus(404);
  console.error(err);
  res.status(500).send("Erro interno do servidor.");
});

async function iniciar() {
  await db.migrar();
  await db.semear();
  setInterval(() => auth.limparSessoesVencidas().catch(console.error), 60 * 60 * 1000);
  app.listen(config.PORTA, () => console.log(`Jornada SAVA rodando em http://localhost:${config.PORTA}`));
}

iniciar().catch((err) => {
  console.error("Falha ao iniciar:", err);
  process.exit(1);
});
