# PROMPT OPERATIVO — FIX CALCOLATORE COSTO DEL LAVORO

> **Priorità**: CRITICA — il consulente del lavoro ha verificato manualmente l'output e trovato errori gravi su minimi tabellari, tassi INAIL, contributi CCNL, e formula TFR. La busta paga stampata dal nostro calcolatore (file `materiale/CCF_000208.pdf`) è stata corretta a mano con i valori reali.

---

## CONTESTO

Calcolatore costo del lavoro aziendale: Next.js + TypeScript.  
File chiave: `lib/engine.ts`, `lib/contributi.ts`, `data/` (JSON aliquote), `types/index.ts`.  
Nella cartella `materiale/` ci sono le **tabelle ufficiali INAIL 2019-in vigore** (4 gestioni tariffarie: terziario, industria, artigianato, altre attività, navigazione) e il file RTF `terziario-confcommercio.rtf` con il **costo del lavoro ufficiale CCNL Commercio Confcommercio Livello 6** (fonte: Wolters Kluwer One Lavoro).

Il file `CCF_000208.pdf` è una scansione di 4 pagine della stampa del nostro calcolatore per il test case **CCNL Commercio Confcommercio, Livello 6, full-time**, con le seguenti **correzioni a mano del consulente**:

---

## SEZIONE A — CORREZIONI VERIFICATE DAL CONSULENTE (CCF_000208.pdf)

### Test case: CCNL Commercio, Livello 6, 40h full-time, 14 mensilità

| Voce | Valore nostro (SBAGLIATO) | Valore corretto (consulente) | Delta |
|---|---|---|---|
| RAL effettiva annua | 16.072 € | **21.584,78 €** (1.541,77 × 14) | +34% |
| Contributi INPS datoriali | 4.629 € | **6.216,00 €** (28,80% di 21.584,78) | +34% |
| TFR accantonamento annuo | 1.389 € | **1.588,88 €** | +14% |
| Premio INAIL (voce 0111) | ~80 € | **~157 €** (tasso 7,31‰, NON 5,0‰) | +96% |
| Contributi contrattuali CCNL | 114 € | **180 €** (15 €/mese × 12 = importo FISSO) | +58% |
| **Costo totale aziendale** | **24.963 €** | **~28.737 €** | **+15%** |

**Nota a mano del consulente**: "NOTA PER MARCO: applicare percentuale ordine m P 43.2 14" + "correggere a cascata" (= tutti i valori downstream vanno ricalcolati).

---

## SEZIONE B — ERRORI STRUTTURALI DA CORREGGERE

### B1. MINIMI TABELLARI CCNL COMPLETAMENTE SBAGLIATI (🔴 CRITICO)

**Il problema**: i minimi tabellari in TUTTI i file `data/ccnl/*.json` sono obsoleti/errati. Per CCNL Commercio Livello 6 abbiamo **1.148,00 €** ma il valore reale aggiornato è **1.541,77 €** (+34%).

**Dato di riferimento ufficiale** (dal file `materiale/terziario-confcommercio.rtf`, fonte Wolters Kluwer One Lavoro):

```
CCNL Commercio Confcommercio — Livello 6:
  Retribuzione base (minimo tabellare):  1.541,77 €/mese
  Scatti di anzianità:                    19,73 €/scatto
```

**Azione richiesta**: aggiornare i minimi tabellari di TUTTI i 16 file CCNL in `data/ccnl/`. Per ciascun CCNL:

