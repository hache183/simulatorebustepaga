# Prompt per Claude Code — Fix segnalazioni Francesca (aprile 2026)

> Copia tutto il blocco sotto la riga `---` e incollalo nella CLI di Claude Code dalla root del progetto.

---

## Contesto

Stai lavorando su un simulatore del costo del lavoro in Next.js 14 + TypeScript (cartella corrente). Alcune modifiche sono già state applicate in una sessione precedente di Claude Code: **non rifare da zero** ciò che esiste già. Prima di toccare qualsiasi file, leggi il file esistente e verifica cosa c'è già.

La cliente (Francesca, consulente del lavoro) ha segnalato **4 problemi** e fornito i documenti di riferimento nella cartella `LAVORO/` (50 PDF Wolters Kluwer One Lavoro + INPS). Di seguito le istruzioni precise per risolverli.

---

## PROBLEMA 1 — Retribuzione oraria domestici non coincide con le tabelle aggiornate

**File da modificare**: `data/ccnl/domestici.json`

**Cosa fare**:
1. Leggi il PDF `LAVORO/collaboratori-familiari-non-conviventi-lavoro-dome.pdf`. Contiene la tabella retributiva del CCNL Collaboratori Familiari non conviventi (accordo 28/10/2025, vigente dal 01/01/2026), firmato da FIDALDO-DOMINA / Filcams-Fisascat-Uiltucs-Federcolf.
2. Estrai l'esatta **retribuzione oraria minima** per ciascuno degli 8 livelli (DS, D, CS, C, BS, B, AS, A), valida dal 01/01/2026.
3. Aggiorna il campo `minimoTabellare` di ogni livello in `data/ccnl/domestici.json` con i valori esatti letti dal PDF. Non inventare, non stimare: usa solo i valori presenti nel documento.
4. Se il documento riporta la voce come "paga base oraria", "minimo tabellare orario" o simile, usa quello. Il campo `minimoTabellare` per i domestici rappresenta l'importo **orario** (il CCNL usa `retribuzioneOraria: true`).
5. Aggiorna il campo `fonte` e `updatedAt` del JSON.

**Attenzione**: il campo `mensilita: 13` nei domestici è usato solo per il calcolo degli scatti, non per la RAL (che si calcola come `tariffaOraria × oreLavoro × 52`). Non modificarlo.

---

## PROBLEMA 2 — Rimuovere il campo "apprendistato"

**Cosa fare**:
1. Cerca in tutto il codebase (componenti, pagine, tipi, engine, API) tutte le occorrenze del campo "apprendistato" **come campo del form** (es. un checkbox "è apprendista?", un'opzione "apprendistato" nel tipoContratto, o un campo separato).
2. Rimuovi il campo dal form, dai tipi (`types/index.ts`), dallo schema Zod dell'engine (`lib/engine.ts`), dallo schema Zod del form (`components/CalcolatoreForm.tsx`) e da qualsiasi componente che lo referenzia.
3. **Non toccare** le voci `apprendistato_base/anno2/anno3/oltre9` in `data/aliquote-inps.json` (sono settori contributivi, non campi del form). Non toccare neanche l'agevolazione `id: "apprendistato"` in `aliquote-inps.json` (è un'agevolazione contributiva separata dal campo form).
4. Se il campo non esiste già (già rimosso nella sessione precedente), salta questo punto.

---

## PROBLEMA 3 — Calcolo INPS c/lavoratore per domestici nel netto non funziona correttamente

**Bug descritto dalla cliente**: Per un lavoratore domestico livello A, tempo indeterminato, 25 ore/settimana, il contributo INPS a carico del lavoratore nel calcolo del netto dovrebbe essere calcolato come:

```
ore annue × quota_oraria_lavoratore = (52 × 25) × aliquota_fascia = 1300 × €0,31 = €403/anno
```

Il valore €0,31/ora deriva dalla Circolare INPS n. 9/2026 (PDF: `LAVORO/Circolare numero 9 del 03-02-2026 _ Det...Circolari, Messaggi e Normativa _ INPS.pdf`), fascia per lavoratori con >24h/settimana.

