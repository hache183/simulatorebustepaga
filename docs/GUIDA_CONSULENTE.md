# Guida operativa per la consulente del lavoro

**Prodotto:** CostWork Pro — simulatore di costo del lavoro e di netto stimato  
**Data di redazione:** 11 settembre 2026  
**Base:** comportamento attuale del software e dei file dati del repository, non un elenco di «come dovrebbe essere».

> **Avvertenza**  
> Simulatore di **costo** e di **netto stimato**. Non è un software paghe, non produce Uniemens, CU, LUL, F24, denuncia trimestrale domestici né flusso Cassa Edile.  
> I versamenti reali dipendono da matricola INPS, voce INAIL aziendale (con oscillazione), denuncia trimestrale domestici, iscrizione al fondo pensione, comune di residenza, carichi di famiglia e da quanto risulta in busta dopo conguaglio.  
> Ogni cifra citata in questa guida compare in un JSON, nel motore di calcolo o in un test golden. Dove si arrotonda, si dice.

---

## I cinque casi già quadrati con Francesca

Numeri ripresi dai test golden (`lib/__tests__/golden-francesca.test.ts`) e dallo stesso motore. Tolleranza dei test: 0,02 €.

| Caso | Input sintetico | Cosa è stato quadrato | Importo |
|---|---|---|---:|
| **D-CONV-A** | Domestico convivente liv. A, 54 h, 13 mensilità, 0 scatti, **senza CassaColf** | RAL | 11.805,30 |
| | | INPS datore (0,93 €/h × 54 × 52) | 2.611,44 |
| | | TFR (RAL / 13,5) | 874,47 |
| | | 13ª (informativa, **non sommata**) | 908,10 |
| | | **Costo azienda** | **15.291,21** |
| | | INPS lavoratore (0,31 €/h × 54 × 52) | 870,48 |
| | | Netto da busta **senza IRPEF** | 10.934,82 |
| **D1** | Domestico non convivente liv. A, 25 h, paga 6,51 €/h, TI, **senza CassaColf** | RAL (6,51 × 1.300) | 8.463,00 |
| | | INPS datore (0,93 × 1.300) | 1.209,00 |
| | | INPS lavoratore (0,31 × 1.300) | 403,00 |
| | | INAIL voce separata | 0,00 |
| | | Netto da busta **senza IRPEF** | 8.060,00 |
| **C1** | Commercio 4°, 40 h, 14 mensilità, 0 scatti, 10 dipendenti, INAIL 0111 | RAL = TOTALE 1.783,75 × 14 | 24.972,50 |
| | | INPS datore (29,28%) | 7.311,95 |
| | | TFR | 1.849,81 |
| | | 13ª informativa (= una mensilità) | 1.783,75 |
| **P1** | FIPE Quadro A | TOTALE tabella (non il solo minimo 1.854,49) | 2.472,19 |
| | | RAL = 2.472,19 × 14 | 34.610,66 |
| **M1** | Metalmeccanici C3, 4 anni di anzianità (2 scatti biennali) | Scatti = 2 × 29,64 € × 12 | 711,36 |

Il dettaglio voce per voce di questi cinque casi è al **§ 9**.

---

## 0. Cosa fa e cosa non fa

| Calcola | Non sostituisce |
|---|---|
| Costo aziendale di **prima assunzione / anno 1** su CCNL già caricati | Software paghe, Uniemens, F24, CU, LUL |
| RAL di tabella (colonna **TOTALE** Wolters Kluwer, dove il JSON la distingue) | Il CCNL «vero» se la tabella nel file è proxy, scaduta o non verificata |
| INPS datore per **settore × dimensione**, o fasce orarie domestici Circ. n. 9/2026 | La distinta INPS della matricola (CSC, codice autorizzazione, sgravi già in uso) |
| TFR di accantonamento annuo (RAL / 13,5) | TFR da corrispondere all’uscita, rivalutazione ISTAT dell’anno, scelta fondo |
| Premio INAIL = RAL × tasso medio ‰ / 1.000 sulla voce scelta | Oscillazione aziendale (± fino al 40% indicato in nota) |
| Netto **ordinario**: IRPEF 23/33/43 + detrazione + bonus cuneo + addizionali — **STIMA** | 730 / 770, carichi di famiglia, acconti, addizionale comunale vera |
| Netto **domestici**: RAL − INPS lavoratore, **senza IRPEF in busta** | La dichiarazione del lavoratore domestico |
| Compenso **amministratore**: Gestione separata 35,03% o 24% + IRPEF | IRAP puntuale, rivalsa, socio-lavoratore, IVS artigiani/commercianti (modulo non attivo) |

### Percorso in maschera (ramo dipendente / domestici)

1. Accesso con credenziali.  
2. Si sceglie il **CCNL** (elenco di tutti i file in `data/ccnl/`, tranne due duplicati interni: `lavoro_domestico` e `domestici_conviventi`).  
3. Si sceglie il **livello**: sotto compare la scomposizione paga base / contingenza / EDR / altre / totale e la RAL tabellare.  
4. Se CCNL domestici: si indica se è **convivente** (carica la tabella mensile conviventi). Eventuali deroghe PT, voce notturna, copertura riposi.  
5. Si indica **tipo contratto** (TI, TD, somministrazione, apprendistato — per i domestici solo TI/TD), **ore**, **mensilità**.  
6. Step azienda: numero dipendenti, regione, **voce INAIL**, anzianità per gli scatti, aliquota INPS precompilata dal settore (modificabile), toggle sanità / previdenza complementare / CassaColf, spunta agevolazioni.  
7. Si ottiene il report: costo annuo, equivalente mensile medio, % sulla RAL, prospetto netto, voci di dettaglio.  
8. In parallelo, dal menu: pagina **Compensi societari** (amministratore). Non entra nel calcolo CCNL.

Se la `fonte` del CCNL contiene «PROXY» o «NON VERIFICATO», oppure `validitaAl` è già passata, compare un **banner giallo** in form e in esito.

Dallo step azienda in poi compare inoltre un **avviso a tutta larghezza** sullo stato della tabella, che copre anche il caso in cui `validitaAl` **manchi**: senza una data dichiarata la vigenza va confermata sulla fonte ufficiale, la tabella non è presunta aggiornata. L'avviso è rosso per tabella scaduta o fonte proxy, ambra per validità non dichiarata, e resta leggibile anche **nel PDF stampato**. Su 28 CCNL in elenco, l'unico che oggi non produce alcun avviso è il Terziario Confcommercio.

### Tre rami distinti

