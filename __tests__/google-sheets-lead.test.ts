import fs from 'fs';
import os from 'os';
import path from 'path';
import { NextRequest } from 'next/server';
import { POST as creaLead } from '@/app/api/leads/route';
import {
  formattaDataRoma,
  normalizzaChiavePrivata,
  salvaLeadSuFoglio,
} from '@/lib/google-sheets-lead';
import { LEAD_UNLOCK_COOKIE, verificaCookieLead } from '@/lib/lead-unlock';
import { inviaEmailLead, type LeadPayload } from '@/lib/send-lead-email';

jest.mock('@/lib/send-lead-email', () => ({
  inviaEmailLead: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('googleapis', () => ({
  __esModule: true,
  google: {
    auth: { JWT: jest.fn() },
    sheets: jest.fn(),
  },
}));

const SECRET = 'test-secret-lead-cookie-32b-minimo';
const CHIAVE_ENV = '-----BEGIN PRIVATE KEY-----\\nTEST\\n-----END PRIVATE KEY-----\\n';
const CHIAVE_PEM = '-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----\n';
const EMAIL_SA = 'lead-test@example.iam.gserviceaccount.com';
const SHEET_ID = 'sheet-test-id';
const storeFile = path.join(os.tmpdir(), `leads-sheets-${process.pid}.json`);

const mockGet = jest.fn();
const mockAppend = jest.fn();
const { google } = jest.requireMock('googleapis') as {
  google: { auth: { JWT: jest.Mock }; sheets: jest.Mock };
};
const mockJwt = google.auth.JWT;
const mockSheets = google.sheets;

const leadBase: LeadPayload = {
  id: '11111111-1111-4111-8111-111111111111',
  nome: 'Mario\nRossi',
  email: 'mario@example.com',
  telefono: '333 1234567',
  azienda: 'Rossi Srl',
  ruolo: '=HR',
  marketing: true,
  modulo: 'edili',
  meta: { settore: 'edilizia', note: 'linea\tunica' },
};

const intestazione = [
  'Data (ora di Roma)',
  'ID',
  'Modulo',
  'Nome',
  'Email',
  'Telefono',
  'Azienda',
  'Ruolo',
  'Consenso marketing',
  'Contesto',
];

function richiesta(body: unknown, ip: string): NextRequest {
  return new NextRequest('http://localhost/api/leads', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
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

function corpoLead(extra: Record<string, unknown> = {}) {
  return {
    nome: 'Mario Rossi',
    email: 'mario@example.com',
    telefono: '333 1234567',
    azienda: 'Rossi Srl',
    ruolo: 'HR',
    privacy: true,
    marketing: false,
    modulo: 'dipendenti',
    meta: { ccnl: 'commercio' },
    website: '',
    ...extra,
  };
}

function configuraFoglio() {
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID = SHEET_ID;
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = EMAIL_SA;
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = CHIAVE_ENV;
  delete process.env.GOOGLE_SHEETS_TAB_NAME;
}

function togliConfigurazione() {
  delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  delete process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  delete process.env.GOOGLE_SHEETS_TAB_NAME;
}

beforeEach(() => {
  process.env.LEAD_COOKIE_SECRET = SECRET;
  process.env.LEAD_STORE_PATH = storeFile;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  togliConfigurazione();
  fs.rmSync(storeFile, { force: true });
  mockGet.mockReset();
  mockAppend.mockReset();
  mockGet.mockResolvedValue({ data: {} });
  mockAppend.mockResolvedValue({ data: {} });
  mockJwt.mockReset();
  mockJwt.mockImplementation(() => ({ kind: 'jwt' }));
  mockSheets.mockReset();
  mockSheets.mockReturnValue({
    spreadsheets: { values: { get: mockGet, append: mockAppend } },
  });
  (inviaEmailLead as jest.Mock).mockReset();
  (inviaEmailLead as jest.Mock).mockResolvedValue(undefined);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  fs.rmSync(storeFile, { force: true });
  togliConfigurazione();
});

describe('chiave e data', () => {
  test('converte i \\n letterali e gli apici tipici di Vercel', () => {
    expect(normalizzaChiavePrivata(`"${CHIAVE_ENV}"`)).toBe(CHIAVE_PEM);
    expect(normalizzaChiavePrivata(CHIAVE_PEM)).toBe(CHIAVE_PEM);
  });

  test('formatta l\'orario in Europe/Rome, anche col cambio ora', () => {
    expect(formattaDataRoma(new Date('2026-01-15T23:30:00.000Z'))).toBe('16/01/2026 00:30:00');
    expect(formattaDataRoma(new Date('2026-07-15T22:30:00.000Z'))).toBe('16/07/2026 00:30:00');
  });
});

describe('salvaLeadSuFoglio', () => {
  test('su un foglio vuoto scrive intestazione italiana e i campi del lead', async () => {
    configuraFoglio();
    const quando = new Date('2026-01-15T23:30:00.000Z');
    await salvaLeadSuFoglio(leadBase, quando);

    expect(mockJwt).toHaveBeenCalledWith({
      email: EMAIL_SA,
      key: CHIAVE_PEM,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    expect(mockGet).toHaveBeenCalledWith({
      spreadsheetId: SHEET_ID,
      range: "'Lead'!A1",
    });
    expect(mockAppend).toHaveBeenCalledTimes(1);
    expect(mockAppend).toHaveBeenCalledWith({
      spreadsheetId: SHEET_ID,
      range: "'Lead'!A:J",
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [
          intestazione,
          [
            '16/01/2026 00:30:00',
            leadBase.id,
            'edili',
            'Mario Rossi',
            'mario@example.com',
            '333 1234567',
            'Rossi Srl',
            '=HR',
            'sì',
            'settore=edilizia, note=linea unica',
          ],
        ],
      },
    });
  });

  test('se il foglio ha già una riga appende solo i dati', async () => {
    configuraFoglio();
    process.env.GOOGLE_SHEETS_TAB_NAME = "L'archivio";
    mockGet.mockResolvedValue({ data: { values: [['Data (ora di Roma)']] } });
    await salvaLeadSuFoglio(
      { ...leadBase, marketing: false, meta: undefined, azienda: undefined },
      new Date('2026-01-15T23:30:00.000Z'),
    );

    const scritto = mockAppend.mock.calls[0][0] as {
      range: string;
      requestBody: { values: string[][] };
    };
    expect(scritto.range).toBe("'L''archivio'!A:J");
    expect(scritto.requestBody.values).toEqual([[
      '16/01/2026 00:30:00',
      leadBase.id,
      'edili',
      'Mario Rossi',
      'mario@example.com',
      '333 1234567',
      '',
      '=HR',
      'no',
      '',
    ]]);
  });

  test('senza variabili non chiama Google', async () => {
    await salvaLeadSuFoglio(leadBase);
    expect(mockSheets).not.toHaveBeenCalled();
    expect(mockAppend).not.toHaveBeenCalled();
  });

  test('con configurazione parziale salta la scrittura', async () => {
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = SHEET_ID;
    await salvaLeadSuFoglio(leadBase);
    expect(mockSheets).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  test('una chiave che non è PEM non chiama Google', async () => {
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = SHEET_ID;
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = EMAIL_SA;
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = 'non-e-una-chiave';
    await expect(salvaLeadSuFoglio(leadBase)).resolves.toBeUndefined();
    expect(mockSheets).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  test('propaga un errore di rete', async () => {
    configuraFoglio();
    mockGet.mockRejectedValue(new Error('ECONNRESET'));
    await expect(salvaLeadSuFoglio(leadBase)).rejects.toThrow('ECONNRESET');
  });
});

describe('POST /api/leads e il foglio', () => {
  test('dopo l\'email appende la riga e sblocca', async () => {
    configuraFoglio();
    const res = await creaLead(richiesta(corpoLead({ marketing: true, modulo: 'soci' }), '203.0.113.70'));
    expect(res.status).toBe(200);
    const token = tokenDalSetCookie(res);
    expect(verificaCookieLead(token)).toMatchObject({ ok: true });

    const inviato = (inviaEmailLead as jest.Mock).mock.calls[0][0] as LeadPayload;
    expect(mockAppend).toHaveBeenCalledTimes(1);
    const valori = mockAppend.mock.calls[0][0].requestBody.values as string[][];
    expect(valori[0]).toEqual(intestazione);
    expect(valori[1]).toEqual([
      expect.stringMatching(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/),
      inviato.id,
      'soci',
      'Mario Rossi',
      'mario@example.com',
      '333 1234567',
      'Rossi Srl',
      'HR',
      'sì',
      'ccnl=commercio',
    ]);
    expect(res.headers.get('set-cookie')).toContain(LEAD_UNLOCK_COOKIE);
  });

  test('se il foglio non risponde sblocca comunque', async () => {
    configuraFoglio();
    mockAppend.mockRejectedValue(new Error('socket hang up'));
    const res = await creaLead(richiesta(corpoLead(), '203.0.113.71'));
    expect(res.status).toBe(200);
    const json = await res.json() as { ok?: boolean; unlocked?: boolean };
    expect(json).toEqual({ ok: true, unlocked: true });
    expect(verificaCookieLead(tokenDalSetCookie(res)).ok).toBe(true);
    expect(inviaEmailLead).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith('[google-sheets]', 'socket hang up');

    const archivio = JSON.parse(fs.readFileSync(storeFile, 'utf8')) as { leads: Array<{ email: string }> };
    expect(archivio.leads[0].email).toBe('mario@example.com');
  });

  test('senza variabili il comportamento resta solo email', async () => {
    const res = await creaLead(richiesta(corpoLead(), '203.0.113.72'));
    expect(res.status).toBe(200);
    expect(inviaEmailLead).toHaveBeenCalledTimes(1);
    expect(mockSheets).not.toHaveBeenCalled();
    expect(verificaCookieLead(tokenDalSetCookie(res)).ok).toBe(true);
  });

  test('honeypot non scrive sul foglio né manda email', async () => {
    configuraFoglio();
    const res = await creaLead(richiesta(corpoLead({
      nome: 'Bot',
      email: 'bot@example.com',
      website: 'http://spam.test',
    }), '203.0.113.73'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(inviaEmailLead).not.toHaveBeenCalled();
    expect(mockSheets).not.toHaveBeenCalled();
    expect(mockAppend).not.toHaveBeenCalled();
    expect(tokenDalSetCookie(res)).toBeNull();
    expect(fs.existsSync(storeFile)).toBe(false);
  });

  test('se l\'email fallisce non scrive sul foglio e non sblocca', async () => {
    configuraFoglio();
    (inviaEmailLead as jest.Mock).mockRejectedValue(new Error('resend down'));
    const res = await creaLead(richiesta(corpoLead(), '203.0.113.74'));
    expect(res.status).toBe(503);
    expect(mockAppend).not.toHaveBeenCalled();
    expect(tokenDalSetCookie(res)).toBeNull();
    expect(fs.existsSync(storeFile)).toBe(false);
  });
});
