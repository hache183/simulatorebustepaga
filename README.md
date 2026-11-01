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

All’apertura il visitatore vede prima un modulo in due passaggi (nome, email, telefono, azienda, ruolo, consenso privacy obbligatorio e consenso marketing facoltativo). Il simulatore e i report restano chiusi finché il lead non è stato salvato. Dopo l’invio, un cookie firmato (httpOnly, circa 30 giorni) sblocca il calcolatore su quel browser. Senza un cookie valido, `POST /api/calcola` e `POST /api/societari` rispondono 401.

### Variabili per i lead

In `.env.local` e, su Vercel, nelle Environment Variables del progetto:

- `LEAD_COOKIE_SECRET` — segreto HMAC del cookie di sblocco. Obbligatorio, almeno 16 caratteri (meglio 32 o più, casuali). Senza questo valore il modulo non sblocca il simulatore.
- `LEADS_TO_EMAIL` — indirizzo che riceve i lead
- `LEADS_FROM_EMAIL` — mittente verificato su Resend (es. `CostWork <noreply@tuodominio.it>`)
- `RESEND_API_KEY` — chiave API Resend

Opzionale: `NEXT_PUBLIC_PRIVACY_URL` per puntare a un’informativa esterna; altrimenti si usa `/privacy`.

In locale ogni lead e le simulazioni che esegue finiscono anche in `data/runtime/leads.json` (non va committato: contiene dati personali). Su Vercel il disco è in sola lettura: il lead resta nell’email, che include un id, e ogni simulazione viene scritta nei log della funzione con lo stesso id.

### Prova manuale del gate

1. Imposta `LEAD_COOKIE_SECRET` e le tre variabili Resend, poi `npm run dev`.
2. Apri `http://localhost:3000/calcolatore`: deve comparire il modulo, non il calcolatore.
3. Compila i due passaggi e invia: compare il simulatore. Ricarica la pagina: il modulo non torna.
4. Cancella il cookie `lead_unlock` e ricarica: il modulo torna.
5. Senza cookie, `curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/calcola -H 'content-type: application/json' -d '{}'` deve stampare `401`.

### Area consulente (admin)

Login da **Area consulente** nell’header oppure `/login`. Servono `AUTH_EMAIL`, `AUTH_PASSWORD` e `AUTH_TOKEN` come prima.

---

## Come aggiornare le aliquote INPS o le tariffe INAIL

1. Accedi come consulente e vai su: **http://localhost:3000/admin**
2. Inserisci la password admin (quella in `.env.local`, variabile `ADMIN_PASSWORD`)
3. Seleziona il file da modificare (es. "Aliquote INPS e Agevolazioni")
4. Modifica i numeri direttamente nell'editor
5. Clicca **Salva modifiche**

Il sistema verifica che il formato sia corretto prima di salvare. Se c'è un errore, te lo dice prima di sovrascrivere il file.

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