| Ramo | Dove si entra | Motore |
|---|---|---|
| **Dipendente CCNL** | Calcolatore, CCNL diverso da domestici | Percentuali su RAL (INPS settore, INAIL, TFR, fondi) |
| **Domestici** | Stesso calcolatore, CCNL «Lavoratori Domestici»; convivente = flag | Contributi **a ora** Circ. INPS n. 9/2026; INAIL non duplicato; netto senza IRPEF |
| **Compensi societari** | Pagina separata `/compensi-societari` | Gestione separata + IRPEF sull’amministratore. Non è un CCNL |

---

## 1. Mappa dei dati (da dove nasce ogni numero)

| Voce in maschera / in output | File di origine | Campo | Aggiornato al | Norma / contratto citato nel file | Note |
|---|---|---|---|---|---|
| Minimo / paga base | `data/ccnl/<id>.json` | `livelli[].minimoTabellare` | `updatedAt` del CCNL | `fonte` del JSON | Per i conviventi il campo è il **TOTALE** mensile (Francesca). |
| Contingenza, EDR, altre indennità fisse | stesso | `contingenza`, `edr`, `altreIndennitaFisse` | idem | idem | Se il PDF ha minimo = totale, sono a 0. |
| **Retribuzione mensile di tabella (colonna TOTALE)** | stesso | `retribuzioneMensileTabella` | idem | Convenzione WK: minimo + contingenza + EDR + indennità fisse | È questa che precompila la RAL, non il solo minimo. |
| Mensilità di default | stesso | `mensilita` | idem | Precompilato; 13–16 ammessi in maschera (minimo di legge 13, R.D.L. 1525/1937 citato in maschera) | 15ª/16ª solo se si forza il numero. |
| Orario pieno | stesso | `orarioSettimanalePieno` | idem | Default 40; conviventi 54 | Il part-time è `ore / orario pieno`. |
| Scatto di livello | stesso | `livelli[].scattoEuro` | idem | CCNL | Se manca, si usa `scattiAnzianita.importoPerScattoEuro`. |
| Periodicità / max scatti | stesso | `scattiAnzianita` | idem | CCNL | Domestici: 4% sul minimo, biennale, max 7. |
| Fondo Est, MetaSalute, FAST, Ebiter, COMETA, Previcommercio, CassaColf, … | stesso | `contributiContrattuali.azienda.*` | idem | `notaLegge` di ciascuna voce | Sanità default **accesa**; previdenza complementare default **spenta**; CassaColf default **spenta**. |
| Elementi extra (ex festività, ecc.) | stesso, se presente | `elementiAggiuntivi` | idem | CCNL | Entra nel totale **solo** se `condizione` è vuota. Le voci «mancata adesione ente / sanità» **non** entrano. |
| Aliquota INPS datore / dipendente per settore | `data/aliquote-inps.json` | `settoriContributivi.*` + `mappaCcnlSettore` | 2026-01-01 | Circ. INPS n. 19/2025 — L. 207/2024 | Ricostruzione per voci (IVS, NASpI, CUAF, malattia, maternità, FIS/CIGS). |
| Fasce domestici €/ora | stesso | `settoriContributivi.domestici.tabellaFasce2026` | 2026-01-01 | **Circ. INPS n. 9/2026** | Ramo usato dal motore. Le tabelle 2025 sotto `lavoro_domestico` **non** sono usate. |
| Agevolazioni | stesso | `agevolazioni[]` | 2026-01-01 | `fonteLegge` di ciascuna | Spunta = autodichiarazione. |
| TFR divisore 13,5 | `data/tfr.json` | `divisoreAnnuo` | 2026-01-01 | Art. 2120 c.c. — D.Lgs. 252/2005 | Rivalutazione in JSON ma **non nel costo anno 1** (e il toggle non è in maschera). |
| Tariffe INAIL | `data/inail.json` | `voci[].tassoPerMille` | 2026-04-12 | DD.MM. 27/02/2019; estratti WK One Lavoro 7 aprile 2026 | Oscillazione in anagrafica, **non applicata**. |
| Addizionale regionale / comunale | `data/addizionali-irpef.json` | `regioni[]`, `aliquotaComunaleDefault` 0,80% | 2026-09-11 | Il file si dichiara **stima**; scaglioni regionali differenziati **NON VERIFICATI** | Francesca chiederà il comune: il software usa una media 0,80%. |
| Gestione separata 35,03% / 24% | `data/gestione-separata.json` | `amministratoreSenzaAltraCopertura` / `…ConAltraCoperturaOPensionato` | 2026-09-11 | Circ. INPS n. 8 del 03/02/2026 | Solo modulo societari. |
| Scaglioni IRPEF 23 / 33 / 43 | motore (`lib/engine.ts`) | — | — | **Fonte della norma non dichiarata in un JSON** | Fino a 28.000 / 50.000 / oltre. |
| Bonus cuneo | motore | — | — | Stima L. 207/2024 art. 1 cc. 4-9 (testo del disclaimer) | **STIMA**. |
| Mappa PDF → JSON | `data/ccnl/_fonti.md` | — | 11/09/2026 | Elenco schede WK usate | Non tutti i ~50 PDF in `LAVORO/` hanno un JSON dedicato. |

### CCNL disponibili in maschera

28 contratti (30 file JSON meno i duplicati `lavoro_domestico` e `domestici_conviventi`). I conviventi si aprono dal flag sul CCNL domestici.

Stato **Banner UI** = giallo in maschera (fonte con PROXY/NON VERIFICATO, oppure `validitaAl` già scaduta al 11/09/2026).  
Stato **mappa** = colonna di `_fonti.md`.

