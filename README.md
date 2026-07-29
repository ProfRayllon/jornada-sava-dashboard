# Jornada SAVA

Dashboard estático para GitHub Pages.

## Como publicar

1. Suba todos os arquivos desta pasta para o repositório.
2. Ative o GitHub Pages apontando para a branch principal e a pasta raiz.
3. Mantenha `dados-painel.js` na raiz. Ele é a base tratada principal carregada pelo painel.
4. Mantenha `dados-jornada.js`, `dados-jornada.json` e as planilhas na raiz como fonte original e fallback.

## Regras principais

- `Rank` é a pontuação somente do ano selecionado.
- `Total para nível` acumula o histórico quando a pessoa também participou em anos anteriores.
- `Nível` é calculado a partir do `Total para nível`.
- Selos zeram a cada ano.
- A pontuação dos selos não altera o Rank; ela apenas define se a pessoa atingiu a regra do selo.

## Regras dos selos

### Selo Sou feliz!

Concedido para quem completa as 4 datas do Programa de Felicidade do ciclo.

Cada data vale `575` pontos para o selo:

```text
575 + 575 + 575 + 575 = 2.300
```

Para receber o selo, a pessoa precisa atingir `2.300 / 2.300`.

### Selo Mente Brilhante

Concedido por desempenho técnico máximo.

Para Controladoria e Administrativo, a regra usa os três indicadores técnicos:

```text
Qualidade técnica nos serviços = 500
Eficiência no atendimento ao cliente = 500
Domínio de ferramentas tecnológicas = 500
Total = 1.500
```

Para Advogados Associados, a regra temporária usa pontuação normalizada para fechar a mesma régua de `1.500`, sem alterar o Rank:

```text
Conhecimentos jurídicos normalizado = Conhecimentos jurídicos / 950 * 750
Proatividade estratégica normalizada = Proatividade estratégica / 950 * 750
Mente Brilhante = soma dos dois
```

Para receber o selo, o advogado precisa atingir `1.500 / 1.500` nessa régua normalizada.

### Selo Eu inspiro pessoas!

Concedido por desempenho máximo nos critérios socioemocionais/relacionais.

Para Controladoria e Administrativo:

```text
Proatividade = 600
Inteligência emocional e social = 600
Autogestão = 800
Total = 2.000
```

Para Advogados Associados, a regra atual considera:

```text
Responsabilidade normalizada = Responsabilidade / 800 * 1000
Relacionamentos colaborativos normalizado = Relacionamentos colaborativos / 800 * 1000
Eu inspiro pessoas! = soma dos dois
```

Para receber o selo, o advogado precisa atingir `2.000 / 2.000` nessa régua normalizada. A normalização vale apenas para o selo e não altera o Rank.

## Ajustes rápidos

- Paleta e layout ficam em `styles.css`.
- Para trocar os selos, substitua os PNGs dentro de `icones_selos`.
- Se atualizar as planilhas, rode `python scripts\build_tratamento_2026.py` e depois `python scripts\build_dados_painel.py` para gerar novamente `Tratamento - base 2026.xlsx`, `dados-painel.js` e `dados-painel.json`.