**Prima di modificare qualsiasi cosa**:
1. Leggi la Circolare INPS n. 9/2026 dal PDF sopra indicato. Estrai la tabella delle fasce contributive 2026 per i lavoratori domestici: `contributoOraTotal`, `quotaLavoratore` per ciascuna fascia (conviventi/oltre24h, fino €9,61/h, €9,61–€11,70/h, oltre €11,70/h).
2. Confronta i valori letti con quelli presenti in `data/aliquote-inps.json` → sezione `settoriContributivi.domestici.tabellaFasce2026`. Se diversi, aggiorna il JSON.
3. Traccia il calcolo nel codice (`lib/contributi.ts` → funzione `calcolaInpsDomestici`) per 25h/week:
   - `oreAnnue = 25 × 52 = 1300`
   - poiché `oreLavoro (25) > 24` → `fascia = fasce.oltre24hSettimanali`
   - `inpsDipendente = fascia.quotaLavoratore × oreAnnue`
4. Verifica dove questo valore arriva nel netto: `lib/engine.ts` usa `aliquotaDipendenteDefault = inpsDom.inpsDipendente / ralEffettiva` che viene poi moltiplicato per `ralEffettiva` in `calcolaNettoDipendente`. Verifica che il risultato finale sia `inpsDom.inpsDipendente` (cioè non ci sia perdita di precisione o cortocircuito logico).
5. Controlla anche `components/RisultatiCalcolatore.tsx`: verifica che il valore `nettoDipendente.inpsDipendente` venga mostrato correttamente nell'UI. Potrebbe esserci un bug di display in cui viene mostrato il 9,19% fisso invece del valore per-ora.
6. Se trovi il bug, correggilo nel file appropriato (engine o component). Spiega cosa hai trovato in un commento nel codice.

**Riadatta tutta la logica del lavoro domestico** per essere robusta e coerente:
- La RAL per domestici = `minimoTabellare_orario × oreLavoro × 52` (senza oreRatio basato su 40h)
- I contributi INPS per domestici sono fissi per ora, non percentuale della RAL
- Il netto per domestici deve usare i contributi fissi per ora, non il 9,19% generico
- Gli scatti di anzianità per domestici sono percentuali sul minimoTabellare orario (4% per biennio, max 7)
- Per i domestici NON si calcola l'INAIL (già presente come `isDomestici ? 0 : calcolaInail(...)`)
- Verifica che il sanity check range 128%-160% sia saltato per i domestici (già presente, verifica)

---

## PROBLEMA 4 — Retribuzioni di tutti i CCNL non coincidono con le tabelle

**File da modificare**: `data/ccnl/*.json` (tutti i 17 file CCNL)

**Procedura**:

### Step 4a — Mappa i PDF ai CCNL
Nella cartella `LAVORO/` ci sono ~50 PDF con codici Wolters Kluwer (es. `A021.pdf`, `B011.pdf`, ecc.) più 3 PDF con nome descrittivo già mappati. Leggi ogni PDF e identifica a quale CCNL corrisponde. Il PDF contiene sempre nella prima pagina il nome del contratto collettivo e il periodo di validità dei dati retributivi.

I 3 PDF già mappati con nome descrittivo:
- `collaboratori-familiari-non-conviventi-lavoro-dome.pdf` → `data/ccnl/domestici.json`
- `metalmeccanica-aziende-industriali.pdf` → `data/ccnl/metalmeccanici.json`
- `pubblici-esercizi-ristorazione-e-turismo-pubblici-.pdf` → `data/ccnl/pubblici_esercizi.json`
- `Circolare numero 9 del 03-02-2026 _ Det...Circolari, Messaggi e Normativa _ INPS.pdf` → dati INPS domestici

I CCNL nel progetto che hanno un JSON in `data/ccnl/`:
`agricoltura`, `chimica`, `commercio`, `cooperative_sociali`, `credito`, `domestici`, `edilizia`, `informatica`, `metalmeccanici`, `multiservizi`, `pubblici_esercizi`, `sanita_privata`, `scuole_private`, `studi_professionali`, `telecomunicazioni`, `tessile`, `trasporti`

