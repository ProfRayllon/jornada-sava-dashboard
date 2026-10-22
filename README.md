# Jornada SAVA

Site institucional, painel de ranking e sistema de lançamentos da Jornada SAVA — o programa de
valorização e desenvolvimento do Sebadelhe Aranha & Vasconcelos Advocacia.

## Estrutura

```text
index.html          Site institucional (homepage)
login.html          Acesso da equipe (administração, RH e líderes)
sistema.html        Sistema: visão geral, lançamentos, colaboradores, equipe e painel
painel.html         Painel de ranking e selos (abre dentro do sistema, exige login)

assets/
  css/              home.css · sistema.css · painel.css
  js/
    regras.js         Regras da jornada (critérios, pontos, níveis, selos, bimestres)
    store.js          Camada de dados: conversa com a API e guarda o estado em memória
    home.js           Interações da homepage
    sistema.js        Telas do sistema
    painel.js         Painel de ranking
    painel-bridge.js  Junta a base importada com os lançamentos do sistema
  img/              Fotos do site (capa, premiações, vencedores)
  icones/           Ícones da interface e selos (icones/selos)
  logo/             Logotipos

server/             API Node.js + PostgreSQL (login, colaboradores, lançamentos, tempo real)
  src/              index.js (servidor) · rotas.js (API) · auth.js · db.js · senha.js · regras.js
  sql/              Migrações do banco, aplicadas sozinhas na ordem dos arquivos

scripts/            Scripts Python que tratam as planilhas e geram a base do painel

base/               base de dados: dados-painel.js/json (no Git por enquanto); planilhas e
                    respostas brutas ficam fora do Git
docs/               (fora do Git) documentos internos e referências
```

## O que não vai para o repositório

A pasta `docs/` (documentos internos), o `.env` e o conteúdo de `base/` estão no `.gitignore`, com
uma exceção: `base/dados-painel.js` e `base/dados-painel.json` vão para o repositório, porque o
site e o painel usam essa base tratada. Planilhas e respostas brutas ficam fora, e o servidor não
entrega nada de `base/` além desses arquivos.

Sem a base, o site abre normalmente, mas sem os números e o hall da fama, e o painel fica vazio.

## Como os dados ficam salvos

Usuários, colaboradores e lançamentos ficam no **PostgreSQL**. O servidor (`server/`) entrega o
site e a API em `/api`:

- O login cria uma sessão em cookie `httpOnly` (8 h por padrão). Senhas são guardadas com scrypt.
- `sistema.html` e `painel.html` só abrem com sessão ativa; o servidor redireciona para o login.
- As permissões de cada perfil (admin, RH, líder) são conferidas no servidor.
- Quando alguém grava algo, os outros usuários conectados recebem o aviso na hora (SSE).
- A homepage pública recebe só os pontos já somados (sem notas, feedbacks nem autores).
- No primeiro start, o servidor cria o administrador (`ADMIN_EMAIL`/`ADMIN_PASSWORD` do `.env`)
  e importa as pessoas da base tratada do ano atual (`base/dados-painel.json`).
- Se um administrador entrar num navegador que ainda tem dados da versão antiga (localStorage),
  o sistema oferece enviar esses dados para o servidor (só funciona com o banco sem lançamentos).

## Publicando na VPS

Precisa de uma VPS Linux (Ubuntu 22.04/24.04, 1 GB de RAM já basta) e de um domínio.

1. **DNS:** no painel do domínio, crie um registro `A` apontando o domínio (`jornadasava.com.br`)
   para o IP da VPS. Se quiser o `www.`, crie também um `A` (ou `CNAME`) para ele.
2. **Docker na VPS** (acesse por SSH como root):

   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

3. **Código:**

   ```bash
   git clone https://github.com/ProfRayllon/jornada-sava-dashboard.git /opt/jornada-sava
   cd /opt/jornada-sava
   cp .env.example .env
   nano .env   # preencha DOMAIN, POSTGRES_PASSWORD e ADMIN_PASSWORD
   ```

   Para gerar senhas fortes: `openssl rand -base64 24`.

4. **Base das planilhas:** `base/dados-painel.js` e `base/dados-painel.json` já vêm do Git. Se quiser
   o fallback do painel, envie também `base/dados-jornada.js` (ex.: `scp base/dados-jornada.js root@IP:/opt/jornada-sava/base/`).
5. **Subir:**

   ```bash
   docker compose up -d --build
   docker compose logs -f app   # deve mostrar "Administrador criado" e "rodando"
   ```

   O Caddy emite o certificado HTTPS sozinho em alguns segundos. Acesse `https://SEU_DOMINIO`.

6. **Firewall** (opcional, recomendado):

   ```bash
   ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable
   ```

### Atualizando

```bash
cd /opt/jornada-sava && git pull && docker compose up -d --build
```

As migrações novas de `server/sql/` rodam sozinhas ao subir.

### Backup do banco

```bash
mkdir -p backups
docker compose exec -T db pg_dump -U sava jornada_sava | gzip > backups/sava-$(date +%F).sql.gz
```

Para agendar todo dia às 3h, adicione no `crontab -e`:

```text
0 3 * * * cd /opt/jornada-sava && docker compose exec -T db pg_dump -U sava jornada_sava | gzip > backups/sava-$(date +\%F).sql.gz
```

Restaurar: `gunzip -c backups/ARQUIVO.sql.gz | docker compose exec -T db psql -U sava jornada_sava`.

## Rodando localmente

Precisa do Node.js 20+ e de um PostgreSQL local (ou `docker compose up db`).

```powershell
cd server
npm install
# Configure DATABASE_URL em ../.env antes de iniciar.
npm run dev
```

Defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` no ambiente para a criação inicial.
Não existe senha padrão; contas já existentes mantêm a senha cadastrada no banco.

O `python -m http.server` não serve mais: sem a API, o login e os lançamentos não funcionam.

## Atualizando a base a partir das planilhas

Coloque as planilhas em `base/planilhas/` e rode:

```powershell
python scripts\build_tratamento_2026.py
python scripts\build_dados_painel.py
```

Os arquivos `base/dados-painel.js` e `base/dados-painel.json` são gerados novamente. Na VPS, basta
substituir os dois arquivos em `/opt/jornada-sava/base/` (a pasta é montada no container).


## Configuração segura

`DATABASE_URL` é obrigatória; o Compose já a transmite ao servidor. Fora do Docker,
configure-a explicitamente no `.env`. O Compose interpola `POSTGRES_PASSWORD` sem
codificação automática; para uma instalação nova, prefira uma senha aleatória com
caracteres seguros para URL (ex.: `openssl rand -hex 32`). Não altere a configuração
de um banco existente sem coordenar a rotação da senha no banco e na aplicação.

Arquivos `.env*`, exceto `.env.example`, e chaves locais ficam fora do Git e do build.
Não publique segredos em código, documentação, logs ou pacotes de entrega. A alteração
de `ADMIN_PASSWORD` não redefine um usuário já criado. Consulte `SECURITY.md`.
