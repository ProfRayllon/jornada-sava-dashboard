const workbookConfigs = [
  { year: 2026, label: "2026", file: "JORNADA SAVA 2026.xlsx" },
  { year: 2025, label: "Resultado 2025", file: "JORNADA SAVA 2025.xlsx" },
];

const attendanceMaxByCycle = {
  felicidade: 2300,
  eventos: 700,
};

const legacy2025RankOverrides = {
  "ARTHUR MAIA SUASSUNA": 4725,
  "DAVI DE ASSIS PINHEIRO DA SILVA": 4400,
  "TAMARA MENESES MEDEIROS DE MELO": 4200,
  "BRUNO ANDRADE FARIAS": 4150,
  "MAURICIO BARBOSA DE PAIVA": 4150,
  "GABRIEL SOUTO MAIOR PEIXOTO": 4075,
  "PAULO ALVES DA SILVA FILHO": 4075,
  "JULIA RENALE OLIVEIRA": 3900,
  "CYBELLE FERNANDES DA SILVA": 3900,
  "LEONARDO ARNAUD DE LUCENA LOPES": 3700,
  "KATIA WANESSA BORGES DE LIMA LUZ": 3650,
  "RAFAEL JOSE BARRETO SERRANO": 3650,
  "GABRIEL NASCIMENTO RODRIGUES": 3575,
  "JONATAN RAULIM RAMOS": 3575,
  "DANIELY MARIA MOURA DE OLIVEIRA": 3575,
  "GILDERSON ALEXANDRE DA SILVA": 3575,
  "LORENA DE OLIVEIRA ALVES": 3575,
};

const legacy2025TotalOverrides = {
  "ARTHUR MAIA SUASSUNA": 11035,
  "DAVI DE ASSIS PINHEIRO DA SILVA": 8285,
  "TAMARA MENESES MEDEIROS DE MELO": 5350,
  "BRUNO ANDRADE FARIAS": 8800,
  "MAURICIO BARBOSA DE PAIVA": 10755,
  "GABRIEL SOUTO MAIOR PEIXOTO": 7290,
  "PAULO ALVES DA SILVA FILHO": 7610,
  "JULIA RENALE OLIVEIRA": 7710,
  "CYBELLE FERNANDES DA SILVA": 8875,
  "LEONARDO ARNAUD DE LUCENA LOPES": 8450,
  "KATIA WANESSA BORGES DE LIMA LUZ": 9175,
  "RAFAEL JOSE BARRETO SERRANO": 7710,
  "GABRIEL NASCIMENTO RODRIGUES": 9195,
  "JONATAN RAULIM RAMOS": 8610,
  "DANIELY MARIA MOURA DE OLIVEIRA": 9560,
  "GILDERSON ALEXANDRE DA SILVA": 8390,
  "LORENA DE OLIVEIRA ALVES": 6760,
  "CLAYTON PEREIRA DE OLIVEIRA": 8760,
  "THAIS DANTAS CAVALCANTI": 8500,
};

const levelRules = [
  { name: "Explorador SAVA", min: 0, max: 6000, slug: "explorador" },
  { name: "Protagonista SAVA", min: 6001, max: 13000, slug: "protagonista" },
  { name: "Líder SAVA", min: 13001, max: 23000, slug: "lider" },
  { name: "Guardião SAVA", min: 23001, max: Infinity, slug: "guardiao" },
];

const winnerPhotosByYear = {
  2025: "img/vencedor-2025.png",
  2026: "img/vencedor-2026.jpeg",
};

const badgeDefinitions = [
  {
    id: "happy",
    label: "Sou feliz!",
    short: "Feliz",
    image: "icones_selos/1.png",
    className: "badge-happy",
    tone: "happy",
    description: "Reconhece quem espalha alegria, bom humor e energia positiva por onde passa.",
  },
  {
    id: "bright",
    label: "Mente brilhante",
    short: "Técnica",
    image: "icones_selos/2.png",
    className: "badge-bright",
    tone: "bright",
    description: "Reconhece o pensamento crítico, a inovação e as ideias que impulsionam resultados.",
  },
  {
    id: "inspire",
    label: "Eu inspiro pessoas!",
    short: "Inspira",
    image: "icones_selos/3.png",
    className: "badge-inspire",
    tone: "inspire",
    description: "Reconhece quem motiva, desenvolve e deixa um impacto positivo nas pessoas.",
  },
];

const state = {
  activeYear: 2026,
  years: new Map(),
  cumulative: new Map(),
  search: "",
  category: "all",
  level: "all",
  experienceSort: null,
  badgesExpanded: false,
  activeBadgeId: null,
  namesPrivacy: {
    active: false,
    othersRevealed: false,
    championRevealed: false,
  },
};

