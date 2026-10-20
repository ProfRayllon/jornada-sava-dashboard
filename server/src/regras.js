// Carrega as regras do front-end (assets/js/regras.js) no servidor, para que os dois lados usem
// exatamente o mesmo cálculo de bimestres, critérios e pontos.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { RAIZ } = require("./config");

const contexto = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(RAIZ, "assets/js/regras.js"), "utf8"), contexto);

module.exports = contexto.window.SAVA_REGRAS;
