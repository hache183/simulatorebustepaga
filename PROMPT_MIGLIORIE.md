# Prompt per GitHub Copilot Agent — Migliorie Simulatore Costo del Lavoro

Copia e incolla tutto il contenuto sotto la riga `---` nel chat di Copilot in modalità Agent.

---

## Contesto del progetto

Sto lavorando su un simulatore del costo del lavoro dipendente in Next.js 14 + TypeScript + Tailwind. Il progetto è nella cartella corrente. La struttura è:

- `types/index.ts` — interfacce TypeScript (CalcolatoreInput, CalcolatoreOutput, CcnlData, LivelloCcnl, ecc.)
- `data/ccnl/*.json` — 16 file JSON con dati contrattuali CCNL (livelli, contributi, mensilità, scatti)
- `data/aliquote-inps.json` — aliquote INPS base (28,80% azienda, 9,19% dipendente) e agevolazioni
- `data/inail.json` — voci tariffarie INAIL
- `data/tfr.json` — parametri TFR (divisore 13,5)
- `lib/engine.ts` — motore di calcolo principale (`calculateCosto()`)
- `lib/contributi.ts` — funzioni calcolo INPS, TFR, INAIL, agevolazioni, scatti
- `lib/ccnl.ts` — loader CCNL con cache
- `components/CalcolatoreForm.tsx` — Step 1 del form (CCNL, livello, RAL, tipo contratto, ore, mensilità)
- `components/CalcolatoreFormStep2.tsx` — Step 2 del form (dipendenti, regione, INAIL, anzianità, agevolazioni)
- `components/RisultatiCalcolatore.tsx` — visualizzazione risultati
- `app/api/ccnl/[id]/livelli/route.ts` — API livelli per CCNL
- `app/api/calcola/route.ts` — API calcolo
- `__tests__/engine.test.ts` — test Jest

## Modifiche richieste

Devi implementare **3 modifiche**. Per ciascuna, modifica TUTTI i file necessari (tipi, dati JSON, engine, componenti, API, test). Non saltare nessun file coinvolto.

### MODIFICA 1: Livelli contrattuali con qualifica e retribuzione tabellare

**Stato attuale**: Ogni livello CCNL nei file `data/ccnl/*.json` ha solo `codice`, `descrizione` (es. "1° livello") e `moltiplicatore`. Nel dropdown del form l'utente vede solo "Q — Quadro", "1 — 1° livello", ecc. Non c'è modo di sapere quale qualifica professionale corrisponde né quale retribuzione tabellare minima prevede il CCNL.

**Cosa fare**:

1. **Aggiornare ogni livello in ogni file `data/ccnl/*.json`** aggiungendo i campi:
   - `qualifica`: stringa con la qualifica professionale corrispondente secondo il CCNL (es. per Commercio: livello 1 = "Personale con funzioni ad elevata responsabilità", livello 4 = "Commessi alla vendita, cassieri", ecc.)
   - `minimoTabellare`: numero, il minimo di retribuzione tabellare mensile in euro previsto dal CCNL per quel livello (paga base + contingenza, senza scatti). Usa i valori aggiornati al 2025/2026. Se non riesci a trovare il valore esatto, usa un valore realistico basato sulle proporzioni del moltiplicatore già presente

   Esempio di come deve diventare un livello nel JSON:
   ```json
   {
     "codice": "4",
     "descrizione": "4° livello",
     "qualifica": "Commessi alla vendita, cassieri, contabili d'ordine",
     "minimoTabellare": 1618.75,
     "moltiplicatore": 0.72
   }
   ```

2. **Aggiornare l'interfaccia `LivelloCcnl` in `types/index.ts`** aggiungendo:
   ```typescript
   qualifica: string;
   minimoTabellare: number; // minimo tabellare mensile in euro
   ```

3. **Aggiornare l'API `app/api/ccnl/[id]/livelli/route.ts`** per restituire anche `qualifica` e `minimoTabellare` nella risposta.

4. **Aggiornare il dropdown del livello in `components/CalcolatoreForm.tsx`** per mostrare ad ogni livello: codice, qualifica e RAL tabellare annua lorda. Il formato nell'option del select deve essere:
   ```
   Liv. 4 — Commessi alla vendita, cassieri — Min. tab. €1.618,75/mese (RAL €21.043,75)
   ```
   La RAL tabellare si calcola come: `minimoTabellare × mensilità_CCNL` (dove mensilità è il campo `mensilita` del CCNL, es. 13 o 14).
   Sotto il dropdown, quando un livello è selezionato, mostra un riquadro informativo con:
   - Qualifica completa
   - Minimo tabellare mensile
   - RAL tabellare annua (minimo × mensilità)

