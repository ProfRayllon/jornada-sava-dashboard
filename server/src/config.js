const path = require("node:path");

const env = process.env;

module.exports = {
  PORTA: Number(env.PORT || 3000),
  // Pasta do site (index.html, assets/, base/). No Docker, o projeto é copiado para /app.
  RAIZ: path.resolve(env.APP_ROOT || path.join(__dirname, "../..")),
  DATABASE_URL: env.DATABASE_URL || "",
  PRODUCAO: env.NODE_ENV === "production",
  HORAS_SESSAO: Number(env.SESSION_HOURS || 8),
  // Primeiro acesso: criado só quando o banco ainda não tem nenhum usuário.
  ADMIN_EMAIL: (env.ADMIN_EMAIL || "admin@sava.adv.br").trim().toLowerCase(),
  ADMIN_SENHA: env.ADMIN_PASSWORD || "",
};
