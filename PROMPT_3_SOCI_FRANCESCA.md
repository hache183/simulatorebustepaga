# Prompt Cursor 3/3 — Soci e Amministratori (foglio 15/09/2026)

Esegui per ultimo, stessa repo. Non toccare i golden dipendenti/domestici.

Copia da `## RUOLO`.

---

## RUOLO

Francesca sul tab Soci:

- «Non comprendo l’opzione 1, forse basta solo la 2»
- Opzione 1 = Ritenuta unica sul percipiente → **TOGLIERLA**
- Opzione 2 = **Gestione separata** → unica
- «Il resto ok»
- Senza compenso: trasferte nazionale **46,48** / estera **77,47**
- Togliere **buoni pasto**
- Km = km percorsi × costo km **tabella ACI 2026** in base al **modello auto**

Fonte obbligatoria delle tariffe: il PDF ufficiale già in repo (Marco lo mette in directory). Niente fetch online, niente medie da blog, niente 0,3714.

---

## DIVIETI

```
lib/engine.ts
lib/contributi.ts
data/ccnl/**
components/CalcolatoreForm.tsx
components/RisultatiCalcolatore.tsx
lib/__tests__/golden-francesca.test.ts
```

Non reintrodurre 8% / «ritenuta unica». Non lasciare due form soci.  
Non inventare un solo `costoKm`. Se un modello non è nel JSON parsato dal PDF, override manuale.

---

## REGIME CONTRIBUTIVO (solo GS)

- Default: GS **35,03%** (`data/gestione-separata.json`, Circ. INPS 8/2026)
- Checkbox **iscritto ad altra gestione obbligatoria / pensionato** → GS **24%**

Riparto **2/3 società + 1/3 percipiente**:

```
quotaSocieta     = lordo × aliquotaGS × (2/3)
quotaPercipiente = lordo × aliquotaGS × (1/3)
costoDatore      = lordo + quotaSocieta + rimborsiAzienda
nettoCompenso    = lordo − quotaPercipiente − IRPEF stimata
```

IRPEF da `lib/societari.ts` / `lib/irpef-lavoro-dipendente.ts` **senza bonus cuneo**.  
Senza compenso: lordo 0, GS 0, restano trasferte + km.  
Togli `8%`, `p8`, «ritenuta unica sul percipiente».

---

## TRASFERTE (con e senza compenso)

| Tipo | €/giorno default | Editabile |
|---|---:|---|
| Nazionale | 46,48 | sì |
| Estera | 77,47 | sì |

Totale = giorni × importo del tipo. Fuori base GS/IRPEF. Entra in liquido e in costo datore.

---

## BUONI PASTO

Eliminare campi, default, righe riepilogo. Zero residui a 10 €.

---

## KM + MODELLO AUTO — parsare IL PDF IN REPO

### Dove sta il file

Cerca, in quest’ordine, e usa il primo che esiste:

```
LAVORO/tabelle-aci-2026.pdf
data/tabelle-aci-2026.pdf
tabelle-aci-2026.pdf
docs/tabelle-aci-2026.pdf
```

È il Supplemento ordinario n. 40 alla GU n. 297 del 23-12-2025: *Tabelle nazionali dei costi chilometrici di esercizio di autovetture e motocicli elaborate dall'ACI — art. 51 co. 4 lett. a) TUIR*. 92 pagine. Intestazioni di sezione tipo:

- FRINGE BENEFIT 2026 AUTOVEICOLI A BENZINA IN PRODUZIONE
- (poi diesel, ibridi, plug-in, elettrici, gas, fuori produzione, motocicli, ecc.)

Colonne di ogni riga:

`ID Modello | Marca | Modello | COSTO KM 15.000 KM | Fringe 25% | 30% | 50% | 60%`

### Cosa importare

Solo queste colonne nel JSON:

