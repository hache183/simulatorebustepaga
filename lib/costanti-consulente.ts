/** Forfait medio assistenza sanitaria integrativa (solo flusso Dipendenti). */
export const ASSISTENZA_SANITARIA_FORFAIT_MENSILE = 15;
export const ASSISTENZA_SANITARIA_FORFAIT_ANNUO = ASSISTENZA_SANITARIA_FORFAIT_MENSILE * 12;

export const NOTA_ASSISTENZA_SANITARIA_FORFAIT =
  `Forfait medio ${ASSISTENZA_SANITARIA_FORFAIT_MENSILE.toFixed(2)} €/mese × 12. ` +
  'Il dato è suscettibile di variazione da verificare con il consulente del lavoro.';

/** Ore fisse per formula semplificata ferie/permessi/ex festività non godute (dipendenti). */
export const ORE_FERIE_NON_GODUTE_FISSE = 173;

export const NOTA_FERIE_NON_GODUTE_SEMPLIFICATA = (mensilita: number) =>
  `${ORE_FERIE_NON_GODUTE_FISSE} h × (RAL / ${mensilita} / ${ORE_FERIE_NON_GODUTE_FISSE}) — ` +
  'ferie, permessi ed ex festività non godute (formula semplificata)';
