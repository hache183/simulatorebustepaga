import fs from 'fs';
import path from 'path';
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

function loadJson<T>(relativePath: string): T {
  const fullPath = path.join(process.cwd(), relativePath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as T;
}

/**
 * Calcola i contributi INPS datoriali lordi (prima delle agevolazioni).
 * @see Circolare INPS n. 99/2023
 */
export function calcolaInpsBase(ral: number, aliquotaOverride?: number): number {
  if (aliquotaOverride !== undefined) return ral * aliquotaOverride;
  const data = loadJson<AliquoteInpsData>('data/aliquote-inps.json');
  return ral * data.aliquotaBaseAzienda;
}

/**
 * Determina il settore contributivo INPS in base al CCNL e alla dimensione aziendale.
 * Ritorna l'aliquota datore e dipendente appropriate.
 */
export function getSettoreContributivo(
  ccnlId: string,
  numeroDipendenti: number
): SettoreContributivo | null {
  const data = loadJson<AliquoteInpsData>('data/aliquote-inps.json');
  const baseSector = data.mappaCcnlSettore[ccnlId];
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

  return data.settoriContributivi[settoreKey] ?? null;
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
  const data = loadJson<AliquoteInpsData>('data/aliquote-inps.json');
  const inpsBase = calcolaInpsBase(input.ral);

  const tutteSelezionate = data.agevolazioni.filter(a =>
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
export function calcolaTfr(ral: number, _mensilita: number): number {
  const data = loadJson<TfrData>('data/tfr.json');
  return ral / data.divisoreAnnuo;
}

/**
 * Calcola il premio INAIL annuo in base alla voce tariffaria.
 * @see D.P.R. 1124/1965 — Testo Unico INAIL
 */
export function calcolaInail(ral: number, codiceVoce: string): number {
  const data = loadJson<InailData>('data/inail.json');
  const voce = data.voci.find(v => v.codice === codiceVoce);
  if (!voce) throw new Error(`Codice INAIL '${codiceVoce}' non trovato nelle tariffe`);
  return (ral * voce.tassoPerMille) / 1000;
}

/**
 * Calcola il costo annuo degli scatti di anzianità maturati.
 * @see Norma contrattuale CCNL di riferimento
 */
export function calcolaScattiAnzianita(
  anzianitaAnni: number,
  config: ScattiAnzianita
): number {
  const periodicitaAnni = config.periodicitaMesi / 12;
  const numScatti = Math.min(
    Math.floor(anzianitaAnni / periodicitaAnni),
    config.maxScatti
  );
  return numScatti * config.importoPerScattoEuro * 12; // costo annuo
}
