import { getAddizionaleRegionale, getAddizionaleComunale, round2 } from './contributi';

/* eslint-disable @typescript-eslint/no-require-imports */
const GS = require('../data/gestione-separata.json') as GestioneSeparataData;
/* eslint-enable @typescript-eslint/no-require-imports */

interface AliquotaGs {
  aliquotaTotale: number;
  quotaCommittente: number;
  quotaPercipiente: number;
}

interface GestioneSeparataData {
  fonte: string;
  minimaleReddito: number;
  massimaleReddito: number;
  sogliaMaggiorazioneArtigianiCommercianti: number;
  amministratoreSenzaAltraCopertura: AliquotaGs;
  amministratoreConAltraCoperturaOPensionato: AliquotaGs;
  artigiani: { aliquota: number; comingSoon: boolean };
  commercianti: { aliquota: number; comingSoon: boolean };
  ritenutaSostitutiva8: { aliquota: number; validitaAl: string; nota: string };
}

/* ------------------------------------------------------------------ *
 * Simulazione soci/amministratori — allineata al build in produzione. *
 * Produzione non applica il riparto GS 2/3-1/3 in UI: è una           *
 * simulazione a ritenuta unica sul percipiente, da validare con       *
 * Francesca.                                                          *
 * ------------------------------------------------------------------ */

export const ALIQUOTE_SOCI = {
  p35_03: 0.3503,
  p8: 0.08,
  p24: 0.24,
} as const;

export type AliquotaSociId = keyof typeof ALIQUOTE_SOCI;
export type ModalitaSoci = 'con_compenso' | 'senza_compenso';
export type TipoContrattoIrpef = 'tempo_indeterminato' | 'tempo_determinato';

/**
 * I due trattamenti contributivi che la consulente può applicare al compenso.
 *
 * - `ritenuta_unica`: l'intera aliquota scelta è trattenuta al percipiente e il
 *   costo per la società è il solo compenso lordo. È il comportamento storico
 *   del pannello, l'unico compatibile con la ritenuta ridotta 8%.
 * - `riparto_gs`: Gestione separata con riparto 2/3 a carico del committente e
 *   1/3 a carico del percipiente (Circ. INPS 8/2026). È il trattamento
 *   ordinario dell'amministratore: l'aliquota discende dall'esistenza di altra
 *   copertura INPS, non dalla scelta manuale.
 */
export type RegimeContributivoSoci = 'ritenuta_unica' | 'riparto_gs';

export interface SociState {
  modalita: ModalitaSoci;
  regimeContributivo: RegimeContributivoSoci;
  lordoAnnuo: number;
  aliquotaInpsId: AliquotaSociId;
  haAltraCoperturaInps: boolean;
  tipoContrattoIrpef: TipoContrattoIrpef;
  giorniTrasferte: number;
  importoTrasfertaGiornaliera: number;
  kmAutoPersonale: number;
  tariffaKmEur: number;
  giorniBuoniPasto: number;
  importoBuonoPastoGiornaliero: number;
}

export interface DettaglioFiscaleSoci {
  ralLorda: number;
  inpsDipendente: number;
  imponibileIrpef: number;
  irpefLorda: number;
  detrazioneLavoroDip: number;
  bonusCuneoFiscale: number;
  irpefNetta: number;
  addizionaleRegionale: number;
  addizionaleComunale: number;
  nettoAnnuo: number;
  disclaimer: string;
}

/** Dettaglio del riparto Gestione separata, valorizzato solo nel regime `riparto_gs`. */
export interface RipartoGestioneSeparata {
  contributoTotale: number;
  quotaCommittente: number;
  quotaPercipiente: number;
  imponibileGs: number;
  massimaleApplicato: boolean;
}

export interface SociResult {
  regimeApplicato: RegimeContributivoSoci;
  trasferte: number;
  rimborsoKm: number;
  buoniPasto: number;
  sommaRimborsiIndennita: number;
  compensoLordo: number;
  ritenutaInps: number;
  aliquotaInpsApplicata: number;
  irpefEImposteTotali: number;
  nettoDaCompenso: number;
  nettoTotalePercepito: number;
  costoTotaleDatore: number;
  ripartoGs: RipartoGestioneSeparata | null;
  dettaglioFiscale: DettaglioFiscaleSoci | null;
}