1. Cerca su internet i minimi tabellari aggiornati al 2025-2026 dalla fonte ufficiale (siti delle parti sociali firmatarie o archivio CNEL https://www.cnel.it/Archivio-Contratti)
2. Aggiorna OGNI livello nel JSON
3. Aggiorna gli scatti di anzianità (per Commercio: 19,73 €, non 10,33 €)

**CCNL Commercio Confcommercio — valori corretti da applicare subito** (dal file RTF del consulente):

| Livello | Nostro valore attuale | Valore corretto | Fonte |
|---|---|---|---|
| Q | 1.914,00 | **DA VERIFICARE** | Rinnovo CCNL 2024 |
| 1 | 1.802,00 | **DA VERIFICARE** | Rinnovo CCNL 2024 |
| 2 | 1.646,00 | **DA VERIFICARE** | Rinnovo CCNL 2024 |
| 3 | 1.509,00 | **DA VERIFICARE** | Rinnovo CCNL 2024 |
| 4 | 1.375,00 | **DA VERIFICARE** | Rinnovo CCNL 2024 |
| 5 | 1.243,00 | **DA VERIFICARE** | Rinnovo CCNL 2024 |
| 6 | 1.148,00 | **1.541,77** ✅ | Da RTF consulente |

**Scatti anzianità Commercio**: nostro 10,33 → corretto **19,73** (dal RTF)

**IMPORTANTE**: il rinnovo del CCNL Commercio Confcommercio 2024-2027 (firmato marzo 2024) ha introdotto aumenti significativi (~€100-350/livello) scaglionati. Cercare le tabelle aggiornate con le fasi di aumento e applicare i valori in vigore alla data odierna (aprile 2026).

Per TUTTI gli altri CCNL (metalmeccanici, edilizia, chimica, etc.), cercare analogamente i rinnovi contrattuali più recenti e aggiornare i minimi. I nostri valori attuali sono quasi certamente obsoleti.

---

### B2. TASSI INAIL COMPLETAMENTE SBAGLIATI (🔴 CRITICO)

**Il problema**: il file `data/inail.json` contiene tassi inventati/approssimati. Il consulente ha corretto la voce 0111 da **5,0‰ a 7,31‰** (il tasso ufficiale dalla tabella INAIL Terziario).

**Fonte ufficiale**: i file PDF in `materiale/` contengono le **Tariffe ordinarie dei premi INAIL** (DD.MM. 27 febbraio 2019, in vigore) per tutte e 4 le gestioni, estratte il 7 aprile 2026 da Wolters Kluwer One Lavoro. Ecco i tassi estratti dai PDF per le voci che abbiamo nel nostro sistema:

| Codice | Settore (nostro) | Nostro tasso (‰) | Tasso ufficiale Terziario (‰) | Tasso ufficiale Industria (‰) |
|---|---|---|---|---|
| 0111 | Commercio al dettaglio/ingrosso | 5,0 ❌ | **7,31** | — |
| 0721 | Uffici e attività amministrative | 3,1 | **DA VERIFICARE nei PDF** (cercate codice 0721) | — |
| 3111 | Costruzioni edili | 63,0 | 48,85 (terziario) | **DA CERCARE** (industria) |
| 5411 | Ristorazione/pubblici esercizi | 12,0 | **DA VERIFICARE** (cercare 0210 terziario = 9,91) | — |
| 6311 | Trasporto merci su strada | 36,5 | **DA VERIFICARE** | — |
| 9100 | Informatica e servizi IT | 2,7 | **DA VERIFICARE** | — |
| 4211 | Industria metalmeccanica | 17,8 | — | **DA VERIFICARE** |
| 7111 | Sanità privata | 6,2 | **DA VERIFICARE** | — |
| 8121 | Pulizie e multiservizi | 9,4 | **DA VERIFICARE** | — |
| 2311 | Industria chimica | 11,2 | 6,24 (terziario 2110) | **DA VERIFICARE** |
| 1411 | Industria tessile | 14,6 | — | **DA VERIFICARE** |
| 0211 | Agricoltura | 22,1 | — | — (altre attività) |

**Azione richiesta**:

1. Estrarre TUTTI i tassi dai 4 PDF in `materiale/` (terziario.pdf, industria.pdf, artigianato.pdf, "altre attività.pdf") usando `pdftotext`
2. Per ogni voce nel nostro `inail.json`, trovare il codice corrispondente nella gestione corretta e aggiornare il tasso
3. **AGGIUNGERE il campo `gestione`** per ogni voce (terziario/industria/artigianato/altre_attivita) — già presente nel JSON ma i valori vanno verificati
4. Se un codice nel nostro JSON non corrisponde a un codice ufficiale (i codici INAIL sono strutturati: grande gruppo → sottogruppo → voce), correggere la mappatura
5. Aggiungere eventuali voci mancanti che sono rilevanti per i CCNL che supportiamo

**NOTA IMPORTANTISSIMA**: i tassi INAIL variano per GESTIONE tariffaria. Lo stesso tipo di attività ha tassi diversi se classificata sotto "terziario" vs "industria" vs "artigianato". Il nostro JSON deve specificare la gestione e il nostro form/engine deve usare il tasso della gestione corretta in base al tipo di azienda.

---

### B3. CONTRIBUTI CONTRATTUALI CCNL: IMPORTI FISSI, NON PERCENTUALI (🟠 GRAVE)

**Il problema**: nel JSON `data/ccnl/commercio.json` i contributi Fondo Est e Ebiter sono modellati come **percentuali della RAL** (0,56% e 0,15%), ma nella realtà sono **importi fissi mensili**.

Il consulente ha corretto: **15 €/mese × 12 = 180 €/anno** (vs il nostro calcolo percentuale che dava 114 €).

**Dato ufficiale** (dal RTF del consulente):
```
Contributi Fondo di previdenza integrativa:  28,85 €/mese
```

**Azione richiesta**:

1. Modificare la struttura dei contributi CCNL per supportare sia importi fissi che percentuali
2. Per ogni CCNL, verificare se i contributi sono fissi o percentuali

**Nuova struttura proposta per i contributi contrattuali**:

```jsonc
"contributiContrattuali": {
  "azienda": {
    "fondoEst": {
      "tipo": "sanitario",
      "modalita": "fisso",           // NUOVO: "fisso" | "percentuale"
      "importoMensile": 10.42,       // NUOVO: se modalita = "fisso"
      "percentuale": null,           // null se fisso
      "descrizione": "Fondo sanitario integrativo Est",
      "notaLegge": "Accordo nazionale Confcommercio"
    },
    "ebiter": {
      "tipo": "bilaterale",
      "modalita": "fisso",
      "importoMensile": 4.58,
      "percentuale": null,
      "descrizione": "Ente bilaterale territoriale Ebiter",
      "notaLegge": "Art. 4 CCNL Commercio"
    },
    "previcommercio": {               // NUOVO: manca nel nostro sistema!
      "tipo": "previdenziale",
      "modalita": "fisso",
      "importoMensile": 28.85,
      "percentuale": null,
      "descrizione": "Fondo previdenza complementare integrativa",
      "notaLegge": "CCNL Commercio Confcommercio"
    }
  }
}
```

Per il codice `lib/engine.ts`, la sezione che calcola i contributi CCNL (attualmente riga ~181-184) va modificata per gestire entrambe le modalità:

```typescript
// PRIMA (sbagliato):
const contributiCcnl = contributiAttivi
  .reduce((sum, c) => sum + ralEffettiva * c.percentuale, 0);

// DOPO (corretto):
const contributiCcnl = contributiAttivi.reduce((sum, c) => {
  if (c.modalita === 'fisso' && c.importoMensile != null) {
    return sum + c.importoMensile * 12;
  }
  return sum + ralEffettiva * (c.percentuale ?? 0);
}, 0);
```

Aggiornare anche `types/index.ts` per `ContributoContrattuale`:

```typescript
export interface ContributoContrattuale {
  tipo: 'sanitario' | 'previdenziale' | 'bilaterale';
  modalita: 'fisso' | 'percentuale';
  importoMensile?: number | null;     // NUOVO
  percentuale: number | null;         // ora nullable
  descrizione: string;
  notaLegge: string;
}
```

---

### B4. ELEMENTI RETRIBUTIVI MANCANTI NEL MODELLO (🟠 GRAVE)

**Il problema**: il nostro calcolatore non tiene conto di diverse voci che incidono sul costo reale. Dalla scheda ufficiale del consulente (RTF) emergono voci che noi ignoriamo completamente:

| Voce mancante | Importo (Liv.6 Commercio) | Note |
|---|---|---|
| E.d.r. mancata adesione Ente bilaterale | 4,62 €/mese | Pagato per 14 mensilità se non aderisce all'ente bilaterale |
| E.d.r. mancata erogazione assistenza sanitaria | 16,00 €/mese | Pagato per 14 mensilità se non versa al fondo sanitario |
| Ex festività (4 novembre) | 5,07 €/mese | Retribuzione indiretta |
| Festività non godute | 10,14 €/mese | Retribuzione indiretta |
| Contributo di solidarietà | 2,89 €/mese | Contributo obbligatorio |
| Contributi fondo previdenza integrativa | 28,85 €/mese | Es. Previcommercio |

**Azione richiesta**: 

Queste voci sono specifiche per CCNL e livello. Per il CCNL Commercio abbiamo i dati esatti dal file RTF. Per una prima implementazione:

1. **Aggiungi una sezione `elementiAggiuntivi`** nei JSON CCNL per modellare queste voci
2. **Il calcolo engine.ts** deve sommarle al costo totale
3. Cercane i valori per gli altri CCNL (o almeno per i principali: Commercio, Metalmeccanici, Edilizia)

**Struttura proposta per i JSON CCNL**:

```jsonc
"elementiAggiuntivi": {
  "edrEnteBilaterale": {
    "importoMensile": 4.62,
    "mensilita": 14,
    "condizione": "mancata_adesione_ente_bilaterale",
    "descrizione": "E.d.r. mancata adesione Ente bilaterale"
  },
  "edrAssistenzaSanitaria": {
    "importoMensile": 16.00,
    "mensilita": 14,
    "condizione": "mancata_erogazione_assistenza_sanitaria",
    "descrizione": "E.d.r. mancata erogazione prestazioni assistenza sanitaria"
  },
  "exFestivita": {
    "importoMensile": 5.07,
    "mensilita": 12,
    "condizione": null,
    "descrizione": "Ex festività (4 novembre)"
  },
  "festivitaNonGodute": {
    "importoMensile": 10.14,
    "mensilita": 12,
    "condizione": null,
    "descrizione": "Festività non godute"
  },
  "contributoSolidarieta": {
    "importoMensile": 2.89,
    "mensilita": 12,
    "condizione": null,
    "descrizione": "Contributo di solidarietà"
  }
}
```

**NOTA**: se questa sezione è troppo complessa da implementare per tutti i CCNL in un primo momento, implementala ALMENO per il CCNL Commercio (che è il caso test del consulente) e predisponi la struttura dati per gli altri.

---

### B5. FORMULA TFR: VERIFICARE LA BASE DI CALCOLO (🟡 MEDIO)

**Il problema**: la nostra formula TFR è:

```typescript
// Attuale (lib/contributi.ts):
const retribuzioneTfr = ral * (mensilita / 12);
return retribuzioneTfr / 13.5;
```

Per il test case Commercio Liv.6:
- Nostro calcolo: 21.584,78 × (14/12) / 13,5 = 1.865,35 €/anno
- Valore corretto del consulente: **1.542,48 €/anno** (128,54 × 12)
- Differenza: +21% (il nostro è troppo alto!)

Il problema è che la **base di calcolo del TFR per Art. 2120 c.c.** è la "retribuzione annua" che NON è semplicemente RAL × mensilità/12. La retribuzione utile ai fini del TFR:
- Include: paga base + contingenza + scatti + EDR + superminimo + rateo mensilità aggiuntive
- Ma la modalità di inclusione delle mensilità aggiuntive varia per CCNL
- Per il CCNL Commercio, dalla tabella del consulente, il TFR mensile = 128,54 € su retrib totale di 1.861,02 €

**Calcolo inverso**: 128,54 × 13,5 = 1.735,29 € mensile (base TFR), che è MENO della retribuzione totale di 1.861,02 €.

La formula corretta **semplificata** per la nostra approssimazione dovrebbe essere:

```typescript
// CORRETTO (semplificato):
// TFR = RAL annua (comprese mensilità aggiuntive) / 13,5
// La RAL già include le mensilità aggiuntive (es. 1541.77 × 14 = 21584.78)
// NON bisogna moltiplicare ulteriormente per mensilita/12!
const tfr = ral / 13.5;
```

**Verifica**: 21.584,78 / 13,5 = 1.598,87 € — più vicino al valore del consulente (1.542,48 €) ma non esatto. La differenza residua (~56 €) dipende dal fatto che il consulente calcola il TFR su una base leggermente diversa dalla RAL piena (escludendo probabilmente alcune voci dalla base TFR per CCNL).

**Azione**: 
1. **Rimuovere** la moltiplicazione `(mensilita / 12)` dalla formula TFR — la RAL inserita a sistema include già le mensilità, quindi dividere per 13,5 è sufficiente
2. Come formula di base usare: `TFR = RAL / 13.5`
3. Aggiungere un commento che spiega che la base TFR esatta dipende dalla retribuzione utile per CCNL

---

### B6. INCOERENZA INTERNA NEI DATI — ALIQUOTE INPS DETTAGLIO VS TOTALE (🟡 MEDIO)

**Il problema**: nel file `data/aliquote-inps.json`, per `commercio_fino15`:
- `aliquotaDatore`: 0.2897 (= 28,97%)
- Ma la SOMMA del `dettaglio`: 23,81% + 1,61% + 0,68% + 2,44% + 0,24% + 0,50% = **29,28%** ≠ 28,97%

C'è un'incoerenza di 0,31 punti percentuali tra il totale dichiarato e la somma delle componenti. Stesso problema potenziale per gli altri settori.

**Azione**: per ogni settore in `settoriContributivi`, verificare che la somma delle componenti nel `dettaglio` corrisponda esattamente all'`aliquotaDatore`. Se non coincidono, il valore della somma delle componenti è quello corretto (perché è verificabile voce per voce).

---

## SEZIONE C — VALORI DI RIFERIMENTO UFFICIALI DAL MATERIALE DEL CONSULENTE

### C1. Scheda costo completa CCNL Commercio Confcommercio Liv.6 (dal RTF)

Questo è il **benchmark** da raggiungere. Il nostro calcolatore, per lo stesso input, deve dare risultati comparabili:

```
RETRIBUZIONE:
  Retribuzione base (minimo tabellare):     1.541,77 €/mese
  Scatti di anzianità:                         19,73 €/scatto
  E.d.r. mancata adesione Ente bilaterale:     4,62 €/mese
  E.d.r. mancata erog. assist. sanitaria:     16,00 €/mese
  = Retribuzione diretta:                   1.582,12 €/mese
  Ex festività (4 novembre):                    5,07 €/mese
  Festività non godute:                        10,14 €/mese
  = Retribuzione indiretta:                    15,21 €/mese
  Mensilità aggiuntive (13a, 14a) rateo:      263,69 €/mese
  = RETRIBUZIONE TOTALE:                    1.861,02 €/mese

ONERI:
  TFR:                                        128,54 €/mese (= 1.542,48 €/anno)
  Contributi fondo previdenza integrativa:     28,85 €/mese (= 346,20 €/anno)
  Contributi INPS:                            530,39 €/mese (= 6.364,68 €/anno)
  Contributo di solidarietà:                    2,89 €/mese (= 34,68 €/anno)
  Contributi INAIL:                            22,56 €/mese (= 270,72 €/anno)
  = Contributi obbligatori:                   555,84 €/mese

TOTALE:
  Costo medio MENSILE:                     2.574,25 €
  Costo medio ANNUO:                      30.891,00 €
  Costo medio ORARIO:                        17,85 €
```

### C2. Tassi INAIL ufficiali (dai PDF terziario.pdf)

I codici più rilevanti per i nostri CCNL (gestione Terziario):

| Codice | Descrizione | Tasso ‰ (ufficiale) | Nostro tasso ‰ | Stato |
|---|---|---|---|---|
| 0111 | Commercio al dettaglio/ingrosso | **7,31** | 5,0 | ❌ SBAGLIATO |
| 0210 | Ristorazione con somministrazione | **9,91** | 12,0 (cod. 5411) | ❌ Codice e tasso sbagliati |
| 0311 | Sanità e prestazioni sanitarie | **11,85** | 6,2 (cod. 7111) | ❌ Codice e tasso sbagliati |
| 0314 | Erogazione infermieristica leggera | **5,00** | — | Mancante |
| 0410 | Servizi estetici/barbieri | **4,63** | — | Mancante |
| 0421 | Pulizie interne | **18,88** | 9,4 (cod. 8121) | ❌ |
| 2110 | Farmacia/chimica terziario | **6,24** | 11,2 (cod. 2311) | ❌ |
| 3100 | Costruzioni edili | **48,85** (terziario) | 63,0 | ❌ |
| 4100 | Energia/telecomunicazioni | **14,13** | 4,3 (cod. 6111) | ❌ |
| 6250 | Orologeria/strumenti precisione | **3,66** | — | Mancante |
| 6310 | Macchine elettriche/elettrodomestici | **6,54** | — | Mancante |
| 6520 | Elettricisti civili | **6,37** | — | Mancante |
| 6561 | Apparecchi illuminazione | **5,56** | — | Mancante |
| 7100 | Ceramica, vetro, cemento | **10,89** | — | Mancante |
| 8100 | Pelletteria, calzature | **7,50** | — | Mancante |
| 8200 | Lavanderia, tintoria | **8,03** | — | Mancante |
| 9124 | Trasporto persone | **19,60** | — | Mancante |

**AZIONE**: riscrivere completamente `data/inail.json` usando i dati reali estratti dai PDF. Per ogni voce:
- Usare il **codice ufficiale INAIL** (non codici inventati)
- Specificare la **gestione** (terziario/industria/artigianato/altre_attivita)
- Usare il **tasso ufficiale** dal PDF della gestione corretta
- Mantenere il campo `rangeOscillazione` per indicare la variabilità

Per estrarre i dati dai PDF, usare:
```bash
cd materiale && pdftotext -layout "terziario.pdf" - | grep -E "^\s*[0-9]{4}\b"
cd materiale && pdftotext -layout "industria.pdf" - | grep -E "^\s*[0-9]{4}\b"
cd materiale && pdftotext -layout "artigianato.pdf" - | grep -E "^\s*[0-9]{4}\b"
cd materiale && pdftotext -layout "altre attività.pdf" - | grep -E "^\s*[0-9]{4}\b"
```

---

## SEZIONE D — PIANO DI IMPLEMENTAZIONE (ORDINE DI PRIORITÀ)

### FASE 1 — Fix dati critici (i numeri devono essere giusti)

1. **Aggiornare `data/ccnl/commercio.json`**: minimi tabellari, scatti, contributi fissi → vedi Sezione C1
2. **Riscrivere `data/inail.json`**: tutti i tassi dai PDF ufficiali → vedi Sezione C2
3. **Fix formula TFR** in `lib/contributi.ts`: rimuovere `(mensilita / 12)` → `TFR = ral / 13.5`
4. **Fix contributi CCNL** in `lib/engine.ts`: supportare importi fissi oltre a percentuali → vedi Sezione B3
5. **Fix incoerenza aliquote INPS** in `data/aliquote-inps.json`: verificare che somma dettaglio = totale → vedi Sezione B6
6. **Aggiornare minimi tabellari** per TUTTI gli altri CCNL cercando i rinnovi contrattuali 2024-2026 su internet

### FASE 2 — Arricchimento modello

7. **Aggiungere elementi retributivi mancanti** (EDR, festività, contributo solidarietà) almeno per CCNL Commercio → vedi Sezione B4
8. **Aggiornare `types/index.ts`** con i nuovi campi (modalita, importoMensile, elementiAggiuntivi)
9. **Aggiornare i test** in `__tests__/engine.test.ts` con il test case del consulente come golden test

### FASE 3 — Validazione

10. **Test di validazione**: simulare esattamente il caso CCNL Commercio Liv.6 del consulente e verificare che il costo totale annuo sia ~30.891 € (dal RTF ufficiale) o almeno ~28.737 € (dalla correzione a mano sulla busta)
11. **Verificare che il netto dipendente** per lo stesso caso sia coerente con la pagina 3 del CCF

---

## SEZIONE E — VINCOLI E NOTE OPERATIVE

- **NON inventare dati**: se non trovi il valore ufficiale aggiornato per un CCNL specifico, lascia il valore attuale con un commento `// TODO: verificare - valore potenzialmente obsoleto`
- **Mantieni retrocompatibilità**: la struttura del tipo `ContributoContrattuale` va estesa (aggiungere campi), non rotta (i campi esistenti restano)
- **Priorità al CCNL Commercio**: è il caso test del consulente, deve essere PERFETTO. Gli altri CCNL si aggiornano dopo ma la struttura deve supportarli
- **Arrotondamenti**: i calcoli intermedi non arrotondano. Solo il display arrotonda a 2 decimali. Usa `Math.round(x * 100) / 100` o `toFixed(2)` solo in output
- **Fonti**: per ogni dato aggiornato, scrivi la fonte nel campo `fonte` o `notaLegge` del JSON

---

## SEZIONE F — COMANDI UTILI PER ESTRARRE DATI DAI PDF

```bash
# Estrai tutti i tassi INAIL da ciascuna gestione
cd /Users/marcoepicoco/Desktop/simulatore/materiale

# Terziario (il più usato per commercio, servizi, uffici)
pdftotext -layout "terziario.pdf" - | grep -E "^\s*[0-9]{4}\b"

# Industria (metalmeccanici, chimica, tessile)
pdftotext -layout "industria.pdf" - | grep -E "^\s*[0-9]{4}\b"

# Artigianato
pdftotext -layout "artigianato.pdf" - | grep -E "^\s*[0-9]{4}\b"

# Altre attività (agricoltura, ecc.)
pdftotext -layout "altre attività.pdf" - | grep -E "^\s*[0-9]{4}\b"

# Navigazione
pdftotext -layout "navigazione.pdf" -

# RTF con dati completi Commercio Confcommercio
textutil -convert txt "terziario-confcommercio.rtf" -stdout
```

---

## GOLDEN TEST — Il calcolatore DEVE produrre questi risultati

**Input**:
- CCNL: Commercio Confcommercio  
- Livello: 6
- Ore: 40 (full-time)
- Mensilità: 14
- Anzianità: 0 anni (no scatti)  
- Numero dipendenti: ≤15
- Codice INAIL: 0111
- Agevolazioni: nessuna
- Assistenza sanitaria: inclusa
- Retribuzione personalizzata: NO (usa minimo tabellare)

**Output atteso** (dal materiale consulente):
- RAL: ~21.584,78 € (1.541,77 × 14)
- INPS datoriali: ~6.216 €
- TFR: ~1.542 - 1.599 €
- INAIL: ~157 € (7,31‰)
- Contributi CCNL: ~180 € (fissi)
- **Costo totale: nell'ordine di 28.000-31.000 €** (il target pieno è 30.891 dal RTF se si includono TUTTI gli elementi)

Se il costo totale esce sotto i 27.000 € o sopra i 33.000 €, c'è sicuramente un errore.