| Nome in elenco (file) | Decorrenza dichiarata nel JSON | Mens. | Liv. | Banner UI | Mappa `_fonti.md` |
|---|---|---:|---:|---|---|
| Agricoltura (`agricoltura.json`) | impiegati 01/07/2024 · OTD 01/01/2025 | 13 | 5 | no | OK |
| Alimentari industria (`alimentari.json`) | 01/01/2026–31/12/2026 | 14 | 8 | no | OK |
| Assicurazioni (`assicurazioni.json`) | tabelle 01/12/2024 | 14 | 7 | no | PROXY in mappa; la `fonte` JSON **non** contiene la parola PROXY |
| Autorimesse (`autorimesse.json`) | tabelle gennaio 2026 | 14 | 11 | no | MANCANTE in mappa |
| Chimica (`chimica.json`) | — | 13 | 7 | **sì (NON VERIFICATO)** | MANCANTE |
| Terziario Confcommercio (`commercio.json`) | 01/11/2025 (4ª tranche rinnovo 22/03/2024); `validitaAl` 31/10/2026 | 14 | 10 | no (non ancora scaduta) | OK — fonte **FILCAMS/kitech**, non la scheda One Lavoro Confcommercio (H011 in `LAVORO/` è Agenzie ippiche) |
| Commercio Confesercenti (`commercio_confesercenti.json`) | 01/11/2025 | 14 | 8 | no | OK |
| Condomini (`condomini.json`) | 01/01/2026 | 13 | 6 | no | PROXY in mappa; `fonte` JSON senza PROXY |
| Cooperative sociali (`cooperative_sociali.json`) | 01/01/2026 | 14 | 7 | no | OK |
| Credito ACRI (`credito.json`) | 01/03/2026 | 14 | 8 | no | OK |
| Domestici non conviventi (`domestici.json`) | 01/01/2026 | 13 | 8 | no | OK |
| Edilizia (`edilizia.json`) | 01/01/2026–31/12/2026 | 13 | 5 | **sì (PROXY)** | PROXY (artigianato F015, non ANCE) |
| Gomma-plastica (`gomma_plastica.json`) | 01/01/2026–31/03/2027 | 13 | 10 | no | OK |
| Grafica/editoria (`grafica_editoria.json`) | vigenza fino al 31/12/2026 | 14 | 12 | no | PROXY in mappa; `fonte` JSON senza PROXY |
| Informatica (`informatica.json`) | — | 13 | 13 | **sì (NON VERIFICATO)** | MANCANTE |
| Legno-arredamento (`legno_arredamento.json`) | 01/01/2025 | 13 | 12 | no | MANCANTE in mappa |
| Metalmeccanici industria (`metalmeccanici.json`) | 01/06/2025–**31/05/2026** | 13 | 9 | **sì, tabella scaduta** | OK (scaduta) |
| Metalmeccanici artigianato (`metalmeccanici_artigianato.json`) | 01/03/2026 | 13 | 8 | no | OK |
| Multiservizi (`multiservizi.json`) | testo fonte: fino al 30/04/2026; **`validitaAl` assente** | 13 | 6 | no | PROXY in mappa |
| Pubblici esercizi FIPE (`pubblici_esercizi.json`) | 01/06/2025–**31/05/2026** | 14 | 10 | **sì, tabella scaduta** | OK (scaduta) |
| Sanità privata (`sanita_privata.json`) | 01/10/2025–30/11/2026 | 14 | 6 | **sì (PROXY)** | PROXY (H442 ambulatori, non AIOP) |
| Scuole private laiche (`scuole_private.json`) | 01/01/2026–31/12/2026 | 14 | 5 | no | OK — JSON FISM materne (T271) **assente** |
| Studi professionali (`studi_professionali.json`) | — | 14 | 8 | **sì (NON VERIFICATO)** | MANCANTE |
| Telecomunicazioni (`telecomunicazioni.json`) | fino al **30/06/2026** | 13 | 6 | **sì, tabella scaduta** | OK |
| Tessile-abbigliamento (`tessile.json`) | 01/01/2026–31/12/2026 | 13 | 7 | no | OK |
| Trasporti (`trasporti.json`) | proxy I100 dal 01/01/2026 | 14 | 6 | **sì (PROXY)** | PROXY |
| Turismo alberghi (`turismo.json`) | fino al **30/04/2026** | 14 | 10 | **sì, tabella scaduta** | OK (scaduta) — non è FIPE |
| Vigilanza privata (`vigilanza_privata.json`) | vigenza fino al 31/12/2026 | 14 | 7 | no | MANCANTE in mappa |

Non in maschera: `lavoro_domestico.json` (duplicato obsoleto) e `domestici_conviventi.json` (si carica con il flag convivente).

---

## 2. Come si costruisce la RAL

Tredicesima e quattordicesima **sono già dentro la RAL**. In output compaiono come scomposizione informativa e **non si sommano** al costo.

### 2.1 Dipendente standard

La maschera precompila:

`RAL = retribuzioneMensileTabella × mensilità`

Il motore, se le ore non sono l’orario pieno del CCNL, scala:

`RAL effettiva = RAL inserita × (ore settimanali / orario pieno)`

`retribuzioneMensileTabella` è la colonna **TOTALE** delle schede Costo Rapido Wolters Kluwer (paga base + contingenza + EDR + indennità fisse di tabella). Non è il solo «minimo».

**Esempio FIPE QA** (`data/ccnl/pubblici_esercizi.json`): minimo 1.854,49 + contingenza 542,70 + indennità di funzione 75,00 = **TOTALE 2.472,19**. RAL a 14 mensilità = **34.610,66**. Usare 1.854,49 × 14 darebbe 25.962,86: è il bug che Francesca vedeva prima.

**Esempio Commercio 4°** (`data/ccnl/commercio.json`): paga base 1.257,46 + contingenza 524,22 + 3° elemento 2,07 = **TOTALE 1.783,75**. RAL a 14 mensilità = **24.972,50**.

### 2.2 Domestici non conviventi

`RAL = paga oraria × ore settimanali × 52`

La paga di default è il minimo orario di tabella (liv. A = **6,51 €**, `data/ccnl/domestici.json`). Si può variare il campo «paga oraria lorda». Il motore **non** fa «minimo orario × 13 mensilità»: usa solo paga × ore × 52. Il JSON ha comunque `mensilita: 13`: serve al TFR (RAL / 13,5) e alla riga informativa 13ª (= RAL / 13).

Caso D1: 6,51 × 25 × 52 = **8.463,00**.

### 2.3 Domestici conviventi

`RAL = totale mensile di tabella × 13`

Full-time convivente = **54 ore/settimana** (parametro INPS, anche se la paga è mensile). In maschera le ore sono **bloccate a 54**, salvo due deroghe:

| Deroga | Livelli | Condizione in maschera | Effetto |
|---|---|---|---|
| PT 30 h | solo **C, BS, B** | «iscritto a corso di scuola» + voce PT 30 h | Mensile da `vociParticolari.tempoParziale30h` (C 814,60 · BS 737,39 · B 702,25); ore INPS = 30 |
| PT | solo **CS, DS** | «altro lavoratore già in forza» | Si possono impostare ore ≠ 54; il mensile resta quello di livello |
| Assistenza notturna | DS / CS / BS | select voce | Mensile 1.695,99 / 1.372,91 / 1.211,38 |
| Presenza notturna | tutti i livelli del JSON | select voce | Mensile 811,09 |
| Copertura riposi | DS / CS | toggle + ore | **In aggiunta** al mensile: 10,75 o 8,91 €/h × ore × 52. Non sostituisce il livello |

