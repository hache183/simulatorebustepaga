import type { LeadPayload } from '@/lib/send-lead-email';
import { creaClientFogli } from '@/lib/google-sheets-api';

/**
 * Copia opzionale del lead su un foglio Google, dopo l'email SMTP.
 * Se le variabili mancano non fa nulla. Se la scrittura fallisce, l'errore
 * sale al chiamante: POST /api/leads lo registra e sblocca comunque.
 * L'honeypot non arriva qui.
 */

export const INTESTAZIONE_LEAD = [
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
] as const;

interface ConfigFoglioLead {
  spreadsheetId: string;
  clientEmail: string;
  privateKey: string;
  tab: string;
}

/** I `\n` letterali (tipici di Vercel) diventano ritorni a capo veri. */
export function normalizzaChiavePrivata(raw: string): string {
  let key = raw.trim().replace(/^\uFEFF/, '');
  if (key.length >= 2) {
    const apici = (key.startsWith('"') && key.endsWith('"'))
      || (key.startsWith("'") && key.endsWith("'"));
    if (apici) key = key.slice(1, -1).trim();
  }
  key = key.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
  if (key.includes('PRIVATE KEY') && !key.endsWith('\n')) key += '\n';
  return key;
}

export function formattaDataRoma(adesso: Date): string {
  const parti = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(adesso);
  const valore = (tipo: Intl.DateTimeFormatPartTypes) => parti.find(p => p.type === tipo)?.value ?? '';
  return `${valore('day')}/${valore('month')}/${valore('year')} ${valore('hour')}:${valore('minute')}:${valore('second')}`;
}

function cella(v: string | undefined): string {
  return (v ?? '').replace(/[\r\n\t]/g, ' ').trim();
}

function contesto(meta: Record<string, string> | undefined): string {
  if (!meta) return '';
  return Object.entries(meta)
    .map(([k, v]) => `${cella(k)}=${cella(v)}`)
    .join(', ');
}

export function rigaLead(lead: LeadPayload, adesso: Date): string[] {
  return [
    formattaDataRoma(adesso),
    cella(lead.id),
    lead.modulo,
    cella(lead.nome),
    cella(lead.email),
    cella(lead.telefono),
    cella(lead.azienda),
    cella(lead.ruolo),
    lead.marketing ? 'sì' : 'no',
    contesto(lead.meta),
  ];
}

function colonna(n: number): string {
  let s = '';
  let x = n;
  while (x > 0) {
    const resto = (x - 1) % 26;
    s = String.fromCharCode(65 + resto) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

function intervallo(tab: string, celle: string): string {
  return `'${tab.replace(/'/g, "''")}'!${celle}`;
}

function foglioVuoto(values: unknown): boolean {
  if (!Array.isArray(values) || values.length === 0) return true;
  const prima = values[0];
  if (!Array.isArray(prima) || prima.length === 0) return true;
  const cellaA1 = prima[0];
  if (typeof cellaA1 === 'string') return cellaA1.trim().length === 0;
  return cellaA1 == null;
}

export function configFoglioLead(): ConfigFoglioLead | null {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() ?? '';
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ?? '';
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? '';
  const compilate = [spreadsheetId, clientEmail, privateKeyRaw.trim()].filter(Boolean);
  if (compilate.length === 0) return null;
  if (!spreadsheetId || !clientEmail || !privateKeyRaw.trim()) {
    console.error(
      '[google-sheets] configurazione incompleta: servono GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    );
    return null;
  }
  const privateKey = normalizzaChiavePrivata(privateKeyRaw);
  if (!/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(privateKey)) {
    console.error(
      '[google-sheets] GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY non è una chiave PEM. Incolla il campo private_key del JSON del service account.',
    );
    return null;
  }
  return {
    spreadsheetId,
    clientEmail,
    privateKey,
    tab: process.env.GOOGLE_SHEETS_TAB_NAME?.trim() || 'Lead',
  };
}

export async function salvaLeadSuFoglio(lead: LeadPayload, adesso: Date = new Date()): Promise<void> {
  const config = configFoglioLead();
  if (!config) return;

  const sheets = creaClientFogli({
    clientEmail: config.clientEmail,
    privateKey: config.privateKey,
  });
  const fine = colonna(INTESTAZIONE_LEAD.length);
  const lettura = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: intervallo(config.tab, 'A1'),
  });
  const riga = rigaLead(lead, adesso);
  const values = foglioVuoto(lettura.data.values)
    ? [[...INTESTAZIONE_LEAD], riga]
    : [riga];

  await sheets.spreadsheets.values.append({
    spreadsheetId: config.spreadsheetId,
    range: intervallo(config.tab, `A:${fine}`),
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
}