export function defaultStateSoci(): SociState {
  return {
    modalita: 'con_compenso',
    regimeContributivo: 'ritenuta_unica',
    lordoAnnuo: 12_000,
    aliquotaInpsId: 'p8',
    haAltraCoperturaInps: false,
    tipoContrattoIrpef: 'tempo_indeterminato',
    giorniTrasferte: 0,
    importoTrasfertaGiornaliera: 46.48,
    kmAutoPersonale: 0,
    tariffaKmEur: 0.3714,
    giorniBuoniPasto: 0,
    importoBuonoPastoGiornaliero: 10,
  };
}

/** Stessa pipeline IRPEF del motore dipendenti, duplicata qui: engine.ts non va importato né modificato. */
function irpefComeDipendenti(
  ral: number,
  aliquotaInps: number,
  tipo: TipoContrattoIrpef,
): DettaglioFiscaleSoci {
  const inpsDipendente = ral * aliquotaInps;
  const imponibile = ral - inpsDipendente;

  const irpefLorda =
    imponibile <= 28_000 ? 0.23 * imponibile
    : imponibile <= 50_000 ? 6_440 + (imponibile - 28_000) * 0.33
    : 13_700 + (imponibile - 50_000) * 0.43;

  const detrazioneLavoroDip =
    imponibile <= 15_000 ? Math.max(1_955, tipo === 'tempo_determinato' ? 1_380 : 690)
    : imponibile <= 28_000 ? Math.max(0, 1_910 + 1_190 * (28_000 - imponibile) / 13_000)
    : imponibile <= 50_000 ? Math.max(0, 1_910 * (50_000 - imponibile) / 22_000)
    : 0;

  const bonusCuneoFiscale =
    imponibile <= 8_500 ? 0.071 * imponibile
    : imponibile <= 15_000 ? 603.5 + (imponibile - 8_500) * 0.053
    : imponibile <= 20_000 ? 948 + (imponibile - 15_000) * 0.048
    : imponibile <= 32_000 ? 1_000
    : imponibile <= 40_000 ? 1_000 * (40_000 - imponibile) / 8_000
    : 0;

  const irpefNetta = Math.max(0, irpefLorda - detrazioneLavoroDip - bonusCuneoFiscale);
  const addizionaleRegionale = imponibile * getAddizionaleRegionale('');
  const addizionaleComunale = imponibile * getAddizionaleComunale();
  const nettoAnnuo = ral - inpsDipendente - irpefNetta - addizionaleRegionale - addizionaleComunale;

  return {
    ralLorda: round2(ral),
    inpsDipendente: round2(inpsDipendente),
    imponibileIrpef: round2(imponibile),
    irpefLorda: round2(irpefLorda),
    detrazioneLavoroDip: round2(detrazioneLavoroDip),
    bonusCuneoFiscale: round2(bonusCuneoFiscale),
    irpefNetta: round2(irpefNetta),
    addizionaleRegionale: round2(addizionaleRegionale),
    addizionaleComunale: round2(addizionaleComunale),
    nettoAnnuo: round2(nettoAnnuo),
    disclaimer:
      'Simulazione indicativa — verificare il coordinamento con Gestione separata / altra gestione INPS. '
      + 'Addizionali come media usata anche per i dipendenti.',
  };
}