Senza i due flag, un convivente A **non può** essere part-time: il motore riporta le ore a 54.

Caso D-CONV-A: 908,10 × 13 = **11.805,30**.

### 2.4 Retribuzione personalizzata / superminimo (art. 2099 c.c.)

Toggle «retribuzione diversa dal minimo tabellare» (non domestici). La RAL digitata **sostituisce** quella di tabella e, in part-time, viene ancora moltiplicata per `ore / orario pieno`.

Se la personalizzata supera il totale di tabella × mensilità, compare una riga **Superminimo** puramente informativa (importo in totale = 0: non si conta due volte). INPS, TFR e INAIL girano sulla RAL personalizzata, non sul solo minimo.

---

## 3. Contributi INPS datore

### 3.1 Come si sceglie l’aliquota

1. Si guarda `mappaCcnlSettore` in `data/aliquote-inps.json`.  
2. Commercio / industria si spezzano a **15 dipendenti**.  
3. Se in maschera l’aliquota è ancora 28,80% (valore sentinella), il motore **ignora** il 28,80% e usa il settore. Se l’utente la cambia (es. 26,76%), usa quella.  
4. Fallback se un CCNL non fosse mappato: 28,80% (`aliquotaBaseAzienda`). Oggi la mappa copre tutti i 30 id.

| CCNL (id) | Settore usato | Aliquota datore |
|---|---|---|
| commercio, pubblici_esercizi, studi_professionali, multiservizi, telecomunicazioni, informatica, scuole_private, sanita_privata, commercio_confesercenti, turismo, autorimesse, condomini, vigilanza_privata | commercio ≤15 / >15 | **29,28%** / **29,68%** |
| metalmeccanici, chimica, trasporti, tessile, alimentari, gomma_plastica, grafica_editoria, legno_arredamento | industria ≤15 / >15 | **30,37%** / **30,77%** |
| metalmeccanici_artigianato | artigianato | **29,38%** |
| edilizia | edilizia_industria | **34,47%** |
| credito, assicurazioni | credito_assicurazioni | **29,98%** |
| cooperative_sociali | cooperative_sociali | **29,28%** |
| agricoltura | agricoltura | **39,50%** (stima media salariati fissi; nota nel JSON: gli OTD sono un altro regime) |
| domestici / conviventi | calcolo a ora, non % | § 3.4 |

### 3.2 Scomposizione nel JSON (ricostruzione, non distinte ufficiali)

Le somme coincidono con l’aliquota datore. Il file avvisa di verificare il FIS 2026.

| Voce | Commercio ≤15 | Commercio >15 | Industria ≤15 | Industria >15 | Artigianato | Edilizia ind. | Credito |
|---|---:|---:|---:|---:|---:|---:|---:|
| IVS | 23,81% | 23,81% | 23,81% | 23,81% | 23,81% | 23,81% | 23,81% |
| NASpI | 1,61% | 1,61% | 1,61% | 1,61% | 1,61% | 1,61% | 1,61% |
| CUAF | 0,68% | 0,68% | 0,68% | 0,68% | 0,68% | 0,68% | 0,68% |
| Malattia | 2,44% | 2,44% | 3,53% | 3,53% | 2,44% | 3,53% | 2,44% |
| Maternità | 0,24% | 0,24% | 0,24% | 0,24% | 0,24% | 0,24% | 0,24% |
| FIS | 0,50% | 0 | 0,50% | 0 | — | — | — |
| CIGS | — | 0,90% | — | 0,90% | — | 0,90% | — |
| Altro | — | — | — | — | FSBA 0,60% | Cassa edile 3,70% | Fondo solidarietà quota datore ≈ 1,20% |
| **Totale datore** | **29,28%** | **29,68%** | **30,37%** | **30,77%** | **29,38%** | **34,47%** | **29,98%** |

Dipendente, su tutti questi settori: **9,19%**.

### 3.3 Tempo determinato, somministrazione, apprendistato

- **TD e somministrazione:** + **1,40%** NASpI datore (art. 2 c. 28 L. 92/2012, costante nel motore). Si somma all’aliquota di settore.  
- **Somministrazione:** in più, markup agenzia in % (default **0** — non inventato).  
- **Apprendistato:** non è un esonero del 90% sulla 28,8%. Si usano le aliquote del JSON. In maschera **non c’è** il campo «anno di apprendistato»: il motore assume **1° anno**. Con **10 o più dipendenti** (o dal 4° anno) l’aliquota datore è comunque **10%**.

| Chiave JSON | Quando | Datore | Dipendente |
|---|---|---:|---:|
| `apprendistato_base` | fino a 9 dip., 1° anno | **3,50%** | 5,84% |
| `apprendistato_anno2` | fino a 9 dip., 2° anno | **4,50%** | 5,84% |
| `apprendistato_anno3` | fino a 9 dip., 3° anno | **5,00%** | 5,84% |
| `apprendistato_oltre9` | 10+ dip. **oppure** dal 4° anno | **10,00%** | 5,84% |

La spunta agevolazione «apprendistato» **non sconta nulla** (risparmio 0). Serve il tipo contratto.

L’apprendista **ha** premio INAIL (non è azzerato).

### 3.4 Domestici — Circ. INPS n. 9/2026

Fasce in `tabellaFasce2026`. Si applica la fascia **>24 h / convivente** se `ore > 24` **oppure** `convivente = true`. Altrimenti si guarda la retribuzione oraria effettiva (RAL / ore / 52).

| Fascia | Totale €/ora | Quota lavoratore | Quota datore (totale − lav.) | Addizionale TD (totale / lav.) |
|---|---:|---:|---:|---:|
| >24 h / convivente | 1,24 | 0,31 | **0,93** | 1,32 / 0,31 |
| ≤ 9,61 €/h | 1,70 | 0,43 | 1,27 | 1,82 / 0,43 |
| 9,61–11,70 €/h | 1,92 | 0,48 | 1,44 | 2,05 / 0,48 |
| > 11,70 €/h | 2,34 | 0,59 | 1,75 | 2,50 / 0,59 |

Formula:  
`INPS datore = (totale ora − quota lavoratore) × ore settimanali × 52`  
(più eventuali ore di copertura riposi).

