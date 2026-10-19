import { z } from 'zod';
import { getCcnlData } from './ccnl';
import {
  calcolaInpsBase,
  calcolaTfr,
  calcolaInail,
  calcolaScattiAnzianita,
  calcolaInpsDomestici,
  getSettoreContributivo,
} from './contributi';
import type { CalcolatoreInput, CalcolatoreOutput, DettaglioCosto, ContributoContrattuale } from '@/types';
import { calcolaNettoDaRedditoLordoEinpsPerc, DISCLAIMER_NETTO_DIPENDENTE } from '@/lib/irpef-lavoro-dipendente';
import { calcolaRetribuzioneDomestici, round2 } from '@/lib/domestici';
import { calcolaEdili, isEdiliCcnlId } from '@/lib/edili';
import {
  ASSISTENZA_SANITARIA_FORFAIT_ANNUO,
  NOTA_ASSISTENZA_SANITARIA_FORFAIT,
  NOTA_FERIE_NON_GODUTE_SEMPLIFICATA,
  ORE_FERIE_NON_GODUTE_FISSE,
} from '@/lib/costanti-consulente';

// Schema di validazione Zod — rifiuta qualsiasi input malformato prima del calcolo
const InputSchema = z.object({
  ccnlId: z.string().min(1, 'Seleziona un CCNL'),
  livello: z.string().min(1, 'Seleziona il livello contrattuale'),
  ral: z.number({ error: 'La RAL deve essere un numero' })
    .min(1, 'RAL minima: 1 euro')
    .max(500_000, 'RAL massima: 500.000 euro'),
  tipoContratto: z.enum(
    ['tempo_indeterminato', 'tempo_determinato'],
    { error: 'Tipo di contratto non valido' }
  ),
  oreLavoro: z.number().min(1).max(80),
  mensilita: z.number()
    .min(12, 'Minimo 12 mensilità')
    .max(16, 'Massimo 16 mensilità — oltre non esiste nel diritto del lavoro italiano'),
  anzianitaAnni: z.number().min(0).max(50),
  numeroDipendenti: z.number().min(1),
  regione: z.string(),
  codiceInail: z.string(),
  agevolazioniSelezionate: z.array(z.string()),
  includiAssistenzaSanitaria: z.boolean(),
  aliquotaInps: z.number().min(0).max(0.5),
  quotaNonGodute: z.number().min(0).max(1).optional(),
  retribuzionePersonalizzata: z.number().min(0).max(500_000).optional(),
  convivente: z.boolean().optional(),
  pagaOraria: z.number().min(0).max(500).optional(),
  oreSettimanali: z.number().min(1).max(80).optional(),
  includiCassaColf: z.boolean().optional(),
  sostituzioneTitolare: z.boolean().optional(),
  oreNonGodute: z.number().min(0).max(2000).optional(),
  oreAssenzeAnnue: z.number().min(0).max(2000).optional(),
});

// Soglie sanity check volutamente ampie per evitare falsi positivi:
// il costo/RAL varia molto in base a INAIL, contributi contrattuali, agevolazioni e orario.
// Questo controllo deve intercettare solo anomalie forti (configurazioni errate), non casi legittimi.
const RANGE_SANITY = { min: 1.05, max: 2.20 };

/**
 * Calcolo dedicato per il CCNL Lavoro Domestico.
 * I contributi sono forfettari (importo fisso per ora), non percentuali.
 * INAIL è incluso nei contributi forfettari INPS.
 * Non è prevista CIG/FIS.
 */
