import type {
  CalcolatoreInput,
  AgevolazioneInps,
  AgevolazioneApplicata,
  AlertScadenza,
  AliquoteInpsData,
  InailData,
  TfrData,
  ScattiAnzianita,
  SettoreContributivo,
} from '@/types';

// Static requires — webpack bundles JSON at build time, no fs at runtime
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ALIQUOTE_INPS = require('../data/aliquote-inps.json') as AliquoteInpsData;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const INAIL_DATA = require('../data/inail.json') as InailData;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TFR_DATA = require('../data/tfr.json') as TfrData;

/**
 * Calcola i contributi INPS datoriali lordi (prima delle agevolazioni).
 * @see Circolare INPS n. 99/2023
 */
export function calcolaInpsBase(ral: number, aliquotaOverride?: number): number {
  if (aliquotaOverride !== undefined) return ral * aliquotaOverride;
  return ral * ALIQUOTE_INPS.aliquotaBaseAzienda;
}

/**
 * Determina il settore contributivo INPS in base al CCNL e alla dimensione aziendale.
 * Ritorna l'aliquota datore e dipendente appropriate.
 */
export function getSettoreContributivo(
  ccnlId: string,
  numeroDipendenti: number
): SettoreContributivo | null {
  const baseSector = ALIQUOTE_INPS.mappaCcnlSettore[ccnlId];
  if (!baseSector) return null;

  // Resolve size-based variant
  let settoreKey: string;
  if (baseSector === 'commercio') {
    settoreKey = numeroDipendenti <= 15 ? 'commercio_fino15' : 'commercio_oltre15';
  } else if (baseSector === 'industria') {
    settoreKey = numeroDipendenti <= 15 ? 'industria_fino15' : 'industria_oltre15';
  } else {
    settoreKey = baseSector;
  }

  return ALIQUOTE_INPS.settoriContributivi[settoreKey] ?? null;
}

/**
 * Seleziona le agevolazioni compatibili tra quelle scelte dall'utente.
 * Se due agevolazioni sono in conflitto (nonCumulabileCon), applica quella
 * con massimale annuo più alto (o percentuale più alta se massimale è null).
 */
function risolviCumulabilita(
  agevolazioni: AgevolazioneInps[]
): { selezionate: AgevolazioneInps[]; avvertenze: Map<string, string> } {
  const selezionate: AgevolazioneInps[] = [];
  const avvertenze = new Map<string, string>();
  const escludiIds = new Set<string>();

  // Ordina: prima quelle con massimale più alto (o nessun massimale = alto)
  const ordinate = [...agevolazioni].sort((a, b) => {
    const ma = a.massimaleAnnuo ?? 999999;
    const mb = b.massimaleAnnuo ?? 999999;
    return mb - ma;
  });

  for (const agev of ordinate) {
    if (escludiIds.has(agev.id)) {
      avvertenze.set(agev.id, `Non applicata: non cumulabile con un'altra agevolazione già selezionata`);
      continue;
    }
    selezionate.push(agev);
    for (const conflitoId of agev.nonCumulabileCon) {
      escludiIds.add(conflitoId);
    }
  }

  return { selezionate, avvertenze };
}

/**
 * Calcola le agevolazioni contributive applicabili e il risparmio netto.
 * Rispetta massimali annui, regole di cumulabilità e genera alert scadenze.
 * @see Legge 178/2020, D.Lgs. 81/2015, Legge 92/2012
 */
export function calcolaAgevolazioni(input: CalcolatoreInput): {
  agevolazioniApplicate: AgevolazioneApplicata[];
  risparmioTotale: number;
  alertScadenze: AlertScadenza[];
} {
  const inpsBase = calcolaInpsBase(input.ral);

  const tutteSelezionate = ALIQUOTE_INPS.agevolazioni.filter(a =>
    input.agevolazioniSelezionate.includes(a.id)
  );

  const { selezionate, avvertenze } = risolviCumulabilita(tutteSelezionate);

  const agevolazioniApplicate: AgevolazioneApplicata[] = [];
  let risparmioTotale = 0;

  for (const agev of selezionate) {
    const risparmioLordo = inpsBase * agev.percentualeEsonero;
    const risparmio = agev.massimaleAnnuo !== null
      ? Math.min(risparmioLordo, agev.massimaleAnnuo)
      : risparmioLordo;
    risparmioTotale += risparmio;
    agevolazioniApplicate.push({
      id: agev.id,
      nome: agev.nome,
      risparmioAnnuo: risparmio,
      avvertenza: avvertenze.get(agev.id),
    });
  }

  // Agevolazioni escluse per non-cumulabilità
  for (const agev of tutteSelezionate) {
    if (!selezionate.find(s => s.id === agev.id) && avvertenze.has(agev.id)) {
      agevolazioniApplicate.push({
        id: agev.id,
        nome: agev.nome,
        risparmioAnnuo: 0,
        avvertenza: avvertenze.get(agev.id),
      });
    }
  }

  const ora = Date.now();
  const alertScadenze: AlertScadenza[] = selezionate
    .filter(a => a.scadenza !== null && a.scadenzaAlertGiorni !== null)
    .map(a => ({
      agevolazioneId: a.id,
      nome: a.nome,
      scadenza: a.scadenza!,
      giorniRimanenti: Math.ceil((new Date(a.scadenza!).getTime() - ora) / 86_400_000),
    }))
    .filter(a => a.giorniRimanenti <= 90);

  return { agevolazioniApplicate, risparmioTotale, alertScadenze };
}

