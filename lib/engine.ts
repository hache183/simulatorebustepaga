import { z } from 'zod';
import { getCcnlData } from './ccnl';
import {
  calcolaInpsBase,
  calcolaAgevolazioni,
  calcolaTfr,
  calcolaInail,
  calcolaScattiAnzianita,
  calcolaInpsDomestici,
  getSettoreContributivo,
} from './contributi';
import type { CalcolatoreInput, CalcolatoreOutput, DettaglioCosto, ContributoContrattuale, NettoDipendente, AliquoteInpsData } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ALIQUOTE_INPS = require('../data/aliquote-inps.json') as AliquoteInpsData;

// Schema di validazione Zod — rifiuta qualsiasi input malformato prima del calcolo
const InputSchema = z.object({
  ccnlId: z.string().min(1, 'Seleziona un CCNL'),
  livello: z.string().min(1, 'Seleziona il livello contrattuale'),
  ral: z.number({ error: 'La RAL deve essere un numero' })
    .min(1_000, 'RAL minima: 1.000 euro')
    .max(500_000, 'RAL massima: 500.000 euro'),
  tipoContratto: z.enum(
    ['tempo_indeterminato', 'tempo_determinato'],
    { error: 'Tipo di contratto non valido' }
  ),
  oreLavoro: z.number().min(1).max(48),
  mensilita: z.number()
    .min(13, 'Il minimo di legge è 13 mensilità (tredicesima obbligatoria per R.D.L. 1525/1937)')
    .max(16, 'Massimo 16 mensilità — oltre non esiste nel diritto del lavoro italiano'),
  anzianitaAnni: z.number().min(0).max(50),
  numeroDipendenti: z.number().min(1),
  regione: z.string(),
  codiceInail: z.string(),
  agevolazioniSelezionate: z.array(z.string()),
  includiAssistenzaSanitaria: z.boolean(),
  aliquotaInps: z.number().min(0).max(0.5),
  retribuzionePersonalizzata: z.number().min(0).max(500_000).optional(),
  convivente: z.boolean().optional(),
  pagaOraria: z.number().min(0).max(500).optional(),
  oreSettimanali: z.number().min(1).max(54).optional(),
});