Per ogni CCNL, trova il PDF corrispondente e aggiorna il `minimoTabellare` di ogni livello con i valori esatti dal documento. La metodologia Wolters Kluwer "Costo Rapido" include: paga base + contingenza + E.D.R. confederale (€10,33/mese) + voci aggiuntive CCNL come componenti della retribuzione diretta mensile.

### Step 4b — Aggiorna i JSON
Per ogni file `data/ccnl/NOME.json`:
1. Leggi il PDF corrispondente
2. Confronta i valori di `minimoTabellare` per ogni livello con quelli nel JSON
3. Se diversi, aggiorna con i valori esatti del PDF (importo mensile in €)
4. Aggiorna `fonte` con il nome del PDF e la data di validità
5. Aggiorna `updatedAt` con la data odierna (2026-04-21)
6. Non modificare altri campi (moltiplicatore, qualifica, codice, contributiContrattuali, scattiAnzianita) a meno che non siano chiaramente sbagliati in base al documento

### Step 4c — Verifica i tre CCNL prioritari
Francesca ha segnalato specificatamente questi come errati:
- **Commercio (Confcommercio)**: `data/ccnl/commercio.json` — attualmente ha note `TODO: verificare` su tutti i livelli. Trova il PDF Confcommercio tra quelli in LAVORO e aggiorna.
- **Pubblici Esercizi**: `data/ccnl/pubblici_esercizi.json` — già ha `fonte` dal PDF `pubblici-esercizi-ristorazione-e-turismo-pubblici-.pdf`. Rileggi il PDF e verifica che i valori siano esatti.
- **Metalmeccanica industria**: `data/ccnl/metalmeccanici.json` — già ha `fonte` dal PDF `metalmeccanica-aziende-industriali.pdf`. Rileggi e verifica.

---

## Regole di sicurezza per NON rompere nulla

1. **Non modificare mai la logica di calcolo** (`lib/engine.ts`, `lib/contributi.ts`) se non è strettamente necessario per il Problema 3. Se modifichi engine o contributi, esegui i test dopo: `npm test`.
2. **Non cambiare i nomi dei campi** nei tipi (`types/index.ts`) né nelle interfacce esistenti senza motivo.
3. **Non rimuovere funzionalità esistenti**: il toggle assistenza sanitaria, l'aliquota INPS personalizzabile, la retribuzione personalizzata (superminimo), gli scatti di anzianità, tutte le agevolazioni — devono continuare a funzionare.
4. **I valori `moltiplicatore`** nei livelli CCNL NON vanno modificati (sono già calibrati sul motore).
5. **Non inventare valori**: se un PDF non contiene il minimo tabellare per un livello specifico, lascia il valore esistente nel JSON e aggiungi una nota `"_nota": "non trovato nel documento — valore precedente mantenuto"`.
6. **Non modificare `data/aliquote-inps.json`** oltre ai valori delle fasce domestici (Problema 3).
7. Dopo ogni modifica ai JSON, esegui `npm run build` per verificare che TypeScript non abbia errori.
8. **Esegui `npm test` alla fine** e assicurati che tutti i test passino. Se qualche test fallisce a causa delle nuove retribuzioni tabellari (es. snapshot), aggiornalo con i nuovi valori corretti.

---

## Workflow consigliato

```
1. Leggi tutti i PDF in LAVORO/ e costruisci una mappa PDF → CCNL
2. Risolvi Problema 1 (domestici orario)
3. Risolvi Problema 2 (apprendistato — solo se esiste ancora nel form)
4. Risolvi Problema 3 (bug INPS netto domestici):
   a. Leggi PDF circolare INPS n.9/2026
   b. Verifica/aggiorna aliquote-inps.json
   c. Traccia il bug nell'engine/component e correggilo
5. Risolvi Problema 4 (tutti i CCNL):
   a. Per ogni CCNL: leggi PDF, confronta, aggiorna
6. npm run build
7. npm test
8. Se tutto passa: hai finito.
```
