#!/usr/bin/env python3
"""One-shot: tabelle ACI 2026 (GU 297/2025 SO 40) → data/aci-2026.json.

Usa solo il PDF già in repo. Non scarica nulla.
Una riga del PDF = un veicolo. Le colonne fringe benefit non vengono importate.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CANDIDATI_PDF = [
    ROOT / "LAVORO" / "tabelle-aci-2026.pdf",
    ROOT / "data" / "tabelle-aci-2026.pdf",
    ROOT / "tabelle-aci-2026.pdf",
    ROOT / "docs" / "tabelle-aci-2026.pdf",
]

OUTPUT = ROOT / "data" / "aci-2026.json"

# Marche di due o tre token, dal più lungo. Il resto della riga è il modello.
MARCHE_COMPOSTE = [
    "DR AUTOMOBILES",
    "CIRELLI MOTOR",
    "GIOTTI VICTORIA",
    "HARLEY-DAVIDSON",
    "ROLLS ROYCE",
    "ROYAL ENFIELD",
    "ASTON MARTIN",
    "FONT VENDOME",
    "KG MOBILITY",
    "LAND ROVER",
    "LINK & CO",
    "MOTO MORINI",
    "MV AUGUSTA",
    "ROLLER TEAM",
    "ALFA ROMEO",
    "FANTIC MOTOR",
    "GREAT WALL",
    "CF MOTO",
]

SOTTOSEZIONI = {
    "BENZINA-GPL",
    "IBRIDO BENZINA-GPL",
    "PLUG-IN BENZINA",
    "PLUG-IN GASOLIO",
    "BENZINA-METANO",
    "METANO ESCUSIVO",
    "METANO ESCLUSIVO",
    "CICLOMOTORI",
    "CICLOMOTORI ELETTRICI",
    "MICROCAR",
    "MOTOCICLI",
    "MOTOCICLI ELETTRICI",
    "MOTOCICLI IBRIDO-BENZINA",
}

# Valori della colonna COSTO KM 15.000 KM, pagine benzina in produzione.
CONTROLLI = [
    ("DACIA", "SANDERO 2021 1.0 SCE 65CV", 0.3810),
    ("FIAT", "GRANDE PANDA 1.2 100CV MOD 2025", 0.4373),
    ("RENAULT", "CLIO 1.0 90CV MOD 2024", 0.4091),
    ("CITROEN", "C3 1.2 100 CV MOD 2024", 0.4208),
]

RIGA = re.compile(
    r"^(?P<id>\d{4,6})\s+(?P<body>.+)\s+"
    r"(?P<ck>\d+,\d{4})\s+"
    r"(?P<fr>\d{1,3}(?:\.\d{3})*,\d{2})"
    r"(?:\s+\d{1,3}(?:\.\d{3})*,\d{2})*\s*$"
)
COSTO_SENZA_ID = re.compile(r"\d+,\d{4}\s+\d{1,3}(?:\.\d{3})*,\d{2}")


def trova_pdf() -> Path:
    for path in CANDIDATI_PDF:
        if path.is_file():
            return path
    raise SystemExit(
        "PDF ACI 2026 non trovato. Attesi, in ordine: "
        + ", ".join(str(p.relative_to(ROOT)) for p in CANDIDATI_PDF)
    )


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def alimentazione_da(titolo: str) -> str:
    t = titolo.upper()
    if "CICLOMOTORI ELETTRICI" in t or "MOTOCICLI ELETTRICI" in t:
        return "elettrico"
    if "MOTOCICLI IBRIDO" in t:
        return "ibrido"
    if t.strip() in {"CICLOMOTORI", "MOTOCICLI"} or "MOTOVEICOLI" in t:
        return "moto"
    if "MICROCAR" in t:
        return "microcar"
    if "AUTOCARAVAN" in t:
        return "autocaravan"
    if "PLUG-IN" in t or "PLUG IN" in t:
        return "plug-in"
    if "IBRIDO" in t:
        return "ibrido"
    if "METANO" in t or "GPL" in t:
        return "gas"
    if "GASOLIO" in t or "DIESEL" in t:
        return "diesel"
    if "ELETTRIC" in t:
        return "elettrico"
    if "BENZINA" in t:
        return "benzina"
    return "altro"


def e_titolo_sezione(riga: str) -> bool:
    u = riga.strip().upper()
    if u.startswith("AUTOVEICOLI") or u.startswith("MOTOVEICOLI") or u == "AUTOCARAVAN":
        return True
    return u in SOTTOSEZIONI


def split_marca_modello(body: str) -> tuple[str, str]:
    for marca in MARCHE_COMPOSTE:
        prefisso = marca + " "
        if body.startswith(prefisso):
            return marca, body[len(prefisso):].strip()
    marca, _, modello = body.partition(" ")
    return marca, modello.strip()


def parse_costo(testo: str) -> float:
    return float(testo.replace(".", "").replace(",", "."))


def main() -> None:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise SystemExit("Serve il pacchetto pypdf (già usato in questo ambiente).") from exc

    pdf_path = trova_pdf()
    reader = PdfReader(str(pdf_path))

    veicoli: list[dict] = []
    pagine_con_scarti: dict[int, list[str]] = {}
    alimentazione = "benzina"
    in_produzione = True

    for indice, page in enumerate(reader.pages):
        numero = indice + 1
        testo = page.extract_text() or ""
        if not testo.strip():
            pagine_con_scarti.setdefault(numero, []).append("<pagina senza testo>")
            print(f"pagina {numero}: testo assente, saltata", file=sys.stderr)
            continue

        for grezza in testo.splitlines():
            riga = norm(grezza)
            if not riga:
                continue
            riga = re.sub(r"(\d)\s+,", r"\1,", riga)

            if e_titolo_sezione(riga):
                titolo = riga.upper()
                if "FUORI PRODUZIONE" in titolo:
                    in_produzione = False
                elif "IN PRODUZIONE" in titolo or titolo.startswith("MOTOVEICOLI") or titolo == "AUTOCARAVAN":
                    in_produzione = True
                alimentazione = alimentazione_da(titolo)
                continue

            match = RIGA.match(riga)
            if not match:
                if COSTO_SENZA_ID.search(riga) and "15.000" not in riga and "CK)" not in riga:
                    pagine_con_scarti.setdefault(numero, []).append(riga[:180])
                    print(f"pagina {numero}: riga non importata (manca l'ID o il formato non torna): {riga[:180]}", file=sys.stderr)
                continue

            body = norm(match.group("body"))
            marca, modello = split_marca_modello(body)
            if not marca or not modello:
                pagine_con_scarti.setdefault(numero, []).append(riga[:180])
                print(f"pagina {numero}: marca/modello vuoti, riga saltata: {riga[:180]}", file=sys.stderr)
                continue

            costo = parse_costo(match.group("ck"))
            if not (0 < costo < 20):
                pagine_con_scarti.setdefault(numero, []).append(riga[:180])
                print(f"pagina {numero}: costo km fuori scala ({costo}), riga saltata", file=sys.stderr)
                continue

            veicoli.append({
                "idModello": match.group("id"),
                "marca": marca,
                "modello": modello,
                "alimentazione": alimentazione,
                "inProduzione": in_produzione,
                "costoKm": costo,
            })

    errori: list[str] = []
    for marca, modello, atteso in CONTROLLI:
        trovati = [
            v for v in veicoli
            if v["marca"] == marca and v["modello"] == modello and v["alimentazione"] == "benzina" and v["inProduzione"]
        ]
        if not trovati:
            simili = [
                v["modello"] for v in veicoli
                if v["marca"] == marca and modello.split()[0] in v["modello"]
            ][:8]
            errori.append(f"manca {marca} {modello}. Simili: {simili}")
            continue
        if abs(trovati[0]["costoKm"] - atteso) > 1e-9:
            errori.append(
                f"{marca} {modello}: atteso {atteso}, letto {trovati[0]['costoKm']}"
            )

    if len(veicoli) < 1000:
        errori.append(f"pochi veicoli importati: {len(veicoli)}")

    if errori:
        for msg in errori:
            print("CHECK FALLITO:", msg, file=sys.stderr)
        raise SystemExit(1)

    payload = {
        "fonte": "GU Serie Generale n.297 del 23-12-2025, SO n.40 — ACI 2026 art. 51 co. 4 lett. a TUIR",
        "fileOrigine": str(pdf_path.relative_to(ROOT)),
        "validitaDal": "2026-01-01",
        "veicoli": veicoli,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"pdf={pdf_path.relative_to(ROOT)}")
    print(f"pagine={len(reader.pages)}")
    print(f"veicoli={len(veicoli)}")
    print(f"pagine_con_righe_saltate={len(pagine_con_scarti)}")
    print(f"righe_saltate={sum(len(v) for v in pagine_con_scarti.values())}")
    if pagine_con_scarti:
        print("pagine=" + ",".join(str(n) for n in sorted(pagine_con_scarti)))
    for marca, modello, atteso in CONTROLLI:
        print(f"OK {marca} {modello} = {atteso}")


if __name__ == "__main__":
    main()
