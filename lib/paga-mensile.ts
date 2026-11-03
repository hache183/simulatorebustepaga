import type { LivelloCcnl } from '@/types';

/**
 * Paga mensile usata come base della RAL di default.
 * Minimo tabellare più indennità contrattuali nominate (contingenza, EDR,
 * indennità di funzione, superminimo collettivo). Non somma terzo elemento,
 * elemento distinto né la colonna TOTALE (`retribuzioneMensileTabella`).
 */
export function pagaMensileBase(livello: LivelloCcnl): number {
  const indennita =
    (livello.contingenza ?? 0) +
    (livello.edr ?? 0) +
    (livello.altreIndennitaFisse ?? 0) +
    (livello.superminimoCollettivo ?? 0) +
    (livello.indennitaFunzione ?? 0);
  return Math.round((livello.minimoTabellare + indennita) * 100) / 100;
}