5. **Aggiornare i test** se necessario per i nuovi campi.

**Dati delle qualifiche e minimi tabellari** — Usa queste indicazioni per i CCNL principali (valori approssimativi 2025/2026):

**Commercio (Confcommercio)** — 14 mensilità nei fatti per impiegati/quadri:
- Q (Quadro): Funzioni direttive con responsabilità di unità organizzativa — min. tab. ~€1.914
- 1: Personale con funzioni ad elevata responsabilità — min. tab. ~€1.802
- 2: Impiegati con mansioni di concetto — min. tab. ~€1.646
- 3: Impiegati d'ordine, commessi qualificati — min. tab. ~€1.509
- 4: Commessi alla vendita, cassieri, contabili d'ordine — min. tab. ~€1.375
- 5: Ausiliari, addetti al confezionamento — min. tab. ~€1.243
- 6: Personale di pulizia, fattorini — min. tab. ~€1.148

**Metalmeccanici (Federmeccanica)** — 13 mensilità + elemento perequativo:
- D1 (ex 7/Quadro): Quadri e alte professionalità — min. tab. ~€2.102
- D2 (ex 6): Impiegati direttivi, tecnici di alto livello — min. tab. ~€1.893
- C1 (ex 5): Impiegati di concetto con esperienza — min. tab. ~€1.713
- C2 (ex 4): Operai specializzati, impiegati d'ordine qualificati — min. tab. ~€1.544
- C3 (ex 3): Operai qualificati — min. tab. ~€1.373
- B1 (ex 2): Operai comuni, ausiliari — min. tab. ~€1.226
- B2 (ex 1): Apprendisti, personale senza qualifica — min. tab. ~€1.098

Per gli altri CCNL (edilizia, sanità privata, studi professionali, cooperative sociali, trasporti, pubblici esercizi, chimica, credito, multiservizi, telecomunicazioni, tessile, informatica, agricoltura, scuole private), ricava le qualifiche tipiche dalla denominazione del CCNL e i minimi tabellari usando proporzioni realistiche basate sui moltiplicatori già presenti nel JSON. Inserisci qualifiche sensate per il settore (es. per Edilizia: "Capo cantiere", "Muratore specializzato", ecc.; per Sanità privata: "Infermiere professionale", "Operatore socio-sanitario", ecc.).

---

### MODIFICA 2: Toggle assistenza sanitaria integrativa

**Stato attuale**: I contributi contrattuali CCNL (fondi come Fondo Est per Commercio, Metasalute per Metalmeccanici, ecc.) vengono SEMPRE inclusi nel calcolo. Il datore di lavoro non può scegliere se includerli o meno.

**Cosa fare**:

1. **Aggiungere nei file `data/ccnl/*.json`** un campo `tipo` a ciascun contributo contrattuale per distinguere quelli sanitari:
   ```json
   "contributiContrattuali": {
     "azienda": {
       "fondoEst": {
         "percentuale": 0.0056,
         "descrizione": "Fondo sanitario integrativo Est",
         "notaLegge": "Accordo nazionale Confcommercio",
         "tipo": "sanitario"
       },
       "ebiter": {
         "percentuale": 0.0015,
         "descrizione": "Ente bilaterale territoriale Ebiter",
         "notaLegge": "Art. 4 CCNL Commercio",
         "tipo": "bilaterale"
       }
     }
   }
   ```
   I possibili valori di `tipo` sono: `"sanitario"` (fondi assistenza sanitaria), `"previdenziale"` (fondi pensione complementare come Cometa), `"bilaterale"` (enti bilaterali come Ebiter). Classifica correttamente ogni contributo in ogni CCNL.

2. **Aggiornare l'interfaccia `ContributoContrattuale` in `types/index.ts`** aggiungendo:
   ```typescript
   tipo: 'sanitario' | 'previdenziale' | 'bilaterale';
   ```

3. **Aggiungere un campo booleano `includiAssistenzaSanitaria` a `CalcolatoreInput` in `types/index.ts`** con default `true`.

4. **Aggiungere un toggle/switch nel form** (Step 1 o Step 2, dove ha più senso — probabilmente Step 2 vicino ai contributi). Il toggle deve:
   - Essere etichettato "Includi assistenza sanitaria integrativa"
   - Avere un testo esplicativo sotto: "Se attivo, include nel costo i contributi al fondo sanitario previsto dal CCNL (es. Fondo Est, Metasalute, San.Arti). Disattivalo se l'azienda non aderisce al fondo sanitario."
   - Default: attivo (true)
   - Mostrare il nome del fondo sanitario specifico del CCNL selezionato, se presente

