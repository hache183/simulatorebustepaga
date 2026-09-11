#!/usr/bin/env python3
"""FASE 0+1: retribuzioneMensileTabella, scomposizione WK, scalaConPartTime, orario pieno."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CCNL_DIR = ROOT / "data" / "ccnl"
TODAY = "2026-09-11T00:00:00Z"

# Override per codice livello: minimo, contingenza, edr, altre, totale, scatto?
# Valori da PDF LAVORO/ o FILCAMS (commercio).

COMMERCIO = {
    # FILCAMS CCNL Terziario 1/11/2025 + kitech H011 Confcommercio.
    # Terzo elemento 2,07 in altreIndennitaFisse (non è EDR 10,33).
    "Q":  (2183.09, 540.37, 0, 260.76 + 2.07, 2986.29, 25.46),
    "1":  (1966.54, 537.52, 0, 2.07, 2506.13, 24.84),
    "2":  (1701.04, 532.54, 0, 2.07, 2235.65, 22.83),
    "3":  (1453.94, 527.90, 0, 2.07, 1983.91, 21.95),
    "4":  (1257.46, 524.22, 0, 2.07, 1783.75, 20.66),
    "5":  (1136.07, 521.94, 0, 2.07, 1660.08, 20.30),
    "6":  (1019.94, 519.76, 0, 2.07, 1541.77, 19.73),
    "7":  (873.22, 517.51, 0, 5.16 + 2.07, 1397.96, 19.47),
    "OV1": (1187.00, 530.04, 0, 0, 1717.04, 15.49),
    "OV2": (994.96, 526.11, 0, 0, 1521.07, 14.46),
}

FIPE = {
    "QA": (1854.49, 542.70, 0, 75.00, 2472.19, 40.80),
    "QB": (1674.63, 537.59, 0, 70.00, 2282.22, 39.25),
    "1":  (1517.16, 536.71, 0, 0, 2053.87, 37.70),
    "2":  (1337.33, 531.59, 0, 0, 1868.92, 36.15),
    "3":  (1228.88, 528.26, 0, 0, 1757.14, 34.86),
    "4":  (1127.75, 524.94, 0, 0, 1652.69, 33.05),
    "5":  (1021.49, 522.37, 0, 0, 1543.86, 32.54),
    "6S": (960.13, 520.64, 0, 0, 1480.77, 31.25),
    "6":  (937.80, 520.51, 0, 0, 1458.31, 30.99),
    "7":  (841.89, 518.45, 0, 0, 1360.34, 30.47),
}

METAL = {
    "A1": (2837.12, 0, 0, 0, 2837.12, 40.96),
    "B3": (2770.74, 0, 0, 0, 2770.74, 40.96),
    "B2": (2481.84, 0, 0, 0, 2481.84, 36.41),
    "B1": (2313.34, 0, 0, 0, 2313.34, 32.43),
    "C3": (2158.26, 0, 0, 0, 2158.26, 29.64),
    "C2": (2015.24, 0, 0, 0, 2015.24, 26.75),
    "C1": (1973.51, 0, 0, 0, 1973.51, 25.05),
    "D2": (1931.78, 0, 0, 0, 1931.78, 25.05),
    "D1": (1742.03, 0, 0, 0, 1742.03, 21.59),
}

ALIMENTARI = {
    "1S": (2770.85, 545.72, 10.33, 251.11, 3578.01, None),
    "1":  (2409.40, 538.70, 10.33, 131.39, 3089.82, None),
    "2":  (1987.80, 530.51, 10.33, 108.40, 2637.04, None),
    "3A": (1746.84, 525.83, 10.33, 95.26, 2378.26, None),
    "3":  (1566.17, 522.32, 10.33, 85.41, 2184.23, None),
    "4":  (1445.66, 519.99, 10.33, 78.84, 2054.82, None),
    "5":  (1325.21, 517.65, 10.33, 72.27, 1925.46, None),
    "6":  (1204.74, 515.31, 10.33, 65.70, 1796.08, None),
}

TELCO = {
    "Q": (1946.69, 530.91, 10.33, 153.12, 2641.05, None),
    "A": (1731.19, 526.99, 10.33, 48.94, 2317.45, None),
    "B": (1417.32, 521.08, 10.33, 40.00, 1988.73, None),
    "C": (1277.74, 517.83, 10.33, 36.05, 1841.95, None),
    "D": (1144.10, 516.07, 10.33, 32.48, 1702.98, None),
    "E": (853.81, 511.26, 10.33, 24.28, 1399.68, None),
}

TESSILE = {
    "Q": (2457.72, 0, 0, 51.65, 2509.37, None),
    "1": (2318.50, 0, 0, 0, 2318.50, None),
    "2": (2175.37, 0, 0, 0, 2175.37, None),
    "3": (1938.95, 0, 0, 0, 1938.95, None),
    "4": (1853.17, 0, 0, 0, 1853.17, None),
    "5": (1760.02, 0, 0, 0, 1760.02, None),
    "6": (1469.68, 0, 0, 0, 1469.68, None),
}

COOP = {
    "Q": (2504.09, 0, 0, 232.41, 2736.50, None),
    "1": (2192.54, 0, 0, 154.94, 2347.48, None),
    "2": (1985.42, 0, 0, 77.47, 2062.89, None),
    "3": (1839.15, 0, 0, 0, 1839.15, None),
    "4": (1637.57, 0, 0, 0, 1637.57, None),
    "5": (1545.21, 0, 0, 0, 1545.21, None),
    "6": (1359.85, 0, 0, 0, 1359.85, None),
}

GOMMA = {
    "Q": (2497.83, 0, 0, 50.00, 2547.83, None),
    "A": (2351.85, 0, 0, 0, 2351.85, None),
    "B": (2218.74, 0, 0, 0, 2218.74, None),
    "C": (2189.60, 0, 0, 0, 2189.60, None),
    "D": (2162.08, 0, 0, 0, 2162.08, None),
    "E": (2074.83, 0, 0, 0, 2074.83, None),
    "F": (2021.12, 0, 0, 0, 2021.12, None),
    "G": (1883.45, 0, 0, 0, 1883.45, None),
    "H": (1796.11, 0, 0, 0, 1796.11, None),
    "I": (1614.73, 0, 0, 0, 1614.73, None),
}

AGRI = {
    "Q": (1788.38, 0, 0, 185.00, 1973.38, None),
    "1": (1458.61, 0, 0, 0, 1458.61, None),
    "2": (1458.61, 0, 0, 0, 1458.61, None),
    "3": (1330.25, 0, 0, 0, 1330.25, None),
    "4": (991.85, 0, 0, 0, 991.85, None),
}

EDIL_PROXY = {
    "Q": (2218.96, 534.28, 10.33, 140.00, 2903.57, None),
    "1": (1975.08, 529.12, 10.33, 0, 2514.53, None),
    "2": (1533.88, 520.12, 10.33, 0, 2064.33, None),
    "3": (1426.72, 517.85, 10.33, 0, 1954.90, None),
    "4": (1097.30, 512.58, 10.33, 0, 1620.21, None),
}

SANITA_H442 = {
    "DS": (2408.53, 0, 0, 129.11, 2537.64, None),
    "B":  (2131.39, 0, 0, 70.00, 2201.39, None),
    "C":  (1856.50, 0, 0, 70.00, 1926.50, None),
    "D":  (1706.37, 0, 0, 70.00, 1776.37, None),
    "E":  (1595.42, 0, 0, 70.00, 1665.42, None),
    "F":  (1484.78, 0, 0, 70.00, 1554.78, None),
}

TURISMO_H052 = {
    "QA": (2366.94, 0, 0, 75.00, 2441.94, None),
    "QB": (2191.35, 0, 0, 70.00, 2261.35, None),
    "1":  (2041.68, 0, 0, 0, 2041.68, None),
    "2":  (1866.07, 0, 0, 0, 1866.07, None),
    "3":  (1759.94, 0, 0, 0, 1759.94, None),
    "4":  (1660.69, 0, 0, 0, 1660.69, None),
    "5":  (1557.44, 0, 0, 0, 1557.44, None),
    "6S": (1497.57, 0, 0, 0, 1497.57, None),
}

SCUOLE = {
    "D": (1785.91, 0, 0, 0, 1785.91, None),
    "A": (1615.67, 0, 0, 0, 1615.67, None),
    "B": (1589.64, 0, 0, 0, 1589.64, None),
    "C": (1419.45, 0, 0, 0, 1419.45, None),
    "E": (1322.51, 0, 0, 0, 1322.51, None),
}


def apply_breakdown(liv: dict, row: tuple) -> None:
    minimo, cont, edr, altre, totale, scatto = row
    liv["minimoTabellare"] = minimo
    liv["contingenza"] = cont
    liv["edr"] = edr
    liv["altreIndennitaFisse"] = altre
    liv["retribuzioneMensileTabella"] = totale
    if scatto is not None:
        liv["scattoEuro"] = scatto
    liv.pop("_nota", None)


def ensure_tabella(liv: dict) -> None:
    if "retribuzioneMensileTabella" in liv:
        return
    extra = (
        liv.get("contingenza") or 0
        + (liv.get("edr") or 0)
        + (liv.get("altreIndennitaFisse") or 0)
        + (liv.get("indennitaFunzione") or 0)
    )
    # If already using TOTALE as minimo (no breakdown), copy.
    liv.setdefault("contingenza", liv.get("contingenza", 0) or 0)
    liv.setdefault("edr", liv.get("edr", 0) or 0)
    liv.setdefault("altreIndennitaFisse", liv.get("altreIndennitaFisse", 0) or 0)
    liv["retribuzioneMensileTabella"] = round(
        liv["minimoTabellare"]
        + (liv.get("contingenza") or 0)
        + (liv.get("edr") or 0)
        + (liv.get("altreIndennitaFisse") or 0),
        2,
    )


def patch_contributi(d: dict) -> None:
    az = d.get("contributiContrattuali", {}).get("azienda", {})
    for c in az.values():
        if not isinstance(c, dict):
            continue
        if "scalaConPartTime" in c:
            continue
        if c.get("perOra"):
            c["scalaConPartTime"] = True
        elif c.get("modalita") == "percentuale":
            c["scalaConPartTime"] = True
        else:
            c["scalaConPartTime"] = False


def patch_file(path: Path) -> None:
    d = json.loads(path.read_text())
    cid = d.get("id") or path.stem
    patch_contributi(d)
    d.setdefault("orarioSettimanalePieno", 54 if cid == "domestici_conviventi" else 40)

    if cid == "commercio":
        d["fonte"] = (
            "CCNL Terziario Distribuzione e Servizi (Confcommercio) — tabelle 01/11/2025 "
            "(rinnovo 22/03/2024, 4ª tranche). Fonte: FILCAMS CGIL + kitech Cnel H011. "
            "minimoTabellare = paga base; retribuzioneMensileTabella = colonna TOTALE "
            "(paga + contingenza + ind. funzione quadro + 3° elemento 2,07). "
            "materiale/terziario-confcommercio.rtf conferma liv. 6 TOTALE 1.541,77. "
            "Non mescolato con Confesercenti."
        )
        d["updatedAt"] = TODAY
        d["validitaAl"] = "2026-10-31"
        existing = {l["codice"]: l for l in d["livelli"]}
        new_livelli = []
        meta = {
            "Q": ("Quadro", "Funzioni direttive con responsabilità di unità organizzativa"),
            "1": ("1° livello", "Personale con funzioni ad elevata responsabilità"),
            "2": ("2° livello", "Impiegati con mansioni di concetto"),
            "3": ("3° livello", "Impiegati d'ordine, commessi qualificati"),
            "4": ("4° livello", "Commessi alla vendita, cassieri, contabili d'ordine"),
            "5": ("5° livello", "Ausiliari, addetti al confezionamento"),
            "6": ("6° livello", "Personale di pulizia, fattorini"),
            "7": ("7° livello", "Personale di primo impiego senza qualifica"),
            "OV1": ("Operatore di vendita 1ª cat.", "Operatore di vendita prima categoria"),
            "OV2": ("Operatore di vendita 2ª cat.", "Operatore di vendita seconda categoria"),
        }
        molt = {"Q": 1.00, "1": 0.94, "2": 0.86, "3": 0.79, "4": 0.72, "5": 0.65, "6": 0.60, "7": 0.52, "OV1": 0.70, "OV2": 0.62}
        for code, row in COMMERCIO.items():
            liv = dict(existing.get(code, {}))
            desc, qual = meta[code]
            liv.update({"codice": code, "descrizione": desc, "qualifica": liv.get("qualifica") or qual, "moltiplicatore": liv.get("moltiplicatore") or molt[code]})
            apply_breakdown(liv, row)
            new_livelli.append(liv)
        d["livelli"] = new_livelli
        d["scattiAnzianita"]["importoPerScattoEuro"] = 19.73

    elif cid == "pubblici_esercizi":
        d["fonte"] = (
            "PDF LAVORO/pubblici-esercizi-ristorazione-e-turismo-pubblici-.pdf — Wolters Kluwer One Lavoro, "
            "stampa 20/04/2026. FIPE, minimi 01/06/2025–31/05/2026. Colonna TOTALE = minimo + contingenza "
            "(comprensiva EDR confederale) + indennità di funzione. Orario pieno 40h (divisore 172)."
        )
        d["updatedAt"] = TODAY
        d["validitaAl"] = "2026-05-31"
        d["orarioSettimanalePieno"] = 40
        for liv in d["livelli"]:
            if liv["codice"] in FIPE:
                apply_breakdown(liv, FIPE[liv["codice"]])

    elif cid == "metalmeccanici":
        d["fonte"] = (
            "PDF LAVORO/metalmeccanica-aziende-industriali.pdf + C011.pdf — WK One Lavoro, "
            "stampa 20/04/2026. METALMECCANICA INDUSTRIA 01/06/2025–31/05/2026. Minimo = Totale."
        )
        d["updatedAt"] = TODAY
        d["validitaAl"] = "2026-05-31"
        for liv in d["livelli"]:
            if liv["codice"] in METAL:
                apply_breakdown(liv, METAL[liv["codice"]])

    elif cid == "chimica":
        d["fonte"] = (
            "NON VERIFICATO — fonte assente. Nessun PDF Federchimica in LAVORO/. "
            "Il proxy B371 Gomma NON è più usato come fonte Chimica."
        )
        d["updatedAt"] = TODAY
        for liv in d["livelli"]:
            liv["_nota"] = "NON VERIFICATO — fonte assente"
            ensure_tabella(liv)

    elif cid == "studi_professionali":
        d["fonte"] = (
            "NON VERIFICATO — fonte assente. Nessun PDF Confprofessioni in LAVORO/. "
            "H442 è Ambulatori sanitari, non Studi professionali."
        )
        d["updatedAt"] = TODAY
        for liv in d["livelli"]:
            liv["_nota"] = "NON VERIFICATO — fonte assente"
            ensure_tabella(liv)

    elif cid == "domestici":
        d["orarioSettimanalePieno"] = 40
        for liv in d["livelli"]:
            liv.setdefault("contingenza", 0)
            liv.setdefault("edr", 0)
            liv.setdefault("altreIndennitaFisse", 0)
            liv["retribuzioneMensileTabella"] = liv["minimoTabellare"]

    elif cid == "domestici_conviventi":
        d["orarioSettimanalePieno"] = 54
        for liv in d["livelli"]:
            liv.setdefault("contingenza", 0)
            liv.setdefault("edr", 0)
            altre = liv.get("indennitaFunzione") or 0
            liv["altreIndennitaFisse"] = altre
            # Convenzione Francesca: minimoTabellare = colonna TOTALE. Non modificare i valori.
            liv["retribuzioneMensileTabella"] = liv["minimoTabellare"]

    elif cid == "alimentari":
        d["fonte"] = (
            "PDF LAVORO/E012.pdf — ALIMENTARI INDUSTRIA, vigenti 01/01/2026–31/12/2026. "
            "Colonna TOTALE WK (minimo + contingenza + EDR 10,33 + altre indennità)."
        )
        d["updatedAt"] = TODAY
        for liv in d["livelli"]:
            if liv["codice"] in ALIMENTARI:
                apply_breakdown(liv, ALIMENTARI[liv["codice"]])

    elif cid == "telecomunicazioni":
        d["fonte"] = (
            "PDF LAVORO/K411.pdf — TELECOMUNICAZIONI (Asstel), 01/01/2026–30/06/2026. "
            "Colonna TOTALE WK."
        )
        d["updatedAt"] = TODAY
        d["validitaAl"] = "2026-06-30"
        for liv in d["livelli"]:
            if liv["codice"] in TELCO:
                apply_breakdown(liv, TELCO[liv["codice"]])

    elif cid == "tessile":
        d["fonte"] = (
            "PDF LAVORO/D014.pdf — ABBIGLIAMENTO INDUSTRIA (SMI), 01/01/2026–31/12/2026. "
            "Colonna TOTALE WK."
        )
        d["updatedAt"] = TODAY
        for liv in d["livelli"]:
            if liv["codice"] in TESSILE:
                apply_breakdown(liv, TESSILE[liv["codice"]])

    elif cid == "cooperative_sociali":
        d["fonte"] = (
            "PDF LAVORO/T151.pdf — COOPERATIVE SOCIALI, vigenti dal 01/01/2026. Colonna TOTALE WK."
        )
        d["updatedAt"] = TODAY
        for liv in d["livelli"]:
            if liv["codice"] in COOP:
                apply_breakdown(liv, COOP[liv["codice"]])

    elif cid == "gomma_plastica":
        d["fonte"] = (
            "PDF LAVORO/B371.pdf — GOMMA INDUSTRIA, 01/01/2026–31/03/2027. Colonna TOTALE WK."
        )
        d["updatedAt"] = TODAY
        for liv in d["livelli"]:
            if liv["codice"] in GOMMA:
                apply_breakdown(liv, GOMMA[liv["codice"]])

    elif cid == "agricoltura":
        d["fonte"] = (
            "PDF LAVORO/A021.pdf IMPIEGATI (01/07/2024) + A11.pdf OPERAI OTD (01/01/2025). "
            "Quadro: TOTALE con indennità 185 €. Operai: minimo = totale."
        )
        d["updatedAt"] = TODAY
        for liv in d["livelli"]:
            if liv["codice"] in AGRI:
                apply_breakdown(liv, AGRI[liv["codice"]])

    elif cid == "edilizia":
        d["fonte"] = (
            "PROXY — PDF LAVORO/F015.pdf EDILIZIA ARTIGIANATO 01/01/2026–31/12/2026 "
            "(ANCE Industria assente in LAVORO/). Colonna TOTALE WK. NON VERIFICATO vs ANCE."
        )
        d["updatedAt"] = TODAY
        for liv in d["livelli"]:
            liv["_nota"] = "PROXY F015 artigianato — NON VERIFICATO vs ANCE Industria"
            if liv["codice"] in EDIL_PROXY:
                apply_breakdown(liv, EDIL_PROXY[liv["codice"]])

    elif cid == "sanita_privata":
        d["fonte"] = (
            "PROXY — PDF LAVORO/H442.pdf AMBULATORI SANITARI 01/10/2025–30/11/2026 "
            "(non è il CCNL AIOP ospedaliero). Colonna TOTALE con indennità di funzione."
        )
        d["updatedAt"] = TODAY
        for liv in d["livelli"]:
            liv["_nota"] = "PROXY H442 Ambulatori — verificare se AIOP"
            if liv["codice"] in SANITA_H442:
                apply_breakdown(liv, SANITA_H442[liv["codice"]])

    elif cid == "turismo":
        d["fonte"] = (
            "PDF LAVORO/H052.pdf — ALBERGHI CONFCOMMERCIO, 01/06/2025–30/04/2026. "
            "Non è FIPE pubblici esercizi. Colonna TOTALE WK."
        )
        d["updatedAt"] = TODAY
        d["validitaAl"] = "2026-04-30"
        for liv in d["livelli"]:
            if liv["codice"] in TURISMO_H052:
                apply_breakdown(liv, TURISMO_H052[liv["codice"]])
            else:
                ensure_tabella(liv)

    elif cid == "scuole_private":
        d["fonte"] = (
            "PDF LAVORO/T231.pdf — SCUOLE PRIVATE LAICHE 01/01/2026–31/12/2026. Minimo = Totale. "
            "T271 Scuole materne FISM non ha JSON dedicato."
        )
        d["updatedAt"] = TODAY
        for liv in d["livelli"]:
            if liv["codice"] in SCUOLE:
                apply_breakdown(liv, SCUOLE[liv["codice"]])

    elif cid == "informatica":
        d["fonte"] = d.get("fonte", "")
        if "NON VERIFICATO" not in d["fonte"]:
            d["fonte"] = "NON VERIFICATO — fonte assente. " + d.get("fonte", "")
        d["updatedAt"] = TODAY
        for liv in d["livelli"]:
            liv["_nota"] = "NON VERIFICATO — fonte assente"
            ensure_tabella(liv)

    elif cid == "trasporti":
        if "NON VERIFICATO" not in d.get("fonte", ""):
            d["fonte"] = "PROXY I100 Autotrasporto — da verificare. " + d.get("fonte", "")
        for liv in d["livelli"]:
            liv.setdefault("_nota", "PROXY — da verificare")
            ensure_tabella(liv)

    else:
        for liv in d["livelli"]:
            ensure_tabella(liv)

    path.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
    print("patched", path.name)


def main() -> None:
    for p in sorted(CCNL_DIR.glob("*.json")):
        patch_file(p)


if __name__ == "__main__":
    main()
