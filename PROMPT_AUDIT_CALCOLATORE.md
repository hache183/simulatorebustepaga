# PROMPT AUDIT & FIX — Simulatore Costo del Lavoro

> **Obiettivo**: audit completo del motore di calcolo, correzione bug critici, aggiornamento dati normativi 2025-2026, aggiunta netto mensile dipendente.

---

## CONTESTO DEL PROGETTO

Calcolatore del costo del lavoro aziendale in Italia. Stack: Next.js, TypeScript, Zod, TailwindCSS.
Struttura: `lib/engine.ts` (motore di calcolo), `lib/contributi.ts` (funzioni contributive), `data/` (JSON con aliquote, CCNL, INAIL), `components/` (UI React), `types/index.ts`.

---

## BUG CRITICI DA CORREGGERE IMMEDIATAMENTE

### BUG 1 — RAL calcolata col moltiplicatore (CRITICO, produce cifre assurde)

**File**: `lib/engine.ts`, riga ~67

```typescript
// BUG: il moltiplicatore viene applicato alla RAL già calcolata dal form
ralEffettiva = input.ral * livello.moltiplicatore * oreRatio;
```

**Problema**: il form (`CalcolatoreForm.tsx`, useEffect riga ~90) precompila `ral = minimoTabellare × mensilita`. Poi l'engine moltiplica **di nuovo** per `livello.moltiplicatore`. Per commercio livello 6: `1148 × 13 = 14.924` → engine fa `14.924 × 0.60 = 8.954` → RAL finale ~9000€ (assurda).

**Fix**: rimuovere la moltiplicazione per `livello.moltiplicatore` dalla riga di calcolo RAL in engine.ts. Il `moltiplicatore` è un dato informativo (rapporto rispetto al livello Quadro), NON un fattore di calcolo. Il minimoTabellare È GIÀ il valore corretto per quel livello.

```typescript
// CORRETTO:
ralEffettiva = input.ral * oreRatio;
```

**Nota**: il campo `moltiplicatore` può restare nei JSON CCNL come dato informativo/visualizzazione ma NON deve mai entrare nel calcolo della RAL.

---

### BUG 2 — Mensilità errate nei JSON CCNL

**File**: tutti i JSON in `data/ccnl/`

Molti CCNL hanno `"mensilita": 13` quando in realtà prevedono 14 mensilità (tredicesima + quattordicesima). Correggere come segue:

| CCNL | mensilità corrette | nel JSON attuale | Fonte |
|---|---|---|---|
| `commercio.json` | **14** | 13 ❌ | Art. 208 CCNL Commercio Confcommercio — quattordicesima obbligatoria |
| `pubblici_esercizi.json` | **14** | 14 ✅ | — |
| `studi_professionali.json` | **14** | 13 ❌ | Art. 122 CCNL Studi Professionali Confprofessioni |
| `credito.json` | **14** | 13 ❌ | CCNL ABI — premio di produttività + 14a |
| `trasporti.json` | **14** | 13 ❌ | Art. 68 CCNL Logistica Trasporti Merci — 14a mensilità |
| `cooperative_sociali.json` | **14** | 13 ❌ | Art. 68 CCNL Cooperative Sociali |
| `sanita_privata.json` | **14** | 13 ❌ | Art. 54 CCNL AIOP Sanità Privata |
| `metalmeccanici.json` | **13** | 13 ✅ | Non prevede quattordicesima |
| `edilizia.json` | **13** | 13 ✅ | Gratifica natalizia = tredicesima, no quattordicesima |
| `chimica.json` | **13** | 13 ✅ | — |
| `tessile.json` | **13** | 13 ✅ | — |
| `multiservizi.json` | **13** | 13 ✅ | — |
| `telecomunicazioni.json` | **13** | 13 ✅ | — |
| `informatica.json` | **13** | 13 ✅ | — |
| `agricoltura.json` | **13** | 13 ✅ | — |
| `scuole_private.json` | **14** | 13 ❌ | CCNL Scuole Paritarie — 14a mensilità |

