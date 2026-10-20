/** Forfait medio assistenza sanitaria integrativa (solo flusso Dipendenti). */
export const ASSISTENZA_SANITARIA_FORFAIT_MENSILE = 15;
export const ASSISTENZA_SANITARIA_FORFAIT_ANNUO = ASSISTENZA_SANITARIA_FORFAIT_MENSILE * 12;

export const NOTA_ASSISTENZA_SANITARIA_FORFAIT =
  `Forfait medio ${ASSISTENZA_SANITARIA_FORFAIT_MENSILE.toFixed(2)} €/mese × 12. ` +
  'Il dato è suscettibile di variazione da verificare con il consulente del lavoro.';

/**
 * Formula semplificata ferie/permessi/ex festività non godute (dipendenti):
 * 275 h fisse × (retribuzione mensile / 173 h fisse).
 */
export const ORE_FERIE_NON_GODUTE_FISSE = 275;
export const DIVISORE_ORARIO_FERIE_FISSO = 173;

export const NOTA_FERIE_NON_GODUTE_SEMPLIFICATA = (mensilita: number) =>
  `${ORE_FERIE_NON_GODUTE_FISSE} h × (RAL / ${mensilita} / ${DIVISORE_ORARIO_FERIE_FISSO}) — ` +
  'ferie, permessi ed ex festività non godute (formula semplificata)';