async function calculateCostoDomestico(input: CalcolatoreInput): Promise<CalcolatoreOutput> {
  const convivente = input.convivente === true || input.ccnlId === 'domestici_conviventi';
  const oreInserite = input.oreSettimanali ?? input.oreLavoro;
  const ret = calcolaRetribuzioneDomestici({
    convivente,
    livello: input.livello,
    oreSettimanali: oreInserite,
    pagaOrariaInserita: input.pagaOraria,
    sostituzioneTitolare: input.sostituzioneTitolare,
    mensilita: input.mensilita,
  });

  const ccnl = getCcnlData(convivente ? 'domestici_conviventi' : 'domestici');
  const ccnlNonConv = getCcnlData('domestici');
  const ralEffettiva = ret.ral;
  const mensilita = ret.mensilita;
  const oreSettimanali = ret.oreSettimanali;

  const inpsDom = calcolaInpsDomestici(
    ralEffettiva,
    oreSettimanali,
    convivente,
    input.tipoContratto,
    ret.regime === 'non_convivente' || ret.regime === 'convivente_c' ? ret.pagaOraria : undefined,
  );
  const oreAnnuali = oreSettimanali * 52;
  const inpsDatore = inpsDom.inpsDatore;
  const tfr = calcolaTfr(ralEffettiva, mensilita);
  const costoScatti = calcolaScattiAnzianita(input.anzianitaAnni, ccnl.scattiAnzianita, ralEffettiva);

  const cassa = ccnlNonConv.contributiContrattuali.azienda.cassaColf;
  const quotaCassaOra = cassa?.perOra ? (cassa.importoMensile ?? 0) : 0;
  const cassaColf = input.includiCassaColf ? round2(quotaCassaOra * oreAnnuali) : 0;

  // Ferie non godute (non conviventi): Y = (173 × ore settimanali) / 40, costo = Y × paga oraria.
  const ORE_FR_DOMESTICI = 173;
  const oreEquivalentiFr = round2((ORE_FR_DOMESTICI * oreSettimanali) / 40);
  const oreManuali = input.oreNonGodute ?? 0;
  const oreNonGodute = oreManuali > 0 ? oreManuali : oreEquivalentiFr;
  const quotaNonGodute = input.quotaNonGodute ?? 1;
  const costoFerie = ret.regime === 'non_convivente'
    ? round2(oreNonGodute * ret.pagaOraria * quotaNonGodute)
    : 0;

  // La tredicesima è informativa e già dentro la RAL (mensile × mensilità).
  const tredicesima = mensilita > 0 ? ralEffettiva / mensilita : 0;
  const costoTotaleAnnuo = ralEffettiva + inpsDatore + tfr + costoScatti + cassaColf + costoFerie;
  const percentualeRal = ralEffettiva > 0 ? costoTotaleAnnuo / ralEffettiva : 0;
  const pct = (n: number) => (ralEffettiva > 0 ? n / ralEffettiva : 0);

  const notaFerie = oreManuali > 0
    ? `${oreNonGodute} h (inserite) × ${fmtNum(ret.pagaOraria)}€/h`
    : `${oreEquivalentiFr} h (173×${oreSettimanali}/40) × ${fmtNum(ret.pagaOraria)}€/h`;

  const voci: DettaglioCosto[] = [
    {
      id: 'ral',
      categoria: 'ral',
      descrizione: ret.descrizioneRal,
      importoAnnuo: ralEffettiva,
      importoMensile: ralEffettiva / 12,
      percentualeRal: 1,
    },
    {
      id: 'inps',
      categoria: 'inps_azienda',
      descrizione: `Contributi INPS forfettari datore (${fmtNum(inpsDom.quotaDatorePerOra)}€/ora × ${oreAnnuali} ore)`,
      importoAnnuo: inpsDatore,
      importoMensile: inpsDatore / 12,
      percentualeRal: pct(inpsDatore),
      notaLegge: `Fascia: ${inpsDom.fasciaNome}`,
    },
    {
      id: 'tfr',
      categoria: 'tfr',
      descrizione: 'TFR — accantonamento annuo',
      importoAnnuo: tfr,
      importoMensile: tfr / 12,
      percentualeRal: pct(tfr),
      notaLegge: 'Art. 2120 c.c. — divisore 13,5',
    },
    {
      id: 'inail',
      categoria: 'inail',
      descrizione: 'INAIL domestici — contributo fisso annuo (non incluso: gestito tramite INPS-Cassa Domestici)',
      importoAnnuo: 0,
      importoMensile: 0,
      percentualeRal: 0,
      notaLegge: 'Il premio INAIL per i lavoratori domestici è un importo fisso annuo versato con i contributi INPS trimestrali.',
    },
    {
      id: 'tredicesima',
      categoria: 'tredicesima',
      descrizione: 'Tredicesima mensilità (già inclusa nella retribuzione annua)',
      importoAnnuo: tredicesima,
      importoMensile: tredicesima / 12,
      percentualeRal: pct(tredicesima),
      notaLegge: 'Voce informativa: importo già compreso nella retribuzione annua. Non si somma al costo.',
    },
    {
      id: 'contributi_ccnl',
      categoria: 'ccnl_contrattuale',
      descrizione: 'Cassacolf',
      importoAnnuo: cassaColf,
      importoMensile: cassaColf / 12,
      percentualeRal: pct(cassaColf),
      notaLegge: input.includiCassaColf
        ? `Quota oraria datoriale ${fmtNum(quotaCassaOra)}€ × ${oreAnnuali} ore`
        : 'CassaColf esclusa',
    },
    ...(costoScatti > 0 ? [{
      id: 'scatti_anzianita',
      categoria: 'ccnl_contrattuale' as const,
      descrizione: 'Scatti di anzianità',
      importoAnnuo: costoScatti,
      importoMensile: costoScatti / 12,
      percentualeRal: pct(costoScatti),
      notaLegge: 'CCNL Lavoro Domestico — scatti biennali',
    }] : []),
    ...(ret.regime === 'non_convivente' ? [{
      id: 'ferie_permessi_festivita',
      categoria: 'ccnl_contrattuale' as const,
      descrizione: 'Ferie, permessi e festività non godute',
      importoAnnuo: costoFerie,
      importoMensile: costoFerie / 12,
      percentualeRal: pct(costoFerie),
      notaLegge: notaFerie,
    }] : []),
  ];

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
    nettoPerMensilita: mensilita > 0 ? nettoAnnuoDomestico / mensilita : 0,
    disclaimer: 'Netto da busta senza IRPEF. Per il lavoro domestico il datore privato non è sostituto d\'imposta (art. 4 DPR 322/1998). IRPEF e addizionali sono gestite autonomamente dal lavoratore tramite dichiarazione dei redditi.',
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

function importoContributoContrattuale(c: ContributoContrattuale, ral: number, oreAnnue: number): number {
  if (c.modalita === 'fisso' && c.importoMensile != null) {
    const mesi = c.mensilitaMaturazione ?? 12;
    return c.importoMensile * (c.perOra ? oreAnnue : mesi);
  }
  return ral * (c.percentuale ?? 0);
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

  if (isEdiliCcnlId(input.ccnlId)) {
    return calcolaEdili(input);
  }

  // ─── BRANCH STANDARD ───────────────────────────────────────────────────
  // Validazione aggiuntiva per CCNL standard
  if (input.mensilita < 13) {
    throw new Error('Il minimo di legge è 13 mensilità (tredicesima obbligatoria per R.D.L. 1525/1937)');
  }
  if (input.oreLavoro > 48) throw new Error('Ore settimanali massime: 48');
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
    inpsFasciaNome = inpsDom.fasciaNome;
  } else {
    const settore = getSettoreContributivo(input.ccnlId, input.numeroDipendenti);
    if (!settore) {
      throw new Error(`Settore contributivo INPS non configurato per CCNL '${input.ccnlId}'`);
    }
    aliquotaDipendenteDefault = settore.aliquotaDipendente;
    const aliquotaInpsEffettiva = input.aliquotaInps;
    inpsBase = calcolaInpsBase(ralEffettiva, aliquotaInpsEffettiva);
  }

  // 5. Il costo dipendenti è il lordo contributivo pieno: le agevolazioni
  // non si sottraggono (il report non le applica).
  const inpsNetto = inpsBase;

  // 6. TFR (Art. 2120 c.c.)
  // Usa le mensilità dall'input utente, non dal JSON del CCNL.
  // Il JSON contiene il default contrattuale; l'utente può averlo modificato
  // per accordo aziendale integrativo (art. 2077 c.c.)
  const mensilita = input.mensilita;
  const tfr = calcolaTfr(ralEffettiva, mensilita);

  // 7. INAIL — per i domestici è un contributo fisso annuo gestito via INPS, non per-mille RAL
  const inail = isDomestici ? 0 : calcolaInail(ralEffettiva, input.codiceInail);

  // 8. 13ª e 14ª sono informative e già dentro la RAL.
  // Stesso divisore per entrambe: RAL / numero mensilità (non /12, non 173 ore).
  const quotaMensilita = ralEffettiva / mensilita;
  const tredicesima = quotaMensilita;
  const quattordicesima = mensilita >= 14 ? quotaMensilita : 0;
  const quindicesimaESedicesima = mensilita >= 15 ? quotaMensilita * (mensilita - 14) : 0;

  // 9. Contributi contrattuali: assistenza sanitaria e ente bilaterale su righe distinte
  const contributiEntries = Object.entries(ccnl.contributiContrattuali.azienda) as [string, ContributoContrattuale][];
  const oreAnnue = input.oreLavoro * 52;
  const bilaterali = contributiEntries.filter(([, c]) => c.tipo === 'bilaterale');
  const altriContributi = contributiEntries.filter(
    ([, c]) => c.tipo !== 'sanitario' && c.tipo !== 'bilaterale' && c.tipo !== 'previdenziale',
  );
  const importoSanitario = ASSISTENZA_SANITARIA_FORFAIT_ANNUO;
  const importoBilaterali = bilaterali.map(([, c]) => importoContributoContrattuale(c, ralEffettiva, oreAnnue));
  const importoAltri = altriContributi.map(([, c]) => importoContributoContrattuale(c, ralEffettiva, oreAnnue));
  const contributiCcnl = importoSanitario + importoBilaterali.reduce((s, n) => s + n, 0) + importoAltri.reduce((s, n) => s + n, 0);

  // 10. Scatti di anzianità: importo del livello se c'è, altrimenti media del CCNL
  const costoScatti = calcolaScattiAnzianita(
    input.anzianitaAnni,
    ccnl.scattiAnzianita,
    ralEffettiva,
    livello.scattoEuro,
  );

  // 10b. Ferie, permessi e ex festività non godute — formula fissa: 173 h × (RAL/mensilità/173)
  const retribuzioneMensile = ralEffettiva / mensilita;
  const costoFerieNonGodute = round2(
    ORE_FERIE_NON_GODUTE_FISSE * (retribuzioneMensile / ORE_FERIE_NON_GODUTE_FISSE),
  );

  // 11. Totale
  // NOTA: la RAL include già tutte le mensilità (es. 1541.77 × 14 = 21584.78),
  // quindi tredicesima, quattordicesima e mensilità extra NON vanno aggiunte al totale
  // — sono solo voci informative che mostrano la scomposizione della RAL.
  const costoTotaleAnnuo =
    ralEffettiva + inpsNetto + tfr + inail +
    contributiCcnl + costoScatti + costoFerieNonGodute;

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
    : `Aliquota ${(input.aliquotaInps * 100).toFixed(2).replace('.', ',')}%`;

  const notaRal = isRetribuzionePersonalizzata
    ? 'Retribuzione concordata tra le parti — art. 2099 c.c.'
    : undefined;

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
      descrizione: 'Contributi INPS datoriali',
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
      id: 'assistenza_sanitaria',
      categoria: 'ccnl_contrattuale',
      descrizione: 'Assistenza sanitaria integrativa',
      importoAnnuo: importoSanitario,
      importoMensile: importoSanitario / 12,
      percentualeRal: importoSanitario / ralEffettiva,
      notaLegge: NOTA_ASSISTENZA_SANITARIA_FORFAIT,
    },
    ...bilaterali.map(([key, c], i) => ({
      id: `ente_bilaterale_${key}`,
      categoria: 'ccnl_contrattuale' as const,
      descrizione: c.descrizione || 'Ente bilaterale',
      importoAnnuo: importoBilaterali[i],
      importoMensile: importoBilaterali[i] / 12,
      percentualeRal: importoBilaterali[i] / ralEffettiva,
      notaLegge: c.notaLegge,
    })),
    ...altriContributi.map(([key, c], i) => ({
      id: `ccnl_${key}`,
      categoria: 'ccnl_contrattuale' as const,
      descrizione: c.descrizione,
      importoAnnuo: importoAltri[i],
      importoMensile: importoAltri[i] / 12,
      percentualeRal: importoAltri[i] / ralEffettiva,
      notaLegge: c.notaLegge,
    })),
    {
      id: 'scatti_anzianita',
      categoria: 'ccnl_contrattuale',
      descrizione: `Scatti di anzianità (${Math.min(Math.floor(input.anzianitaAnni / (ccnl.scattiAnzianita.periodicitaMesi / 12)), ccnl.scattiAnzianita.maxScatti)} scatti maturati)`,
      importoAnnuo: costoScatti,
      importoMensile: costoScatti / 12,
      percentualeRal: costoScatti / ralEffettiva,
      notaLegge: 'CCNL — scatti di anzianità',
    },
    ...(costoFerieNonGodute > 0
      ? [{
          id: 'ferie_permessi_festivita',
          categoria: 'ccnl_contrattuale' as const,
          descrizione: 'Ferie, permessi e festività non godute',
          importoAnnuo: costoFerieNonGodute,
          importoMensile: costoFerieNonGodute / 12,
          percentualeRal: costoFerieNonGodute / ralEffettiva,
          notaLegge: NOTA_FERIE_NON_GODUTE_SEMPLIFICATA(mensilita),
        }]
      : []),
  ];

  // 13. Netto dipendente: IRPEF lorda − detrazioni art. 13 − bonus cuneo − addizionali.
  const nettoDipendente = calcolaNettoDaRedditoLordoEinpsPerc(
    ralEffettiva,
    aliquotaDipendenteDefault,
    input.tipoContratto,
    mensilita,
    DISCLAIMER_NETTO_DIPENDENTE,
    true,
  );

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