**D1:** 25 h > 24 → fascia 0,93 × 25 × 52 = **1.209,00**; lavoratore 0,31 × 1.300 = **403,00**.  
**D-CONV-A:** convivente → stessa fascia; 0,93 × 54 × 52 = **2.611,44**; lavoratore **870,48**.

Le tabelle orarie 2025 ancora visibili sotto la chiave `lavoro_domestico` dello stesso JSON **non sono usate** dal motore.

---

## 4. INPS dipendente e «netto»

### 4.1 Ramo ordinario

INPS dipendente = RAL × **9,19%** (campo `aliquotaDipendente` di settore; apprendistato 5,84%).

Poi, sul residuo (`RAL − INPS dipendente`), **STIMA**:

1. **IRPEF lorda:** 23% fino a 28.000; 33% da 28.000 a 50.000; 43% oltre. Fonte della norma **non** è in un JSON.  
2. **Detrazione lavoro dipendente** (algoritmo nel motore, fonte non in JSON): minimo 690; fino a 15.000 → 1.955; da 15.000 a 28.000 → 1.910 + 1.190 × (28.000 − imponibile) / 13.000; da 28.000 a 50.000 → 1.910 × (50.000 − imponibile) / 22.000.  
3. **Bonus cuneo (STIMA, disclaimer L. 207/2024 art. 1 cc. 4-9):** 7,1% fino a 8.500; poi 5,3% fino a 15.000; poi 4,8% fino a 20.000; 1.000 € da 20.000 a 32.000; decalage lineare a 0 a 40.000.  
4. IRPEF netta = max(0, lorda − detrazione − bonus).  
5. **Addizionale regionale:** aliquota unica per regione da `addizionali-irpef.json` (prima fascia / ordinaria, **non** gli scaglioni veri). Es. Lombardia 1,23%; Campania 2,03%; default 1,73%.  
6. **Addizionale comunale:** sempre **0,80%** (media nazionale dichiarata nel file). **Nessun comune.**

Netto annuo = RAL − INPS dip. − IRPEF netta − addizionali.  
In maschera: media su 12 mesi e netto per mensilità.

Il disclaimer in output lo dice: è una stima; il calcolo esatto dipende dalla situazione personale.

### 4.2 Ramo domestici

Il datore familiare **non è sostituto d’imposta** (art. 4 DPR 322/1998, citato nel disclaimer del risultato).

«Netto» in maschera = **imponibile netto da contributi (senza IRPEF — il lavoratore la versa in dichiarazione)**.

`Netto = RAL − (quota lavoratore €/ora × ore × 52)`

Non è il netto fiscale. Non si applicano IRPEF, detrazione, bonus, addizionali.

---

## 5. TFR e INAIL

### TFR

`TFR anno 1 = RAL effettiva / 13,5`  
Fonte: `data/tfr.json`, art. 2120 c.c.

Cosa **non** calcola, o calcola solo se si accendessero flag **non esposti in maschera**:

- rivalutazione 1,5% + 75% FOI (nel JSON; inflazione di default 2% nel motore) — voce eventuale **non nel totale anno 1**;  
- Fondo Tesoreria INPS 0,50% per aziende ≥ 50 dip. — rappresentazione «in sostituzione di quota TFR», importo 0 nel totale; flag non in maschera;  
- TFR da liquidare all’uscita;  
- destinazione a fondo pensione.

### INAIL

`premio = RAL × tasso ‰ / 1.000` sulla voce scelta. Catalogo in `data/inail.json` (tasso medio nazionale). L’oscillazione min/max è scritta in anagrafica e **non applicata**.

Esempi usati nei golden: voce **0111** terziario 7,31 ‰; voce **0721** uffici 12,09 ‰. Per la ristorazione esiste anche **0210** (9,91 ‰): il caso P1 di test ha usato 0111, non 0210.

**Domestici:** INAIL già nei coefficienti orari Circ. 9/2026. Voce a **0**, per non duplicare.

---

## 6. Voci CCNL accessorie

Default in maschera oggi:

| Famiglia | Default | Base di calcolo | Scala col part-time? |
|---|---|---|---|
| Fondi **sanitari** (Fondo Est, MetaSalute, FAST, …) | **acceso** | fisso €/mese × 12, oppure % sulla RAL | i fissi sanitari in genere **no** (`scalaConPartTime: false`) |
| Enti **bilaterali** (Ebiter, EBTL, …) | acceso (non è un toggle dedicato) | fisso o % | come da JSON |
| **Previdenza complementare** (COMETA 2%, Previcommercio 1,55%, Fonchim, …) | **sempre incluso (obbligatoria)** | % sulla RAL | sì, perché gira sulla RAL già scalata |
| **CassaColf** 0,04 €/h | **sempre incluso (obbligatoria)** | 0,04 × ore × 52 | sì (è a ora) |
| Scatti | sempre, se anzianità > 0 | vedi sotto | — |
| Elementi aggiuntivi a `condizione: null` | sempre | €/mese × n. mensilità **senza** scala PT | no |
| Elementi con condizione (EDR mancata adesione, ecc.) | **mai** | — | il motore non chiede se la condizione è vera |

**CassaColf, da dire a voce:** il versamento CCNL (Art. 49 nel JSON) è **dovuto**. Il default spento allinea il foglio Francesca (15.291,21 senza 112,32 €). Toggle acceso: 54 × 52 × 0,03 = **112,32 €/anno** convivente; 25 × 52 × 0,03 = **52,00 €** sul caso D1.

### Scatti

`n. scatti = min( intero(anni / (periodicità mesi / 12)) ; maxScatti )`

- Se c’è `scattoEuro` sul livello: `n × scattoEuro × 12`.  
- Domestici orari: `n × 4% × minimo orario di tabella × ore × 52` (sul **minimo tabellare**, non sulla paga di fatto sopra minimo).  
- Conviventi: `n × 4% × (minimoBase o minimoTabellare) × mensilità`.  
- Periodicità tipiche: commercio 36 mesi max 10; metalmeccanici 24 mesi max 5; FIPE 48 mesi max 6; domestici 24 mesi max 7.

Esempio M1: 4 anni / 24 mesi = 2 scatti; C3 `scattoEuro` 29,64; 2 × 29,64 × 12 = **711,36**.

### Esempi di contributi (quota datore)

