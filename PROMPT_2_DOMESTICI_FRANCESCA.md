# Prompt Cursor 2/3 — Collaboratori familiari / domestici (note 16/09/2026)

Esegui **dopo** il prompt 1, stessa repo. Non toccare soci. Non disfare i dipendenti.

Copia da `## RUOLO`.

---

## RUOLO

Francesca vuole i domestici **fuori** dal form dipendenti. Tre tab in `/calcolatore`:

`Dipendenti | Collaboratori familiari / domestici | Soci e Amministratori`

Regole da fogli 16/09 (tabelle A/B/C stampate + manoscritto). Coefficiente ore→mese: **4,33**.

---

## DIVIETI

```
lib/societari.ts
components/SociAmministratoriPanel.tsx
components/SociAmministratoriTab.tsx
app/api/societari/**
```

Non applicare 173/56/32 dei dipendenti industria/commercio ai domestici.  
Non usare `8,91 × 25 × 4,33 = 864,51` del foglio: il prodotto è **964,51** (lei ha sbagliato l’aritmetica; la formula resta ore × 4,33).

---

## UI

In `CalcolatorePageClient.tsx` (o equivalente) tab centrale **Collaboratori familiari / domestici**.

Dentro, due sotto-modi: **Non convivente** | **Convivente**.

---

## NON CONVIVENTI

«Vanno bene»: paga oraria × ore settimanali × 4,33.

Esempio foglietto:

`9,57 × 25 × 4,33 = 1.037,00` (accetta arrotondamento ±1 €).

RAL / retribuzione annua: mensile così ottenuto × mensilità del CCNL domestici (di solito 13; leggi JSON, non inventare 14).

Aggiungere **solo** l’incidenza ferie/permessi/festività **non godute**, stessa logica dei dipendenti (ore non godute × paga oraria).  
Paga oraria del rateo = retribuzione oraria inserita (già oraria, non /173).  
Ore non godute: campi JSON domestici se ci sono; senno input utente default 0 + nota «inserire ore non godute».

INPS: fascia oraria Circ. INPS domestici già in engine (non copiare 28,80%). CassaColf off di default.

---

## CONVIVENTI — tabelle 1° gennaio 2026

Fonte: foglio «Dal 1° gennaio 2026 CONVIVENTI». Metti i numeri in `data/ccnl/domestici_conviventi.json` (o spezza A/B/C in tre sezioni chiare). Non lasciare tabelle vecchie parallele (`lavoro_domestico` duplicato).

### Tabella A — full time (default)

Convivente default = **tempo pieno 54 ore**. Il calcolatore prende il **mensile A**, non lo ricostruisce dalle ore.

| Liv | Mensile € | Indennità funzione € |
|---|---:|---:|
| DS | 1.474,73 | 207,69 |
| D  | 1.404,51 | 207,69 |
| CS | 1.193,84 | 0 |
| C  | 1.123,63 | 0 |
| BS | 1.053,39 | 0 |
| B  | 983,16 | 0 |
| AS | 958,55 | 0 |
| A  | 908,10 | 0 |

Retribuzione mensile base = mensile + indennità se > 0.  
UI: ore sett. bloccate a 54 in questo ramo. Niente slider 25 h.

Golden già noto livello A, 13 mensilità, no CassaColf:

`908,10 × 13 = 11.805,30` RAL. Non cambiarlo se i test già lo danno.

### Tabella B — part time convivente, solo C / B / BS, minimo 30 h

| Liv | Mensile € (30 h) |
|---|---:|
| C  | 814,60 |
| BS | 737,39 |
| B  | 702,25 |

Se l’utente chiede PT convivente:
- livelli ammessi solo C, B, BS
- ore sett. **≥ 30 e < 54**
- base = mensile B (per 30 h). Se ore > 30, proporziona: `mensileB × (ore/30)` salvo il JSON dica altrimenti
- altri livelli: errore UI «part-time convivente ammesso solo C, B, BS (tab. B)»

### Tabella C — sostituzione titolare, solo CS / DS, valori **orari**

| Liv | €/ora |
|---|---:|
| DS | 10,75 |
| CS | 8,91 |

«Di qualunque ora ma devono essere per sostituzione».

Mensile = `orario × oreSettimanali × 4,33`.

Check: `8,91 × 25 × 4,33 = 964,51`.

In UI: flag obbligatorio «sostituzione titolare (tab. C)» per aprire CS/DS orari. Senza flag, CS/DS conviventi usano tab. A.

### INPS conviventi
Stesso schema dei non conviventi (fasce orarie INPS domestici). Non 28,80%.

---

## INTEGRAZIONE TAB

Tab Dipendenti = form CCNL del prompt 1, invariato.  
Tab Soci = quello già in repo, invariato in questo prompt.  
`/compensi-societari` resta redirect se già lo è.

---

## VERIFICA

```bash
npx tsc --noEmit
npx jest lib/__tests__/golden-francesca.test.ts --no-coverage
```

Aggiungi (o allinea) test:

| ID | Atteso |
|---|---|
| A convivente FT | mensile 908,10 |
| B convivente 30 h | C 814,60 / BS 737,39 / B 702,25 |
| C sost. CS 25 h | 964,51 mensili |
| Non conv. 9,57 × 25 × 4,33 | 1.037,00 mensili ±1 € |

Report: file toccati, conferma che `lib/engine.ts` dipendenti non ha perso 9,19% / no-cuneo / no-agevolazioni del prompt 1.
