/**
 * Simulazioni isolate per Soci / Amministratori — logica diversa dalla busta dipendente.
 * Schema consulente: lordo → INPS selezionata → IRPEF (stessa pipeline dipendenti) → aggiunta rimborsi.
 */

import { calcolaNettoDaRedditoLordoEinpsPerc } from '@/lib/irpef-lavoro-dipendente';

/** Aliquota indicative ACI/indennità km (verificare tabella anno in vigore aggiornata). */
export const TARIFFA_KM_INDICATIVA_2026_EUR = 0.3714;

export const DISCLAIMER_NETTO_SOCIO =
  'Simulazione indicativa — verificare inviso tributario/coordinamento con Gestione Separata/altra gestione INPS. Addizionali come media usata anche per dipendenti.';

export type ModalitaSocio = 'con_compenso' | 'senza_compenso';

export type AliquotaInpsSocioId = 'p35_03' | 'p8' | 'p24';

export interface SociScenarioInput {
  modalita: ModalitaSocio;
  /** Compenso lordo annuo (€) nel caso “con compenso”. Default consigliato: 12.000 (= ~1.000 €/mese × 12). */
  lordoAnnuo: number;
  aliquotaInpsId: AliquotaInpsSocioId;
  haAltraCoperturaInps: boolean;
  tipoContrattoIrpef: 'tempo_indeterminato' | 'tempo_determinato';
  giorniTrasferte: number;
  importoTrasfertaGiornaliera: number;
  kmAutoPersonale: number;
  tariffaKmEur: number;
  giorniBuoniPasto: number;
  importoBuonoPastoGiornaliero: number;
}

export interface SociScenarioOutput {
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
  dettaglioFiscale: ReturnType<typeof calcolaNettoDaRedditoLordoEinpsPerc> | null;
}

const ALIQUOTE_MAP: Record<AliquotaInpsSocioId, number> = {
  p35_03: 0.3503,
  p8: 0.08,
  p24: 0.24,
};

export function aliquotaInpsSocioDecimali(id: AliquotaInpsSocioId): number {
  return ALIQUOTE_MAP[id];
}

export function calcolaSociScenario(inp: SociScenarioInput): SociScenarioOutput {
  const trasferte = Math.max(0, inp.giorniTrasferte) * Math.max(0, inp.importoTrasfertaGiornaliera);
  const rimborsoKm = Math.max(0, inp.kmAutoPersonale) * Math.max(0, inp.tariffaKmEur);
  const buoniPasto = Math.max(0, inp.giorniBuoniPasto) * Math.max(0, inp.importoBuonoPastoGiornaliero);
  const sommaRimborsiIndennita = trasferte + rimborsoKm + buoniPasto;

  if (inp.modalita === 'senza_compenso') {
    return {
      trasferte,
      rimborsoKm,
      buoniPasto,
      sommaRimborsiIndennita,
      compensoLordo: 0,
      ritenutaInps: 0,
      aliquotaInpsApplicata: 0,
      irpefEImposteTotali: 0,
      nettoDaCompenso: 0,
      nettoTotalePercepito: sommaRimborsiIndennita,
      costoTotaleDatore: sommaRimborsiIndennita,
      dettaglioFiscale: null,
    };
  }

  const lordo = Math.max(0, inp.lordoAnnuo);
  const aliq = aliquotaInpsSocioDecimali(inp.aliquotaInpsId);
  const ritenutaInps = lordo * aliq;

  const dettaglio = calcolaNettoDaRedditoLordoEinpsPerc(
    lordo,
    aliq,
    inp.tipoContrattoIrpef,
    12,
    DISCLAIMER_NETTO_SOCIO,
  );

  const irpefEImposteTotali =
    dettaglio.irpefNetta + dettaglio.addizionaleRegionale + dettaglio.addizionaleComunale;
  const nettoDaCompenso = dettaglio.nettoAnnuo;
  const nettoTotalePercepito = nettoDaCompenso + sommaRimborsiIndennita;
  const costoTotaleDatore = lordo + sommaRimborsiIndennita;

  return {
    trasferte,
    rimborsoKm,
    buoniPasto,
    sommaRimborsiIndennita,
    compensoLordo: lordo,
    ritenutaInps,
    aliquotaInpsApplicata: aliq,
    irpefEImposteTotali,
    nettoDaCompenso,
    nettoTotalePercepito,
    costoTotaleDatore,
    dettaglioFiscale: dettaglio,
  };
}
