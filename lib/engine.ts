import { z } from 'zod';
import { getCcnlData } from './ccnl';
import {
  calcolaInpsBase,
  calcolaAgevolazioni,
  calcolaTfr,
  calcolaInail,
  calcolaScattiAnzianita,
} from './contributi';
import type { CalcolatoreInput, CalcolatoreOutput, DettaglioCosto } from '@/types';

// Schema di validazione Zod — rifiuta qualsiasi input malformato prima del calcolo
const InputSchema = z.object({
  ccnlId: z.string().min(1, 'Seleziona un CCNL'),
  livello: z.string().min(1, 'Seleziona il livello contrattuale'),
  ral: z.number({ error: 'La RAL deve essere un numero' })
    .min(10_000, 'RAL minima: 10.000 euro')
    .max(500_000, 'RAL massima: 500.000 euro'),
  tipoContratto: z.enum(
    ['tempo_indeterminato', 'tempo_determinato', 'apprendistato', 'somministrazione'],
    { error: 'Tipo di contratto non valido' }
  ),
  oreLavoro: z.number().min(1).max(48),
  mensilita: z.number()
    .min(13, 'Il minimo di legge è 13 mensilità (tredicesima obbligatoria per R.D.L. 1525/1937)')
    .max(16, 'Massimo 16 mensilità — oltre non esiste nel diritto del lavoro italiano'),
  anzianitaAnni: z.number().min(0).max(50),
  numeroDipendenti: z.number().min(1),
  regione: z.string().min(1, 'Seleziona la regione'),
  codiceInail: z.string().min(4, 'Seleziona la categoria INAIL'),
  agevolazioniSelezionate: z.array(z.string()),
});

// Soglie sanity check: il costo totale deve essere tra il 128% e il 150% della RAL.
// Se è fuori range, probabilmente c'è un errore nelle aliquote JSON.
const RANGE_ATTESO = { min: 1.28, max: 1.50 };

/**
 * Funzione principale del calcolatore.
 * Valida l'input, orchestra tutti i moduli di calcolo, restituisce il costo voce per voce.
 * @see Art. 2120 c.c., Legge 178/2020, Circ. INPS 99/2023, D.P.R. 1124/1965
 * @throws {z.ZodError} Se l'input non supera la validazione
 * @throws {Error} Se un CCNL o un codice INAIL non esiste
 */
