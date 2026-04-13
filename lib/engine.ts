import { z } from 'zod';
import { getCcnlData } from './ccnl';
import {
  calcolaInpsBase,
  calcolaAgevolazioni,
  calcolaTfr,
  calcolaInail,
  calcolaScattiAnzianita,
  getSettoreContributivo,
} from './contributi';
import type { CalcolatoreInput, CalcolatoreOutput, DettaglioCosto, ContributoContrattuale, NettoDipendente } from '@/types';

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
  includiAssistenzaSanitaria: z.boolean(),
  aliquotaInps: z.number().min(0).max(0.5),
  retribuzionePersonalizzata: z.number().min(0).max(500_000).optional(),
});

// Soglie sanity check: il costo totale deve essere tra il 128% e il 150% della RAL.
// Se è fuori range, probabilmente c'è un errore nelle aliquote JSON.
const RANGE_ATTESO = { min: 1.28, max: 1.60 };

/**
 * Calcola IRPEF lorda per scaglioni 2025-2026 (L. 207/2024, aggiornata da L. 199/2025).
 * Dal 2025 il secondo scaglione passa dal 35% al 33% (art. 1 L. 199/2025).
 */
function calcolaIrpefLorda(imponibile: number): number {
  if (imponibile <= 28_000) {
    return imponibile * 0.23;
  } else if (imponibile <= 50_000) {
    return 28_000 * 0.23 + (imponibile - 28_000) * 0.33;
  } else {
    return 28_000 * 0.23 + 22_000 * 0.33 + (imponibile - 50_000) * 0.43;
  }
}

/**
 * Calcola detrazione per lavoro dipendente (art. 13 TUIR post-riforma).
 * La detrazione minima è 690€ per tempo indeterminato, 1.380€ per tempo determinato.
 */
function calcolaDetrazioneLavoroDip(imponibile: number, tipoContratto: string): number {
  const detrazioneMinima = tipoContratto === 'tempo_determinato' ? 1380 : 690;
  if (imponibile <= 15_000) {
    return Math.max(1955, detrazioneMinima);
  } else if (imponibile <= 28_000) {
    return 1910 + 1190 * (28_000 - imponibile) / 13_000;
  } else if (imponibile <= 50_000) {
    return 1910 * (50_000 - imponibile) / 22_000;
  }
  return 0;
}

/**
 * Calcola bonus cuneo fiscale 2025 (L. 207/2024, art. 1 cc. 4-9).
 * Sostituisce il taglio contributivo. Per redditi fino a 20k è un bonus non tassabile
 * con tre sotto-fasce (7.1%, 5.3%, 4.8%), per redditi 20k-40k è una detrazione IRPEF aggiuntiva.
 */
function calcolaBonusCuneoFiscale(redditoComplessivo: number): number {
  if (redditoComplessivo <= 8_500) {
    return redditoComplessivo * 0.071;
  } else if (redditoComplessivo <= 15_000) {
    return 8_500 * 0.071 + (redditoComplessivo - 8_500) * 0.053;
  } else if (redditoComplessivo <= 20_000) {
    return 8_500 * 0.071 + 6_500 * 0.053 + (redditoComplessivo - 15_000) * 0.048;
  } else if (redditoComplessivo <= 32_000) {
    return 1_000;
  } else if (redditoComplessivo <= 40_000) {
    return 1_000 * (40_000 - redditoComplessivo) / 8_000;
  }
  return 0;
}

/**
 * Calcola il netto mensile stimato del dipendente.
 */