// Soglie sanity check volutamente ampie per evitare falsi positivi:
// il costo/RAL varia molto in base a INAIL, contributi contrattuali, agevolazioni e orario.
// Questo controllo deve intercettare solo anomalie forti (configurazioni errate), non casi legittimi.
const RANGE_SANITY = { min: 1.05, max: 2.20 };

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
    return Math.max(0, 1910 + 1190 * (28_000 - imponibile) / 13_000);
  } else if (imponibile <= 50_000) {
    return Math.max(0, 1910 * (50_000 - imponibile) / 22_000);
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
 * Calcolo dedicato per il CCNL Lavoro Domestico.
 * I contributi sono forfettari (importo fisso per ora), non percentuali.
 * INAIL è incluso nei contributi forfettari INPS.
 * Non è prevista CIG/FIS.
 */
async function calculateCostoDomestico(input: CalcolatoreInput): Promise<CalcolatoreOutput> {
  const ccnl = getCcnlData(input.ccnlId);
  const livello = ccnl.livelli.find(l => l.codice === input.livello);
  if (!livello) throw new Error(`Livello '${input.livello}' non trovato nel CCNL '${input.ccnlId}'`);

  const pagaOraria = input.pagaOraria ?? livello.minimoTabellare;
  const oreSettimanali = input.oreSettimanali ?? input.oreLavoro;
  const convivente = input.convivente ?? false;
  const mensilita = input.mensilita; // 13 per lavoro domestico

  // Indennità vitto e alloggio per conviventi
  const settoreDomestico = ALIQUOTE_INPS.settoriContributivi['domestici'] as unknown as Record<string, unknown>;
  const indennitaMensileConfigurata = Number(settoreDomestico['indennitaVittoAlloggioMensile'] ?? 0);
  const indennitaVAMensile = convivente ? indennitaMensileConfigurata : 0;
  const indennitaVAAnnua = indennitaVAMensile * 12;

  // RAL = paga oraria × ore settimanali × 52 + eventuale vitto e alloggio
  const retribuzioneBaseAnnua = pagaOraria * oreSettimanali * 52;
  const ralEffettiva = retribuzioneBaseAnnua + indennitaVAAnnua;

  // Contributi INPS forfettari (per ora lavorata)
  const inpsDom = calcolaInpsDomestici(
    ralEffettiva,
    oreSettimanali,
    convivente,
    input.tipoContratto
  );
  const contributoOrarioDatore = inpsDom.quotaDatorePerOra;
  const oreAnnuali = oreSettimanali * 52;
  const inpsDatore = inpsDom.inpsDatore;

  // TFR (Art. 2120 c.c.)
  const tfr = calcolaTfr(ralEffettiva, mensilita);

  // Scatti di anzianità (orari per il domestico)
  const costoScatti = calcolaScattiAnzianita(input.anzianitaAnni, ccnl.scattiAnzianita) * oreSettimanali * 52 / 12;

  // Tredicesima mensilità — per il lavoro domestico è aggiuntiva rispetto alla paga oraria annua
  const tredicesima = ralEffettiva / 12;

  // Totale costo datore (INAIL incluso nei contributi forfettari)
  const costoTotaleAnnuo = ralEffettiva + inpsDatore + tfr + costoScatti + tredicesima;

  const percentualeRal = ralEffettiva > 0 ? costoTotaleAnnuo / ralEffettiva : 0;

  // Voci di dettaglio
  const voci: DettaglioCosto[] = [
    {
      id: 'ral',
      categoria: 'ral',
      descrizione: `Retribuzione annua (${fmtNum(pagaOraria)}€/ora × ${oreSettimanali}h/sett × 52 sett${convivente ? ' + vitto e alloggio' : ''})`,
      importoAnnuo: ralEffettiva,
      importoMensile: ralEffettiva / 12,
      percentualeRal: 1,
    },
    ...(convivente ? [{
      id: 'vitto_alloggio',
      categoria: 'ral' as const,
      descrizione: `Indennità vitto e alloggio convivente (${fmtNum(indennitaVAMensile)}€/mese)`,
      importoAnnuo: indennitaVAAnnua,
      importoMensile: indennitaVAMensile,
      percentualeRal: ralEffettiva > 0 ? indennitaVAAnnua / ralEffettiva : 0,
      notaLegge: 'Art. 36 CCNL Lavoro Domestico — indennità vitto e alloggio per conviventi',
    }] : []),
    {
      id: 'inps',
      categoria: 'inps_azienda',
      descrizione: `Contributi INPS forfettari datore (${fmtNum(contributoOrarioDatore)}€/ora × ${oreAnnuali} ore)`,
      importoAnnuo: inpsDatore,
      importoMensile: inpsDatore / 12,
      percentualeRal: ralEffettiva > 0 ? inpsDatore / ralEffettiva : 0,
      notaLegge: 'Circolare INPS lavoro domestico — contributi forfettari orari (INAIL incluso)',
    },
    {
      id: 'tfr',
      categoria: 'tfr',
      descrizione: 'TFR — accantonamento annuo',
      importoAnnuo: tfr,
      importoMensile: tfr / 12,
      percentualeRal: ralEffettiva > 0 ? tfr / ralEffettiva : 0,
      notaLegge: 'Art. 2120 c.c. — divisore 13,5',
    },
    {
      id: 'tredicesima',
      categoria: 'tredicesima',
      descrizione: 'Tredicesima mensilità',
      importoAnnuo: tredicesima,
      importoMensile: tredicesima / 12,
      percentualeRal: ralEffettiva > 0 ? tredicesima / ralEffettiva : 0,
      notaLegge: 'CCNL Lavoro Domestico — tredicesima obbligatoria.',
    },
    ...(costoScatti > 0 ? [{
      id: 'scatti_anzianita',
      categoria: 'ccnl_contrattuale' as const,
      descrizione: `Scatti di anzianità`,
      importoAnnuo: costoScatti,
      importoMensile: costoScatti / 12,
      percentualeRal: ralEffettiva > 0 ? costoScatti / ralEffettiva : 0,
      notaLegge: 'CCNL Lavoro Domestico — scatti biennali',
    }] : []),
  ];

  // Netto dipendente — datore privato non è sostituto d'imposta, nessuna ritenuta IRPEF
  const inpsDipendenteDomestico = inpsDom.inpsDipendente;
  const nettoAnnuoDomestico = ralEffettiva - inpsDipendenteDomestico;
  const nettoDipendente = {
    ralLorda: ralEffettiva,
    inpsDipendente: inpsDipendenteDomestico,
    imponibileIrpef: nettoAnnuoDomestico,
    irpefLorda: 0,
    detrazioneLavoroDip: 0,
    bonusCuneoFiscale: 0,
    irpefNetta: 0,
    addizionaleRegionale: 0,
    addizionaleComunale: 0,
    nettoAnnuo: nettoAnnuoDomestico,
    nettoMensile12: nettoAnnuoDomestico / 12,
    nettoPerMensilita: nettoAnnuoDomestico / mensilita,
    disclaimer: 'Per il lavoro domestico il datore privato non è sostituto d\'imposta (art. 4 DPR 322/1998). IRPEF e addizionali sono gestite autonomamente dal lavoratore tramite dichiarazione dei redditi.',
  };

  return {
    input,
    costoTotaleAnnuo,
    costoTotaleMensile: costoTotaleAnnuo / 12,
    percentualeRal,
    voci,
    agevolazioniApplicate: [],
    alertScadenze: [],
    calcolatoIl: new Date().toISOString(),
    nettoDipendente,
  };
}

function fmtNum(n: number): string {
  return n.toFixed(2);
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

  // ─── BRANCH LAVORO DOMESTICO ────────────────────────────────────────────
  if (['domestici', 'domestici_conviventi', 'domestici_non_conviventi'].includes(input.ccnlId)) {
    return calculateCostoDomestico(input);
  }

  // ─── BRANCH STANDARD ───────────────────────────────────────────────────
  // Validazione aggiuntiva per CCNL standard
  if (input.ral < 10_000) throw new Error('RAL minima: 10.000 euro');
  if (input.codiceInail.length < 4) throw new Error('Seleziona la categoria INAIL');

  // 2. Carica dati CCNL
  const ccnl = getCcnlData(input.ccnlId);
  const livello = ccnl.livelli.find(l => l.codice === input.livello);
  if (!livello) throw new Error(`Livello '${input.livello}' non trovato nel CCNL '${input.ccnlId}'`);

  // Flag: il CCNL usa tariffe orarie (es. domestici). Cambia logica RAL e INPS.
  const isDomestici = ccnl.retribuzioneOraria === true;

  // 3. Calcola RAL effettiva
  let ralEffettiva: number;
  let isRetribuzionePersonalizzata = false;

  if (isDomestici) {
    // Per i domestici la RAL inserita è già l'annuo corretto per le ore lavorate
    // (tariffa oraria × ore/sett. × 52). Non si applica oreRatio.
    if (input.retribuzionePersonalizzata && input.retribuzionePersonalizzata > 0) {
      ralEffettiva = input.retribuzionePersonalizzata;
      isRetribuzionePersonalizzata = true;
    } else {
      ralEffettiva = input.ral;
    }
  } else {
    const oreRatio = input.oreLavoro / 40; // 40h = full-time di riferimento
    if (input.retribuzionePersonalizzata && input.retribuzionePersonalizzata > 0) {
      ralEffettiva = input.retribuzionePersonalizzata * oreRatio;
      isRetribuzionePersonalizzata = true;
    } else {
      ralEffettiva = input.ral * oreRatio;
    }
  }

  // Calcola superminimo informativo
  const ralTabellare = isDomestici
    ? livello.minimoTabellare * input.oreLavoro * 52
    : livello.minimoTabellare * input.mensilita;
  const superminimo = isRetribuzionePersonalizzata
    ? Math.max(0, (input.retribuzionePersonalizzata! * (isDomestici ? 1 : input.oreLavoro / 40)) - ralTabellare)
    : 0;

  // 4. Contributi INPS
  let inpsBase: number;
  let aliquotaInpsDefault: number;
  let aliquotaDipendenteDefault: number;
  let inpsFasciaNome: string | undefined;

  if (isDomestici) {
    // Circ. INPS n. 9/2026 — contributo fisso per ora (non percentuale RAL)
    const inpsDom = calcolaInpsDomestici(
      ralEffettiva,
      input.oreLavoro,
      input.convivente ?? false,
      input.tipoContratto
    );
    inpsBase = inpsDom.inpsDatore;
    aliquotaDipendenteDefault = ralEffettiva > 0 ? inpsDom.inpsDipendente / ralEffettiva : 0;
    aliquotaInpsDefault = ralEffettiva > 0 ? inpsDom.inpsDatore / ralEffettiva : 0;
    inpsFasciaNome = inpsDom.fasciaNome;
  } else {
    const settore = getSettoreContributivo(input.ccnlId, input.numeroDipendenti);
    if (!settore) {
      throw new Error(`Settore contributivo INPS non configurato per CCNL '${input.ccnlId}'`);
    }
    aliquotaInpsDefault = settore.aliquotaDatore;
    aliquotaDipendenteDefault = settore.aliquotaDipendente;
    const aliquotaInpsEffettiva = input.aliquotaInps;
    inpsBase = calcolaInpsBase(ralEffettiva, aliquotaInpsEffettiva);
  }

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

  // 7. INAIL — per i domestici è un contributo fisso annuo gestito via INPS, non per-mille RAL
  const inail = isDomestici ? 0 : calcolaInail(ralEffettiva, input.codiceInail);

  // 8. Tredicesima (tutti i CCNL) e quattordicesima (CCNL con >=14 mensilità)
  const tredicesima = ralEffettiva / 12;
  // La quattordicesima è dovuta se le mensilità effettive sono 14 o più.
  // Se le mensilità sono 15 o 16, le mensilità aggiuntive seguono la stessa
  // logica della quattordicesima: importo pari a una mensilità ordinaria ciascuna.
  // @see Prassi contrattuale italiana — mensilità aggiuntive oltre la 13a
  const quattordicesima = mensilita >= 14 ? ralEffettiva / 12 : 0;
  const quindicesimaESedicesima = mensilita >= 15 ? (ralEffettiva / 12) * (mensilita - 14) : 0;

  // 9. Contributi contrattuali specifici del CCNL (supporta fisso, fisso/ora e percentuale)
  const contributiEntries = Object.values(ccnl.contributiContrattuali.azienda) as ContributoContrattuale[];
  const contributiAttivi = input.includiAssistenzaSanitaria
    ? contributiEntries
    : contributiEntries.filter(c => c.tipo !== 'sanitario');
  const oreAnnue = input.oreLavoro * 52;
  const contributiCcnl = contributiAttivi.reduce((sum, c) => {
    if (c.modalita === 'fisso' && c.importoMensile != null) {
      // perOra: true → tariffa oraria (es. CassaColf), altrimenti importo mensile × 12
      return sum + c.importoMensile * (c.perOra ? oreAnnue : 12);
    }
    return sum + ralEffettiva * (c.percentuale ?? 0);
  }, 0);

  // 10. Scatti di anzianità (supporta importo fisso o percentuale sulla RAL)
  const costoScatti = calcolaScattiAnzianita(input.anzianitaAnni, ccnl.scattiAnzianita, ralEffettiva);

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

  // Sanity check anti-anomalia (non normativo): evita warning su casi realistici
  // e segnala solo valori chiaramente implausibili.
  if (!isDomestici && (percentualeRal < RANGE_SANITY.min || percentualeRal > RANGE_SANITY.max)) {
    console.warn(
      `[engine] Attenzione: costo ${(percentualeRal * 100).toFixed(1)}% della RAL — ` +
      `fuori dal range di sanity ${RANGE_SANITY.min * 100}%-${RANGE_SANITY.max * 100}%. ` +
      `Verifica input, aliquote e configurazioni CCNL/INAIL.`
    );
  }

  // 12. Assembla le voci di dettaglio
  const notaInps = isDomestici
    ? `Fascia: ${inpsFasciaNome} — Circ. INPS n. 9/2026`
    : input.aliquotaInps !== aliquotaInpsDefault
      ? `Aliquota ${(input.aliquotaInps * 100).toFixed(2)}% — personalizzata dall'utente`
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
      descrizione: isDomestici
        ? 'INAIL domestici — contributo fisso annuo (non incluso: gestito tramite INPS-Cassa Domestici)'
        : 'Premio INAIL (tasso medio nazionale — il tasso effettivo della vostra azienda dipende dall\'oscillazione per andamento infortunistico e può variare significativamente)',
      importoAnnuo: inail,
      importoMensile: inail / 12,
      percentualeRal: inail / ralEffettiva,
      notaLegge: isDomestici
        ? 'Il premio INAIL per i lavoratori domestici è un importo fisso annuo (≈€1.040/anno) versato con i contributi INPS trimestrali tramite bollettino MAV/F24.'
        : 'D.P.R. 1124/1965 — Testo Unico INAIL. Tasso medio di tariffa: l\'oscillazione individuale può variare ±40%.',
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