- `idModello` (es. 31510)
- `marca` (es. FIAT)
- `modello` (testo intero, es. `GRANDE PANDA 1.2 100CV MOD 2025`)
- `alimentazione` / `sezione` ricavata dal titolo di pagina (benzina, diesel, ibrido, plug-in, elettrico, gas, moto, …)
- `inProduzione` true/false dal titolo
- `costoKm` = colonna **COSTO KM 15.000 KM** (es. Grande Panda = **0,4373**)

**Non importare** le quattro colonne fringe benefit. Quello è uso promiscuo auto aziendale, altro istituto.

### Come parsare

Script one-shot in `scripts/parse-aci-2026.py` (o ts-node). Pdfplumber / tabula / pymupdf: una riga PDF = un veicolo.  
Output: `data/aci-2026.json`.

```json
{
  "fonte": "GU Serie Generale n.297 del 23-12-2025, SO n.40 — ACI 2026 art. 51 co. 4 lett. a TUIR",
  "fileOrigine": "LAVORO/tabelle-aci-2026.pdf",
  "validitaDal": "2026-01-01",
  "veicoli": [
    {
      "idModello": "31510",
      "marca": "FIAT",
      "modello": "GRANDE PANDA 1.2 100CV MOD 2025",
      "alimentazione": "benzina",
      "inProduzione": true,
      "costoKm": 0.4373
    }
  ]
}
```

Obiettivo: **tutte** le righe del PDF (migliaia), non un campione di 40.  
Se una pagina fallisce il parse, loggala e continua. Non riempire i buchi con numeri inventati.

Check minimi dopo il parse (valori veri del PDF, pagina 1–3 benzina):

| Modello | costoKm |
|---|---|
| DACIA SANDERO 2021 1.0 SCE 65CV | 0,3810 |
| FIAT GRANDE PANDA 1.2 100CV MOD 2025 | 0,4373 |
| RENAULT CLIO 1.0 90CV MOD 2024 | 0,4091 |
| CITROEN C3 1.2 100 CV MOD 2024 | 0,4208 |

Se questi quattro non tornano, il parser è sbagliato: non shippare il JSON.

Niente `fetch` a runtime verso ACI / GU / pmi.it.

### UI

- Combobox cercabile marca + modello (anche pezzo di stringa: «panda», «golf 1.5»)
- Mostra €/km ACI in sola lettura
- Km nel periodo
- `rimborsoKm = km × costoKm`
- Se modello assente: override manuale €/km + nota «modello non in tabella ACI 2026 — inserire il costo km dalla GU»
- Banner fisso: «Tariffa = colonna Costo km 15.000 km, tabelle ACI 2026, GU 297/2025 SO 40. Non è il fringe benefit.»

Togli il default `0,3714`.

---

## LAYOUT

Tab `/calcolatore?tab=soci`. Header «Compensi societari» → stesso tab.  
`/compensi-societari` redirect.

Con compenso: lordo → GS 35,03/24 → trasferte naz/est → modello auto + km → riepilogo live.  
Senza compenso: niente lordo, restano trasferte + km.

---

## VERIFICA

| Caso | Atteso |
|---|---|
| 12.000 €, GS 35,03%, 0 rimborsi | quota società **2.802,40** → costo **14.802,40** |
| 12.000 €, GS 24%, 0 rimborsi | quota società **1.920** → costo **13.920** |
| Senza compenso, 10 gg naz. 46,48, 0 km | **464,80** |
| 100 km, Grande Panda 1.2 (0,4373) | rimborso **43,73** |
| Nessuna option 8% / ritenuta unica | zero match |
| Nessun campo buoni pasto | zero match |
| `data/aci-2026.json` veicoli.length | nell’ordine delle **migliaia**, non 40 |
| I 4 costoKm di controllo sopra | esatti |

```bash
npx tsc --noEmit
npx jest lib/__tests__/golden-francesca.test.ts --no-coverage
```

Se un golden CCNL diventa rosso: revert solo file soci.

Report: path del PDF usato, n. veicoli importati, n. pagine saltate, i 4 check, file toccati.
