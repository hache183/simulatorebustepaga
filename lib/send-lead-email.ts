import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { escapeHtml } from '@/lib/html';
import type { LeadModulo } from '@/lib/lead-unlock';

export interface LeadPayload {
  id: string;
  nome: string;
  email: string;
  telefono?: string;
  azienda?: string;
  ruolo?: string;
  marketing: boolean;
  modulo: LeadModulo;
  meta?: Record<string, string>;
}

const VARIABILI_SMTP = 'SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, LEADS_TO_EMAIL, LEADS_FROM_EMAIL';

interface ConfigSmtp {
  host: string;
  port: number;
  user: string;
  pass: string;
  to: string;
  from: string;
}

function portaSmtp(valore: string): number | null {
  if (!/^\d+$/.test(valore)) return null;
  const port = Number(valore);
  if (port < 1 || port > 65535) return null;
  return port;
}

function leggiConfigurazione(): ConfigSmtp {
  const host = process.env.SMTP_HOST?.trim() ?? '';
  const portRaw = process.env.SMTP_PORT?.trim() ?? '';
  const user = process.env.SMTP_USER?.trim() ?? '';
  const pass = process.env.SMTP_PASS ?? '';
  const to = process.env.LEADS_TO_EMAIL?.trim() ?? '';
  const from = process.env.LEADS_FROM_EMAIL?.trim() ?? '';
  const port = portaSmtp(portRaw);

  if (!host || port === null || !user || !pass || !to || !from) {
    throw new Error(`Configurazione email lead mancante (${VARIABILI_SMTP}).`);
  }

  return { host, port, user, pass, to, from };
}

/** 465: SSL implicito. 587: STARTTLS obbligatorio. */
function opzioniTrasporto(cfg: ConfigSmtp): SMTPTransport.Options {
  const opzioni: SMTPTransport.Options = {
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  };
  if (cfg.port === 587) opzioni.requireTLS = true;
  return opzioni;
}

export async function inviaEmailLead(lead: LeadPayload): Promise<void> {
  const cfg = leggiConfigurazione();
  const transport = nodemailer.createTransport(opzioniTrasporto(cfg));
  const testo = (v: string) => v.replace(/[\r\n\t]/g, ' ').trim();
  const meta = lead.meta && Object.keys(lead.meta).length > 0
    ? Object.entries(lead.meta).map(([k, v]) => `${testo(k)}=${testo(v)}`).join(', ')
    : '';
  const righe = [
    `ID: ${testo(lead.id)}`,
    `Modulo: ${lead.modulo}`,
    `Nome: ${testo(lead.nome)}`,
    `Email: ${testo(lead.email)}`,
    lead.telefono ? `Telefono: ${testo(lead.telefono)}` : null,
    lead.azienda ? `Azienda: ${testo(lead.azienda)}` : null,
    lead.ruolo ? `Ruolo: ${testo(lead.ruolo)}` : null,
    `Consenso marketing: ${lead.marketing ? 'sì' : 'no'}`,
    meta ? `Contesto: ${meta}` : null,
    `Data: ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`,
  ].filter((r): r is string => Boolean(r));

  await transport.sendMail({
    from: cfg.from,
    to: cfg.to,
    subject: `[Costi Lavoro Italia] Nuovo lead — ${lead.modulo}`,
    text: righe.join('\n'),
    html: `<pre style="font-family:sans-serif;font-size:14px;line-height:1.5">${righe.map(escapeHtml).join('\n')}</pre>`,
  });
}