function calcolaNettoDipendente(
  ral: number,
  mensilita: number,
  aliquotaInpsDipendente: number,
  tipoContratto: string,
): NettoDipendente {
  // STEP 2 — Contributi INPS dipendente
  const inpsDipendente = ral * aliquotaInpsDipendente;

  // STEP 3 — Imponibile IRPEF
  const imponibileIrpef = ral - inpsDipendente;

  // STEP 4 — IRPEF lorda
  const irpefLorda = calcolaIrpefLorda(imponibileIrpef);

  // STEP 5 — Detrazioni lavoro dipendente
  const detrazioneLavoroDip = calcolaDetrazioneLavoroDip(imponibileIrpef, tipoContratto);

  // STEP 6 — Bonus cuneo fiscale 2025
  const bonusCuneoFiscale = calcolaBonusCuneoFiscale(imponibileIrpef);

  // STEP 7 — IRPEF netta
  const irpefNetta = Math.max(0, irpefLorda - detrazioneLavoroDip - bonusCuneoFiscale);

  // STEP 8 — Addizionali (stima media nazionale — varia per regione/comune.
  // Regionale: da 0,90% (Bolzano) a 3,33% (Lazio/Campania fascia alta). Media ~1,73%.
  // Comunale: da 0% a 0,90%. Media ~0,80%.
  const addizionaleRegionale = imponibileIrpef * 0.0173;
  const addizionaleComunale = imponibileIrpef * 0.008;

  // STEP 9 — Netto
  const nettoAnnuo = ral - inpsDipendente - irpefNetta - addizionaleRegionale - addizionaleComunale;
  const nettoMensile12 = nettoAnnuo / 12;
  const nettoPerMensilita = nettoAnnuo / mensilita;

  return {
    ralLorda: ral,
    inpsDipendente,
    imponibileIrpef,
    irpefLorda,
    detrazioneLavoroDip,
    bonusCuneoFiscale,
    irpefNetta,
    addizionaleRegionale,
    addizionaleComunale,
    nettoAnnuo,
    nettoMensile12,
    nettoPerMensilita,
    disclaimer: 'Il netto è una stima indicativa. Il calcolo esatto dipende dalla situazione fiscale personale del dipendente (carichi familiari, detrazioni aggiuntive, addizionali comunali/regionali specifiche).',
  };
}

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
  let ralEffettiva: number;
  let isRetribuzionePersonalizzata = false;
  if (input.retribuzionePersonalizzata && input.retribuzionePersonalizzata > 0) {
    ralEffettiva = input.retribuzionePersonalizzata * oreRatio;
    isRetribuzionePersonalizzata = true;
  } else {
    ralEffettiva = input.ral * oreRatio;
  }

  // Calcola superminimo informativo
  const ralTabellare = livello.minimoTabellare * input.mensilita;
  const superminimo = isRetribuzionePersonalizzata
    ? Math.max(0, input.retribuzionePersonalizzata! - ralTabellare)
    : 0;

  // 4. Contributi INPS lordi — auto-select settore se l'utente non ha personalizzato
  const settore = getSettoreContributivo(input.ccnlId, input.numeroDipendenti);
  const aliquotaInpsDefault = settore ? settore.aliquotaDatore : 0.288;
  const aliquotaDipendenteDefault = settore ? settore.aliquotaDipendente : 0.0919;
  const aliquotaInpsEffettiva = input.aliquotaInps;
  const inpsBase = calcolaInpsBase(ralEffettiva, aliquotaInpsEffettiva);

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

  // 9. Contributi contrattuali specifici del CCNL (supporta fisso e percentuale)
  const contributiEntries = Object.values(ccnl.contributiContrattuali.azienda) as ContributoContrattuale[];
  const contributiAttivi = input.includiAssistenzaSanitaria
    ? contributiEntries
    : contributiEntries.filter(c => c.tipo !== 'sanitario');
  const contributiCcnl = contributiAttivi.reduce((sum, c) => {
    if (c.modalita === 'fisso' && c.importoMensile != null) {
      return sum + c.importoMensile * 12;
    }
    return sum + ralEffettiva * (c.percentuale ?? 0);
  }, 0);

  // 10. Scatti di anzianità
  const costoScatti = calcolaScattiAnzianita(input.anzianitaAnni, ccnl.scattiAnzianita);

  // 10b. Elementi aggiuntivi CCNL (EDR, ex festività, contributo solidarietà, ecc.)
  let costoElementiAggiuntivi = 0;
  if (ccnl.elementiAggiuntivi) {
    for (const elem of Object.values(ccnl.elementiAggiuntivi)) {
      // Includi solo gli elementi senza condizione (sempre dovuti)
      // o con condizione specifica — per ora includiamo tutti quelli senza condizione
      if (elem.condizione === null || elem.condizione === undefined) {
        costoElementiAggiuntivi += elem.importoMensile * elem.mensilita;
      }
    }
  }

  // 11. Totale
  // NOTA: la RAL include già tutte le mensilità (es. 1541.77 × 14 = 21584.78),
  // quindi tredicesima, quattordicesima e mensilità extra NON vanno aggiunte al totale
  // — sono solo voci informative che mostrano la scomposizione della RAL.
  const costoTotaleAnnuo =
    ralEffettiva + inpsNetto + tfr + inail +
    contributiCcnl + costoScatti + costoElementiAggiuntivi;

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
  const notaInps = aliquotaInpsEffettiva !== aliquotaInpsDefault
    ? `Aliquota ${(aliquotaInpsEffettiva * 100).toFixed(2)}% — personalizzata dall'utente`
    : 'Circ. INPS n. 99/2023 — aliquota base 28,80%';

  const notaRal = isRetribuzionePersonalizzata
    ? 'Retribuzione concordata tra le parti — art. 2099 c.c.'
    : undefined;

  const notaCcnl = !input.includiAssistenzaSanitaria
    ? `CCNL ${ccnl.nome} — assistenza sanitaria esclusa`
    : `CCNL ${ccnl.nome}`;

  const voci: DettaglioCosto[] = [
    {
      id: 'ral',
      categoria: 'ral',
      descrizione: 'Retribuzione annua lorda (RAL effettiva)',
      importoAnnuo: ralEffettiva,
      importoMensile: ralEffettiva / 12,
      percentualeRal: 1,
      notaLegge: notaRal,
    },
    ...(isRetribuzionePersonalizzata && superminimo > 0
      ? [{
          id: 'superminimo',
          categoria: 'ral' as const,
          descrizione: `Superminimo (differenza rispetto al minimo tabellare)`,
          importoAnnuo: 0,
          importoMensile: 0,
          percentualeRal: 0,
          notaLegge: `Art. 2099 c.c. — superminimo individuale o collettivo: €${(superminimo / 12).toFixed(2)}/mese (€${superminimo.toFixed(2)}/anno)`,
        }]
      : []),
    {
      id: 'inps',
      categoria: 'inps_azienda',
      descrizione: 'Contributi INPS datoriali (netti da agevolazioni)',
      importoAnnuo: inpsNetto,
      importoMensile: inpsNetto / 12,
      percentualeRal: inpsNetto / ralEffettiva,
      notaLegge: notaInps,
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
      descrizione: 'Premio INAIL (tasso medio nazionale — il tasso effettivo della vostra azienda dipende dall\'oscillazione per andamento infortunistico e può variare significativamente)',
      importoAnnuo: inail,
      importoMensile: inail / 12,
      percentualeRal: inail / ralEffettiva,
      notaLegge: 'D.P.R. 1124/1965 — Testo Unico INAIL. Tasso medio di tariffa: l\'oscillazione individuale può variare ±40%.',
    },
    {
      id: 'tredicesima',
      categoria: 'tredicesima',
      descrizione: 'Tredicesima mensilità (già inclusa nella RAL)',
      importoAnnuo: tredicesima,
      importoMensile: tredicesima / 12,
      percentualeRal: tredicesima / ralEffettiva,
      notaLegge: 'CCNL — obbligatoria per tutti i lavoratori dipendenti. Voce informativa: importo già compreso nella RAL.',
    },
    ...(quattordicesima > 0
      ? [{
          id: 'quattordicesima',
          categoria: 'quattordicesima' as const,
          descrizione: 'Quattordicesima mensilità (già inclusa nella RAL)',
          importoAnnuo: quattordicesima,
          importoMensile: quattordicesima / 12,
          percentualeRal: quattordicesima / ralEffettiva,
          notaLegge: 'CCNL — prevista per CCNL con 14+ mensilità. Voce informativa: importo già compreso nella RAL.',
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
      notaLegge: notaCcnl,
    },
    {
      id: 'scatti_anzianita',
      categoria: 'ccnl_contrattuale',
      descrizione: `Scatti di anzianità (${Math.min(Math.floor(input.anzianitaAnni / (ccnl.scattiAnzianita.periodicitaMesi / 12)), ccnl.scattiAnzianita.maxScatti)} scatti maturati)`,
      importoAnnuo: costoScatti,
      importoMensile: costoScatti / 12,
      percentualeRal: costoScatti / ralEffettiva,
      notaLegge: 'CCNL — scatti di anzianità',
    },
    ...(costoElementiAggiuntivi > 0
      ? [{
          id: 'elementi_aggiuntivi',
          categoria: 'ccnl_contrattuale' as const,
          descrizione: 'Elementi aggiuntivi CCNL (ex festività, festività non godute, contributo solidarietà)',
          importoAnnuo: costoElementiAggiuntivi,
          importoMensile: costoElementiAggiuntivi / 12,
          percentualeRal: costoElementiAggiuntivi / ralEffettiva,
          notaLegge: `CCNL ${ccnl.nome} — elementi retributivi indiretti`,
        }]
      : []),
  ];

  // 13. Calcolo netto dipendente
  const nettoDipendente = calcolaNettoDipendente(ralEffettiva, mensilita, aliquotaDipendenteDefault, input.tipoContratto);

  return {
    input,
    costoTotaleAnnuo,
    costoTotaleMensile: costoTotaleAnnuo / 12,
    percentualeRal,
    voci,
    agevolazioniApplicate,
    alertScadenze,
    calcolatoIl: new Date().toISOString(),
    nettoDipendente,
  };
}
