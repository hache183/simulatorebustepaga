import { getCcnlData } from '@/lib/ccnl';
import { calcolaInail } from '@/lib/contributi';
import { calcolaNettoDaRedditoLordoEinpsPerc, DISCLAIMER_NETTO_DIPENDENTE } from '@/lib/irpef-lavoro-dipendente';
import type { CalcolatoreInput, CalcolatoreOutput, DettaglioCosto, MotoreEdiliConfig } from '@/types';

const EDILI_CCNL = new Set(['edilizia_industria', 'edilizia_artigianato']);

export function isEdiliCcnlId(ccnlId: string): boolean {
  return EDILI_CCNL.has(ccnlId);
}

export function livelliOperaioEdili(ccnlId: string) {
  const ccnl = getCcnlData(ccnlId);
  return ccnl.livelli.filter(l => l.categoriaOperaio !== false);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function getMotoreEdili(ccnlId: string): MotoreEdiliConfig {
  const ccnl = getCcnlData(ccnlId);
  if (!ccnl.motoreEdili) {
    throw new Error(`Motore edili non configurato per CCNL '${ccnlId}'`);
  }
  return ccnl.motoreEdili;
}

function contributoOrarioCassaEdile(f: number, cfg: MotoreEdiliConfig): number {
  const c = cfg.cassaEdile;
  return (f * c.percentSuF) + c.coeffOrario1 + c.coeffFisso2 + c.coeffFisso3 + (f * c.percentSuF2);
}

export interface VociEdiliIntermedie {
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
  imponibile: number;
  ratio: number;
}

export function calcolaVociEdili(
  minimoMensile: number,
  oreSettimanali: number,
  retribuzionePersonalizzataAnnuo: number | undefined,
  cfg: MotoreEdiliConfig,
): VociEdiliIntermedie {
  const ratio = Math.min(1, Math.max(0, oreSettimanali / cfg.oreSettimanaliPieno));
  const baseTabellareAnnuo = minimoMensile * 12;
  let A = round2(baseTabellareAnnuo * ratio);
  if (retribuzionePersonalizzataAnnuo && retribuzionePersonalizzataAnnuo > baseTabellareAnnuo) {
    A = round2(retribuzionePersonalizzataAnnuo * ratio);
  }

  const B = round2(A * cfg.gratificaFeriePercent);
  const C = round2(A * cfg.permessiFestivitaPercent);
  const D = round2(cfg.indennitaMensaGiorno * cfg.giorniIndennitaMese * 12);
  const E = round2(cfg.indennitaTrasportoGiorno * cfg.giorniIndennitaMese * 12);
  const imponibile = round2(A + B + C + D + E);

  return { A, B, C, D, E, imponibile, ratio };
}

export function calcolaCassaEdileAnnua(A: number, ratio: number, cfg: MotoreEdiliConfig): number {
  const f = (A / 12) / cfg.oreMensiliPieno;
  const g = contributoOrarioCassaEdile(f, cfg);
  const oreAnnueCassa = cfg.oreMensiliPieno * 12 * ratio;
  return round2(g * oreAnnueCassa);
}

export async function calcolaEdili(input: CalcolatoreInput): Promise<CalcolatoreOutput> {
  if (!isEdiliCcnlId(input.ccnlId)) {
    throw new Error(`CCNL non edile: '${input.ccnlId}'`);
  }
  if (!input.codiceInail || input.codiceInail.length < 2) {
    throw new Error('Seleziona la categoria INAIL (voce 36xx)');
  }

  const ccnl = getCcnlData(input.ccnlId);
  const cfg = getMotoreEdili(input.ccnlId);
  const livello = ccnl.livelli.find(l => l.codice === input.livello);
  if (!livello) throw new Error(`Livello '${input.livello}' non trovato`);
  if (livello.categoriaOperaio === false) {
    throw new Error('Il livello selezionato non è un operaio edile');
  }

  const ore = input.oreSettimanali ?? input.oreLavoro;
  const voci = calcolaVociEdili(
    livello.minimoTabellare,
    ore,
    input.retribuzionePersonalizzata,
    cfg,
  );

  const inpsDatore = round2(voci.imponibile * cfg.inpsDatorePercent);
  const tfr = round2(voci.imponibile / 13.5);
  const baseInail = round2(voci.A + voci.B + voci.C + voci.E);
  const inail = round2(calcolaInail(baseInail, input.codiceInail));
  const cassaEdile = calcolaCassaEdileAnnua(voci.A, voci.ratio, cfg);

  const costoTotaleAnnuo = round2(
    voci.imponibile + inpsDatore + tfr + inail + cassaEdile,
  );

  const nettoDipendente = calcolaNettoDaRedditoLordoEinpsPerc(
    voci.imponibile,
    cfg.inpsDipendentePercent,
    input.tipoContratto,
    12,
    DISCLAIMER_NETTO_DIPENDENTE + ' Imponibile edile = A+B+C+D+E (12 mensilità; 13ª dalla Cassa Edile).',
    false,
  );

  const pct = (n: number) => (voci.imponibile > 0 ? n / voci.imponibile : 0);

  const dettaglio: DettaglioCosto[] = [
    {
      id: 'edile_a',
      categoria: 'ral',
      descrizione: 'A — Retribuzione base (minimo tabellare × 12 mesi, proporzionata alle ore)',
      importoAnnuo: voci.A,
      importoMensile: voci.A / 12,
      percentualeRal: pct(voci.A),
    },
    {
      id: 'edile_b',
      categoria: 'ccnl_contrattuale',
      descrizione: 'B — Gratifica e ferie (18,50% di A)',
      importoAnnuo: voci.B,
      importoMensile: voci.B / 12,
      percentualeRal: pct(voci.B),
    },
    {
      id: 'edile_c',
      categoria: 'ccnl_contrattuale',
      descrizione: 'C — Permessi e festività (4,95% di A)',
      importoAnnuo: voci.C,
      importoMensile: voci.C / 12,
      percentualeRal: pct(voci.C),
    },
    {
      id: 'edile_d',
      categoria: 'ccnl_contrattuale',
      descrizione: 'D — Indennità mensa (3,60 € × 22 giorni × 12 mesi)',
      importoAnnuo: voci.D,
      importoMensile: voci.D / 12,
      percentualeRal: pct(voci.D),
    },
    {
      id: 'edile_e',
      categoria: 'ccnl_contrattuale',
      descrizione: 'E — Indennità trasporto (2,40 € × 22 giorni × 12 mesi)',
      importoAnnuo: voci.E,
      importoMensile: voci.E / 12,
      percentualeRal: pct(voci.E),
    },
    {
      id: 'inps',
      categoria: 'inps_azienda',
      descrizione: 'Contributi INPS datoriali (35,08% su A+B+C+D+E)',
      importoAnnuo: inpsDatore,
      importoMensile: inpsDatore / 12,
      percentualeRal: pct(inpsDatore),
      notaLegge: 'Aliquota media edili — imponibile contributivo annuo',
    },
    {
      id: 'tfr',
      categoria: 'tfr',
      descrizione: 'TFR — accantonamento annuo',
      importoAnnuo: tfr,
      importoMensile: tfr / 12,
      percentualeRal: pct(tfr),
      notaLegge: 'Art. 2120 c.c. — (A+B+C+D+E) / 13,5',
    },
    {
      id: 'inail',
      categoria: 'inail',
      descrizione: 'Premio INAIL (base A+B+C+E, senza mensa)',
      importoAnnuo: inail,
      importoMensile: inail / 12,
      percentualeRal: pct(inail),
      notaLegge: 'D.P.R. 1124/1965',
    },
    {
      id: 'cassa_edile',
      categoria: 'ccnl_contrattuale',
      descrizione: `Cassa Edile provinciale (${cfg.cassaProvincia})`,
      importoAnnuo: cassaEdile,
      importoMensile: cassaEdile / 12,
      percentualeRal: pct(cassaEdile),
      notaLegge: 'Contributo orario G × ore annue (173 h/mese × 12, proporzionate al part-time)',
    },
    {
      id: 'tredicesima_cassa',
      categoria: 'tredicesima',
      descrizione: 'Tredicesima mensilità',
      importoAnnuo: 0,
      importoMensile: 0,
      percentualeRal: 0,
      notaLegge: 'Corrisposta direttamente al lavoratore dalla Cassa Edile — non a carico del datore in questo prospetto',
    },
  ];

  const inputNormalizzato: CalcolatoreInput = {
    ...input,
    ral: voci.imponibile,
    mensilita: 12,
    aliquotaInps: cfg.inpsDatorePercent,
    oreLavoro: ore,
  };

  return {
    input: inputNormalizzato,
    costoTotaleAnnuo,
    costoTotaleMensile: round2(costoTotaleAnnuo / 12),
    percentualeRal: voci.imponibile > 0 ? costoTotaleAnnuo / voci.imponibile : 0,
    voci: dettaglio,
    agevolazioniApplicate: [],
    alertScadenze: [],
    calcolatoIl: new Date().toISOString(),
    nettoDipendente,
  };
}
