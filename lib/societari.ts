import { calcolaNettoDaRedditoLordoEinpsPerc } from '@/lib/irpef-lavoro-dipendente';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}


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
}

/* ------------------------------------------------------------------ *
 * Simulazione soci/amministratori. Unico regime: Gestione separata    *
 * con riparto 2/3 società – 1/3 percipiente (Circ. INPS 8/2026).      *
 * IRPEF come lavoro dipendente (detrazioni art. 13), senza bonus cuneo. *
 * ------------------------------------------------------------------ */

export const IMPORTO_TRASFERTA_NAZIONALE_DEFAULT = 46.48;
export const IMPORTO_TRASFERTA_ESTERA_DEFAULT = 77.47;

export type ModalitaSoci = 'con_compenso' | 'senza_compenso';

export interface SociState {
  modalita: ModalitaSoci;
  lordoAnnuo: number;
  /** Iscritto ad altra gestione obbligatoria o pensionato → GS 24% invece di 35,03%. */
  haAltraCoperturaInps: boolean;
  giorniTrasfertaNazionale: number;
  importoTrasfertaNazionale: number;
  giorniTrasfertaEstera: number;
  importoTrasfertaEstera: number;
  km: number;
  /** €/km colonna ACI «costo km 15.000 km», oppure override se il modello non è in tabella. */
  costoKm: number;
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

/** Riparto Gestione separata: 2/3 società, 1/3 percipiente. */
export interface RipartoGestioneSeparata {
  contributoTotale: number;
  quotaCommittente: number;
  quotaPercipiente: number;
  imponibileGs: number;
  massimaleApplicato: boolean;
}

export interface SociResult {
  trasferteNazionali: number;
  trasferteEstere: number;
  trasferte: number;
  rimborsoKm: number;
  sommaRimborsiIndennita: number;
  compensoLordo: number;
  /** Quota 1/3 trattenuta al percipiente. */
  quotaPercipiente: number;
  /** Quota 2/3 a carico della società. */
  quotaSocieta: number;
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
    lordoAnnuo: 12_000,
    haAltraCoperturaInps: false,
    giorniTrasfertaNazionale: 0,
    importoTrasfertaNazionale: IMPORTO_TRASFERTA_NAZIONALE_DEFAULT,
    giorniTrasfertaEstera: 0,
    importoTrasfertaEstera: IMPORTO_TRASFERTA_ESTERA_DEFAULT,
    km: 0,
    costoKm: 0,
  };
}

function rimborsiDa(o: SociState) {
  const trasferteNazionali = round2(
    Math.max(0, o.giorniTrasfertaNazionale) * Math.max(0, o.importoTrasfertaNazionale),
  );
  const trasferteEstere = round2(
    Math.max(0, o.giorniTrasfertaEstera) * Math.max(0, o.importoTrasfertaEstera),
  );
  const trasferte = round2(trasferteNazionali + trasferteEstere);
  const rimborsoKm = round2(Math.max(0, o.km) * Math.max(0, o.costoKm));
  const sommaRimborsi = round2(trasferte + rimborsoKm);
  return { trasferteNazionali, trasferteEstere, trasferte, rimborsoKm, sommaRimborsi };
}

export function calcolaSoci(o: SociState): SociResult {
  const rimborsi = rimborsiDa(o);

  if (o.modalita === 'senza_compenso') {
    return {
      ...rimborsi,
      sommaRimborsiIndennita: rimborsi.sommaRimborsi,
      compensoLordo: 0,
      quotaPercipiente: 0,
      quotaSocieta: 0,
      aliquotaInpsApplicata: 0,
      irpefEImposteTotali: 0,
      nettoDaCompenso: 0,
      nettoTotalePercepito: rimborsi.sommaRimborsi,
      costoTotaleDatore: rimborsi.sommaRimborsi,
      ripartoGs: null,
      dettaglioFiscale: null,
    };
  }

  const lordo = Math.max(0, o.lordoAnnuo);
  const gs = calcolaCompensiSocietari({
    tipo: 'amministratore',
    compensoAnnuo: lordo,
    iscrittoAltraGestione: o.haAltraCoperturaInps,
  });

  const imposte = round2(gs.irpefNetta);
  const fisc: DettaglioFiscaleSoci = {
    ralLorda: round2(lordo),
    inpsDipendente: gs.gsPercipiente,
    imponibileIrpef: round2(lordo - gs.gsPercipiente),
    irpefLorda: gs.irpefLorda,
    detrazioneLavoroDip: gs.detrazioneLavoroDip,
    bonusCuneoFiscale: gs.bonusCuneoFiscale,
    irpefNetta: gs.irpefNettaIrpef,
    addizionaleRegionale: gs.addizionaleRegionale,
    addizionaleComunale: gs.addizionaleComunale,
    nettoAnnuo: gs.nettoAmministratore,
    disclaimer:
      'Gestione separata: 2/3 a carico della società e 1/3 trattenuto al percipiente (Circ. INPS 8/2026). '
      + 'IRPEF con detrazioni lavoro dipendente (art. 13), senza bonus cuneo. '
      + 'Addizionali come media usata anche per i dipendenti. Trasferte e km sono fuori dalla base contributiva.',
  };

  return {
    ...rimborsi,
    sommaRimborsiIndennita: rimborsi.sommaRimborsi,
    compensoLordo: round2(lordo),
    quotaPercipiente: gs.gsPercipiente,
    quotaSocieta: gs.gsCommittente,
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
 * Riparto 2/3 committente – 1/3 percipiente. IRPEF senza bonus cuneo. *
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
  detrazioneLavoroDip: number;
  bonusCuneoFiscale: number;
  irpefNettaIrpef: number;
  addizionaleRegionale: number;
  addizionaleComunale: number;
  irpefNetta: number;
  costoSocieta: number;
  nettoAmministratore: number;
  irapNota: string;
  fonte: string;
  calcolatoIl: string;
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
    detrazioneLavoroDip: 0,
    bonusCuneoFiscale: 0,
    irpefNettaIrpef: 0,
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

  const aliquotaInpsDip = lordo > 0 ? gsPercipiente / lordo : 0;
  const fisc = calcolaNettoDaRedditoLordoEinpsPerc(
    lordo,
    aliquotaInpsDip,
    'tempo_indeterminato',
    12,
    'Stima IRPEF amministratore con detrazioni lavoro dipendente.',
    false,
  );
  const imposteTotali = round2(fisc.irpefNetta + fisc.addizionaleRegionale + fisc.addizionaleComunale);

  return {
    ...base,
    aliquotaGs: cfg.aliquotaTotale,
    gsTotale: round2(gsTotale),
    gsCommittente: round2(gsCommittente),
    gsPercipiente: round2(gsPercipiente),
    irpefLorda: round2(fisc.irpefLorda),
    detrazioneLavoroDip: round2(fisc.detrazioneLavoroDip),
    bonusCuneoFiscale: round2(fisc.bonusCuneoFiscale),
    irpefNettaIrpef: round2(fisc.irpefNetta),
    addizionaleRegionale: round2(fisc.addizionaleRegionale),
    addizionaleComunale: round2(fisc.addizionaleComunale),
    irpefNetta: imposteTotali,
    costoSocieta: round2(lordo + gsCommittente),
    nettoAmministratore: round2(fisc.nettoAnnuo),
    irapNota: 'IRAP: non calcolata (incidenza del compenso sulla base IRAP dipende dal tipo di società).',
  };
}
