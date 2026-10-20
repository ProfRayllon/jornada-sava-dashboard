const crypto = require("node:crypto");
const { promisify } = require("node:util");

const scrypt = promisify(crypto.scrypt);
const N = 16384;

async function gerarHash(senha) {
  const salt = crypto.randomBytes(16).toString("hex");
  const chave = await scrypt(String(senha), salt, 64, { N });
  return `scrypt$${N}$${salt}$${chave.toString("hex")}`;
}

function iguais(a, b) {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Aceita também o formato antigo do navegador (sha256 de "salt:senha"), usado na importação.
// Quem entra com uma senha nesse formato tem o hash refeito em scrypt (precisaRefazer).
async function conferir(senha, hash) {
  const [tipo, ...partes] = String(hash).split("$");
  if (tipo === "scrypt") {
    const [n, salt, esperado] = partes;
    const chave = await scrypt(String(senha), salt, 64, { N: Number(n) });
    return { ok: iguais(chave.toString("hex"), esperado), precisaRefazer: false };
  }
  if (tipo === "sha256") {
    const [salt, esperado] = partes;
    const calc = crypto.createHash("sha256").update(`${salt}:${senha}`).digest("hex");
    return { ok: iguais(calc, esperado), precisaRefazer: true };
  }
  return { ok: false, precisaRefazer: false };
}

module.exports = { gerarHash, conferir };
