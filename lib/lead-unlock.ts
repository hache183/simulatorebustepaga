import { createHash, createHmac, timingSafeEqual } from 'crypto';

/** Cookie HttpOnly impostato da POST /api/leads dopo invio lead valido. */
export const LEAD_UNLOCK_COOKIE = 'lead_unlock';

/** Durata sblocco simulatore (giorni). */
export const LEAD_UNLOCK_MAX_AGE_DAYS = 30;

export const LEAD_UNLOCK_MAX_AGE_SEC = LEAD_UNLOCK_MAX_AGE_DAYS * 24 * 60 * 60;

export type LeadModulo = 'dipendenti' | 'edili' | 'domestici' | 'soci';

const VERSIONE = 'v1';
const SEGRETO_MIN = 16;

export type EsitoCookieLead =
  | { ok: true; leadId: string }
  | { ok: false };

/**
 * Formato: `v1.<base64url({id, exp})>.<base64url(hmac-sha256)>`.
 * `exp` è in secondi Unix. Il segreto sta solo in LEAD_COOKIE_SECRET.
 */
function segreto(): string | null {
  const valore = process.env.LEAD_COOKIE_SECRET?.trim();
  if (!valore || valore.length < SEGRETO_MIN) return null;
  return valore;
}

export function segretoLeadConfigurato(): boolean {
  return segreto() !== null;
}

/**
 * Confronto a tempo costante. Gli HMAC hanno lunghezza fissa, ma una firma
 * alterata può averne un'altra: timingSafeEqual rifiuta lunghezze diverse,
 * quindi si confrontano gli hash SHA-256 (sempre 32 byte), come in admin-auth.
 */
function macUguali(ricevuta: Buffer, attesa: Buffer): boolean {
  const ha = createHash('sha256').update(ricevuta).digest();
  const hb = createHash('sha256').update(attesa).digest();
  return timingSafeEqual(ha, hb);
}

export function opzioniCookieLead(): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: LEAD_UNLOCK_MAX_AGE_SEC,
  };
}

export function firmaCookieLead(
  leadId: string,
  opts?: { nowMs?: number; ttlSec?: number },
): string | null {
  const key = segreto();
  if (!key || !/^[\w-]{8,80}$/.test(leadId)) return null;
  const nowMs = opts?.nowMs ?? Date.now();
  const ttlSec = opts?.ttlSec ?? LEAD_UNLOCK_MAX_AGE_SEC;
  const exp = Math.floor(nowMs / 1000) + ttlSec;
  const payload = Buffer.from(JSON.stringify({ id: leadId, exp }), 'utf8').toString('base64url');
  const mac = createHmac('sha256', key).update(`${VERSIONE}.${payload}`).digest('base64url');
  return `${VERSIONE}.${payload}.${mac}`;
}

export function verificaCookieLead(
  token: string | undefined | null,
  nowMs = Date.now(),
): EsitoCookieLead {
  const key = segreto();
  if (!key || !token || token.length > 512) return { ok: false };

  const parti = token.split('.');
  if (parti.length !== 3) return { ok: false };
  const [versione, payload, firma] = parti;
  if (versione !== VERSIONE || !payload || !firma) return { ok: false };

  const attesa = createHmac('sha256', key).update(`${versione}.${payload}`).digest();
  const ricevuta = Buffer.from(firma, 'base64url');
  if (!macUguali(ricevuta, attesa)) return { ok: false };

  let claims: { id?: unknown; exp?: unknown };
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { id?: unknown; exp?: unknown };
  } catch {
    return { ok: false };
  }

  if (typeof claims.id !== 'string' || !/^[\w-]{8,80}$/.test(claims.id)) return { ok: false };
  if (typeof claims.exp !== 'number' || !Number.isFinite(claims.exp)) return { ok: false };
  if (claims.exp <= Math.floor(nowMs / 1000)) return { ok: false };
  return { ok: true, leadId: claims.id };
}
