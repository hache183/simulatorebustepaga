import type { NettoDipendente } from '@/types';

export const DISCLAIMER_NETTO_DIPENDENTE =
  'Il netto è una stima indicativa. Il calcolo esatto dipende dalla situazione fiscale personale del dipendente (carichi familiari, detrazioni aggiuntive, addizionali comunali/regionali specifiche).';

/**
 * Calcola IRPEF lorda per scaglioni 2025-2026 (L. 207/2024, aggiornata da L. 199/2025).
 * Dal 2025 il secondo scaglione passa dal 35% al 33% (art. 1 L. 199/2025).
 */
export function calcolaIrpefLorda(imponibile: number): number {
  if (imponibile <= 28_000) {
    return imponibile * 0.23;
  } else if (imponibile <= 50_000) {
    return 28_000 * 0.23 + (imponibile - 28_000) * 0.33;
  } else {
    return 28_000 * 0.23 + 22_000 * 0.33 + (imponibile - 50_000) * 0.43;
  }
}

/**
 * Detrazione per lavoro dipendente (art. 13 TUIR post-riforma).
 */
export function calcolaDetrazioneLavoroDip(imponibile: number, tipoContratto: string): number {
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
 * Bonus cuneo fiscale 2025 (L. 207/2024, art. 1 cc. 4-9).
 */
export function calcolaBonusCuneoFiscale(redditoComplessivo: number): number {
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
 * Pipeline identica al netto dipendente in `calculateCosto` (RAL − INPS% × RAL → IRPEF/detrazioni/cuneo/addizionali).
 * Usabile per dipendenti e per analogia su redditi assimilati quando si applica la stessa scala IRPEF.
 */
export function calcolaNettoDaRedditoLordoEinpsPerc(
  redditoLordoAnnuo: number,
  aliquotaInpsSulLordo: number,
  tipoContratto: string,
  mensilitaContrattuali: number,
  disclaimer: string,
  applicaBonusCuneo = true,
): NettoDipendente {
  const inpsDipendente = redditoLordoAnnuo * aliquotaInpsSulLordo;
  const imponibileIrpef = redditoLordoAnnuo - inpsDipendente;

  const irpefLorda = calcolaIrpefLorda(imponibileIrpef);
  const detrazioneLavoroDip = calcolaDetrazioneLavoroDip(imponibileIrpef, tipoContratto);
  const bonusCuneoFiscale = applicaBonusCuneo ? calcolaBonusCuneoFiscale(imponibileIrpef) : 0;
  const irpefNetta = Math.max(0, irpefLorda - detrazioneLavoroDip - bonusCuneoFiscale);

  const addizionaleRegionale = imponibileIrpef * 0.0173;
  const addizionaleComunale = imponibileIrpef * 0.008;

  const nettoAnnuo = redditoLordoAnnuo - inpsDipendente - irpefNetta - addizionaleRegionale - addizionaleComunale;
  const nettoMensile12 = nettoAnnuo / 12;
  const nettoPerMensilita = nettoAnnuo / mensilitaContrattuali;

  return {
    ralLorda: redditoLordoAnnuo,
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
    disclaimer,
  };
}