5. **Aggiornare l'engine (`lib/engine.ts`)**: quando `includiAssistenzaSanitaria` è `false`, escludere dal calcolo dei contributi contrattuali CCNL tutti i contributi con `tipo === 'sanitario'`. I contributi di tipo `bilaterale` e `previdenziale` restano sempre inclusi.

   Nella riga di dettaglio `contributi_ccnl`, se l'assistenza sanitaria è esclusa, aggiungere una nota che lo indica.

6. **Aggiornare la validazione Zod** in `lib/engine.ts` aggiungendo il campo `includiAssistenzaSanitaria: z.boolean()`.

7. **Aggiornare il componente CalcolatorePageClient.tsx** per passare il nuovo campo.

8. **Aggiornare i test** per coprire il caso con e senza assistenza sanitaria.

---

### MODIFICA 3: Aliquota INPS personalizzabile nel form

**Stato attuale**: L'aliquota INPS datoriale è hardcoded a 28,80% (letta da `data/aliquote-inps.json` campo `aliquotaBaseAzienda: 0.288`). Non c'è possibilità per l'utente di modificarla. Questo è un problema perché:
- L'aliquota varia per settore (es. Artigianato "Titolari non iscritti" ha 26,76% per impiegati e 28,98% per operai come mostrato nel documento allegato della cliente)
- Alcune aziende hanno aliquote diverse per inquadramento (operai vs impiegati)
- La Riforma 2024 ha introdotto variazioni

Riferimento dalla documentazione Wolters Kluwer allegata:
> "Contributi previdenziali relativi al settore di appartenenza, con riconoscimento dell'esonero dal versamento del contributo al Fondo di garanzia del TFR e dell'ulteriore riduzione dei contributi dovuti alla Gestione prestazioni temporanee nelle misure di cui all'art. 8 D.L. n. 203/2005"

**Cosa fare**:

1. **Aggiungere un campo `aliquotaInps` a `CalcolatoreInput` in `types/index.ts`**:
   ```typescript
   aliquotaInps: number; // aliquota INPS datoriale personalizzata (es. 0.2676 per 26,76%)
   ```

2. **Aggiungere nel form (Step 2, nella sezione dei contributi)** un campo numerico per l'aliquota INPS:
   - Label: "Aliquota INPS datoriale (%)"
   - Input numerico con step 0.01, range 0–50%
   - Precompilato con il valore di default da `aliquote-inps.json` (28,80%)
   - Mostrare sotto il campo un testo informativo: "Aliquota contributiva INPS a carico del datore di lavoro. Il valore precompilato (28,80%) è quello standard per la generalità delle aziende. Modifica se il settore ha un'aliquota diversa (es. Artigianato, Agricoltura, Credito). Verifica con il tuo consulente del lavoro."
   - L'input deve accettare valori come "26.76" e convertirli internamente in decimale (0.2676)

3. **Aggiornare `lib/contributi.ts`**: la funzione `calcolaInpsBase()` deve accettare un secondo parametro opzionale `aliquotaOverride?: number`. Se fornito, usa quello al posto del valore dal JSON:
   ```typescript
   export function calcolaInpsBase(ral: number, aliquotaOverride?: number): number {
     if (aliquotaOverride !== undefined) return ral * aliquotaOverride;
     const data = loadJson<AliquoteInpsData>('data/aliquote-inps.json');
     return ral * data.aliquotaBaseAzienda;
   }
   ```

4. **Aggiornare `lib/engine.ts`**: passare `input.aliquotaInps` alla funzione `calcolaInpsBase()`. Aggiornare la nota legge sulla voce INPS per mostrare l'aliquota effettivamente usata (es. "Aliquota 26,76% — personalizzata dall'utente" se diversa dal default o "Circ. INPS n. 99/2023 — aliquota base 28,80%" se è il default).

5. **Aggiornare la validazione Zod** in `lib/engine.ts` aggiungendo:
   ```
   aliquotaInps: z.number().min(0).max(0.5)
   ```

6. **Aggiornare lo Step 2 del form** e il `CalcolatorePageClient.tsx` per gestire il nuovo campo.

7. **Aggiornare l'API `/api/calcola`** se necessario.

8. **Aggiornare i test** per coprire il caso con aliquota personalizzata.

---

### MODIFICA 4: Retribuzione personalizzata (superminimo / accordo tra le parti)

**Stato attuale**: La RAL effettiva viene calcolata come `RAL × moltiplicatore_livello × (ore/40)`. L'utente inserisce una RAL e il livello applica il suo moltiplicatore. Non c'è modo di indicare una retribuzione diversa da quella tabellare, concordata tra datore e lavoratore (superminimo individuale o collettivo, ad personam, ecc.).

