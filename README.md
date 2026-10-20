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
    store.js          Camada de dados (hoje localStorage; ponto único para trocar pelo backend)
    home.js           Interações da homepage
    sistema.js        Telas do sistema
    painel.js         Painel de ranking
    painel-bridge.js  Junta a base importada com os lançamentos do sistema
  img/              Fotos do site (capa, premiações, vencedores)
  icones/           Ícones da interface e selos (icones/selos)
  logo/             Logotipos

scripts/            Scripts Python que tratam as planilhas e geram a base do painel

base/               base de dados: dados-painel.js/json (no Git por enquanto); planilhas e
                    respostas brutas ficam fora do Git
docs/               (fora do Git) documentos internos e referências
```

## O que não vai para o repositório

A pasta `docs/` (documentos internos) e o conteúdo de `base/` estão no `.gitignore`, com uma
exceção temporária: `base/dados-painel.js` e `base/dados-painel.json` vão para o repositório
enquanto o site roda no GitHub Pages. Na migração para a VPS com PostgreSQL, eles também saem.

Sem a base, o site abre normalmente, mas sem os números e o hall da fama, e o painel fica vazio.

## Rodando localmente

Com Python instalado, na pasta do projeto:

```powershell
python -m http.server 8080
```

Depois acesse `http://localhost:8080/`.

## Atualizando a base a partir das planilhas

Coloque as planilhas em `base/planilhas/` e rode:

```powershell
python scripts\build_tratamento_2026.py
python scripts\build_dados_painel.py
```

Os arquivos `base/dados-painel.js` e `base/dados-painel.json` são gerados novamente.

## Próximos passos

Hoje os lançamentos do sistema ficam salvos no navegador (localStorage). O próximo passo é um
backend com PostgreSQL, que torna os dados compartilhados entre todos os usuários. Toda leitura e
escrita passa por `assets/js/store.js`, então a migração fica concentrada nesse arquivo.
