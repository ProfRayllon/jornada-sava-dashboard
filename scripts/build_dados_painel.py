import json
import math
import re
import unicodedata
from datetime import date, datetime
from pathlib import Path

import pandas as pd


ROOT_2025_TREATMENT = Path("Tratamneto - base 2025.xlsx")
ROOT_2026_TREATMENT = Path("Tratamento - base 2026.xlsx")

PF_POINTS = 575

KNOWN_2025_TOTALS = {
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
}


def clean(value):
    if value is None:
        return ""
    try:
        if pd.isna(value):
            return ""
    except TypeError:
        pass
    return str(value).strip()


def normalize(value):
    value = clean(value).upper()
    value = "".join(
        char for char in unicodedata.normalize("NFD", value) if unicodedata.category(char) != "Mn"
    )
    value = re.sub(r"[^A-Z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def to_number(value):
    if value is None:
        return 0
    try:
        if pd.isna(value):
            return 0
    except TypeError:
        pass
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0


def fmt_date(value):
    if isinstance(value, (datetime, date, pd.Timestamp)):
        return value.isoformat()
    return value


def base_person(name, category="Sem avaliacao"):
    return {
        "name": clean(name),
        "key": normalize(name),
        "category": category,
        "score": 0,
        "levelScore": 0,
        "felicidade": 0,
        "eventos": 0,
        "tecnica": 0,
        "socio": 0,
        "competencias": 0,
        "badges": [],
        "badgeScores": {},
        "evaluations": 0,
    }


def add_badge(person, badge, score=None):
    if badge not in person["badges"]:
        person["badges"].append(badge)
    if score is not None:
        person["badgeScores"][badge] = round(to_number(score))


def lawyer_bright_score(legal_knowledge, strategic_proactivity):
    return (to_number(legal_knowledge) / 950 * 750) + (to_number(strategic_proactivity) / 950 * 750)


def lawyer_inspire_score(responsibility, collaboration):
    return (to_number(responsibility) / 800 * 1000) + (to_number(collaboration) / 800 * 1000)


def is_date_header(value):
    return isinstance(value, (datetime, date, pd.Timestamp))


def level_score_from_treatment_2025(row, rank_score):
    old_attendance = sum(to_number(row.iloc[index]) for index in range(1, 7))
    old_adv = (
        to_number(row.iloc[10]) * 160
        + to_number(row.iloc[11]) * 160
        + to_number(row.iloc[12]) * 190
        + to_number(row.iloc[13]) * 190
    )
    old_adm = (
        to_number(row.iloc[17]) * 100
        + to_number(row.iloc[18]) * 100
        + to_number(row.iloc[19]) * 100
        + to_number(row.iloc[20]) * 120
        + to_number(row.iloc[21]) * 120
        + to_number(row.iloc[22]) * 160
    )
    return max(rank_score, round(rank_score + old_attendance + old_adv + old_adm))


def process_2025():
    df = pd.read_excel(ROOT_2025_TREATMENT, sheet_name="base_relacionada")
    people = []

    attendance_cols = list(df.columns[23:27])
    adv_cols = list(df.columns[27:31])
    adm_tech_cols = list(df.columns[31:34])
    adm_socio_cols = list(df.columns[34:37])

    for _, row in df.iterrows():
        name = clean(row.get("Nome"))
        if not name:
            continue

        attendance = sum(to_number(row.get(col)) for col in attendance_cols)
        adv_score = sum(to_number(row.get(col)) for col in adv_cols)
        tech_score = sum(to_number(row.get(col)) for col in adm_tech_cols)
        socio_score = sum(to_number(row.get(col)) for col in adm_socio_cols)
        rank_score = round(attendance + adv_score + tech_score + socio_score)
        if rank_score <= 0:
            continue

        category = "Advogados Associados" if adv_score > 0 else "Controladoria e Administrativo"
        person = base_person(name, category)
        person.update(
            {
                "score": rank_score,
                "levelScore": KNOWN_2025_TOTALS.get(normalize(name), level_score_from_treatment_2025(row, rank_score)),
                "felicidade": round(attendance),
                "eventos": 0,
                "tecnica": round(tech_score),
                "socio": round(socio_score),
                "competencias": round(adv_score),
                "evaluations": 1 if adv_score or tech_score or socio_score else 0,
            }
        )

        if attendance >= PF_POINTS * len(attendance_cols):
            add_badge(person, "happy", attendance)
        if (
            category == "Advogados Associados"
            and lawyer_bright_score(row.get(adv_cols[2]), row.get(adv_cols[3])) >= 1500
        ) or (
            category != "Advogados Associados" and tech_score >= 1500
        ):
            bright_score = (
                lawyer_bright_score(row.get(adv_cols[2]), row.get(adv_cols[3]))
                if category == "Advogados Associados"
                else tech_score
            )
            add_badge(person, "bright", bright_score)
        if (
            category == "Advogados Associados"
            and lawyer_inspire_score(row.get(adv_cols[0]), row.get(adv_cols[1])) >= 2000
        ) or (
            category != "Advogados Associados" and socio_score >= 2000
        ):
            inspire_score = (
                lawyer_inspire_score(row.get(adv_cols[0]), row.get(adv_cols[1]))
                if category == "Advogados Associados"
                else socio_score
            )
            add_badge(person, "inspire", inspire_score)

        people.append(person)

    return {
        "year": 2025,
        "source": str(ROOT_2025_TREATMENT),
        "updatedAt": datetime.now().isoformat(timespec="seconds"),
        "people": sorted(people, key=lambda item: (-item["score"], item["name"])),
        "highlights": [],
        "notes": [
            "2025 usa a aba base_relacionada do arquivo tratado.",
            "Rank 2025 = presencas do periodo + avaliacao do periodo.",
            "Total para nivel 2025 usa totais confirmados do Looker quando existem; demais nomes usam o historico convertido da base tratada.",
        ],
    }


def process_2026():
    df = pd.read_excel(ROOT_2026_TREATMENT, sheet_name="base_relacionada")
    people = []

    attendance_cols = [col for col in df.columns if is_date_header(col)]
    adv_cols = list(df.columns[21:25])
    adm_tech_cols = list(df.columns[25:28])
    adm_socio_cols = list(df.columns[28:31])

    for _, row in df.iterrows():
        name = clean(row.get("Nome"))
        if not name:
            continue

        person = base_person(name, clean(row.get("Categoria")) or "Sem avaliacao")
        person.update(
            {
                "score": round(to_number(row.get("Rank"))),
                "levelScore": round(to_number(row.get("Total para nível"))),
                "felicidade": round(sum(to_number(row.get(col)) for col in attendance_cols)),
                "eventos": 0,
                "tecnica": round(sum(to_number(row.get(col)) for col in adm_tech_cols)),
                "socio": round(sum(to_number(row.get(col)) for col in adm_socio_cols)),
                "competencias": round(sum(to_number(row.get(col)) for col in adv_cols)),
                "evaluations": 1 if clean(row.get("Categoria")) != "Sem avaliação" else 0,
            }
        )

        if clean(row.get("Selo Sou feliz!")):
            add_badge(person, "happy", person["felicidade"])
        if (
            person["category"] == "Advogados Associados"
            and lawyer_bright_score(row.get(adv_cols[2]), row.get(adv_cols[3])) >= 1500
        ) or (
            person["category"] == "Controladoria e Administrativo" and person["tecnica"] >= 1500
        ):
            bright_score = (
                lawyer_bright_score(row.get(adv_cols[2]), row.get(adv_cols[3]))
                if person["category"] == "Advogados Associados"
                else person["tecnica"]
            )
            add_badge(person, "bright", bright_score)
        if (
            person["category"] == "Advogados Associados"
            and lawyer_inspire_score(row.get(adv_cols[0]), row.get(adv_cols[1])) >= 2000
        ) or (
            person["category"] == "Controladoria e Administrativo" and person["socio"] >= 2000
        ):
            inspire_score = (
                lawyer_inspire_score(row.get(adv_cols[0]), row.get(adv_cols[1]))
                if person["category"] == "Advogados Associados"
                else person["socio"]
            )
            add_badge(person, "inspire", inspire_score)

        if person["score"] > 0:
            people.append(person)

    return {
        "year": 2026,
        "source": str(ROOT_2026_TREATMENT),
        "updatedAt": datetime.now().isoformat(timespec="seconds"),
        "people": sorted(people, key=lambda item: (-item["score"], item["name"])),
        "highlights": [],
        "notes": [
            "2026 usa a aba base_relacionada criada com a mesma estrutura do tratamento 2025.",
            "Rank 2026 reinicia no ano; Total para nivel acumula apenas para definir o nivel.",
            "As datas 2026 foram tratadas como Programa de Felicidade porque a planilha bruta nao identifica Evento.",
        ],
    }


def main():
    data = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "years": {"2025": process_2025(), "2026": process_2026()},
    }
    with open("dados-painel.json", "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2, default=fmt_date)
    with open("dados-painel.js", "w", encoding="utf-8") as file:
        file.write("window.JORNADA_SAVA_PANEL_DATA = ")
        json.dump(data, file, ensure_ascii=False, separators=(",", ":"), default=fmt_date)
        file.write(";\n")
    print("dados-painel gerado", len(data["years"]["2025"]["people"]), len(data["years"]["2026"]["people"]))


if __name__ == "__main__":
    main()
