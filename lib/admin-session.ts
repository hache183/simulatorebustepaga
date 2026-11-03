import { redisCommand, redisConfigurato } from '@/lib/redis-rest';

/** Cookie di sessione consulente. Sostituisce il token statico AUTH_TOKEN. */
export const ADMIN_SESSION_COOKIE = 'admin_session';

const MAX_AGE_SEC = 60 * 60 * 24 * 7;
const PREFISSO = 'v1';

export function segretoSessione(): string | null {
  const valore = process.env.AUTH_SESSION_SECRET?.trim();
  if (!valore || valore.length < 16) return null;
  return valore;
}

export function versioneSessione(): string {
  return process.env.AUTH_SESSION_VERSION?.trim() || '1';
}

export function opzioniCookieSessione(): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'strict';
  path: '/';
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: MAX_AGE_SEC,
  };
}

interface Claims {
  id: string;
  exp: number;
  ver: string;
}

function byteToB64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlToBytes(value: string): Uint8Array | null {
  try {
    const pad = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4));
    const b64 = value.replace(/-/g, '+').replace(/_/g, '/') + pad;
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function firma(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

function uguali(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function chiaveRedis(id: string): string {
  return `admin:sess:${id}`;
}

function idCasuale(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/** Token firmato. Con Redis la sessione è revocabile singolarmente al logout. */
export async function creaSessioneAdmin(): Promise<string | null> {
  const secret = segretoSessione();
  if (!secret) return null;
  const claims: Claims = {
    id: idCasuale(),
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC,
    ver: versioneSessione(),
  };
  const payload = byteToB64url(new TextEncoder().encode(JSON.stringify(claims)));
  const mac = byteToB64url(await firma(secret, `${PREFISSO}.${payload}`));
  const token = `${PREFISSO}.${payload}.${mac}`;

  if (redisConfigurato()) {
    try {
      await redisCommand(['SET', chiaveRedis(claims.id), '1', 'EX', MAX_AGE_SEC]);
    } catch (e) {
      console.error('[admin-session] registrazione Redis non riuscita', e);
    }
  }
  return token;
}

export async function verificaSessioneAdmin(token: string | undefined | null): Promise<boolean> {
  const claims = await leggiClaims(token);
  if (!claims) return false;
  if (!redisConfigurato()) return true;
  try {
    const presente = await redisCommand(['EXISTS', chiaveRedis(claims.id)]);
    return presente === 1;
  } catch (e) {
    console.error('[admin-session] verifica Redis non riuscita, accetto la firma', e);
    return true;
  }
}

export async function revocaSessioneAdmin(token: string | undefined | null): Promise<void> {
  const claims = await leggiClaims(token);
  if (!claims || !redisConfigurato()) return;
  try {
    await redisCommand(['DEL', chiaveRedis(claims.id)]);
  } catch (e) {
    console.error('[admin-session] revoca Redis non riuscita', e);
  }
}

async function leggiClaims(token: string | undefined | null): Promise<Claims | null> {
  const secret = segretoSessione();
  if (!secret || !token || token.length > 512) return null;
  const parti = token.split('.');
  if (parti.length !== 3) return null;
  const [versione, payload, mac] = parti;
  if (versione !== PREFISSO || !payload || !mac) return null;

  const attesa = await firma(secret, `${versione}.${payload}`);
  const ricevuta = b64urlToBytes(mac);
  if (!ricevuta || !uguali(ricevuta, attesa)) return null;

  let claims: Partial<Claims>;
  try {
    const raw = b64urlToBytes(payload);
    if (!raw) return null;
    claims = JSON.parse(new TextDecoder().decode(raw)) as Partial<Claims>;
  } catch {
    return null;
  }
  if (typeof claims.id !== 'string' || !/^[a-f0-9]{32}$/.test(claims.id)) return null;
  if (typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) return null;
  if (claims.ver !== versioneSessione()) return null;
  return { id: claims.id, exp: claims.exp, ver: claims.ver };
}
