# Calcolatore Costo del Lavoro — Guida all'uso

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
- `LEADS_FROM_EMAIL` — mittente verificato su Resend (es. `CostWork <noreply@tuodominio.it>`)
- `RESEND_API_KEY` — chiave API Resend

Accesso consulente:

- `AUTH_EMAIL` e `AUTH_PASSWORD` — credenziali del login su `/login`
- `AUTH_SESSION_SECRET` — segreto HMAC del cookie `admin_session` (almeno 16 caratteri). Obbligatorio: senza, il login risponde 500
- `AUTH_SESSION_VERSION` — opzionale. Alza il numero (da `1` a `2`) per invalidare tutte le sessioni già emesse

Rate limit e revoca della singola sessione (opzionali):

- `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` — se presenti, login, lead, calcoli e ricerca ACI condividono il contatore tra le istanze Vercel, e il logout cancella quella sessione su Redis. Senza Redis il limite resta nella memoria del processo (non condiviso su serverless) e per revocare le sessioni si alza `AUTH_SESSION_VERSION`

Sito:

- `NEXT_PUBLIC_SITE_URL` — URL canonico per metadata, sitemap e Open Graph. Se manca si usa `https://costworkpro.vercel.app`
- `NEXT_PUBLIC_PRIVACY_URL` — opzionale, informativa esterna; altrimenti si usa `/privacy`

In locale ogni lead e le simulazioni che esegue finiscono anche in `data/runtime/leads.json` (non va committato: contiene dati personali). Su Vercel il disco è in sola lettura: il lead resta nell’email, che include un id, e ogni simulazione viene scritta nei log della funzione con lo stesso id.

### Prova manuale del gate

1. Imposta `LEAD_COOKIE_SECRET` e le tre variabili Resend, poi `npm run dev`.
2. Apri `http://localhost:3000`: deve comparire la home, con il pulsante per il simulatore.
3. Apri `/calcolatore` e compila CCNL e livello: il modulo lead non deve comparire.
4. Premi **Calcola il costo**: compare il modulo. Annullando, i parametri restano. Inviando i dati, parte il report.
5. Ricarica e ricalcola: il modulo non torna. Cancella il cookie `lead_unlock` e ricalcola: il modulo torna.
6. Senza cookie, `curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/calcola -H 'content-type: application/json' -d '{}'` deve stampare `401`.

### Area consulente (admin)

Login da **Area consulente** nell’header oppure `/login`, con `AUTH_EMAIL` e `AUTH_PASSWORD`. Il cookie è una sessione casuale firmata con `AUTH_SESSION_SECRET` (7 giorni, httpOnly). Non è più il vecchio hash statico `AUTH_TOKEN`, e il pannello non chiede una seconda password.

---

## Come aggiornare le aliquote INPS o le tariffe INAIL

1. Accedi come consulente e vai su: **http://localhost:3000/admin**
2. Seleziona il file da modificare (es. "Aliquote INPS e Agevolazioni")
3. Modifica i numeri direttamente nell'editor
4. Clicca **Salva modifiche**

In locale il file viene scritto su disco. Su Vercel il disco è in sola lettura: il pannello valida il JSON e lo fa scaricare, da committare e ridistribuire. Il sistema verifica il formato prima di salvare. Se c'è un errore, te lo dice prima di sovrascrivere il file.

---

## Come aggiungere un nuovo CCNL

1. Copia il file data/ccnl/commercio.json
2. Rinominalo con l'ID del nuovo CCNL (es. metalmeccanici.json)
3. Modifica i valori (livelli, contributi contrattuali, mensilita, scatti)
4. Aggiungi la riga { id: 'metalmeccanici', nome: '...' } nell'array CCNL_DISPONIBILI in components/CalcolatoreForm.tsx
5. Aggiungi il percorso alla whitelist in app/api/admin/update-json/route.ts e app/api/admin/leggi-file/route.ts

---

## Cosa NON modificare

- `lib/engine.ts`, `lib/irpef-*` e i JSON in `data/` con aliquote e minimi (il calcolo non va toccato)
- I file in types/ (contengono i tipi TypeScript)

`app/api/calcola/route.ts` controlla il cookie lead e poi chiama `calculateCosto`: la chiamata al motore va lasciata com'è.

---