export async function calculateCosto(rawInput: unknown): Promise<CalcolatoreOutput> {
  // 1. Validazione input
  const input = InputSchema.parse(rawInput) as CalcolatoreInput;

  // 2. Carica dati CCNL
  const ccnl = getCcnlData(input.ccnlId);
  const livello = ccnl.livelli.find(l => l.codice === input.livello);
  if (!livello) throw new Error(`Livello '${input.livello}' non trovato nel CCNL '${input.ccnlId}'`);

  // 3. Calcola RAL effettiva (aggiustata per livello e part-time)
  const oreRatio = input.oreLavoro / 40; // 40h = full-time di riferimento
  const ralEffettiva = input.ral * livello.moltiplicatore * oreRatio;

  // 4. Contributi INPS lordi
  const inpsBase = calcolaInpsBase(ralEffettiva);

  // 5. Agevolazioni e risparmio contributivo
  const { agevolazioniApplicate, risparmioTotale, alertScadenze } =
    calcolaAgevolazioni({ ...input, ral: ralEffettiva });

  const inpsNetto = Math.max(0, inpsBase - risparmioTotale);

  // 6. TFR (Art. 2120 c.c.)
  // Usa le mensilità dall'input utente, non dal JSON del CCNL.
  // Il JSON contiene il default contrattuale; l'utente può averlo modificato
  // per accordo aziendale integrativo (art. 2077 c.c.)
  const mensilita = input.mensilita;
  const tfr = calcolaTfr(ralEffettiva, mensilita);

  // 7. INAIL
  const inail = calcolaInail(ralEffettiva, input.codiceInail);

  // 8. Tredicesima (tutti i CCNL) e quattordicesima (CCNL con >=14 mensilità)
  const tredicesima = ralEffettiva / 12;
  // La quattordicesima è dovuta se le mensilità effettive sono 14 o più.
  // Se le mensilità sono 15 o 16, le mensilità aggiuntive seguono la stessa
  // logica della quattordicesima: importo pari a una mensilità ordinaria ciascuna.
  // @see Prassi contrattuale italiana — mensilità aggiuntive oltre la 13a
  const quattordicesima = mensilita >= 14 ? ralEffettiva / 12 : 0;
  const quindicesimaESedicesima = mensilita >= 15 ? (ralEffettiva / 12) * (mensilita - 14) : 0;

  // 9. Contributi contrattuali specifici del CCNL
  const contributiCcnl = Object.values(ccnl.contributiContrattuali.azienda)
    .reduce((sum, c) => sum + ralEffettiva * c.percentuale, 0);

  // 10. Scatti di anzianità
  const costoScatti = calcolaScattiAnzianita(input.anzianitaAnni, ccnl.scattiAnzianita);

  // 11. Totale
  const costoTotaleAnnuo =
    ralEffettiva + inpsNetto + tfr + inail +
    tredicesima + quattordicesima + quindicesimaESedicesima +
    contributiCcnl + costoScatti;

  const percentualeRal = costoTotaleAnnuo / ralEffettiva;

  // Sanity check — logga un warning se il risultato è fuori range atteso
  if (percentualeRal < RANGE_ATTESO.min || percentualeRal > RANGE_ATTESO.max) {
    console.warn(
      `[engine] Attenzione: costo ${(percentualeRal * 100).toFixed(1)}% della RAL — ` +
      `fuori dal range atteso ${RANGE_ATTESO.min * 100}%-${RANGE_ATTESO.max * 100}%. ` +
      `Verifica le aliquote nei file JSON.`
    );
  }

  // 12. Assembla le voci di dettaglio
  const voci: DettaglioCosto[] = [
    {
      id: 'ral',
      categoria: 'ral',
      descrizione: 'Retribuzione annua lorda (RAL effettiva)',
      importoAnnuo: ralEffettiva,
      importoMensile: ralEffettiva / 12,
      percentualeRal: 1,
    },
    {
      id: 'inps',
      categoria: 'inps_azienda',
      descrizione: 'Contributi INPS datoriali (netti da agevolazioni)',
      importoAnnuo: inpsNetto,
      importoMensile: inpsNetto / 12,
      percentualeRal: inpsNetto / ralEffettiva,
      notaLegge: 'Circ. INPS n. 99/2023 — aliquota base 28,80%',
    },
    {
      id: 'tfr',
      categoria: 'tfr',
      descrizione: 'TFR — accantonamento annuo',
      importoAnnuo: tfr,
      importoMensile: tfr / 12,
      percentualeRal: tfr / ralEffettiva,
      notaLegge: 'Art. 2120 c.c. — divisore 13,5',
    },
    {
      id: 'inail',
      categoria: 'inail',
      descrizione: 'Premio INAIL',
      importoAnnuo: inail,
      importoMensile: inail / 12,
      percentualeRal: inail / ralEffettiva,
      notaLegge: 'D.P.R. 1124/1965 — Testo Unico INAIL',
    },
    {
      id: 'tredicesima',
      categoria: 'tredicesima',
      descrizione: 'Tredicesima mensilità',
      importoAnnuo: tredicesima,
      importoMensile: tredicesima / 12,
      percentualeRal: tredicesima / ralEffettiva,
      notaLegge: 'CCNL — obbligatoria per tutti i lavoratori dipendenti',
    },
    ...(quattordicesima > 0
      ? [{
          id: 'quattordicesima',
          categoria: 'quattordicesima' as const,
          descrizione: 'Quattordicesima mensilità',
          importoAnnuo: quattordicesima,
          importoMensile: quattordicesima / 12,
          percentualeRal: quattordicesima / ralEffettiva,
          notaLegge: 'CCNL — prevista per CCNL con 14+ mensilità',
        }]
      : []),
    ...(quindicesimaESedicesima > 0
      ? [{
          id: 'mensilita_extra',
          categoria: 'tredicesima' as const,
          descrizione: `Mensilità aggiuntive (${mensilita - 14}a oltre la 14a — accordo aziendale)`,
          importoAnnuo: quindicesimaESedicesima,
          importoMensile: quindicesimaESedicesima / 12,
          percentualeRal: quindicesimaESedicesima / ralEffettiva,
          notaLegge: 'Contrattazione di secondo livello — art. 2077 c.c.',
        }]
      : []),
    {
      id: 'contributi_ccnl',
      categoria: 'ccnl_contrattuale',
      descrizione: 'Contributi contrattuali CCNL (Fondo Est, Ebiter, ecc.)',
      importoAnnuo: contributiCcnl,
      importoMensile: contributiCcnl / 12,
      percentualeRal: contributiCcnl / ralEffettiva,
      notaLegge: `CCNL ${ccnl.nome}`,
    },
    {
      id: 'scatti_anzianita',
      categoria: 'ccnl_contrattuale',
      descrizione: `Scatti di anzianità (${Math.min(Math.floor(input.anzianitaAnni / (ccnl.scattiAnzianita.periodicitaMesi / 12)), ccnl.scattiAnzianita.maxScatti)} scatti maturati)`,
      importoAnnuo: costoScatti,
      importoMensile: costoScatti / 12,
      percentualeRal: costoScatti / ralEffettiva,
      notaLegge: 'CCNL — scatti biennali di anzianità',
    },
  ];

  return {
    input,
    costoTotaleAnnuo,
    costoTotaleMensile: costoTotaleAnnuo / 12,
    percentualeRal,
    voci,
    agevolazioniApplicate,
    alertScadenze,
    calcolatoIl: new Date().toISOString(),
  };
}
