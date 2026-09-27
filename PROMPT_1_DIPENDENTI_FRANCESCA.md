# Prompt Cursor 1/3 — Dipendenti (note Francesca 14/09/2026)

Cartella repo: quella dello zip `simulatorebustepaga` (file già presenti: `lib/engine.ts`, `components/CalcolatoreForm.tsx`, `components/RisultatiCalcolatore.tsx`, `data/ccnl/*`).

Niente `git reset --hard`. Niente deploy finché i tre prompt non sono tutti verdi. Questo prompt **non tocca** domestici né soci.

Copia da `## RUOLO`.

---

## RUOLO

Applicare alla lettera le correzioni della consulente del lavoro sul flusso **Dipendenti** (stampa CostWork 14/09/2026, CCNL Terziario/Commercio di prova). Non «migliorare» oltre il foglio.

---

## DIVIETI

Non modificare:

```
lib/societari.ts
lib/soci-amministratori.ts
components/SociAmministratoriPanel.tsx
components/SociAmministratoriTab.tsx
app/compensi-societari/**
app/api/societari/**
data/gestione-separata.json
data/ccnl/domestici.json
data/ccnl/domestici_conviventi.json
data/ccnl/lavoro_domestico.json
```

Non reintrodurre apprendistato/somministrazione in questo form. Non implementare i cerchi 26,33 / 38,67 ecc.: sono appunti suoi, non specifiche.

---

## COSA FARE

### 1. Tipo contratto
In UI Dipendenti restano **solo**:
- Tempo indeterminato
- Tempo determinato

Togliere apprendistato, somministrazione, altro. TD può ancora applicare NASpI +1,40% se già prevista in engine; non inventare altri tipi.

### 2. Aliquota INPS datoriale 28,80 — solo la nota
Il 28,80% può restare valore precompilato (media). Sostituisci il testo della nota con questo, parola per parola:

> Aliquote contributive INPS a carico del D/L. Il valore precompilato è quello medio per la generalità delle imprese. Il valore preciso è distinto dal settore specifico (es. Artigiani, Commercianti, Industrie). Verifica con il tuo consulente.

Togli «personalizzata dall’utente» e «netti da agevolazioni» dall’etichetta INPS datoriale.

### 3. Togliere le agevolazioni dal calcolo
- Nessuna sottrazione «Risparmio agevolazioni» dal costo.
- Togli toggle/form agevolazioni dal flusso Dipendenti (lascia i file API se servono altrove, ma il report dipendenti non li usa).
- Il costo mostrato è **lordo contributivo pieno**.

Sotto il box costo totale, nota fissa:

> Il costo indicato rappresenta il costo massimo teorico, in assenza di agevolazioni contributive. In funzione della data di assunzione e dei requisiti soggettivi e oggettivi dell’azienda e delle risorse, dovrà essere verificata l’eventuale applicabilità. A titolo esemplificativo tali agevolazioni possono comportare una riduzione del 50% o in alcuni casi fino al 100% dei contributi INPS a carico D/L.

### 4. Colonne tabellari — niente «terzo elemento»
Dalle tabelle CCNL **non inserire la colonna terzo elemento** nella RAL / minimo usato dal motore.

RAL di default = minimo tabellare × mensilità (più solo le voci che il JSON già chiama minimo/superminimo collettivo previsti come base).  
Non sommare un campo `terzoElemento` / `elementoDistinto` / terza colonna stile WK.

Se un JSON ha `retribuzioneMensileTabella` che include il terzo elemento, per il default RAL usa `minimoTabellare` (o minimo + indennità contrattuali esplicitamente nominate, mai «terzo elemento»).

### 5. 13ª e 14ª in report
Sono informative, già dentro la RAL. L’importo da mostrare per ciascuna mensilità extra è:

`RAL / numeroMensilita`

Esempio foglietto: RAL 24.944 €, 14 mensilità → **1.781,71** (non 2.079 = RAL/12).  
Stesso divisore per 13ª e 14ª. Non usare 173 ore per questa riga.

### 6. Assistenza sanitaria / contributi CCNL
Rinomina la voce «Contributi contrattuali CCNL (Fondo Est, Ebiter, ecc.)» in **Assistenza sanitaria integrativa** (più eventuale ente bilaterale se il JSON ha due righe: due righe, non un calderone).

Commercio / terziario Confcommercio: Fondo Est **13,00 €/mese** × mensilità di maturazione previste dal CCNL (se il CCNL dice 12 mesi → 156 €/anno; non inventare 13 se il JSON dice 12).  
L’importo **cambia da CCNL a CCNL**: leggi da JSON (`assistenzaSanitaria.importoMensile` o equivalente). Se manca, 0 + nota «dato CCNL assente».

### 7. Elementi aggiuntivi = FR / permessi / festività non godute
Togli «elemento retributivo indiretto» generico da 217 € se non è questa voce.

Costo annuo non goduto:

```
oreNonGodute = oreFerieAnnuе + orePermessiAnnuе + oreFestivitaAnnuе
pagaOraria = (RAL / numeroMensilita) / 173
costo = oreNonGodute × pagaOraria
```

Default **commercio / terziario** (foglio Francesca, confermato):

- ferie 173 h
- permessi 56 h
- festività 32 h
- totale 261 h
- check: `261 × (1781,71 / 173) = 2.768` (tolleranza 1 €)

Metti questi tre numeri nel JSON del CCNL commercio. Altri CCNL: campi in JSON, default 0 se sconosciuti (non copiare 173/56/32 ovunque).

UI: checkbox o quota «non godute» default **100%** (costo massimo, coerente col punto 3). Se l’utente mette 0% godute, costo 0.

### 8. Prospetto netto
- INPS dipendente: mostrare **9,19%** (non 9,2%). Allinea l’aliquota usata nel conto, non solo l’etichetta.
- **Togliere Bonus cuneo fiscale** dal netto. Il lavoratore «così come sta»: IRPEF lorda − detrazioni lavoro dipendente − addizionali. Niente +1000 cuneo.
- Non toccare la logica detrazioni art. 13 oltre a togliere il cuneo.

### 9. Banner fonte CCNL
Il box «Validità non dichiarata / PDF Agenzie Ippiche» può restare se la fonte è sbagliata: non lo cancellare per far contenta la stampa. Non è in questa lista di correzioni numeriche.

---

## VERIFICA

Caso stampa 14/09, RAL 24.944, 14 mensilità, commercio:

| Voce | Atteso |
|---|---|
| Quota 13ª/14ª informativa | 1.781,71 |
| INPS datore | pieno, senza −3.592 agevolazioni |
| FR non godute | ~2.768 |
| Fondo Est | 13 € × mesi previsti dal JSON |
| Bonus cuneo | assente |
| INPS dip. | 9,19% |
| Tipo contratto in form | solo TI / TD |

```bash
npx tsc --noEmit
npx jest lib/__tests__/golden-francesca.test.ts --no-coverage
```

Se un golden domestico/soci diventa rosso, non patcharlo qui: questo prompt non doveva toccarli.

Report: file toccati, `git diff --stat`, i numeri della tabella sopra.
