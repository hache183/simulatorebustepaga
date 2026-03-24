# Checklist aggiornamenti annuali — Calcolatore Costo del Lavoro

Esegui questa checklist ogni anno (idealmente a gennaio, dopo le circolari INPS di inizio anno).

## Gennaio — dopo le circolari INPS

- [ ] Verificare le aliquote contributive in data/aliquote-inps.json
      Fonte: Circolare INPS di inizio anno (pubblicata su inps.it)
      Campo da aggiornare: aliquotaBaseAzienda (attualmente 28,80%)

- [ ] Verificare le agevolazioni attive: scadenze, massimali, nuove agevolazioni
      Aggiorna il campo scadenza per ogni agevolazione modificata

- [ ] Verificare il campo updatedAt in data/aliquote-inps.json
      Deve riflettere la data dell'ultimo aggiornamento effettivo

## Entro giugno — tariffe INAIL

- [ ] Verificare le tariffe INAIL in data/inail.json
      Fonte: Delibera CDA INAIL (pubblicata su inail.it)
      Campo da aggiornare: tassoPerMille per ogni categoria

- [ ] Aggiornare il campo updatedAt e fonte in data/inail.json

## Dopo ogni rinnovo contrattuale CCNL

- [ ] Per ogni CCNL rinnovato, aggiornare il file JSON in data/ccnl/
      Verificare: livelli e moltiplicatori, importo scatti anzianità, contributi contrattuali (Fondi, Enti bilaterali)

- [ ] Aggiornare il campo updatedAt e fonte nel JSON modificato

## Dopo ogni aggiornamento — eseguire sempre

- [ ] Rieseguire i test: npm test
      Tutti i test devono passare prima di mettere online le modifiche

- [ ] Verificare che il calcolatore mostri la data aggiornata nel disclaimer

---

**Nota**: Se il disclaimer mostra la data in rosso, significa che almeno un file JSON non è stato aggiornato da più di 12 mesi. Verificare quale file è obsoleto.

---