**IMPORTANTE**: Ogni valore va verificato sul testo contrattuale ufficiale aggiornato (archivio CNEL: https://www.cnel.it/Archivio-Contratti). I valori sopra sono indicativi — fai una ricerca aggiornata per ogni CCNL prima di modificare.

---

## MODIFICHE FUNZIONALI RICHIESTE

### MOD A — Mensilità automatiche da CCNL + possibilità override manuale

**Stato attuale**: il form già precompila le mensilità dal JSON CCNL, ma dato che molti JSON hanno il valore sbagliato (vedi BUG 2), mostra sempre 13.

**Requisiti**:
1. Dopo aver corretto i JSON (BUG 2), le mensilità si devono autocompilare dal CCNL scelto
2. L'utente deve comunque poter modificarle liberamente (range 13-16, come ora)
3. Aggiungere un'indicazione visiva: "Il CCNL selezionato prevede X mensilità" tipo label sotto il selettore mensilità
4. Se l'utente modifica le mensilità rispetto al default CCNL, mostrare un warning: "Stai usando un numero di mensilità diverso da quello previsto dal CCNL (default: X)"

**File coinvolti**: `components/CalcolatoreForm.tsx`, JSON in `data/ccnl/`

---

### MOD B — Aggiornamento aliquote INPS (datore + dipendente)

**File**: `data/aliquote-inps.json`, `lib/contributi.ts`, `lib/engine.ts`, `types/index.ts`

**Problema attuale**: aliquota unica datore 28.80% e dipendente 9.19% — troppo semplificato. L'aliquota complessiva datore varia per settore, dimensione aziendale, tipologia contrattuale.

**Struttura corretta per il JSON `aliquote-inps.json`**:

```jsonc
{
  "updatedAt": "2026-01-01T00:00:00Z",
  "fonte": "Circolare INPS n. 19/2025 — L. 207/2024 (Legge di Bilancio 2025)",
  "settoriContributivi": {
    "commercio_fino15": {
      "nome": "Commercio e Terziario (fino a 15 dipendenti)",
      "aliquotaDatore": 0.2897,
      // IVS 23.81%, NASpI 1.61%, CUAF 0.68%, malattia 2.44%, maternità 0.24%,
      // FIS 0.50% (fondo integrazione salariale ≤15 dip)
      "aliquotaDipendente": 0.0919,
      "dettaglio": {
        "IVS": 0.2381,
        "NASpI": 0.0161,
        "CUAF_assegniFamiliari": 0.0068,
        "malattia": 0.0244,
        "maternita": 0.0024,
        "FIS": 0.0050
      }
    },
    "commercio_oltre15": {
      "nome": "Commercio e Terziario (oltre 15 dipendenti)",
      "aliquotaDatore": 0.2977,
      // Come sopra + CIGS 0.90% al posto di FIS 0.50%
      "aliquotaDipendente": 0.0919,
      "dettaglio": { ... }
    },
    "industria_fino15": {
      "nome": "Industria (fino a 15 dipendenti)",
      "aliquotaDatore": 0.3097,
      "aliquotaDipendente": 0.0919,
      "dettaglio": { ... }
    },
    "industria_oltre15": {
      "nome": "Industria (oltre 15 dipendenti)",
      "aliquotaDatore": 0.3168,
      "aliquotaDipendente": 0.0919,
      "dettaglio": { ... }
    },
    "artigianato": {
      "nome": "Artigianato",
      "aliquotaDatore": 0.2897,
      "aliquotaDipendente": 0.0919,
      "dettaglio": { ... }
    },
    "edilizia_industria": {
      "nome": "Edilizia industria",
      "aliquotaDatore": 0.3447,
      // Include Cassa Edile
      "aliquotaDipendente": 0.0919,
      "dettaglio": { ... }
    },
    "credito_assicurazioni": {
      "nome": "Credito e Assicurazioni",
      "aliquotaDatore": 0.3218,
      "aliquotaDipendente": 0.0919,
      "dettaglio": { ... }
    },
    "apprendistato_base": {
      "nome": "Apprendistato (datori fino a 9 dipendenti, 1° anno)",
      "aliquotaDatore": 0.0350,
      "aliquotaDipendente": 0.0584,
      "dettaglio": { ... }
    }
  },
  // Mappatura automatica settore → CCNL (per precompilare)
  "mappaCcnlSettore": {
    "commercio": "commercio_fino15",
    "metalmeccanici": "industria_fino15",
    "edilizia": "edilizia_industria",
    "chimica": "industria_fino15",
    "credito": "credito_assicurazioni",
    // ... etc
  },
  "agevolazioni": [ /* invariato */ ]
}
```

**IMPORTANTE — Aliquota INPS dipendente e cuneo fiscale 2025-2026**:

Con la **Legge di Bilancio 2025 (L. 207/2024, art. 1, commi 4-9)** il taglio del cuneo contributivo (che nel 2024 riduceva l'aliquota dipendente al 6.19% sotto 25k e 7.19% sotto 35k) è stato **eliminato**. L'aliquota INPS dipendente torna al **9.19% pieno** per tutti. Al posto del taglio contributivo è stato introdotto un sistema di **bonus fiscale / detrazione IRPEF**:

- Redditi fino a 20.000€: bonus non tassabile = 7,1% del reddito
- Redditi 20.001-32.000€: detrazione aggiuntiva di 1.000€
- Redditi 32.001-40.000€: detrazione decrescente (da 1.000€ a 0€)
- Redditi oltre 40.000€: nessun beneficio

Questo bonus/detrazione va integrato nel calcolo del netto dipendente (MOD C).

**Azione**: ricerca e verifica le aliquote esatte per ciascun settore consultando la **Circolare INPS n. 19/2025** e il DM Lavoro pubblicato a gennaio 2025. I valori sopra indicati sono **approssimazioni ragionevoli basate sulle aliquote storiche** — vanno verificati sulla circolare ufficiale.

**Logica engine.ts**: il motore deve selezionare automaticamente il settore contributivo in base al ccnlId scelto (via `mappaCcnlSettore`) e alla dimensione aziendale (campo `numeroDipendenti` già presente nell'input). L'utente deve comunque poter sovrascrivere l'aliquota manualmente come già avviene.

---

### MOD C — Aggiornamento tariffario INAIL

**File**: `data/inail.json`

**Problema attuale**: le voci tariffarie e i tassi sono semplificati e potenzialmente imprecisi. Il sistema INAIL usa circa 740 voci tariffarie raggruppate in 4 gestioni tariffarie (Industria, Artigianato, Terziario, Altre Attività) con tassi medi nazionali che variano annualmente.

**Azione richiesta**:

1. **Verificare i tassi medi attuali** consultando:
   - Delibera CdA INAIL 2025 sulle tariffe dei premi
   - Circolare INAIL n. 3 del 20/01/2026 (nuove aliquote oscillazione tasso medio)
   - Database tariffe INAIL: https://www.inail.it/cs/internet/attivita/tariffe-dei-premi.html
   
2. **Struttura consigliata** (migliorata rispetto all'attuale):

```jsonc
{
  "updatedAt": "2026-01-01T00:00:00Z",
  "fonte": "INAIL Tariffe Premi — D.M. 27/02/2019, aggiornamento 2025",
  "voci": [
    {
      "codice": "0722",     // Codice grande gruppo
      "settore": "Commercio al dettaglio e ingrosso",
      "gestione": "terziario",
      "tassoMedioPerMille": 5.00,
      "rangeOscillazione": { "min": 3.50, "max": 7.50 },
      "note": "Tasso medio nazionale — il tasso effettivo dipende dall'andamento infortunistico aziendale"
    },
    {
      "codice": "0723",
      "settore": "Uffici e attività amministrative",
      "gestione": "terziario",
      "tassoMedioPerMille": 4.00,
      "rangeOscillazione": { "min": 2.80, "max": 6.00 },
      "note": ""
    },
    // ... etc
  ]
}
```

**Valori da verificare** (i tassi attuali nel JSON potrebbero essere fuori scala):

| Voce | Tasso attuale nel JSON | Range plausibile | Note |
|---|---|---|---|
| Commercio al dettaglio | 8.3‰ | 4-7‰ | Sembra alto — verificare |
| Uffici/amministrazione | 3.1‰ | 3-5‰ | Plausibile |
| Costruzioni edili | 63.0‰ | 50-80‰ | Alto ma plausibile per edilizia |
| Ristorazione | 12.0‰ | 8-15‰ | Plausibile |
| Trasporto merci | 36.5‰ | 25-45‰ | Plausibile |
| IT/Informatica | 2.7‰ | 2-4‰ | Plausibile |
| Metalmeccanici | 17.8‰ | 12-25‰ | Plausibile |
| Sanità privata | 6.2‰ | 5-9‰ | Plausibile |

**Nota**: i tassi INAIL sono FORTEMENTE variabili per azienda (oscillazione per andamento infortunistico, ±40%). Nel calcolatore usiamo il tasso medio nazionale come stima. Indicare chiaramente nel risultato che il valore è un tasso medio e che quello effettivo può variare.

---

### MOD D — Calcolo e visualizzazione del NETTO MENSILE dipendente

**File coinvolti**: `lib/engine.ts`, `types/index.ts`, `components/RisultatiCalcolatore.tsx`

Aggiungere nel risultato il **netto mensile stimato del dipendente** con il seguente calcolo:

#### Algoritmo di calcolo netto

```
INPUT:
  RAL effettiva (annua)
  mensilità
  aliquota INPS dipendente (base 9.19%)
  
STEP 1 — Retribuzione mensile lorda ordinaria
  lordo_mensile = RAL / mensilità  (divide per le mensilità effettive)
  // NOTA: il lordo mensile delle mensilità aggiuntive (13a, 14a) si calcola
  // a parte per l'IRPEF perché vanno tassate separatamente

STEP 2 — Contributi INPS dipendente (annui)
  inps_dipendente_annuo = RAL × aliquota_inps_dipendente
  inps_dipendente_mensile = inps_dipendente_annuo / 12

STEP 3 — Imponibile IRPEF annuo
  imponibile_irpef = RAL - inps_dipendente_annuo

STEP 4 — IRPEF lorda (scaglioni 2025-2026, confermati da L. 207/2024)
  fino_a_28000:    23%
  da_28001_a_50000: 35%
  oltre_50000:     43%
  
  irpef_lorda = calcola_per_scaglioni(imponibile_irpef)

STEP 5 — Detrazioni lavoro dipendente (art. 13 TUIR post-riforma)
  if imponibile ≤ 15.000:
    detrazione = 1.955 (minimo 690€ per tempo indeterminato, 1.380 tempo determinato)
  elif imponibile ≤ 28.000:
    detrazione = 1.910 + 1.190 × (28.000 - imponibile) / 13.000
  elif imponibile ≤ 50.000:
    detrazione = 1.910 × (50.000 - imponibile) / 22.000
  else:
    detrazione = 0

STEP 6 — Bonus cuneo fiscale 2025 (L. 207/2024, art. 1 cc. 4-9)
  // Sostituisce il taglio contributivo. È un beneficio FISCALE, non contributivo.
  if reddito_complessivo ≤ 20.000:
    bonus = reddito × 0.071  // 7,1% del reddito
  elif reddito_complessivo ≤ 32.000:
    bonus = 1.000  // importo fisso
  elif reddito_complessivo ≤ 40.000:
    bonus = 1.000 × (40.000 - reddito) / 8.000  // decrescente
  else:
    bonus = 0
  // NOTA: per redditi fino a 20k il bonus non è tassabile.
  // Per redditi 20k-40k è una detrazione IRPEF aggiuntiva.

STEP 7 — IRPEF netta
  irpef_netta = max(0, irpef_lorda - detrazione_lavoro_dip - bonus_cuneo)

STEP 8 — Addizionali regionali e comunali (stima media)
  addizionale_regionale = imponibile × 0.0173  // media Italia ~1,73%
  addizionale_comunale = imponibile × 0.008    // media Italia ~0,8%
  // NOTA: variano per regione/comune. Per precisione, servirebbero le tabelle
  // per regione. Come prima approssimazione usare un valore medio.

STEP 9 — Netto annuo e mensile
  netto_annuo = RAL - inps_dipendente_annuo - irpef_netta - addizionale_regionale - addizionale_comunale
  netto_mensile = netto_annuo / 12   // media mensile distribuita su 12 mesi
  netto_per_mensilita = netto_annuo / mensilità  // netto per singola busta
```

#### Visualizzazione nel componente RisultatiCalcolatore

Aggiungere:

1. **Nuova KPI card** (4a card nella griglia, o sotto le 3 esistenti):
   ```
   Netto mensile stimato dipendente
   € X.XXX
   (Media su 12 mesi — stima indicativa)
   ```

2. **Nuova sezione "Prospetto netto dipendente"** dopo la tabella costo aziendale:
   ```
   RAL lorda:                    € XX.XXX
   - Contributi INPS dipendente: -€ X.XXX  (9,19%)
   = Imponibile IRPEF:           € XX.XXX
   - IRPEF lorda:                -€ X.XXX
   + Detrazioni lavoro dip.:     +€ X.XXX
   + Bonus cuneo fiscale:        +€ X.XXX
   - IRPEF netta:                -€ X.XXX
   - Addizionali reg./com.:      -€ X.XXX
   = NETTO ANNUO stimato:        € XX.XXX
   = NETTO MENSILE stimato:      € X.XXX  (su 12 mesi)
   = NETTO per busta (X mens.):  € X.XXX
   ```

3. **Disclaimer** sotto la sezione netto: "Il netto è una stima indicativa. Il calcolo esatto dipende dalla situazione fiscale personale del dipendente (carichi familiari, detrazioni aggiuntive, addizionali comunali/regionali specifiche)."

#### Aggiornamento types/index.ts

Aggiungere al tipo `CalcolatoreOutput`:

```typescript
// Aggiungere:
nettoDipendente: {
  ralLorda: number;
  inpsDipendente: number;
  imponibileIrpef: number;
  irpefLorda: number;
  detrazioneLavoroDip: number;
  bonusCuneoFiscale: number;
  irpefNetta: number;
  addizionaleRegionale: number;
  addizionaleComunale: number;
  nettoAnnuo: number;
  nettoMensile12: number;       // su 12 mesi
  nettoPerMensilita: number;    // su N mensilità
  disclaimer: string;
};
```

---

## RIEPILOGO PRIORITÀ

| # | Tipo | Descrizione | Impatto |
|---|---|---|---|
| 1 | 🔴 BUG CRITICO | Rimuovere `moltiplicatore` dal calcolo RAL in engine.ts | RAL calcolata ~40-60% del valore reale |
| 2 | 🔴 BUG CRITICO | Correggere mensilità nei JSON CCNL | 7 CCNL su 16 hanno mensilità errate |
| 3 | 🟡 MOD A | Mensilità auto-selezionate + override + label | UX |
| 4 | 🟡 MOD B | Aliquote INPS per settore/dimensione aziendale | Precisione calcolo |
| 5 | 🟡 MOD C | Verificare/correggere tassi INAIL | Precisione calcolo |
| 6 | 🟢 MOD D | Aggiungere netto mensile dipendente | Feature richiesta |

---

## CHECKLIST DI VALIDAZIONE POST-FIX

Dopo aver applicato tutte le modifiche, verificare con questi casi test:

### Test 1 — CCNL Commercio, Livello 4, full-time
- **Input**: CCNL Commercio, livello 4, 40h, mensilità auto (deve essere 14), nessuna agevolazione
- **RAL attesa**: `1375 × 14 = 19.250€` (o il minimo tabellare aggiornato × 14)
- **Costo aziendale atteso**: ~128-145% della RAL
- **Netto mensile dipendente atteso**: circa 1.200-1.350€

### Test 2 — CCNL Commercio, Livello 6, full-time
- **Input**: CCNL Commercio, livello 6, 40h, mensilità auto (14)
- **RAL attesa**: `1148 × 14 = 16.072€` — NON deve essere 9.000€
- **Netto mensile stimato**: circa 1.000-1.150€

### Test 3 — CCNL Metalmeccanici, Livello 5, full-time
- **Input**: CCNL Metalmeccanici, livello 5, 40h, mensilità auto (deve restare 13)
- **Verifica**: che le mensilità restino a 13 e non saltino a 14

### Test 4 — Part-time 20h
- **Input**: qualsiasi CCNL, 20h
- **Verifica**: tutti i valori (RAL, costo, netto) devono essere proporzionalmente ridotti al 50%

### Test 5 — Retribuzione personalizzata
- **Input**: CCNL Commercio, livello 4, retribuzione personalizzata 30.000€
- **Verifica**: RAL = 30.000€, superminimo calcolato correttamente, netto coerente

### Test 6 — Agevolazione under 36
- **Input**: qualsiasi, con agevolazione under36
- **Verifica**: il risparmio contributivo non supera il massimale annuo (6.000€)

---

## FONTI DA CONSULTARE PER AGGIORNAMENTO DATI

1. **CCNL Commercio testo integrale**: https://www.cnel.it/Archivio-Contratti — cercare "Terziario Distribuzione e Servizi"
2. **Circolari INPS 2025-2026**: https://www.inps.it — sezione Circolari, cercare aliquote contributive
3. **L. 207/2024** (Legge di Bilancio 2025): per il nuovo bonus cuneo fiscale e conferma scaglioni IRPEF
4. **Tariffe INAIL**: https://www.inail.it/cs/internet/attivita/tariffe-dei-premi.html — tariffe dei premi
5. **Scaglioni IRPEF 2025**: D.Lgs. 216/2023 reso strutturale dalla L. 207/2024
6. **Detrazioni lavoro dipendente**: art. 13 TUIR come modificato dalla riforma fiscale

---

## NOTE PER IL MODELLO CHE ESEGUE LE MODIFICHE

- **Non toccare lo styling o il layout** a meno che non sia strettamente necessario per la nuova sezione netto
- **Mantieni la struttura file esistente**: engine.ts, contributi.ts, types/, data/
- **Aggiorna i test** in `__tests__/engine.test.ts` per riflettere tutti i fix
- **Tutti i calcoli monetari** devono arrotondare a 2 decimali solo nel display, non nei calcoli intermedi
- **Il campo `moltiplicatore`** nei JSON CCNL può restare per display/informazione, ma va ignorato nel calcolo
- **Cerca su internet** le fonti prima di confermare i valori numerici delle aliquote
