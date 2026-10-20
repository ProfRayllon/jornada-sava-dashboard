const crypto = require("node:crypto");
const config = require("./config");
const { pool, usuarioPublico } = require("./db");

const COOKIE = "sava_sessao";
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

function lerCookie(req) {
  const linha = req.headers.cookie || "";
  const par = linha.split(";").map((p) => p.trim()).find((p) => p.startsWith(`${COOKIE}=`));
  return par ? decodeURIComponent(par.slice(COOKIE.length + 1)) : null;
}

const opcoesCookie = () => ({ httpOnly: true, sameSite: "lax", secure: config.PRODUCAO, path: "/" });

async function criarSessao(res, usuarioId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expira = new Date(Date.now() + config.HORAS_SESSAO * 3600 * 1000);
  await pool.query("INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES ($1, $2, $3)", [hashToken(token), usuarioId, expira]);
  res.cookie(COOKIE, token, { ...opcoesCookie(), expires: expira });
}

async function encerrarSessao(req, res) {
  const token = lerCookie(req);
  if (token) await pool.query("DELETE FROM sessoes WHERE token_hash = $1", [hashToken(token)]);
  res.clearCookie(COOKIE, opcoesCookie());
}

async function usuarioDaSessao(req) {
  const token = lerCookie(req);
  if (!token) return null;
  const { rows } = await pool.query(
    `SELECT u.* FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token_hash = $1 AND s.expira_em > now() AND u.ativo`,
    [hashToken(token)],
  );
  return rows[0] ? usuarioPublico(rows[0]) : null;
}

// Middleware: exige sessão e, opcionalmente, um dos perfis informados.
function exigir(...perfis) {
  return async (req, res, next) => {
    try {
      req.usuario = await usuarioDaSessao(req);
      if (!req.usuario) return res.status(401).json({ erro: "Sessão expirada. Entre novamente." });
      if (perfis.length && !perfis.includes(req.usuario.perfil)) return res.status(403).json({ erro: "Seu perfil não tem permissão para esta ação." });
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Limite simples de tentativas de login por IP (memória do processo).
const tentativas = new Map();
const JANELA_MS = 15 * 60 * 1000;
const MAX_FALHAS = 10;

function loginBloqueado(ip) {
  const t = tentativas.get(ip);
  if (!t || t.ate < Date.now()) return false;
  return t.falhas >= MAX_FALHAS;
}

function registrarFalha(ip) {
  const t = tentativas.get(ip);
  if (!t || t.ate < Date.now()) tentativas.set(ip, { falhas: 1, ate: Date.now() + JANELA_MS });
  else t.falhas += 1;
}

const limparFalhas = (ip) => tentativas.delete(ip);

async function limparSessoesVencidas() {
  await pool.query("DELETE FROM sessoes WHERE expira_em < now()");
  for (const [ip, t] of tentativas) if (t.ate < Date.now()) tentativas.delete(ip);
}

module.exports = {
  criarSessao,
  encerrarSessao,
  usuarioDaSessao,
  exigir,
  loginBloqueado,
  registrarFalha,
  limparFalhas,
  limparSessoesVencidas,
};