Nella pratica, la retribuzione effettiva è spesso superiore al minimo tabellare del CCNL: il datore di lavoro e il lavoratore possono concordare un importo aggiuntivo (superminimo) oppure una RAL completamente libera, purché non inferiore al minimo contrattuale.

**Cosa fare**:

1. **Aggiungere a `CalcolatoreInput` in `types/index.ts`** un campo opzionale:
   ```typescript
   retribuzionePersonalizzata?: number; // RAL personalizzata concordata tra le parti (euro/anno)
   ```

2. **Aggiornare il form (Step 1, sotto il dropdown del livello)** con la seguente logica:
   - Dopo che l'utente seleziona un livello, mostrare il riquadro informativo con il minimo tabellare (dalla MODIFICA 1).
   - Aggiungere sotto un **toggle** etichettato: "Retribuzione diversa dal minimo tabellare"
   - Se il toggle è **disattivo** (default): il campo RAL attuale viene **precompilato automaticamente** con la RAL tabellare del livello selezionato (`minimoTabellare × mensilità`), e rimane comunque modificabile.
   - Se il toggle è **attivo**: il campo RAL diventa libero e mostra un sottotesto: "Inserisci la RAL annua lorda concordata tra le parti (superminimo individuale, ad personam o collettivo). Deve essere ≥ al minimo tabellare del livello selezionato."
   - **Validazione**: se il toggle è attivo e la RAL inserita è inferiore al minimo tabellare × mensilità del livello selezionato, mostrare un **warning** (non un errore bloccante): "⚠ La RAL inserita (€XX.XXX) è inferiore al minimo tabellare CCNL per questo livello (€YY.YYY). Verifica con il consulente del lavoro." — NON bloccare il submit perché ci sono casi legittimi (part-time, apprendistato con riduzione).
   - Quando il toggle è attivo, mostrare anche la differenza rispetto al minimo: "Superminimo: €ZZZ/mese (€WWW/anno)" calcolato come `(RAL_inserita - RAL_tabellare) / 12` per il mensile.

3. **Aggiornare `lib/engine.ts`**:
   - Se `retribuzionePersonalizzata` è presente e > 0, usare quel valore al posto di `input.ral` per il calcolo della RAL effettiva: `ralEffettiva = retribuzionePersonalizzata × (ore/40)` (senza applicare il moltiplicatore del livello, perché la retribuzione è già quella concordata).
   - Se `retribuzionePersonalizzata` è assente o 0, comportamento invariato (usa `input.ral × moltiplicatore × oreRatio`).
   - Nella voce di dettaglio della RAL, se è personalizzata, aggiungere la nota: "Retribuzione concordata tra le parti — art. 2099 c.c."
   - Aggiungere una voce di dettaglio separata "Superminimo" che mostra la differenza tra la retribuzione personalizzata e il minimo tabellare, con nota legge "Art. 2099 c.c. — superminimo individuale o collettivo". Questa voce è solo informativa (importo 0 nel totale) per trasparenza.

4. **Aggiornare la validazione Zod** in `lib/engine.ts`:
   ```
   retribuzionePersonalizzata: z.number().min(0).max(500_000).optional()
   ```

5. **Aggiornare lo schema Zod del form** in `CalcolatoreForm.tsx` per il nuovo campo.

6. **Aggiornare `CalcolatorePageClient.tsx`** per passare il campo.

7. **Aggiornare i test** per coprire:
   - Calcolo con retribuzione personalizzata (superminimo)
   - Calcolo senza retribuzione personalizzata (comportamento invariato)
   - Warning se RAL < minimo tabellare

---

## Istruzioni generali

- **Non creare file nuovi** se non strettamente necessario. Modifica i file esistenti.
- **Mantieni lo stile visivo** del progetto (dark theme, CSS inline, font DM Mono per numeri, Plus Jakarta Sans per testo, Syne per heading).
- **Formatta i numeri** con il formato italiano (es. €1.618,75 con punto per migliaia e virgola per decimali) usando `Intl.NumberFormat('it-IT', ...)`.
- **Tutti i 16 CCNL devono essere aggiornati** con qualifiche e minimi tabellari.
- **Non rompere i test esistenti**: dopo le modifiche, i test correnti devono continuare a passare (aggiornali se i campi cambiano).
- **Aggiungi nuovi test** per le funzionalità aggiunte.
- **Mantieni la sicurezza**: rate-limiting, validazione Zod, sanity check del range 128%-150%.
- Ai fini della compilazione dei minimi tabellari, fai riferimento alla metodologia "Costo Rapido" di Wolters Kluwer allegata che prevede: minimo di retribuzione + contingenza + e.d.r. confederale + voci aggiuntive CCNL (incluse quelle per mancata adesione bilateralità) come componenti della retribuzione diretta.
