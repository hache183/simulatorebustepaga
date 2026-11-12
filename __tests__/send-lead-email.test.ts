import fs from 'fs';
import os from 'os';
import path from 'path';
import { NextRequest } from 'next/server';
import nodemailer from 'nodemailer';
import { POST as creaLead } from '@/app/api/leads/route';
import { LEAD_UNLOCK_COOKIE, verificaCookieLead } from '@/lib/lead-unlock';
import { inviaEmailLead, type LeadPayload } from '@/lib/send-lead-email';

const sendMail = jest.fn();
const createTransport = nodemailer.createTransport as jest.Mock;

jest.mock('nodemailer', () => {
  const transport = jest.fn();
  const api = { createTransport: transport };
  return { __esModule: true, default: api };
});

const SECRET = 'test-secret-lead-cookie-32b-minimo';
const storeFile = path.join(os.tmpdir(), `leads-smtp-${process.pid}.json`);

const ENV_SMTP = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'LEADS_TO_EMAIL',
  'LEADS_FROM_EMAIL',
] as const;

const lead: LeadPayload = {
  id: 'lead-smtp-01',
  nome: 'A & B <C>',
  email: 'visitatore@example.com',
  telefono: '333 1234567',
  azienda: 'Rossi Srl',
  ruolo: 'HR',
  marketing: true,
  modulo: 'edili',
  meta: { ccnl: 'studi', livello: 'Q' },
};

function impostaSmtp(port = '465') {
  process.env.SMTP_HOST = 'smtp.test.local';
  process.env.SMTP_PORT = port;
  process.env.SMTP_USER = 'info@example.com';
  process.env.SMTP_PASS = 'test-smtp-pass';
  process.env.LEADS_TO_EMAIL = 'info@example.com';
  process.env.LEADS_FROM_EMAIL = 'Costi Lavoro Italia <info@example.com>';
}

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

function corpo(extra: Record<string, unknown> = {}) {
  return {
    nome: 'Mario Rossi',
    email: 'visitatore@example.com',
    telefono: '3331234567',
    azienda: 'Rossi Srl',
    ruolo: 'HR',
    privacy: true,
    marketing: false,
    modulo: 'dipendenti',
    website: '',
    ...extra,
  };
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

beforeEach(() => {
  sendMail.mockReset();
  sendMail.mockResolvedValue({ messageId: 'id-test' });
  createTransport.mockReset();
  createTransport.mockReturnValue({ sendMail });
  process.env.LEAD_COOKIE_SECRET = SECRET;
  process.env.LEAD_STORE_PATH = storeFile;
  impostaSmtp();
  fs.rmSync(storeFile, { force: true });
});

afterAll(() => {
  fs.rmSync(storeFile, { force: true });
});

describe('inviaEmailLead', () => {
  test('invia lo stesso testo, HTML e subject via SMTP sulla porta 465', async () => {
    const istante = new Date('2026-11-12T08:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(istante);
    try {
      await inviaEmailLead(lead);
    } finally {
      jest.useRealTimers();
    }

    const data = istante.toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
    const righe = [
      'ID: lead-smtp-01',
      'Modulo: edili',
      'Nome: A & B <C>',
      'Email: visitatore@example.com',
      'Telefono: 333 1234567',
      'Azienda: Rossi Srl',
      'Ruolo: HR',
      'Consenso marketing: sì',
      'Contesto: ccnl=studi, livello=Q',
      `Data: ${data}`,
    ];

    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.test.local',
      port: 465,
      secure: true,
      auth: { user: 'info@example.com', pass: 'test-smtp-pass' },
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0] as { from: string; to: string; subject: string; text: string; html: string };
    expect(mail.from).toBe('Costi Lavoro Italia <info@example.com>');
    expect(mail.to).toBe('info@example.com');
    expect(mail.to).not.toBe(lead.email);
    expect(mail.subject).toBe('[Costi Lavoro Italia] Nuovo lead — edili');
    expect(mail.text).toBe(righe.join('\n'));
    expect(mail.html).toBe(
      `<pre style="font-family:sans-serif;font-size:14px;line-height:1.5">${righe.map(r => r.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('\n')}</pre>`,
    );
    expect(mail.html).toContain('A &amp; B &lt;C&gt;');
    expect(mail.html).not.toContain('<C>');
  });

  test('sulla porta 587 usa STARTTLS e non SSL implicito', async () => {
    impostaSmtp('587');
    await inviaEmailLead({ ...lead, meta: undefined, telefono: undefined, azienda: undefined, ruolo: undefined, marketing: false });

    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.test.local',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: 'info@example.com', pass: 'test-smtp-pass' },
    });
    const mail = sendMail.mock.calls[0][0] as { text: string; subject: string };
    expect(mail.subject).toBe('[Costi Lavoro Italia] Nuovo lead — edili');
    expect(mail.text).toContain('Consenso marketing: no');
    expect(mail.text).not.toContain('Telefono:');
    expect(mail.text).not.toContain('Contesto:');
  });

  test('senza una variabile obbligatoria non apre il trasporto', async () => {
    for (const chiave of ENV_SMTP) {
      impostaSmtp();
      delete process.env[chiave];
      createTransport.mockClear();
      await expect(inviaEmailLead(lead)).rejects.toThrow(/Configurazione email lead mancante/);
      expect(createTransport).not.toHaveBeenCalled();
    }

    impostaSmtp();
    process.env.SMTP_PORT = 'abc';
    createTransport.mockClear();
    await expect(inviaEmailLead(lead)).rejects.toThrow(/Configurazione email lead mancante/);
    expect(createTransport).not.toHaveBeenCalled();
  });
});

describe('POST /api/leads con SMTP', () => {
  test('invio corretto sblocca il cookie', async () => {
    const res = await creaLead(richiesta(corpo(), '203.0.113.80'));
    expect(res.status).toBe(200);
    const token = tokenDalSetCookie(res);
    expect(token).toBeTruthy();
    expect(verificaCookieLead(token).ok).toBe(true);
    expect(res.headers.get('set-cookie')).toContain(LEAD_UNLOCK_COOKIE);

    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0] as { to: string; subject: string; text: string };
    expect(mail.to).toBe('info@example.com');
    expect(mail.to).not.toContain('visitatore@example.com');
    expect(mail.subject).toBe('[Costi Lavoro Italia] Nuovo lead — dipendenti');
    expect(mail.text).toContain('Email: visitatore@example.com');
    expect(mail.text).toContain('Nome: Mario Rossi');
  });

  test('configurazione mancante risponde 503 e non sblocca', async () => {
    delete process.env.SMTP_HOST;
    const res = await creaLead(richiesta(corpo(), '203.0.113.81'));
    expect(res.status).toBe(503);
    expect(tokenDalSetCookie(res)).toBeNull();
    expect(createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
    expect(fs.existsSync(storeFile)).toBe(false);
  });

  test('errore SMTP risponde 503 e non sblocca', async () => {
    sendMail.mockRejectedValueOnce(new Error('connessione rifiutata'));
    const res = await creaLead(richiesta(corpo(), '203.0.113.82'));
    expect(res.status).toBe(503);
    expect(tokenDalSetCookie(res)).toBeNull();
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(storeFile)).toBe(false);
  });

  test('honeypot non invia la mail e non sblocca', async () => {
    const res = await creaLead(richiesta(corpo({ website: 'http://spam.test' }), '203.0.113.83'));
    expect(res.status).toBe(200);
    expect(tokenDalSetCookie(res)).toBeNull();
    expect(createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
    expect(fs.existsSync(storeFile)).toBe(false);
  });
});