/**
 * Calcola il TFR annuo da accantonare.
 * Formula: TFR = RAL / 13,5 (Art. 2120 c.c.)
 * La RAL include già le mensilità aggiuntive (es. 1541.77 × 14 = 21584.78),
 * quindi NON va moltiplicata ulteriormente per mensilita/12.
 * La base TFR esatta dipende dalla retribuzione utile definita da ciascun CCNL.
 * @see Art. 2120 c.c. — divisore fisso 13,5
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function calcolaTfr(ral: number, _mensilita?: number): number {
  return ral / TFR_DATA.divisoreAnnuo;
}

/**
 * Calcola il premio INAIL annuo in base alla voce tariffaria.
 * @see D.P.R. 1124/1965 — Testo Unico INAIL
 */
export function calcolaInail(ral: number, codiceVoce: string): number {
  const voce = INAIL_DATA.voci.find(v => v.codice === codiceVoce);
  if (!voce) throw new Error(`Codice INAIL '${codiceVoce}' non trovato nelle tariffe`);
  return (ral * voce.tassoPerMille) / 1000;
}

/**
 * Calcola il costo annuo degli scatti di anzianità maturati.
 * Se percentualeScatto è impostato (es. domestici 4%) usa ralEffettiva come base.
 * @see Norma contrattuale CCNL di riferimento
 */
export function calcolaScattiAnzianita(
  anzianitaAnni: number,
  config: ScattiAnzianita,
  ralEffettiva?: number,
): number {
  const periodicitaAnni = config.periodicitaMesi / 12;
  const numScatti = Math.min(
    Math.floor(anzianitaAnni / periodicitaAnni),
    config.maxScatti
  );
  if (config.percentualeScatto != null && ralEffettiva != null) {
    // Scatto percentuale: ogni scatto aggiunge percentualeScatto × RAL (es. 4% domestici)
    return numScatti * config.percentualeScatto * ralEffettiva;
  }
  if (config.importoPerScattoEuro == null) return 0;
  return numScatti * config.importoPerScattoEuro * 12; // costo annuo
}

// Tipo interno per la struttura domestici in aliquote-inps.json
interface FasciaDomestici {
  retribuzioneConvenzionale: number;
  contributoOraTotal: number;
  quotaLavoratore: number;
  contributoAddizionale?: { contributoOraTotal: number; quotaLavoratore: number };
}
interface DomesticiSettoreRaw {
  nome: string;
  calcoloSpeciale: 'per_ora';
  tabellaFasce2026: {
    oltre24hSettimanali: FasciaDomestici;
    fino961: FasciaDomestici;
    da961a1170: FasciaDomestici;
    oltre1170: FasciaDomestici;
  };
}

/**
 * Calcola i contributi INPS per lavoratori domestici (Circ. INPS n. 9/2026).
 * La fascia è determinata da ore/settimana e retribuzione oraria effettiva.
 * Contributi fissi per ora lavorata (non percentuale della RAL).
 */
export function calcolaInpsDomestici(
  ralAnnua: number,
  oreLavoro: number,
  convivente: boolean = false,
  tipoContratto: 'tempo_indeterminato' | 'tempo_determinato' = 'tempo_indeterminato',
): { inpsDatore: number; inpsDipendente: number; fasciaNome: string; quotaDatorePerOra: number } {
  const data = ALIQUOTE_INPS;
  const raw = (data.settoriContributivi as unknown as Record<string, DomesticiSettoreRaw>)['domestici'];
  const fasce = raw.tabellaFasce2026;

  const oreAnnue = oreLavoro * 52;
  const retribuzioneOraria = oreAnnue > 0 ? ralAnnua / oreAnnue : 0;

  let fascia: FasciaDomestici;
  let fasciaNome: string;

  // Conviventi o >24h/settimana → fascia ridotta (Tabella B)
  if (convivente || oreLavoro > 24) {
    fascia = fasce.oltre24hSettimanali;
    const motivo = convivente ? 'convivente' : '>24h/sett.';
    fasciaNome = `${motivo} — conv. €${fascia.retribuzioneConvenzionale}/h (Tabella B Circ. n. 9/2026)`;
  } else if (retribuzioneOraria <= 9.61) {
    fascia = fasce.fino961;
    fasciaNome = `≤€9,61/h — ret. effettiva €${retribuzioneOraria.toFixed(2)}/h (Tabella A)`;
  } else if (retribuzioneOraria <= 11.70) {
    fascia = fasce.da961a1170;
    fasciaNome = `€9,61–11,70/h — ret. effettiva €${retribuzioneOraria.toFixed(2)}/h (Tabella A)`;
  } else {
    fascia = fasce.oltre1170;
    fasciaNome = `>€11,70/h — ret. effettiva €${retribuzioneOraria.toFixed(2)}/h (Tabella A)`;
  }

  const totaleOrario = tipoContratto === 'tempo_determinato' && fascia.contributoAddizionale
    ? fascia.contributoAddizionale.contributoOraTotal
    : fascia.contributoOraTotal;
  const quotaLavoratoreOraria = tipoContratto === 'tempo_determinato' && fascia.contributoAddizionale
    ? fascia.contributoAddizionale.quotaLavoratore
    : fascia.quotaLavoratore;
  const quotaDatorePerOra = totaleOrario - quotaLavoratoreOraria;
  return {
    inpsDatore: quotaDatorePerOra * oreAnnue,
    inpsDipendente: quotaLavoratoreOraria * oreAnnue,
    fasciaNome,
    quotaDatorePerOra,
  };
}
