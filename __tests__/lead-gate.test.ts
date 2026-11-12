import fs from 'fs';
import os from 'os';
import path from 'path';
import { NextRequest } from 'next/server';
import { POST as calcola } from '@/app/api/calcola/route';
import { GET as leggiLead, POST as creaLead } from '@/app/api/leads/route';
import { POST as societari } from '@/app/api/societari/route';
import { salvaLead } from '@/lib/lead-store';
import {
  LEAD_UNLOCK_COOKIE,
  LEAD_UNLOCK_MAX_AGE_SEC,
  firmaCookieLead,
  opzioniCookieLead,
  verificaCookieLead,
} from '@/lib/lead-unlock';
import { inviaEmailLead } from '@/lib/send-lead-email';

jest.mock('@/lib/send-lead-email', () => ({
  inviaEmailLead: jest.fn().mockResolvedValue(undefined),
}));

const SECRET = 'test-secret-lead-cookie-32b-minimo';
const storeFile = path.join(os.tmpdir(), `leads-gate-${process.pid}.json`);

const inputCalcolo = {
  ccnlId: 'studi_professionali',
  livello: 'Q',
  ral: 28_000,
  tipoContratto: 'tempo_indeterminato',
  oreLavoro: 40,
  mensilita: 13,
  anzianitaAnni: 0,
  numeroDipendenti: 10,
  regione: 'Lombardia',
  codiceInail: '0723',
  agevolazioniSelezionate: [],
  includiAssistenzaSanitaria: true,
  aliquotaInps: 0.2928,
};

