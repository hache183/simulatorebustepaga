import { Resend } from 'resend';
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

export async function inviaEmailLead(lead: LeadPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEADS_TO_EMAIL;
  const from = process.env.LEADS_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    throw new Error('Configurazione email lead mancante (RESEND_API_KEY, LEADS_TO_EMAIL, LEADS_FROM_EMAIL).');
  }

  const resend = new Resend(apiKey);
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

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: `[CostWork Pro] Nuovo lead — ${lead.modulo}`,
    text: righe.join('\n'),
    html: `<pre style="font-family:sans-serif;font-size:14px;line-height:1.5">${righe.map(escapeHtml).join('\n')}</pre>`,
  });

  if (error) {
    throw new Error(error.message ?? 'Invio email fallito');
  }
}
