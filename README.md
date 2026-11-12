# Costi Lavoro Italia — Guida all'uso

## Cos'è questo strumento

Questo calcolatore ti permette di sapere **quanto costa davvero assumere una persona** tenendo conto di tutti i contributi, le agevolazioni disponibili e i costi contrattuali del CCNL scelto.

Inserisci i dati dell'assunzione e ottieni subito il costo aziendale totale voce per voce: INPS, INAIL, TFR, tredicesima, agevolazioni.

---

## Come avviarlo (solo la prima volta)

Hai bisogno di Node.js installato sul computer (scaricalo da nodejs.org se non ce l'hai).

Apri il terminale nella cartella del progetto e digita:

    npm install
    npm run dev

Poi apri il browser e vai su: **http://localhost:3000**

La home spiega il simulatore e porta a `/calcolatore`. I parametri si compilano liberamente. Nome, email, telefono, azienda, ruolo, consenso privacy (obbligatorio) e consenso marketing (facoltativo) si chiedono solo al clic su calcola, se manca il cookie firmato. Dopo l’invio il report parte con i dati già inseriti. Il cookie (httpOnly, circa 30 giorni) fa saltare il modulo alle visite successive. Senza un cookie valido, `POST /api/calcola` e `POST /api/societari` rispondono 401.

### Variabili

In `.env.local` e, su Vercel, nelle Environment Variables del progetto. L’elenco completo è in `.env.example`.

Lead:

- `LEAD_COOKIE_SECRET` — segreto HMAC del cookie di sblocco. Obbligatorio, almeno 16 caratteri (meglio 32 o più, casuali). Senza questo valore il modulo non sblocca il simulatore.
- `LEADS_TO_EMAIL` — indirizzo che riceve i lead
- `LEADS_FROM_EMAIL` — mittente verificato su Resend (es. `Costi Lavoro Italia <noreply@costilavoroitalia.it>`)
- `RESEND_API_KEY` — chiave API Resend

Foglio Google (opzionale). Senza queste variabili il lead resta solo nell’email e il simulatore si sblocca come prima. Se sono impostate ma la scrittura fallisce, l’errore finisce nei log della funzione e lo sblocco avviene comunque. Il campo honeypot `website` non invia email e non scrive sul foglio.

- `GOOGLE_SHEETS_SPREADSHEET_ID` — ID del foglio, la parte di URL fra `/d/` e `/edit`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — `client_email` del service account
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — campo `private_key` del JSON. Su Vercel i ritorni a capo restano come `\n` letterali: incollali così
- `GOOGLE_SHEETS_TAB_NAME` — nome del tab. Se manca si usa `Lead`

Per creare foglio e service account:

1. Apri [Google Cloud Console](https://console.cloud.google.com/) e crea un progetto (o usane uno dedicato a questo sito).
2. In **API e servizi → Libreria** abilita **Google Sheets API**.
3. In **IAM e amministrazione → Account di servizio** crea un account di servizio. Aprilo, scheda **Chiavi**, **Aggiungi chiave → Crea nuova chiave → JSON** e scarica il file. Non committarlo e non incollarlo nel repository.
4. Crea un foglio Google privato (non «chiunque abbia il link»). Rinomina il primo tab in `Lead`, oppure scegli un altro nome e mettilo in `GOOGLE_SHEETS_TAB_NAME`. Il tab deve esistere già: il codice non lo crea.
5. Condividi il foglio in **Editor** con l’email del service account (`client_email` nel JSON, finisce con `.iam.gserviceaccount.com`).
6. Copia l’ID dall’URL: `https://docs.google.com/spreadsheets/d/QUESTO_E_L_ID/edit`.
7. Su Vercel, nelle Environment Variables del progetto, imposta le tre variabili obbligatorie (e il nome del tab se non è `Lead`). Poi fai un nuovo deploy.

La prima riga, se il tab è vuoto, è l’intestazione in italiano: Data (ora di Roma), ID, Modulo, Nome, Email, Telefono, Azienda, Ruolo, Consenso marketing, Contesto. Le righe successive sono i lead. I valori sono scritti come testo (`RAW`), così un telefono o un campo che inizia con `=` non viene reinterpretato dal foglio.

Rate limit (opzionale):

- `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` — se presenti, lead, calcoli e ricerca ACI condividono il contatore tra le istanze Vercel. Senza Redis il limite resta nella memoria del processo.

Sito:

- `NEXT_PUBLIC_SITE_URL` — URL canonico per metadata, sitemap e Open Graph. Se manca si usa `https://costilavoroitalia.it`
- `NEXT_PUBLIC_PRIVACY_URL` — opzionale, informativa esterna; altrimenti si usa `/privacy`

In locale ogni lead e le simulazioni che esegue finiscono anche in `data/runtime/leads.json` (non va committato: contiene dati personali). Su Vercel il disco non è persistente, quindi quel JSON non resta: il lead resta nell’email, che include un id, e ogni simulazione viene scritta nei log della funzione con lo stesso id. Se il foglio Google è configurato, dopo l’email la stessa anagrafica viene aggiunta anche lì. In locale, con le variabili nel `.env.local`, la scrittura sul foglio avviene insieme al JSON.

### Prova manuale del gate

1. Imposta `LEAD_COOKIE_SECRET` e le tre variabili Resend, poi `npm run dev`. Le variabili del foglio Google sono facoltative.
2. Apri `http://localhost:3000`: deve comparire la home, con il pulsante per il simulatore.
3. Apri `/calcolatore` e compila CCNL e livello: il modulo lead non deve comparire.
4. Premi **Calcola il costo**: compare il modulo. Annullando, i parametri restano. Inviando i dati, parte il report.
5. Ricarica e ricalcola: il modulo non torna. Cancella il cookie `lead_unlock` e ricalcola: il modulo torna.
6. Senza cookie, `curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/calcola -H 'content-type: application/json' -d '{}'` deve stampare `401`.

Non c'è un pannello admin. Aliquote, minimi e CCNL stanno nei JSON in `data/` e si aggiornano con un commit.

---

## Come aggiornare le aliquote INPS o le tariffe INAIL

Modifica `data/aliquote-inps.json`, `data/inail.json` o `data/tfr.json`, poi fai commit e ridistribuisci. I file sono letti in build.

---

## Come aggiungere un nuovo CCNL

1. Copia il file data/ccnl/commercio.json
2. Rinominalo con l'ID del nuovo CCNL (es. metalmeccanici.json)
3. Modifica i valori (livelli, contributi contrattuali, mensilita, scatti)
4. Aggiungi il file alla mappa in `lib/ccnl.ts` (`CCNL_MAP`). Il menu del simulatore legge i nomi da lì.

---

## Cosa NON modificare

- `lib/engine.ts`, `lib/irpef-*` e i JSON in `data/` con aliquote e minimi (il calcolo non va toccato)
- I file in types/ (contengono i tipi TypeScript)

`app/api/calcola/route.ts` controlla il cookie lead e poi chiama `calculateCosto`: la chiamata al motore va lasciata com'è.

---