export function calcolaSoci(o: SociState): SociResult {
  const trasferte = round2(Math.max(0, o.giorniTrasferte) * Math.max(0, o.importoTrasfertaGiornaliera));
  const rimborsoKm = round2(Math.max(0, o.kmAutoPersonale) * Math.max(0, o.tariffaKmEur));
  const buoniPasto = round2(Math.max(0, o.giorniBuoniPasto) * Math.max(0, o.importoBuonoPastoGiornaliero));
  const sommaRimborsi = round2(trasferte + rimborsoKm + buoniPasto);

  if (o.modalita === 'senza_compenso') {
    return {
      regimeApplicato: o.regimeContributivo,
      trasferte,
      rimborsoKm,
      buoniPasto,
      sommaRimborsiIndennita: sommaRimborsi,
      compensoLordo: 0,
      ritenutaInps: 0,
      aliquotaInpsApplicata: 0,
      irpefEImposteTotali: 0,
      nettoDaCompenso: 0,
      nettoTotalePercepito: sommaRimborsi,
      costoTotaleDatore: sommaRimborsi,
      ripartoGs: null,
      dettaglioFiscale: null,
    };
  }

  const lordo = Math.max(0, o.lordoAnnuo);

  if (o.regimeContributivo === 'riparto_gs') {
    return ripartoGestioneSeparata(o, lordo, { trasferte, rimborsoKm, buoniPasto, sommaRimborsi });
  }

  const aliquota = ALIQUOTE_SOCI[o.aliquotaInpsId] ?? ALIQUOTE_SOCI.p8;
  const fisc = irpefComeDipendenti(lordo, aliquota, o.tipoContrattoIrpef);

  return {
    regimeApplicato: 'ritenuta_unica',
    trasferte,
    rimborsoKm,
    buoniPasto,
    sommaRimborsiIndennita: sommaRimborsi,
    compensoLordo: round2(lordo),
    ritenutaInps: round2(lordo * aliquota),
    aliquotaInpsApplicata: aliquota,
    irpefEImposteTotali: round2(
      fisc.irpefNetta + fisc.addizionaleRegionale + fisc.addizionaleComunale,
    ),
    nettoDaCompenso: fisc.nettoAnnuo,
    nettoTotalePercepito: round2(fisc.nettoAnnuo + sommaRimborsi),
    costoTotaleDatore: round2(lordo + sommaRimborsi),
    ripartoGs: null,
    dettaglioFiscale: fisc,
  };
}

/**
 * Ramo Gestione separata. Delega a `calcolaCompensiSocietari` invece di
 * riscrivere le formule, così i due punti di ingresso non possono divergere:
 * quella funzione è coperta dai golden test.
 */
function ripartoGestioneSeparata(
  o: SociState,
  lordo: number,
  rimborsi: { trasferte: number; rimborsoKm: number; buoniPasto: number; sommaRimborsi: number },
): SociResult {
  const gs = calcolaCompensiSocietari({
    tipo: 'amministratore',
    compensoAnnuo: lordo,
    iscrittoAltraGestione: o.haAltraCoperturaInps,
  });

  const imposte = round2(gs.irpefLorda + gs.addizionaleRegionale + gs.addizionaleComunale);

  const fisc: DettaglioFiscaleSoci = {
    ralLorda: round2(lordo),
    inpsDipendente: gs.gsPercipiente,
    imponibileIrpef: round2(lordo - gs.gsPercipiente),
    irpefLorda: gs.irpefLorda,
    // Nel riparto GS non si applicano detrazione art. 13 TUIR né bonus cuneo:
    // il netto resta allineato a `calcolaCompensiSocietari`. Da confermare con
    // la consulente se l'amministratore ha diritto alle detrazioni da assimilato.
    detrazioneLavoroDip: 0,
    bonusCuneoFiscale: 0,
    irpefNetta: gs.irpefLorda,
    addizionaleRegionale: gs.addizionaleRegionale,
    addizionaleComunale: gs.addizionaleComunale,
    nettoAnnuo: gs.nettoAmministratore,
    disclaimer:
      'Riparto Gestione separata 2/3 committente – 1/3 percipiente (Circ. INPS 8/2026). '
      + 'Netto al lordo di detrazioni art. 13 TUIR e bonus cuneo, non applicate in questo regime. '
      + 'Addizionali come media usata anche per i dipendenti.',
  };

  return {
    regimeApplicato: 'riparto_gs',
    trasferte: rimborsi.trasferte,
    rimborsoKm: rimborsi.rimborsoKm,
    buoniPasto: rimborsi.buoniPasto,
    sommaRimborsiIndennita: rimborsi.sommaRimborsi,
    compensoLordo: round2(lordo),
    ritenutaInps: gs.gsPercipiente,
    aliquotaInpsApplicata: gs.aliquotaGs,
    irpefEImposteTotali: imposte,
    nettoDaCompenso: gs.nettoAmministratore,
    nettoTotalePercepito: round2(gs.nettoAmministratore + rimborsi.sommaRimborsi),
    costoTotaleDatore: round2(lordo + gs.gsCommittente + rimborsi.sommaRimborsi),
    ripartoGs: {
      contributoTotale: gs.gsTotale,
      quotaCommittente: gs.gsCommittente,
      quotaPercipiente: gs.gsPercipiente,
      imponibileGs: round2(Math.min(lordo, GS.massimaleReddito)),
      massimaleApplicato: lordo > GS.massimaleReddito,
    },
    dettaglioFiscale: fisc,
  };
}