| CCNL | Voce | Tipo | Importo | Default |
|---|---|---|---|---|
| Commercio | Fondo Est | sanitario | 10,42 €/mese | on |
| Commercio | Ebiter | bilaterale | 4,58 €/mese | on |
| Commercio | Previcommercio | previdenziale | 1,55% RAL | **off** |
| Commercio | ex festività + festività non godute + solidarietà | extra `condizione: null` | 5,07+10,14+2,89 €/mese × 12 = 217,20 €/anno | sempre |
| FIPE | FAST | sanitario | 9,00 €/mese | on |
| FIPE | EBTL | bilaterale | 0,20% RAL | on |
| Metalmeccanici | MetaSalute | sanitario | 12,00 €/mese | on |
| Metalmeccanici | COMETA | previdenziale | 2,00% RAL | **off** |
| Domestici | CassaColf | bilaterale oraria | 0,04 €/h | **off** |

---

## 7. Agevolazioni

Elenco da `data/aliquote-inps.json`. Il risparmio è `INPS datore del caso × % esonero`, tetto `massimaleAnnuo` se presente. Base = aliquota **di settore** (o contributi orari domestici), non più il 28,8% universale.

| Id | Nome | % | Massimale | Scadenza nel JSON | Non cumulabile con |
|---|---|---:|---:|---|---|
| under36 | Esonero under 36 | 100% | 6.000 €/anno | 31/12/2026 | decontribuzione_sud, donne_fornero, donne_decreto_coesione |
| donne_fornero | Donne svantaggiate Fornero | 50% | nessuno | nessuna | under36, sud, donne decreto coesione |
| donne_decreto_coesione | Donne Decreto Coesione | 100% | 7.800 €/anno | 31/12/2026 | under36, sud, Fornero |
| decontribuzione_sud | Decontribuzione ZES Unica 2026 | 20% | 1.740 €/anno | 31/12/2029 | under36, Fornero, decreto coesione |
| apprendistato | (etichetta in elenco) | — | — | — | **non applica l’esonero 90%**; vedere tipo contratto |
| disoccupati_12mesi | Disoccupati 12 mesi | 50% | 4.030 €/anno | nessuna | under36 |
| neet | NEET under 30 | 100% | 8.000 €/anno | 31/12/2026 | under36, Fornero, decreto coesione, sud |

In caso di due spunte non cumulabili, resta quella con massimale più alto; l’altra ha avvertenza e risparmio 0.

**Frase secca:** la spunta è un’autodichiarazione; il simulatore **non** verifica età, sesso, NEET, incremento occupazionale, CU, sede ZES.

**Domestici:** se si spuntano comunque, risparmio **0** e avvertenza (regime orario Cassa Domestici, Circ. n. 9/2026).

Alert giallo in esito se la scadenza dell’agevolazione è entro 90 giorni.

---

## 8. Compensi societari

Pagina a sé, non mescolata al CCNL. Fonte: Circ. INPS n. 8 del 03/02/2026 (`data/gestione-separata.json`).

### Amministratore

| | Senza altra copertura | Iscritto ad altra gestione o pensionato |
|---|---|---|
| Aliquota GS | **35,03%** (IVS 33 + 0,50 + 0,22 + DIS-COLL 1,31) | **24%** (solo IVS nel JSON) |
| Riparto | 2/3 committente, 1/3 percipiente | idem |
| Imponibile GS | min(compenso, massimale **122.295 €**) | idem |
| IRPEF | stessi scaglioni 23/33/43 sul compenso − quota GS percipiente | idem |
| Addizionali | stessa tabella regionale + comunale 0,80% | idem |
| Costo società | compenso + 2/3 GS | idem |
| IRAP | **non calcolata** (nota in output) | idem |

Esempio a 40.000 €, Lombardia, senza altra copertura (test): GS 14.012,00 · 2/3 società 9.341,33 · 1/3 4.670,67 · costo società **49.341,33**.

### Scelta del regime nella maschera

Nel tab «Soci e Amministratori» il campo **Regime contributivo del compenso** decide quale dei due trattamenti si applica. La scelta cambia il costo per la società, quindi va fatta consapevolmente:

| | Ritenuta unica sul percipiente (default) | Gestione separata — riparto 2/3 – 1/3 |
|---|---|---|
| Aliquota | scelta a mano: 35,03% · 8% · 24% | dedotta dalla spunta «altra copertura INPS»: 35,03% o 24% |
| Contributo a carico società | **nessuno** | 2/3 del contributo |
| Trattenuta al percipiente | intera aliquota sul lordo | 1/3 del contributo |
| Detrazioni art. 13 + bonus cuneo | applicate | non applicate |
| Costo società su 12.000 € | 12.000,00 | 14.802,40 |
| Costo società su 40.000 € | 40.000,00 | 49.341,33 |

Il default resta la **ritenuta unica**, che è il comportamento storico della maschera ed è l'unico compatibile con la ritenuta ridotta 8%. Per il compenso ordinario dell'amministratore il trattamento corretto è il **riparto 2/3 – 1/3**: con la ritenuta unica il costo azienda risulta inferiore di due terzi del contributo.

Minimale reddito in JSON: 18.808 € (usato solo nel messaggio artigiani/commercianti).

### Socio artigiano / commerciante

**Coming soon.** Il JSON ha già 24% artigiani / 24,48% commercianti, minimale 18.808 €, soglia 56.224 € con +1 punto. In maschera compare il messaggio: non è un costo su «stipendio» mensile.

### Cosa non c’è

IRAP puntuale, rivalsa, welfare societario, compensi misti socio-lavoratore, Gestione IVS calcolata sul reddito d’impresa.

---

## 9. Cinque casi lavorati (da usare a tavolo)

Tutti gli addendi sotto escono dal motore allo stesso arrotondamento del software (due decimali). Le voci 13ª/14ª sono stampate ma **non** stanno nel totale.

### 9.1 Domestico convivente A, 54 h, no CassaColf — D-CONV-A

**Input:** CCNL Lavoratori domestici, flag convivente, livello A, 54 h, 13 mensilità, 0 scatti, TI, CassaColf off.

**File minimo:** `data/ccnl/domestici_conviventi.json` (totale A = 908,10).  
**File INPS:** `data/aliquote-inps.json` → fascia >24 h / convivente.  
**Banner:** no.

| Voce | Formula | € |
|---|---|---:|
| RAL | 908,10 × 13 | 11.805,30 |
| INPS datore | 0,93 × 54 × 52 | 2.611,44 |
| TFR | 11.805,30 / 13,5 | 874,47 |
| INAIL voce | già nell’ora INPS | 0,00 |
| CassaColf | toggle off | 0,00 |
| 13ª (solo scomposizione) | 908,10 | (non in somma) |
| **Costo azienda** | | **15.291,21** |
| INPS lavoratore | 0,31 × 54 × 52 | 870,48 |
| Netto da busta (senza IRPEF) | 11.805,30 − 870,48 | 10.934,82 |

