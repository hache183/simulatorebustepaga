const EVENTO = 'costwork:lead-richiesto';

/** Il calcolo è stato chiesto senza un cookie lead valido. */
export class AccessoLeadRichiesto extends Error {
  constructor() {
    super('Per vedere il report inserisci i tuoi dati.');
    this.name = 'AccessoLeadRichiesto';
  }
}

/** L'utente ha chiuso il modulo senza inviare i dati. */
export class CalcoloAnnullato extends Error {
  constructor() {
    super('Calcolo annullato');
    this.name = 'CalcoloAnnullato';
  }
}

/** Chiede al gate di riaprire il modulo lead (cookie assente o rifiutato). */
export function segnalaLeadRichiesto(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENTO));
}

export function ascoltaLeadRichiesto(fn: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => fn();
  window.addEventListener(EVENTO, handler);
  return () => window.removeEventListener(EVENTO, handler);
}

/**
 * Legge il JSON di un'API di calcolo. Su 401 lancia AccessoLeadRichiesto:
 * il gate mostra il modulo e ripete la stessa richiesta.
 */
export async function leggiRispostaSimulazione<T>(res: Response): Promise<T> {
  let json: { errore?: string } = {};
  try {
    json = (await res.json()) as { errore?: string };
  } catch {
    json = {};
  }
  if (res.status === 401) {
    segnalaLeadRichiesto();
    throw new AccessoLeadRichiesto();
  }
  if (!res.ok) {
    throw new Error(json.errore ?? 'Errore nel calcolo');
  }
  return json as T;
}