function richiesta(url: string, body: unknown, cookie?: string, ip = '203.0.113.10'): NextRequest {
  const headers = new Headers({
    'content-type': 'application/json',
    'x-forwarded-for': ip,
  });
  if (cookie) headers.set('cookie', `${LEAD_UNLOCK_COOKIE}=${cookie}`);
  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function tokenDalSetCookie(res: Response): string | null {
  const righe = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : [res.headers.get('set-cookie') ?? ''];
  for (const riga of righe) {
    const match = riga.match(/lead_unlock=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

function alteraFirma(token: string): string {
  const parti = token.split('.');
  const firma = parti[2] ?? '';
  const sostituto = firma[0] === 'a' ? 'b' : 'a';
  parti[2] = sostituto + firma.slice(1);
  return parti.join('.');
}

beforeEach(() => {
  process.env.LEAD_COOKIE_SECRET = SECRET;
  process.env.LEAD_STORE_PATH = storeFile;
  delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  delete process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  delete process.env.GOOGLE_SHEETS_TAB_NAME;
  fs.rmSync(storeFile, { force: true });
  jest.clearAllMocks();
});

afterAll(() => {
  fs.rmSync(storeFile, { force: true });
});

describe('cookie lead firmato', () => {
  test('firma e verifica un lead con scadenza a circa 30 giorni', () => {
    const token = firmaCookieLead('lead-test-01');
    expect(token).toBeTruthy();
    expect(verificaCookieLead(token)).toEqual({ ok: true, leadId: 'lead-test-01' });
    const payload = JSON.parse(Buffer.from(token!.split('.')[1], 'base64url').toString('utf8')) as { exp: number };
    const tra = payload.exp - Math.floor(Date.now() / 1000);
    expect(tra).toBeGreaterThan(LEAD_UNLOCK_MAX_AGE_SEC - 5);
    expect(tra).toBeLessThanOrEqual(LEAD_UNLOCK_MAX_AGE_SEC);
  });

  test('rifiuta cookie assente, valore legacy, firma alterata, segreto diverso e scadenza', () => {
    expect(verificaCookieLead(undefined).ok).toBe(false);
    expect(verificaCookieLead('1').ok).toBe(false);

    const token = firmaCookieLead('lead-test-02')!;
    expect(verificaCookieLead(alteraFirma(token)).ok).toBe(false);

    const scaduto = firmaCookieLead('lead-test-03', { ttlSec: -120 })!;
    expect(verificaCookieLead(scaduto).ok).toBe(false);

    process.env.LEAD_COOKIE_SECRET = 'altro-segreto-lungo-abbastanza';
    expect(verificaCookieLead(token).ok).toBe(false);
  });

  test('in produzione il cookie è httpOnly, secure e sameSite lax', () => {
    const env = process.env as { NODE_ENV?: string };
    const precedente = env.NODE_ENV;
    env.NODE_ENV = 'production';
    const opzioni = opzioniCookieLead();
    env.NODE_ENV = precedente;
    expect(opzioni).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: LEAD_UNLOCK_MAX_AGE_SEC,
    });
  });
});

describe('POST /api/calcola', () => {
  test('senza cookie risponde 401', async () => {
    const res = await calcola(richiesta('http://localhost/api/calcola', inputCalcolo));
    expect(res.status).toBe(401);
    const json = await res.json() as { errore?: string; costoTotaleAnnuo?: number };
    expect(json.errore).toBeTruthy();
    expect(json.costoTotaleAnnuo).toBeUndefined();
  });

  test('cookie legacy, alterato o scaduto risponde 401', async () => {
    const legacy = await calcola(richiesta('http://localhost/api/calcola', inputCalcolo, '1', '203.0.113.11'));
    expect(legacy.status).toBe(401);

    const valido = firmaCookieLead('lead-calcola-1')!;
    const alterato = await calcola(richiesta('http://localhost/api/calcola', inputCalcolo, alteraFirma(valido), '203.0.113.12'));
    expect(alterato.status).toBe(401);

    const scaduto = firmaCookieLead('lead-calcola-2', { ttlSec: -30 })!;
    const res = await calcola(richiesta('http://localhost/api/calcola', inputCalcolo, scaduto, '203.0.113.13'));
    expect(res.status).toBe(401);
  });

  test('cookie valido restituisce il risultato e lo collega al lead', async () => {
    const leadId = 'lead-calcola-ok';
    salvaLead({
      id: leadId,
      nome: 'Mario Rossi',
      email: 'mario@example.com',
      telefono: '3331234567',
      marketing: false,
      modulo: 'dipendenti',
    });
    const token = firmaCookieLead(leadId)!;
    const res = await calcola(richiesta('http://localhost/api/calcola', inputCalcolo, token, '203.0.113.20'));
    expect(res.status).toBe(200);
    const json = await res.json() as { costoTotaleAnnuo: number };
    expect(json.costoTotaleAnnuo).toBeGreaterThan(28_000);

    const archivio = JSON.parse(fs.readFileSync(storeFile, 'utf8')) as {
      leads: Array<{ id: string; simulazioni: Array<{ endpoint: string; sintesi: string }> }>;
    };
    expect(archivio.leads[0].id).toBe(leadId);
    expect(archivio.leads[0].simulazioni).toHaveLength(1);
    expect(archivio.leads[0].simulazioni[0].endpoint).toBe('calcola');
    expect(archivio.leads[0].simulazioni[0].sintesi).toContain('ccnl=studi_professionali');
    expect(archivio.leads[0].simulazioni[0].sintesi).toContain('costoAnnuo=');
  });
});

describe('POST /api/societari', () => {
  test('senza cookie risponde 401 e con cookie valido restituisce il risultato', async () => {
    const negato = await societari(richiesta('http://localhost/api/societari', { modalita: 'senza_compenso' }));
    expect(negato.status).toBe(401);

    const leadId = 'lead-soci-ok1';
    const token = firmaCookieLead(leadId)!;
    const res = await societari(richiesta(
      'http://localhost/api/societari',
      { modalita: 'senza_compenso' },
      token,
      '203.0.113.30',
    ));
    expect(res.status).toBe(200);
    const json = await res.json() as { costoTotaleDatore: number };
    expect(typeof json.costoTotaleDatore).toBe('number');

    const archivio = JSON.parse(fs.readFileSync(storeFile, 'utf8')) as {
      simulazioni: Array<{ leadId: string; endpoint: string }>;
    };
    expect(archivio.simulazioni[0]).toMatchObject({ leadId, endpoint: 'societari' });
  });
});

describe('POST /api/leads', () => {
  test('imposta un cookie firmato httpOnly e non il valore legacy 1', async () => {
    const res = await creaLead(richiesta('http://localhost/api/leads', {
      nome: 'Mario Rossi',
      email: 'mario@example.com',
      telefono: '333 1234567',
      azienda: 'Rossi Srl',
      ruolo: 'HR',
      privacy: true,
      marketing: true,
      modulo: 'edili',
      website: '',
    }, undefined, '203.0.113.40'));

    expect(res.status).toBe(200);
    const setCookie = (res.headers.getSetCookie?.() ?? [res.headers.get('set-cookie') ?? '']).join(';');
    expect(setCookie.toLowerCase()).toContain('httponly');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');
    const token = tokenDalSetCookie(res);
    expect(token).toBeTruthy();
    expect(token).not.toBe('1');

    const chiamato = (inviaEmailLead as jest.Mock).mock.calls[0][0] as { id: string; marketing: boolean; ruolo: string };
    expect(verificaCookieLead(token)).toEqual({ ok: true, leadId: chiamato.id });
    expect(chiamato.marketing).toBe(true);
    expect(chiamato.ruolo).toBe('HR');

    const lettura = await leggiLead(new NextRequest('http://localhost/api/leads', {
      headers: { cookie: `${LEAD_UNLOCK_COOKIE}=${token}` },
    }));
    expect(await lettura.json()).toEqual({ unlocked: true });
  });

  test('il valore legacy 1 non risulta sbloccato', async () => {
    const lettura = await leggiLead(new NextRequest('http://localhost/api/leads', {
      headers: { cookie: `${LEAD_UNLOCK_COOKIE}=1` },
    }));
    expect(await lettura.json()).toEqual({ unlocked: false });
  });

  test('senza segreto non invia email e non sblocca', async () => {
    process.env.LEAD_COOKIE_SECRET = 'corto';
    const res = await creaLead(richiesta('http://localhost/api/leads', {
      nome: 'Mario Rossi',
      email: 'mario@example.com',
      telefono: '3331234567',
      privacy: true,
      modulo: 'dipendenti',
    }, undefined, '203.0.113.41'));
    expect(res.status).toBe(503);
    expect(inviaEmailLead).not.toHaveBeenCalled();
    expect(tokenDalSetCookie(res)).toBeNull();
  });

  test('honeypot non crea il lead', async () => {
    const res = await creaLead(richiesta('http://localhost/api/leads', {
      nome: 'Bot',
      email: 'bot@example.com',
      telefono: '3331234567',
      privacy: true,
      modulo: 'dipendenti',
      website: 'http://spam.test',
    }, undefined, '203.0.113.42'));
    expect(res.status).toBe(200);
    expect(inviaEmailLead).not.toHaveBeenCalled();
    expect(tokenDalSetCookie(res)).toBeNull();
  });
});