Se si accende CassaColf: +112,32. Non è il foglio Francesca.

### 9.2 Domestico non convivente A, 25 h — D1

**Input:** stesso CCNL senza convivente, liv. A, 25 h, paga 6,51, TI, CassaColf off.

**File minimo:** `data/ccnl/domestici.json` (A = 6,51 €/ora).  
**Banner:** no.

| Voce | Formula | € |
|---|---|---:|
| RAL | 6,51 × 25 × 52 | 8.463,00 |
| INPS datore | 0,93 × 1.300 | 1.209,00 |
| INPS lavoratore | 0,31 × 1.300 | 403,00 |
| INAIL voce | | 0,00 |
| CassaColf | off (on = 52,00) | 0,00 |
| Netto da busta (senza IRPEF) | 8.463 − 403 | 8.060,00 |

Il TFR (8.463 / 13,5) entra nel **costo** azienda; non era nella lista dei numeri che Francesca ha firmato sul netto.

### 9.3 Commercio 4°, 40 h, 14 mensilità, azienda ≤15 — C1

**Input:** CCNL Terziario Confcommercio, liv. 4, 40 h, 14 mensilità, 10 dipendenti, Lombardia, INAIL **0111**, sanità on, previdenza complementare **off**, 0 scatti, TI.

**File minimo:** `data/ccnl/commercio.json`.  
**Banner:** no (`validitaAl` 31/10/2026).  
**Fonte da dire:** FILCAMS/kitech + RTF liv. 6, **non** One Lavoro Confcommercio.

Scomposizione: paga 1.257,46 + contingenza 524,22 + altre 2,07 = **1.783,75**.

| Voce | Formula | € | In totale? |
|---|---|---:|:---:|
| RAL | 1.783,75 × 14 | 24.972,50 | sì |
| INPS datore | 24.972,50 × 29,28% | 7.311,95 | sì |
| TFR | 24.972,50 / 13,5 | 1.849,81 | sì |
| INAIL 0111 | 24.972,50 × 7,31 ‰ | 182,55 | sì |
| Fondo Est + Ebiter | (10,42 + 4,58) × 12 | 180,00 | sì |
| Previcommercio 1,55% | spento | 0,00 | — |
| Ex festività / festività / solidarietà | 18,10 × 12 | 217,20 | sì |
| 13ª e 14ª | 1.783,75 ciascuna | | **no** |
| **Costo azienda (output motore)** | | **34.714,01** | |

Il golden con Francesca su questo caso copre RAL, INPS, TFR e 13ª. Il netto in maschera (20.398,55) è **STIMA IRPEF**, non un numero firmato.

### 9.4 FIPE Quadro A, colonna TOTALE — P1

**Input:** CCNL Pubblici esercizi, QA, 40 h, 14 mensilità, 10 dip., INAIL 0111 (scelta del test; in catalogo la ristorazione è 0210), sanità on.

**File:** `data/ccnl/pubblici_esercizi.json`.  
**Banner: sì — tabella scaduta il 31/05/2026.**

Scomposizione: 1.854,49 + 542,70 + 75,00 = **2.472,19**.

| Voce | Formula | € | In totale? |
|---|---|---:|:---:|
| RAL | 2.472,19 × 14 | 34.610,66 | sì |
| INPS datore | 34.610,66 × 29,28% | 10.134,00 | sì |
| TFR | 34.610,66 / 13,5 | 2.563,75 | sì |
| INAIL 0111 | 34.610,66 × 7,31 ‰ | 253,00 | sì |
| FAST + EBTL | 9 × 12 + 0,20% RAL | 177,22 | sì |
| 13ª / 14ª | 2.472,19 | | **no** |
| **Costo azienda (output motore)** | | **47.738,64** | |

Il golden firmato è: «la RAL usa il TOTALE, non il minimo».

### 9.5 Metalmeccanici C3, 4 anni — M1

**Input:** CCNL metalmeccanici industria, C3, 40 h, 13 mensilità, anzianità 4 anni, 10 dip., INAIL 0721, MetaSalute on, COMETA off.

**File:** `data/ccnl/metalmeccanici.json` (C3 minimo = totale **2.158,26**; `scattoEuro` 29,64).  
**Banner: sì — tabella scaduta il 31/05/2026.** Non risulta in `LAVORO/` un PDF post 1/06/2026.

| Voce | Formula | € | In totale? |
|---|---|---:|:---:|
| RAL | 2.158,26 × 13 | 28.057,38 | sì |
| INPS datore | 28.057,38 × 30,37% (industria ≤15) | 8.521,03 | sì |
| TFR | / 13,5 | 2.078,32 | sì |
| INAIL 0721 | × 12,09 ‰ | 339,21 | sì |
| MetaSalute | 12 × 12 | 144,00 | sì |
| COMETA 2% | spento | 0,00 | — |
| Scatti | 2 × 29,64 × 12 | 711,36 | sì |
| 13ª | 2.158,26 | | **no** |
| **Costo azienda (output motore)** | | **39.851,30** | |

Il golden firmato è lo scatto 711,36.

---

## 10. Limiti noti (da dire subito)

- Tabelle **metalmeccanici industria** e **FIPE** con `validitaAl` **31/05/2026**: a settembre 2026 il banner «tabella scaduta» è corretto. Stesso per **turismo** (30/04/2026) e **telecomunicazioni** (30/06/2026).  
- CCNL con fonte **PROXY / NON VERIFICATO** in maschera: chimica, edilizia, informatica, sanità privata (ambulatori H442, non AIOP), studi professionali, trasporti (I100 artigianato).  
- **Commercio Confcommercio:** i minimi TOTALE arrivano da FILCAMS/kitech e dal RTF liv. 6, **non** da una scheda One Lavoro «Terziario Confcommercio» (il PDF H011 in cartella è Agenzie ippiche). Non mescolare con Confesercenti.  
- Diversi JSON (assicurazioni, condomini, grafica, autorimesse, legno, vigilanza) in `_fonti.md` sono PROXY/MANCANTI e la stringa `fonte` non contiene quelle parole: non accendono il banner giallo della maschera, ma rientrano nell'avviso «validità non dichiarata» perché sono privi di `validitaAl`.  
- **Multiservizi:** il testo fonte parla di tabelle fino al 30/04/2026, ma manca `validitaAl`: l'avviso segnala validità non dichiarata, non una scadenza. La data va portata nel JSON per avere l'avviso di tabella scaduta.  
- Netto ordinario = **stima** (addizionale comunale media, niente carichi di famiglia, niente comune).  
- INAIL senza oscillazione aziendale.  
- Agevolazioni senza istruttoria.  
- **CassaColf** e **fondi pensione** esclusi dal totale se i toggle sono off — in versamento CassaColf è dovuta (Art. 49 CCNL).  
- Ex festività commercio **non** scalano col part-time.  
- Nessun Uniemens, LUL, F24, TFR da corrispondere all’uscita, Cassa Edile «vera», denuncia trimestrale domestici.  
- Apprendistato: senza campo «anno», con 10+ dipendenti si cade sempre sul **10%**.  
- Non tutti i PDF in `LAVORO/` hanno un JSON (es. T271 scuole materne FISM).  
- IRPEF: scaglioni nel motore senza citazione di legge nel JSON.

