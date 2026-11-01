const EVENTO = 'costwork:lead-richiesto';

/** Chiede al funnel di rimettere il modulo lead (cookie assente o rifiutato). */
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
 * Legge il JSON di un'API di calcolo. Su 401 avvisa il funnel e non
 * restituisce un risultato: il simulatore torna al modulo.
 */
export async function leggiRispostaSimulazione<T>(res: Response): Promise<T | null> {
  let json: { errore?: string } = {};
  try {
    json = (await res.json()) as { errore?: string };
  } catch {
    json = {};
  }
  if (res.status === 401) {
    segnalaLeadRichiesto();
    return null;
  }
  if (!res.ok) {
    throw new Error(json.errore ?? 'Errore nel calcolo');
  }
  return json as T;
}
