import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { LRUCache } from 'lru-cache';

/**
 * Utilità condivise dalle route admin: verifica password, rate limiting e
 * rilevamento dell'ambiente di sola lettura.
 */

const FINESTRA_MS = 900_000; // 15 minuti
const MAX_TENTATIVI = 20;

const adminLimiter = new LRUCache<string, number[]>({ max: 500, ttl: FINESTRA_MS });

export function ipRichiesta(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
}

export function adminRateLimited(ip: string): boolean {
  const ora = Date.now();
  const recenti = (adminLimiter.get(ip) ?? []).filter(t => ora - t < FINESTRA_MS);
  if (recenti.length >= MAX_TENTATIVI) return true;
  adminLimiter.set(ip, [...recenti, ora]);
  return false;
}

/**
 * Confronto a tempo costante. Si confrontano gli hash, non le stringhe:
 * hanno sempre la stessa lunghezza, quindi non serve un ramo di fallback
 * che reintrodurrebbe una differenza di tempo sulla lunghezza del segreto.
 */
function confrontoSicuro(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export type EsitoAuth =
  | { ok: true }
  | { ok: false; risposta: NextResponse };

/**
 * Verifica password admin e rate limit. La password arriva dal body o
 * dall'header `x-admin-password`, mai dalla query string: i query param
 * finiscono nei log di accesso della piattaforma.
 */
export function autenticaAdmin(req: NextRequest, password: string | undefined): EsitoAuth {
  const attesa = process.env.ADMIN_PASSWORD;
  if (!attesa) {
    return {
      ok: false,
      risposta: rispostaAdmin({ errore: 'Pannello admin non configurato (ADMIN_PASSWORD mancante)' }, 500),
    };
  }

  if (adminRateLimited(ipRichiesta(req))) {
    return {
      ok: false,
      risposta: rispostaAdmin({ errore: 'Troppi tentativi. Riprova tra 15 minuti.' }, 429),
    };
  }

  if (!password || !confrontoSicuro(password, attesa)) {
    return { ok: false, risposta: rispostaAdmin({ errore: 'Password non corretta' }, 403) };
  }

  return { ok: true };
}

/**
 * Su Vercel il filesystem del progetto è in sola lettura e i JSON dei dati
 * sono inclusi nel bundle a build time: una scrittura non avrebbe comunque
 * effetto sui calcoli. In quegli ambienti il pannello lavora in export.
 * Override esplicito con ADMIN_SOLA_LETTURA = '1' | '0'.
 */
export function adminSolaLettura(): boolean {
  if (process.env.ADMIN_SOLA_LETTURA === '1') return true;
  if (process.env.ADMIN_SOLA_LETTURA === '0') return false;
  return Boolean(process.env.VERCEL);
}

/** Risposta JSON mai memorizzabile in cache: contiene dati autenticati. */
export function rispostaAdmin(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  });
}

/** Percorsi dei file di dati modificabili dal pannello. */
export const FILE_WHITELIST = new Set([
  'data/aliquote-inps.json',
  'data/inail.json',
  'data/tfr.json',
  'data/ccnl/commercio.json',
  'data/ccnl/metalmeccanici.json',
  'data/ccnl/edilizia.json',
  'data/ccnl/sanita_privata.json',
  'data/ccnl/studi_professionali.json',
  'data/ccnl/cooperative_sociali.json',
  'data/ccnl/trasporti.json',
  'data/ccnl/pubblici_esercizi.json',
  'data/ccnl/chimica.json',
  'data/ccnl/credito.json',
  'data/ccnl/multiservizi.json',
  'data/ccnl/telecomunicazioni.json',
  'data/ccnl/tessile.json',
  'data/ccnl/informatica.json',
  'data/ccnl/agricoltura.json',
  'data/ccnl/scuole_private.json',
  'data/ccnl/alimentari.json',
  'data/ccnl/turismo.json',
  'data/ccnl/assicurazioni.json',
  'data/ccnl/gomma_plastica.json',
  'data/ccnl/vigilanza_privata.json',
  'data/ccnl/legno_arredamento.json',
  'data/ccnl/grafica_editoria.json',
  'data/ccnl/metalmeccanici_artigianato.json',
  'data/ccnl/commercio_confesercenti.json',
  'data/ccnl/condomini.json',
  'data/ccnl/autorimesse.json',
  'data/ccnl/lavoro_domestico.json',
  'data/ccnl/domestici.json',
  'data/ccnl/domestici_conviventi.json',
  'data/addizionali-irpef.json',
  'data/gestione-separata.json',
]);