---

## 11. Come verificare un nuovo caso in cinque minuti

1. Aprire la scheda Wolters Kluwer / il CCNL.  
2. Prendere la colonna **TOTALE** del livello (non il solo minimo).  
3. Moltiplicare per le mensilità del JSON (13 o 14, salvo accordo).  
4. Confrontare con la RAL precompilata. Se le ore non sono l’orario pieno, il motore scala in proporzione.  
5. Controllare settore INPS e numero dipendenti (soglia 15 per commercio/industria). Su TD/somministrazione aggiungere 1,40%.  
6. Se domestici: ore e fascia Circ. n. 9/2026 (>24 h o convivente → 1,24 / 0,31). Convivente: 54 h, RAL = mensile × 13.  
7. Se il **totale costo** differisce, prima di dire che il motore è sbagliato:  
   - CassaColf on/off;  
   - sanità on/off (Fondo Est, MetaSalute, FAST);  
   - previdenza complementare (COMETA, Previcommercio) — di default **off**;  
   - elementi extra commercio (217,20 €);  
   - banner tabella scaduta / PROXY;  
   - voce INAIL diversa (0111 vs 0210 cambia il premio).

---

## 12. Appendice — glossario

| Voce | Cosa intende il simulatore |
|---|---|
| **RAL** | Retribuzione annua lorda usata come base: tabella × mensilità (o paga oraria × 52), già comprensiva di 13ª/14ª |
| **Minimo tabellare** | Solo paga base di livello (`minimoTabellare`) |
| **Contingenza** | Indennità di contingenza in tabella, se il PDF la separa |
| **EDR** | Elemento distinto della retribuzione in tabella (spesso 10,33); non confondere con l’EDR da mancata adesione ente, che qui **non** entra |
| **Retribuzione mensile di tabella** | Colonna TOTALE WK = minimo + contingenza + EDR + indennità fisse |
| **Imponibile INPS** | Sul dipendente ordinario ≈ RAL; sul domestico non c’è % ma euro/ora |
| **NASpI addizionale** | +1,40% datore su TD e somministrazione (art. 2 c. 28 L. 92/2012) |
| **FIS / CIGS** | Nel JSON: FIS 0,50% fino a 15 dip.; CIGS 0,90% oltre. Non si sommano sulla stessa riga |
| **TFR 13,5** | Accantonamento annuo = RAL / 13,5 (art. 2120 c.c.) |
| **Gestione separata** | Contributi INPS su compenso amministratore (35,03% o 24%), riparto 2/3–1/3 |
| **Sostituto d’imposta** | Chi trattiene IRPEF in busta. Il datore familiare **non** lo è |
| **CassaColf** | 0,04 €/h datore, Art. 49 CCNL; nel simulatore è un toggle |
| **Oscillazione INAIL** | Maggiorazione/sconto sul tasso medio; in anagrafica, non nel premio calcolato |
| **Autodichiarazione** | La spunta agevolazione non istruisce la pratica |

---

## Domande che Francesca farà

**1. Perché il netto domestici non ha IRPEF?**  
Perché il datore familiare non è sostituto d’imposta. Il numero è RAL meno 0,31 €/ora. L’IRPEF la versa il lavoratore in dichiarazione. In maschera la voce si chiama «imponibile netto da contributi (senza IRPEF)».

**2. Perché CassaColf non sta nel 15.291,21?**  
Perché il toggle è **spento di default**, allineato al foglio manoscritto. In CCNL (Art. 49) i 0,04 €/h sono dovuti: 54 × 52 × 0,03 = 112,32 €. Si accende dal toggle.

**3. Posso fare il part-time al convivente A?**  
No, in via ordinaria. Il motore riporta le ore a 54. PT 30 h solo per C, BS, B se iscritto a corso di scuola; altra deroga PT solo per CS e DS se c’è già un altro lavoratore in forza.

**4. Il 4° commercio è paga base o lordo di tabella?**  
Lordo di tabella: **1.783,75**, non 1.257,46. RAL 24.972,50 a 14 mensilità.

**5. I metalmeccanici sono aggiornati a settembre 2026?**  
No. La tabella nel JSON è 01/06/2025–**31/05/2026**. In maschera c’è il banner giallo. Non c’è in cartella un PDF successivo.

**6. L’INPS commercio è 28,8%?**  
No. Azienda fino a 15 dipendenti: **29,28%** (commercio_fino15). Il 28,80% in maschera è solo il valore iniziale: se non lo si tocca, il motore usa il settore.

**7. COMETA / Previcommercio me li mette sempre?**  
No. Default **off**. Accenderli solo se il lavoratore è iscritto al fondo.

**8. L’agevolazione under 36 è automatica se assumo un giovane?**  
No. La spunta è autodichiarazione. Il simulatore non chiede età né CU. Su domestici, anche spuntata, il risparmio è 0.

**9. (bonus) La 14ª la sommo al costo?**  
No. È già nella RAL. In report è una riga informativa.

**10. (bonus) FIPE QA a 1.854 €?**  
Quello è il **minimo**. Il TOTALE WK è **2.472,19** (c’è la contingenza 542,70 e l’indennità di funzione 75). Tabella scaduta il 31/05/2026.


---

**Aggiornamento ultimo giro (note consulente 19/10):** CassaColf obbligatoria a 0,04 €/h (non più toggle); ferie/permessi/ex festività dipendenti = 275 h fisse × (retribuzione mensile / 173); domestici non conviventi: ferie fisse (173 × ore sett. / 40) × paga oraria, campo non modificabile; conviventi: aggiunto part-time per sostituzione titolare (tab. C); edilizia: nota che l'aliquota Cassa Edile è indicativa e varia per cassa provinciale.
