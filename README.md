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

In `.env.local` e, su Vercel, nelle Environment Variables del progetto. Le variabili SMTP dei lead, su Hostinger, si impostano nel pannello della Web App prima del deploy. L’elenco completo è in `.env.example`.

Lead:

- `LEAD_COOKIE_SECRET` — segreto HMAC del cookie di sblocco. Obbligatorio, almeno 16 caratteri (meglio 32 o più, casuali). Senza questo valore il modulo non sblocca il simulatore.

La notifica del lead parte via SMTP. Non si invia nessuna mail al visitatore. Servono tutte le variabili qui sotto: se ne manca una, `POST /api/leads` risponde 503 e non sblocca il simulatore.

- `SMTP_HOST` — server SMTP. Su Hostinger: `smtp.hostinger.com`
- `SMTP_PORT` — `465`, con SSL implicito. Se la porta 465 non funziona, usa `587` (STARTTLS)
- `SMTP_USER` — indirizzo completo della casella. È l’utente con cui il server si autentica. Su Hostinger: `info@costilavoroitalia.it`
- `SMTP_PASS` — password di quella casella. Non va mai committata
- `LEADS_TO_EMAIL` — destinatario della notifica. La stessa casella (`info@costilavoroitalia.it`), così il messaggio arriva nella posta in arrivo del titolare
- `LEADS_FROM_EMAIL` — mittente. Può essere solo l’indirizzo (`info@costilavoroitalia.it`) oppure `Costi Lavoro Italia <info@costilavoroitalia.it>`

Rate limit (opzionale):

- `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` — se presenti, lead, calcoli e ricerca ACI condividono il contatore tra le istanze Vercel. Senza Redis il limite resta nella memoria del processo.

Sito:

- `NEXT_PUBLIC_SITE_URL` — URL canonico per metadata, sitemap e Open Graph. Se manca si usa `https://costilavoroitalia.it`
- `NEXT_PUBLIC_PRIVACY_URL` — opzionale, informativa esterna; altrimenti si usa `/privacy`

In locale ogni lead e le simulazioni che esegue finiscono anche in `data/runtime/leads.json` (non va committato: contiene dati personali). Su Vercel il disco è in sola lettura: il lead resta nell’email, che include un id, e ogni simulazione viene scritta nei log della funzione con lo stesso id.

### Prova manuale del gate

1. Imposta `LEAD_COOKIE_SECRET` e le variabili SMTP dei lead (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `LEADS_TO_EMAIL`, `LEADS_FROM_EMAIL`), poi `npm run dev`.
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