/* ------------------------------------------------------------------ *
 * Scheda contributiva Gestione separata (Circ. INPS 8/2026).          *
 * Riparto 2/3 committente – 1/3 percipiente: non è ciò che mostra la  *
 * UI di produzione, resta come riferimento normativo e copertura test.*
 * ------------------------------------------------------------------ */

export interface SocietariInput {
  tipo?: 'amministratore' | 'socio_artigiano' | 'socio_commerciante';
  compensoAnnuo: number;
  iscrittoAltraGestione?: boolean;
  regione?: string;
}

export interface SocietariOutput {
  input: SocietariInput;
  comingSoon?: boolean;
  messaggio?: string;
  aliquotaGs: number;
  gsTotale: number;
  gsCommittente: number;
  gsPercipiente: number;
  irpefLorda: number;
  addizionaleRegionale: number;
  addizionaleComunale: number;
  irpefNetta: number;
  costoSocieta: number;
  nettoAmministratore: number;
  irapNota: string;
  fonte: string;
  calcolatoIl: string;
}

function irpefLordaScaglioni(imponibile: number): number {
  if (imponibile <= 28_000) return imponibile * 0.23;
  if (imponibile <= 50_000) return 6_440 + (imponibile - 28_000) * 0.33;
  return 13_700 + (imponibile - 50_000) * 0.43;
}

export function calcolaCompensiSocietari(input: SocietariInput): SocietariOutput {
  const tipo = input.tipo ?? 'amministratore';
  const base: SocietariOutput = {
    input,
    aliquotaGs: 0,
    gsTotale: 0,
    gsCommittente: 0,
    gsPercipiente: 0,
    irpefLorda: 0,
    addizionaleRegionale: 0,
    addizionaleComunale: 0,
    irpefNetta: 0,
    costoSocieta: 0,
    nettoAmministratore: 0,
    irapNota: 'IRAP: non calcolata',
    fonte: GS.fonte,
    calcolatoIl: new Date().toISOString(),
  };

  if (tipo === 'socio_artigiano' || tipo === 'socio_commerciante') {
    const cfg = tipo === 'socio_artigiano' ? GS.artigiani : GS.commercianti;
    const label = tipo === 'socio_artigiano' ? 'artigiani 24%' : 'commercianti 24,48%';
    return {
      ...base,
      comingSoon: true,
      aliquotaGs: cfg.aliquota,
      messaggio:
        `Gestione IVS ${label} sul reddito d'impresa, minimale ${GS.minimaleReddito.toLocaleString('it-IT')} €, `
        + `soglia ${GS.sogliaMaggiorazioneArtigianiCommercianti.toLocaleString('it-IT')} € con +1 punto. `
        + 'Non è un costo su compenso mensile come lo stipendio. Modulo in arrivo.',
    };
  }

  const cfg = input.iscrittoAltraGestione
    ? GS.amministratoreConAltraCoperturaOPensionato
    : GS.amministratoreSenzaAltraCopertura;

  const lordo = Math.max(0, input.compensoAnnuo || 0);
  const imponibileGs = Math.min(lordo, GS.massimaleReddito);
  const gsTotale = imponibileGs * cfg.aliquotaTotale;
  const gsCommittente = gsTotale * cfg.quotaCommittente;
  const gsPercipiente = gsTotale * cfg.quotaPercipiente;

  const imponibileIrpef = Math.max(0, lordo - gsPercipiente);
  const irpefLorda = irpefLordaScaglioni(imponibileIrpef);
  const addReg = imponibileIrpef * getAddizionaleRegionale(input.regione ?? '');
  const addCom = imponibileIrpef * getAddizionaleComunale();

  return {
    ...base,
    aliquotaGs: cfg.aliquotaTotale,
    gsTotale: round2(gsTotale),
    gsCommittente: round2(gsCommittente),
    gsPercipiente: round2(gsPercipiente),
    irpefLorda: round2(irpefLorda),
    addizionaleRegionale: round2(addReg),
    addizionaleComunale: round2(addCom),
    irpefNetta: round2(irpefLorda + addReg + addCom),
    costoSocieta: round2(lordo + gsCommittente),
    nettoAmministratore: round2(lordo - gsPercipiente - irpefLorda - addReg - addCom),
    irapNota: 'IRAP: non calcolata (incidenza del compenso sulla base IRAP dipende dal tipo di società).',
  };
}
