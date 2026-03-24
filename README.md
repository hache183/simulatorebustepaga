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

---

## Come aggiornare le aliquote INPS o le tariffe INAIL

1. Vai su: **http://localhost:3000/admin**
2. Inserisci la password (quella in .env.local)
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

- I file in lib/ (contengono la logica di calcolo)
- I file in types/ (contengono i tipi TypeScript)
- Il file app/api/calcola/route.ts (gestisce la sicurezza delle richieste)

---
