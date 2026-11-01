import { Resend } from 'resend';
import type { LeadModulo } from '@/lib/lead-unlock';

export interface LeadPayload {
  nome: string;
  email: string;
  telefono?: string;
  azienda?: string;
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
  const righe = [
    `Modulo: ${lead.modulo}`,
    `Nome: ${lead.nome}`,
    `Email: ${lead.email}`,
    lead.telefono ? `Telefono: ${lead.telefono}` : null,
    lead.azienda ? `Azienda: ${lead.azienda}` : null,
    lead.meta && Object.keys(lead.meta).length > 0
      ? `Contesto: ${Object.entries(lead.meta).map(([k, v]) => `${k}=${v}`).join(', ')}`
      : null,
    `Data: ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`,
  ].filter(Boolean);

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: `[CostWork Pro] Nuovo lead — ${lead.modulo}`,
    text: righe.join('\n'),
    html: `<pre style="font-family:sans-serif;font-size:14px;line-height:1.5">${righe.join('\n')}</pre>`,
  });

  if (error) {
    throw new Error(error.message ?? 'Invio email fallito');
  }
}