const els = {
  rankingBody: document.querySelector("#rankingBody"),
  rankingTitle: document.querySelector("#rankingTitle"),
  rankingCount: document.querySelector("#rankingCount"),
  badgesList: document.querySelector("#badgesList"),
  badgesToggle: document.querySelector("#badgesToggle"),
  badgeModal: document.querySelector("#badgeModal"),
  badgeModalFeature: document.querySelector("#badgeModalFeature"),
  badgeModalList: document.querySelector("#badgeModalList"),
  badgeModalClose: document.querySelector("#badgeModalClose"),
  winnerKicker: document.querySelector("#winnerKicker"),
  winnerName: document.querySelector("#winnerName"),
  winnerScore: document.querySelector("#winnerScore"),
  winnerLevel: document.querySelector("#winnerLevel"),
  winnerImage: document.querySelector("#winnerImage"),
  winnerImageFrame: document.querySelector("#winnerImageFrame"),
  searchInput: document.querySelector("#searchInput"),
  levelFilter: document.querySelector("#levelFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  experienceSort: document.querySelector("#experienceSort"),
  lastUpdated: document.querySelector("#lastUpdated"),
  themeToggle: document.querySelector("#themeToggle"),
  filterToggle: document.querySelector("#filterToggle"),
  controlStrip: document.querySelector("#controlStrip"),
  namesToggle: document.querySelector("#namesToggle"),
  namesToggleIcon: document.querySelector("#namesToggleIcon"),
  winnerModal: document.querySelector("#winnerModal"),
  winnerModalClose: document.querySelector("#winnerModalClose"),
  winnerModalContinue: document.querySelector("#winnerModalContinue"),
  winnerModalPhoto: document.querySelector("#winnerModalPhoto"),
  winnerModalName: document.querySelector("#winnerModalName"),
  winnerModalLevel: document.querySelector("#winnerModalLevel"),
  winnerModalScore: document.querySelector("#winnerModalScore"),
  winnerConfetti: document.querySelector("#winnerConfetti"),
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  restorePreferences();
  restoreYearFromUrl();
  await loadAllWorkbooks();
  render();
}

function bindEvents() {
  document.querySelectorAll("[data-year]").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveYear(Number(button.dataset.year));
      render();
    });
  });

  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderRanking();
  });

  els.levelFilter.addEventListener("change", (event) => {
    state.level = event.target.value;
    renderRanking();
  });

  els.categoryFilter.addEventListener("change", (event) => {
    state.category = event.target.value;
    renderRanking();
  });

  els.experienceSort.addEventListener("click", () => {
    state.experienceSort = state.experienceSort === "desc" ? "asc" : "desc";
    renderRanking();
  });

  els.themeToggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("jornada-sava-theme", next);
  });

  els.filterToggle.addEventListener("click", () => {
    const hidden = !els.controlStrip.classList.contains("is-collapsed");
    setFiltersHidden(hidden);
    localStorage.setItem("jornada-sava-filters-hidden", String(hidden));
  });

  els.namesToggle.addEventListener("click", () => {
    const privacy = state.namesPrivacy;
    if (!privacy.active) {
      privacy.active = true;
      privacy.othersRevealed = false;
      privacy.championRevealed = false;
    } else if (!privacy.othersRevealed) {
      privacy.othersRevealed = true;
    } else {
      privacy.active = false;
      privacy.othersRevealed = false;
      privacy.championRevealed = false;
    }
    updateNamesToggleButton();
    renderRanking();
    renderWinner(state.years.get(state.activeYear));
  });

  els.rankingBody.addEventListener("click", (event) => {
    if (!event.target.closest("[data-reveal-champion]")) return;
    revealChampion();
  });

  els.winnerModalClose.addEventListener("click", closeWinnerModal);
  els.winnerModalContinue.addEventListener("click", closeWinnerModal);
  els.winnerModal.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-winner-modal]")) closeWinnerModal();
  });

  els.badgesToggle.addEventListener("click", () => {
    state.badgesExpanded = !state.badgesExpanded;
    renderBadges(state.years.get(state.activeYear));
  });

  els.badgesList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-badge-id]");
    if (!card) return;
    openBadgeModal(card.dataset.badgeId);
  });

  els.badgesList.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    const card = event.target.closest("[data-badge-id]");
    if (!card) return;
    event.preventDefault();
    openBadgeModal(card.dataset.badgeId);
  });

  els.badgeModalClose.addEventListener("click", closeBadgeModal);
  els.badgeModal.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-badge-modal]")) closeBadgeModal();
  });
  els.badgeModalFeature.addEventListener("click", (event) => {
    const control = event.target.closest("[data-badge-tab]");
    if (!control) return;
    state.activeBadgeId = control.dataset.badgeTab;
    renderBadgeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.badgeModal.classList.contains("open")) closeBadgeModal();
    if (event.key === "ArrowLeft" && els.badgeModal.classList.contains("open")) navigateBadgeModal(-1);
    if (event.key === "ArrowRight" && els.badgeModal.classList.contains("open")) navigateBadgeModal(1);
    if (event.key === "Escape" && els.winnerModal.classList.contains("open")) closeWinnerModal();
  });

}

function getDefaultWinnerPhoto(year) {
  return winnerPhotosByYear[Number(year)] || "Logo - Copia.png";
}

function restorePreferences() {
  const theme = localStorage.getItem("jornada-sava-theme") || "dark";
  setTheme(theme);

  setFiltersHidden(localStorage.getItem("jornada-sava-filters-hidden") === "true");
}

function setFiltersHidden(hidden) {
  els.controlStrip.classList.toggle("is-collapsed", hidden);
  els.filterToggle.setAttribute("aria-pressed", String(hidden));
}

function updateNamesToggleButton() {
  const privacy = state.namesPrivacy;
  const awaitingRevealAll = privacy.active && !privacy.othersRevealed;
  els.namesToggleIcon.src = awaitingRevealAll ? "icones/view.png" : "icones/hide.png";
  els.namesToggle.setAttribute("aria-pressed", String(privacy.active));
  els.namesToggle.title = awaitingRevealAll
    ? "Revelar todos (exceto o 1º lugar)"
    : privacy.active
      ? "Ocultar nomes novamente"
      : "Ocultar nomes";
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  els.themeToggle?.setAttribute("aria-pressed", String(theme === "dark"));
}

function restoreYearFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const requestedYear = Number(params.get("year") || window.location.hash.replace("#", ""));
  if ([2025, 2026].includes(requestedYear)) setActiveYear(requestedYear);
}

function setActiveYear(year) {
  state.activeYear = year;
  document.querySelectorAll("[data-year]").forEach((item) => {
    const active = Number(item.dataset.year) === state.activeYear;
    item.classList.toggle("active", active);
    item.setAttribute("aria-selected", String(active));
  });
}

async function waitForXlsx() {
  const started = Date.now();
  while (!window.XLSX) {
    if (Date.now() - started > 9000) {
      throw new Error("Biblioteca XLSX indisponível.");
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
}

async function loadAllWorkbooks() {
  const processedData = await loadProcessedData();
  if (processedData?.years) {
    const loaded = Object.values(processedData.years).map(parseProcessedYear);
    loaded.forEach((yearData) => state.years.set(yearData.year, yearData));
    buildCumulativeTotals();
    return;
  }

  const jsonData = await loadJsonData();
  const loaded = await Promise.all(
    workbookConfigs.map((config) => loadWorkbook(config, jsonData?.workbooks?.[String(config.year)])),
  );
  loaded.forEach((yearData) => state.years.set(yearData.year, yearData));
  buildCumulativeTotals();
}

async function loadProcessedData() {
  if (window.JORNADA_SAVA_PANEL_DATA?.years) return window.JORNADA_SAVA_PANEL_DATA;

  try {
    const response = await fetch("dados-painel.json", { cache: "no-store" });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function parseProcessedYear(rawYear) {
  const people = new Map();
  const totals = {
    felicidade: 0,
    eventos: 0,
    tecnica: 0,
    socio: 0,
    competencias: 0,
    maxScore: 0,
    badges: 0,
  };

  (rawYear.people || []).forEach((rawPerson) => {
    const person = {
      key: rawPerson.key || normalize(rawPerson.name),
      name: rawPerson.name,
      category: rawPerson.category || "Sem avaliação",
      score: round(rawPerson.score || 0),
      levelScore: round(rawPerson.levelScore ?? rawPerson.score ?? 0),
      felicidade: round(rawPerson.felicidade || 0),
      eventos: round(rawPerson.eventos || 0),
      tecnica: round(rawPerson.tecnica || 0),
      socio: round(rawPerson.socio || 0),
      competencias: round(rawPerson.competencias || 0),
      evaluations: rawPerson.evaluations || 0,
      badges: rawPerson.badges || [],
      badgeScores: rawPerson.badgeScores || {},
    };
    people.set(person.key, person);
    totals.felicidade += person.felicidade;
    totals.eventos += person.eventos;
    totals.tecnica += person.tecnica;
    totals.socio += person.socio;
    totals.competencias += person.competencias;
    totals.badges += person.badges.length;
  });

  const ranking = [...people.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  totals.maxScore = ranking[0]?.score || 0;

  Object.keys(totals).forEach((key) => {
    totals[key] = round(totals[key]);
  });

  return {
    year: Number(rawYear.year),
    label: String(rawYear.year),
    file: rawYear.source || "",
    people,
    ranking,
    totals,
    highlights: rawYear.highlights || [],
    updatedAt: rawYear.updatedAt ? new Date(rawYear.updatedAt) : new Date(0),
  };
}

async function loadJsonData() {
  if (window.JORNADA_SAVA_DATA?.workbooks) return window.JORNADA_SAVA_DATA;

  try {
    const response = await fetch("dados-jornada.json", { cache: "no-store" });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function loadWorkbook(config, jsonRows) {
  try {
    if (Array.isArray(jsonRows)) return parseWorkbook(config, jsonRows);

    await waitForXlsx();
    const response = await fetch(encodeURI(config.file));
    if (!response.ok) throw new Error(`Não foi possível carregar ${config.file}.`);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
    return parseWorkbook(config, rows);
  } catch (error) {
    showLoadError(config, error);
    return emptyYear(config);
  }
}

function parseWorkbook(config, rows) {
  const people = new Map();
  const totals = {
    felicidade: 0,
    eventos: 0,
    tecnica: 0,
    socio: 0,
    competencias: 0,
    maxScore: 0,
    badges: 0,
  };
  const highlights = [];
  const cycleDates = new Map();
  const attendanceByPerson = new Map();
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const kindHeader = findHeader(headers, "selecione abaixo qual tipo de registro");

  rows.forEach((row) => {
    const kind = clean(row[kindHeader]);
    if (kind === "Avaliação Advogados") parseLawyerRow(row, headers, people, highlights);
    if (kind === "Avaliação Controladoria e ADM") parseAdminRow(row, headers, people, highlights);
    if (kind === "Acompanhamento RH") parseAttendanceRow(row, headers, people, attendanceByPerson, cycleDates, config.year);
  });

  allocateAttendance(attendanceByPerson, cycleDates, people, config.year);
  applyLegacyRankRules(config.year, people);
  finalizePeople(people, totals);

  const ranking = [...people.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  totals.maxScore = ranking[0]?.score || 0;
  totals.badges = ranking.reduce((sum, person) => sum + person.badges.length, 0);

  return {
    year: config.year,
    label: config.label,
    file: config.file,
    people,
    ranking,
    totals,
    highlights,
    updatedAt: rows.reduce((max, row) => {
      const date = parseDateValue(row["Carimbo de data/hora"], config.year);
      return date && date > max ? date : max;
    }, new Date(0)),
  };
}

function parseLawyerRow(row, headers, people, highlights) {
  const nameHeader = findHeader(headers, "nome completo do advogado");
  const name = clean(row[nameHeader]);
  if (!name) return;

  const person = getPerson(people, name, "Advogados Associados");
  const responsibility = numberByHeader(row, headers, ["alta responsabilidade", "responsabilidade"]);
  const collaboration = numberByHeader(row, headers, ["relacionamentos colaborativos"]);
  const legalKnowledge = numberByHeader(row, headers, ["conhecimentos jurídicos"]);
  const proactivity = numberByHeader(row, headers, ["proatividade estratégica"]);
  const score = responsibility + collaboration + legalKnowledge + proactivity;

  person.competencias += score;
  person.score += score;
  person.evaluations += 1;
  const brightScore = getLawyerBrightScore(legalKnowledge, proactivity);
  person.brightScore = Math.max(person.brightScore || 0, brightScore);
  const inspireScore = getLawyerInspireScore(responsibility, collaboration);
  person.inspireScore = Math.max(person.inspireScore || 0, inspireScore);
  person.technicalMax = person.technicalMax || brightScore >= 1900;
  person.socialMax = person.socialMax || inspireScore >= 2000;

  addHighlight(row, headers, person, highlights);
}

function parseAdminRow(row, headers, people, highlights) {
  const nameHeader = findHeader(headers, "nome do colaborador (avaliado)") || findHeader(headers, "nome do colaborador");
  const name = clean(row[nameHeader]);
  if (!name) return;

  const person = getPerson(people, name, "Controladoria e Administrativo");
  const tecnica =
    numberByHeader(row, headers, ["qualidade técnica nos serviços"]) +
    numberByHeader(row, headers, ["eficiência no atendimento ao cliente"]) +
    numberByHeader(row, headers, ["domínio de ferramentas tecnológicas"]);
  const socio =
    numberByHeader(row, headers, ["proatividade"]) +
    numberByHeader(row, headers, ["inteligência emocional e social"]) +
    numberByHeader(row, headers, ["autogestão"]);

  person.tecnica += tecnica;
  person.socio += socio;
  person.score += tecnica + socio;
  person.evaluations += 1;
  person.brightScore = Math.max(person.brightScore || 0, tecnica);
  person.inspireScore = Math.max(person.inspireScore || 0, socio);
  person.technicalMax = person.technicalMax || tecnica >= 1500;
  person.socialMax = person.socialMax || socio >= 2000;

  addHighlight(row, headers, person, highlights);
}

function parseAttendanceRow(row, headers, people, attendanceByPerson, cycleDates, year) {
  headers.forEach((header) => {
    if (!header.includes("[") || !header.includes("]")) return;
    const rawValue = clean(row[header]);
    if (!rawValue) return;

    const name = header.match(/\[(.*?)\]/)?.[1];
    if (!name) return;

    const person = getPerson(people, name, "");
    const personDates = attendanceByPerson.get(person.key) || new Set();
    splitAttendanceDates(rawValue).forEach((dateLabel) => {
      const date = parseAttendanceDate(dateLabel, year);
      if (!date) return;
      const cycle = getCycleKey(date);
      if (!cycle) return;
      const iso = date.toISOString().slice(0, 10);
      personDates.add(`${cycle}|${iso}`);
      if (!cycleDates.has(cycle)) cycleDates.set(cycle, new Set());
      cycleDates.get(cycle).add(iso);
    });
    attendanceByPerson.set(person.key, personDates);
  });
}

function allocateAttendance(attendanceByPerson, cycleDates, people, year) {
  attendanceByPerson.forEach((entries, key) => {
    const person = people.get(key);
    if (!person) return;

    if (year === 2025) {
      const pointByAttendance = person.category === "Advogados Associados" ? 575 : 325;
      const attendanceScore = entries.size * pointByAttendance;
      person.eventos += attendanceScore;
      person.score += attendanceScore;
      person.happinessMax = entries.size > 0;
      person.attendanceCycles = entries.size;
      return;
    }

    const cyclesCompleted = new Set();
    entries.forEach((entry) => {
      const [cycle] = entry.split("|");
      const opportunities = cycleDates.get(cycle)?.size || 1;
      const felicidade = attendanceMaxByCycle.felicidade / opportunities;
      const eventos = attendanceMaxByCycle.eventos / opportunities;
      person.felicidade += felicidade;
      person.eventos += eventos;
      person.score += felicidade + eventos;

      const attendedInCycle = [...entries].filter((item) => item.startsWith(`${cycle}|`)).length;
      if (attendedInCycle === opportunities) cyclesCompleted.add(cycle);
    });
    person.attendanceCycles = cyclesCompleted.size;
    person.happinessMax = cyclesCompleted.size > 0;
  });
}

function applyLegacyRankRules(year, people) {
  if (year !== 2025) return;

  people.forEach((person) => {
    const lookerTotal = legacy2025TotalOverrides[normalize(person.name)];
    const lookerRank = legacy2025RankOverrides[normalize(person.name)];
    if (lookerTotal) person.levelScore = lookerTotal;
    if (!lookerRank) return;

    const difference = lookerRank - person.score;
    person.eventos += difference;
    person.score = lookerRank;
  });
}

function finalizePeople(people, totals) {
  people.forEach((person) => {
    person.score = round(person.score);
    person.felicidade = round(person.felicidade);
    person.eventos = round(person.eventos);
    person.tecnica = round(person.tecnica);
    person.socio = round(person.socio);
    person.competencias = round(person.competencias);

    if (!person.category) person.category = "Sem avaliação";
    person.badges = [];
    person.badgeScores = person.badgeScores || {};
    if (person.happinessMax) {
      person.badges.push("happy");
      person.badgeScores.happy = person.felicidade || person.score;
    }
    if (person.technicalMax) {
      person.badges.push("bright");
      person.badgeScores.bright = person.brightScore || person.tecnica || person.score;
    }
    if (person.socialMax) {
      person.badges.push("inspire");
      person.badgeScores.inspire = person.inspireScore || person.socio || person.score;
    }

    totals.felicidade += person.felicidade;
    totals.eventos += person.eventos;
    totals.tecnica += person.tecnica;
    totals.socio += person.socio;
    totals.competencias += person.competencias;
  });

  Object.keys(totals).forEach((key) => {
    totals[key] = round(totals[key]);
  });
}

function buildCumulativeTotals() {
  state.cumulative.clear();
  const orderedYears = [...state.years.values()].sort((a, b) => a.year - b.year);
  orderedYears.forEach((yearData) => {
    yearData.ranking.forEach((person) => {
      const key = resolveExistingKey(state.cumulative, person.name) || person.key;
      const current = state.cumulative.get(key) || {
        key,
        name: person.name,
        score: 0,
      };
      current.name = person.name;
      current.score += person.levelScore ?? person.score;
      state.cumulative.set(key, current);
    });
  });
}

function render() {
  const yearData = state.years.get(state.activeYear);
  if (!yearData) return;
  renderWinner(yearData);
  renderRanking();
  renderBadges(yearData);
  els.rankingTitle.textContent = `Ranking ${yearData.year}`;
  els.lastUpdated.textContent = yearData.updatedAt.getTime()
    ? `Atualizado em ${formatDateTime(yearData.updatedAt)}`
    : "Aguardando dados";
}

function renderWinner(yearData) {
  const winner = yearData.ranking[0];
  els.winnerKicker.textContent = `Destaque ${yearData.year}`;
  if (!winner) {
    els.winnerName.textContent = "Sem dados";
    els.winnerScore.textContent = "0";
    els.winnerLevel.textContent = "Nível acumulado";
    els.winnerImage.src = getDefaultWinnerPhoto(yearData.year);
    setWinnerMasked(false);
    return;
  }

  els.winnerImage.src = getDefaultWinnerPhoto(yearData.year);

  const privacy = state.namesPrivacy;
  setWinnerMasked(privacy.active && !privacy.championRevealed);
  els.winnerName.textContent = winner.name;
  els.winnerScore.textContent = formatNumber(winner.score);
  els.winnerLevel.textContent = getPersonLevel(winner).name;
}

function setWinnerMasked(masked) {
  els.winnerImageFrame.classList.toggle("is-masked", masked);
  els.winnerName.classList.toggle("is-blurred", masked);
}

function revealChampion() {
  if (state.namesPrivacy.championRevealed) return;
  state.namesPrivacy.championRevealed = true;

  const yearData = state.years.get(state.activeYear);
  const winner = yearData?.ranking[0];
  renderRanking();
  renderWinner(yearData);
  openWinnerModal(winner);
}

const confettiColors = ["#e5c07c", "#f0cf8e", "#fff3d0", "#b99243", "#ffffff"];

function spawnConfetti(container, count = 150) {
  container.innerHTML = "";
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    const isRound = Math.random() < 0.4;
    piece.className = "confetti-piece";
    const size = 5 + Math.random() * 7;
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.width = `${size}px`;
    piece.style.height = `${isRound ? size : size * 1.7}px`;
    piece.style.borderRadius = isRound ? "50%" : "2px";
    piece.style.background = confettiColors[Math.floor(Math.random() * confettiColors.length)];
    piece.style.animationDuration = `${4.2 + Math.random() * 3.2}s`;
    piece.style.animationDelay = `${Math.random() * 3.2}s`;
    piece.style.setProperty("--drift", `${(Math.random() - 0.5) * 260}px`);
    frag.appendChild(piece);
  }
  container.appendChild(frag);
}

function openWinnerModal(winner) {
  if (!winner) return;
  els.winnerModalPhoto.src = els.winnerImage.src;
  els.winnerModalName.textContent = winner.name;
  els.winnerModalLevel.textContent = getPersonLevel(winner).name;
  els.winnerModalScore.textContent = formatNumber(winner.score);
  spawnConfetti(els.winnerConfetti);
  els.winnerModal.classList.add("open");
  els.winnerModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  els.winnerModalClose.focus();
}

function closeWinnerModal() {
  els.winnerModal.classList.remove("open");
  els.winnerModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  els.winnerConfetti.innerHTML = "";
}

function renderRanking() {
  const yearData = state.years.get(state.activeYear);
  if (!yearData) return;

  const filtered = yearData.ranking.filter((person) => {
    const level = getPersonLevel(person);
    const matchesSearch = normalize(person.name).includes(normalize(state.search));
    const matchesCategory = state.category === "all" || person.category === state.category;
    const matchesLevel = state.level === "all" || level.slug === state.level;
    return matchesSearch && matchesCategory && matchesLevel;
  });

  if (state.experienceSort) {
    filtered.sort((a, b) => {
      const order = state.experienceSort === "asc" ? 1 : -1;
      return (getCumulativeScore(a) - getCumulativeScore(b)) * order || b.score - a.score || a.name.localeCompare(b.name);
    });
  }

  updateExperienceSortControl();
  const hasActiveFilters = Boolean(state.search.trim()) || state.category !== "all" || state.level !== "all";
  els.rankingCount.textContent = hasActiveFilters
    ? `${filtered.length} de ${yearData.ranking.length} pessoas`
    : `${filtered.length} pessoas`;

  if (!filtered.length) {
    els.rankingBody.innerHTML = `<tr><td colspan="6"><div class="empty-state">Nenhum resultado encontrado.</div></td></tr>`;
    return;
  }

  els.rankingBody.innerHTML = filtered
    .map((person, index) => {
      const pos = index + 1;
      const level = getPersonLevel(person);
      const cumulative = getCumulativeScore(person);
      const tierMax = level.max === Infinity ? cumulative || level.min || 1 : level.max;
      const progressPct = Math.max(
        0,
        Math.min(100, Math.round(((cumulative - level.min) / Math.max(1, tierMax - level.min)) * 100))
      );
      const rankClass = pos <= 3 ? ` rank-${pos}` : "";
      const privacy = state.namesPrivacy;
      const isChampion = pos === 1;
      const championHidden = isChampion && privacy.active && !privacy.championRevealed;
      const othersHidden = !isChampion && privacy.active && !privacy.othersRevealed;
      const nameHidden = championHidden || othersHidden;
      const nameCellMarkup = championHidden
        ? `
          <button type="button" class="champion-reveal-btn" data-reveal-champion>
            <img src="icones/trofeu.png" alt="" aria-hidden="true" />
            Revelar campeão
          </button>
        `
        : `
          <div class="person-cell">
            <span class="avatar${nameHidden ? " is-masked" : ""}" aria-hidden="true">${nameHidden ? "?" : escapeHtml(getInitials(person.name))}</span>
            <span class="person-name${nameHidden ? " is-blurred" : ""}">${escapeHtml(person.name)}</span>
          </div>
        `;
      return `
        <tr>
          <td><span class="rank-chip${rankClass}">${pos}</span></td>
          <td class="name-cell">${nameCellMarkup}</td>
          <td>${escapeHtml(person.category)}</td>
          <td><span class="level-pill level-${level.slug}">${level.name}</span></td>
          <td class="numeric"><strong>${formatNumber(person.score)}</strong></td>
          <td class="numeric">
            <div class="level-progress-cell">
              <span>${formatNumber(cumulative)}</span>
              <div class="level-progress-track">
                <div class="level-progress-fill level-${level.slug}" style="width:${progressPct}%"></div>
              </div>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function updateExperienceSortControl() {
  if (!els.experienceSort) return;
  const direction = state.experienceSort;
  const header = els.experienceSort.closest("th");
  els.experienceSort.classList.toggle("is-sorted", Boolean(direction));
  els.experienceSort.dataset.direction = direction || "none";
  els.experienceSort.setAttribute(
    "aria-label",
    direction === "asc" ? "Ordenar experiência do maior para o menor" : "Ordenar experiência do menor para o maior"
  );
  if (header) {
    header.setAttribute("aria-sort", direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none");
  }
}

function renderBadges(yearData) {
  if (!yearData) return;
  els.badgesToggle.textContent = state.badgesExpanded ? "Ver menos" : "Ver todos";
  els.badgesToggle.insertAdjacentHTML("beforeend", `<span aria-hidden="true">›</span>`);
  els.badgesToggle.classList.toggle("expanded", state.badgesExpanded);

  els.badgesList.innerHTML = badgeDefinitions
    .map((badge) => {
      const people = yearData.ranking.filter((person) => person.badges.includes(badge.id));
      const countLabel = people.length === 1 ? "1 contemplado" : `${people.length} contemplados`;
      const visiblePeople = state.badgesExpanded ? people : people.slice(0, people.length <= 2 ? 2 : 8);
      const peopleList = renderBadgePeople(visiblePeople, people.length, badge);
      return `
        <article class="badge-card badge-card-${badge.tone}" data-badge-id="${badge.id}" role="button" tabindex="0" aria-label="Abrir detalhes do selo ${badge.label}">
          <span class="badge-spark" aria-hidden="true"></span>
          <img class="badge-seal" src="${badge.image}" alt="${badge.label}" />
          <h3>${badge.label}</h3>
          <p class="badge-description">${badge.description}</p>
          <div class="badge-divider"></div>
          <strong class="badge-count">${countLabel}</strong>
          ${peopleList}
        </article>
      `;
    })
    .join("");
}

function renderBadgePeople(people, total, badge) {
  if (!people.length) return `<p class="badge-empty">Sem contemplados no momento.</p>`;

  if (state.badgesExpanded || total <= 2) {
    return `
      <div class="badge-person-grid">
        ${people
          .map(
            (person) => `
              <div class="badge-person">
                <span class="badge-avatar">${getInitials(person.name)}</span>
                <span>
                  <strong>${escapeHtml(person.name)}</strong>
                  <small>${escapeHtml(person.category)} · ${formatNumber(getBadgeScore(person, badge.id))}</small>
                </span>
              </div>
            `,
          )
          .join("")}
      </div>
    `;
  }

  const extra = total - people.length;
  return `
    <div class="badge-avatar-stack" aria-label="${total} contemplados">
      ${people.map((person) => `<span class="badge-avatar" title="${escapeHtml(person.name)}">${getInitials(person.name)}</span>`).join("")}
      ${extra > 0 ? `<span class="badge-avatar badge-avatar-more">+${extra}</span>` : ""}
    </div>
  `;
}

function openBadgeModal(badgeId) {
  state.activeBadgeId = badgeId;
  renderBadgeModal();
  els.badgeModal.classList.add("open");
  els.badgeModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  els.badgeModalClose.focus();
}

function closeBadgeModal() {
  els.badgeModal.classList.remove("open");
  els.badgeModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function navigateBadgeModal(direction) {
  const currentIndex = badgeDefinitions.findIndex((badge) => badge.id === state.activeBadgeId);
  const nextIndex = (currentIndex + direction + badgeDefinitions.length) % badgeDefinitions.length;
  state.activeBadgeId = badgeDefinitions[nextIndex].id;
  renderBadgeModal();
}

function renderBadgeModal() {
  const yearData = state.years.get(state.activeYear);
  const badge = badgeDefinitions.find((item) => item.id === state.activeBadgeId) || badgeDefinitions[0];
  const people = getBadgePeople(yearData, badge);
  const totalPoints = people.reduce((sum, person) => sum + getBadgeScore(person, badge.id), 0);
  const countLabel = people.length === 1 ? "pessoa neste selo" : "pessoas neste selo";

  els.badgeModalFeature.innerHTML = `
    <img class="modal-brand" src="Logo.png" alt="Sebadelhe Aranha & Vasconcelos Advocacia" />
    <div class="modal-seal-wrap modal-seal-${badge.tone}">
      <span class="modal-beam modal-beam-one" aria-hidden="true"></span>
      <span class="modal-beam modal-beam-two" aria-hidden="true"></span>
      <span class="modal-particles" aria-hidden="true"></span>
      <span class="modal-glow" aria-hidden="true"></span>
      <img src="${badge.image}" alt="${badge.label}" />
    </div>
    <div class="modal-copy">
      <p class="panel-kicker">Selo em destaque</p>
      <h2 id="badgeModalTitle">${badge.label}</h2>
      <p>${badge.description}</p>
      <div class="modal-divider"></div>
      <div class="modal-stats">
        <div>
          <small>Contemplados</small>
          <strong class="count-up" data-count-to="${people.length}">0</strong>
          <span>${countLabel}</span>
        </div>
        <div>
          <small>Pontos distribuídos</small>
          <strong class="count-up" data-count-to="${totalPoints}">0</strong>
          <span>pontos do selo</span>
        </div>
      </div>
    </div>
    <div class="modal-carousel-controls" role="tablist" aria-label="Selecionar selo">
      ${badgeDefinitions
        .map(
          (item) => `
            <button
              class="modal-carousel-marker ${item.id === badge.id ? "is-active" : ""}"
              type="button"
              data-badge-tab="${item.id}"
              role="tab"
              aria-selected="${item.id === badge.id ? "true" : "false"}"
              aria-label="Ver ${item.label}"
            ></button>
          `,
        )
        .join("")}
    </div>
  `;
  animateCountUp(els.badgeModalFeature.querySelectorAll(".count-up"));

  els.badgeModalList.innerHTML = people.length
    ? people
        .map(
          (person) => `
            <article class="modal-person">
              <span class="badge-avatar">${getInitials(person.name)}</span>
              <span class="modal-person-copy">
                <strong>${escapeHtml(person.name)}</strong>
                <small>${escapeHtml(person.category)}</small>
              </span>
              <span class="modal-person-score">
                <strong>${formatNumber(getBadgeScore(person, badge.id))}</strong>
                <small>pontos</small>
              </span>
            </article>
          `,
        )
        .join("")
    : `<div class="modal-empty">Sem contemplados no momento.</div>`;
}

function animateCountUp(elements) {
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  elements.forEach((element) => {
    const target = Number(element.dataset.countTo || 0);
    if (!Number.isFinite(target) || reducedMotion) {
      element.textContent = formatNumber(target);
      return;
    }

    const duration = Math.min(2800, Math.max(1800, 1200 + target / 18));
    const startedAt = performance.now();

    const step = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = countUpEasing(progress);
      element.textContent = formatNumber(Math.round(target * eased));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        element.textContent = formatNumber(target);
      }
    };

    requestAnimationFrame(step);
  });
}

function countUpEasing(progress) {
  if (progress < 0.28) {
    const start = progress / 0.28;
    return 0.78 * (1 - Math.pow(1 - start, 3));
  }

  const tail = (progress - 0.28) / 0.72;
  return 0.78 + 0.22 * (1 - Math.pow(1 - tail, 3.8));
}

function getBadgePeople(yearData, badge) {
  if (!yearData) return [];
  return yearData.ranking
    .filter((person) => person.badges.includes(badge.id))
    .sort((a, b) => getBadgeScore(b, badge.id) - getBadgeScore(a, badge.id) || b.score - a.score || a.name.localeCompare(b.name));
}


function renderMiniBadges(badges) {
  if (!badges.length) return `<span class="count-pill">-</span>`;
  return `
    <div class="mini-badges">
      ${badges
        .map((id) => {
          const badge = badgeDefinitions.find((item) => item.id === id);
          return `<span class="mini-badge ${badge.className}">${badge.short}</span>`;
        })
        .join("")}
    </div>
  `;
}

function getPerson(people, name, category) {
  const existingKey = resolveExistingKey(people, name);
  const key = existingKey || normalize(name);
  const person = people.get(key) || {
    key,
    name: clean(name),
    category,
    score: 0,
    felicidade: 0,
    eventos: 0,
    tecnica: 0,
    socio: 0,
    competencias: 0,
    evaluations: 0,
    badges: [],
    badgeScores: {},
    technicalMax: false,
    socialMax: false,
    happinessMax: false,
    attendanceCycles: 0,
  };

  if (category && (!person.category || person.category === "Sem avaliação")) person.category = category;
  if (clean(name).length > person.name.length || !person.name) person.name = clean(name);
  people.set(key, person);
  return person;
}

function resolveExistingKey(people, name) {
  const normalized = normalize(name);
  if (people.has(normalized)) return normalized;

  const tokens = tokenSet(name);
  for (const [key, person] of people.entries()) {
    const existingTokens = tokenSet(person.name || key);
    const intersection = [...tokens].filter((token) => existingTokens.has(token));
    const firstMatches = [...tokens][0] && [...tokens][0] === [...existingTokens][0];
    if (firstMatches && intersection.length >= Math.min(2, tokens.size, existingTokens.size)) return key;
  }
  return null;
}

function addHighlight(row, headers, person, highlights) {
  const header = headers.find((item) => normalize(item).includes("merece algum destaque especial"));
  const note = clean(row[header]);
  if (!note || /^(n|nao|não|nan)$/i.test(note)) return;
  highlights.push({ name: person.name, note });
}

function getLawyerBrightScore(legalKnowledge, proactivity) {
  return toNumber(legalKnowledge) + toNumber(proactivity);
}

function getLawyerInspireScore(responsibility, collaboration) {
  return (toNumber(responsibility) / 800) * 1000 + (toNumber(collaboration) / 800) * 1000;
}

function getBadgeScore(person, badgeId) {
  return round(person.badgeScores?.[badgeId] ?? person.score);
}

function getInitials(name) {
  return clean(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getPersonLevel(person) {
  const cumulative = getCumulativeScore(person);
  return levelRules.find((rule) => cumulative >= rule.min && cumulative <= rule.max) || levelRules[0];
}

function getCumulativeScore(person, year = state.activeYear) {
  const currentYear = state.years.get(year);
  if (currentYear) {
    const key = resolveExistingKey(currentYear.people, person.name) || normalize(person.name);
    const currentPerson = currentYear.people.get(key);
    if (currentPerson?.levelScore) return currentPerson.levelScore;
  }

  let total = 0;
  [...state.years.values()]
    .filter((yearData) => yearData.year <= year)
    .sort((a, b) => a.year - b.year)
    .forEach((yearData) => {
      const key = resolveExistingKey(yearData.people, person.name) || normalize(person.name);
      const match = yearData.people.get(key);
      if (match) total += match.levelScore ?? match.score;
    });

  return total || person.levelScore || person.score;
}

function downloadCsv() {
  const yearData = state.years.get(state.activeYear);
  if (!yearData) return;

  const rows = [
    ["Posição", "Nome", "Área", "Nível acumulado", "Selos", "Rank", "Total para nível"],
    ...yearData.ranking.map((person, index) => [
      index + 1,
      person.name,
      person.category,
      getPersonLevel(person).name,
      person.badges.map((id) => badgeDefinitions.find((badge) => badge.id === id)?.label).join(" | "),
      person.score,
      getCumulativeScore(person),
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(";")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `jornada-sava-${state.activeYear}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function showLoadError(config, error) {
  els.rankingBody.innerHTML = `<tr><td colspan="6"><div class="error-state">Erro ao carregar ${config.file}: ${escapeHtml(error.message)}</div></td></tr>`;
}

function emptyYear(config) {
  return {
    year: config.year,
    label: config.label,
    file: config.file,
    people: new Map(),
    ranking: [],
    totals: { felicidade: 0, eventos: 0, tecnica: 0, socio: 0, competencias: 0, maxScore: 0, badges: 0 },
    highlights: [],
    updatedAt: new Date(0),
  };
}

function findHeader(headers, includes) {
  const needles = Array.isArray(includes) ? includes : [includes];
  return headers.find((header) => needles.some((needle) => normalize(header).includes(normalize(needle))));
}

function numberByHeader(row, headers, candidates) {
  const header = findHeader(headers, candidates);
  return toNumber(row[header]);
}

function splitAttendanceDates(value) {
  return clean(value)
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseAttendanceDate(value, year) {
  const match = clean(value).match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const parsedYear = match[3] ? Number(match[3].length === 2 ? `20${match[3]}` : match[3]) : year;
  return new Date(parsedYear, month - 1, day);
}

function parseDateValue(value, fallbackYear) {
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    return parsed ? new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S) : null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(fallbackYear, 0, 1) : date;
}

function getCycleKey(date) {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  if (month < 3 || month === 12) return null;
  if (month <= 4) return `${year}-mar-abr`;
  if (month <= 6) return `${year}-mai-jun`;
  if (month <= 8) return `${year}-jul-ago`;
  if (month <= 10) return `${year}-set-out`;
  return `${year}-nov`;
}

function normalize(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9 ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function tokenSet(value) {
  const ignored = new Set(["DE", "DA", "DO", "DAS", "DOS", "E"]);
  return new Set(normalize(value).split(" ").filter((token) => token && !ignored.has(token)));
}

function clean(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const number = Number(String(value).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function round(value) {
  return Math.round(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value || 0);
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function csvCell(value) {
  const text = clean(value);
  return `"${text.replace(/"/g, '""')}"`;
}
