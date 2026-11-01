import fs from 'fs';
import path from 'path';

/**
 * Registro locale lead → simulazioni. Su Vercel il disco è in sola lettura:
 * in quel caso il lead resta nell'email (con lo stesso id) e la simulazione
 * finisce nei log della funzione. Il file non va committato (contiene dati personali).
 */

export type EndpointSimulazione = 'calcola' | 'societari';

export interface SimulazioneLead {
  at: string;
  endpoint: EndpointSimulazione;
  sintesi: string;
}

export interface SimulazioneOrfana extends SimulazioneLead {
  leadId: string;
}

export interface LeadArchiviato {
  id: string;
  nome: string;
  email: string;
  telefono?: string;
  azienda?: string;
  ruolo?: string;
  marketing: boolean;
  modulo: string;
  creatoIl: string;
  simulazioni: SimulazioneLead[];
}

export interface NuovoLead {
  id: string;
  nome: string;
  email: string;
  telefono?: string;
  azienda?: string;
  ruolo?: string;
  marketing: boolean;
  modulo: string;
}

interface Archivio {
  leads: LeadArchiviato[];
  simulazioni: SimulazioneOrfana[];
}

const MAX_LEAD = 2000;
const MAX_SIM = 100;

function percorso(): string {
  return process.env.LEAD_STORE_PATH
    ?? path.join(process.cwd(), 'data', 'runtime', 'leads.json');
}

/** Scrive solo se il percorso è esplicito (test) o se non siamo su Vercel. */
function scrivibile(): boolean {
  if (process.env.LEAD_STORE_DISABLED === '1') return false;
  if (process.env.LEAD_STORE_PATH) return true;
  if (process.env.VERCEL) return false;
  return true;
}

function vuoto(): Archivio {
  return { leads: [], simulazioni: [] };
}

function leggi(): Archivio {
  try {
    const data = JSON.parse(fs.readFileSync(percorso(), 'utf8')) as Partial<Archivio>;
    return {
      leads: Array.isArray(data.leads) ? data.leads : [],
      simulazioni: Array.isArray(data.simulazioni) ? data.simulazioni : [],
    };
  } catch {
    return vuoto();
  }
}

function scrivi(archivio: Archivio): void {
  const file = percorso();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(archivio, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function testo(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const pulito = v.replace(/[\r\n\t]/g, ' ').trim().slice(0, 80);
  return pulito || null;
}

function intero(v: unknown): string | null {
  return typeof v === 'number' && Number.isFinite(v) ? String(Math.round(v)) : null;
}

export function sintesiSimulazione(
  endpoint: EndpointSimulazione,
  body: unknown,
  risultato: unknown,
): string {
  const b = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const r = risultato && typeof risultato === 'object' ? risultato as Record<string, unknown> : {};
  const parti = endpoint === 'calcola'
    ? [
        testo(b.ccnlId) ? `ccnl=${testo(b.ccnlId)}` : null,
        testo(b.regione) ? `regione=${testo(b.regione)}` : null,
        testo(b.tipoContratto) ? `contratto=${testo(b.tipoContratto)}` : null,
        intero(r.costoTotaleAnnuo) ? `costoAnnuo=${intero(r.costoTotaleAnnuo)}` : null,
      ]
    : [
        testo(b.tipo) ? `tipo=${testo(b.tipo)}` : null,
        testo(b.modalita) ? `modalita=${testo(b.modalita)}` : null,
        intero(r.costoTotaleDatore) ? `costoDatore=${intero(r.costoTotaleDatore)}` : null,
      ];
  return parti.filter(Boolean).join(' ') || endpoint;
}

export function salvaLead(lead: NuovoLead): void {
  if (!scrivibile()) {
    console.info(JSON.stringify({ evento: 'lead', id: lead.id, modulo: lead.modulo }));
    return;
  }
  const archivio = leggi();
  const esistente = archivio.leads.find(l => l.id === lead.id);
  if (esistente) {
    esistente.nome = lead.nome;
    esistente.email = lead.email;
    esistente.telefono = lead.telefono;
    esistente.azienda = lead.azienda;
    esistente.ruolo = lead.ruolo;
    esistente.marketing = lead.marketing;
    esistente.modulo = lead.modulo;
  } else {
    archivio.leads.push({
      ...lead,
      creatoIl: new Date().toISOString(),
      simulazioni: [],
    });
  }
  if (archivio.leads.length > MAX_LEAD) {
    archivio.leads.splice(0, archivio.leads.length - MAX_LEAD);
  }
  scrivi(archivio);
}

export function registraSimulazione(
  leadId: string,
  evento: { endpoint: EndpointSimulazione; sintesi: string },
): void {
  const voce: SimulazioneLead = {
    at: new Date().toISOString(),
    endpoint: evento.endpoint,
    sintesi: evento.sintesi.slice(0, 240),
  };
  if (!scrivibile()) {
    console.info(JSON.stringify({ evento: 'simulazione', leadId, endpoint: voce.endpoint, sintesi: voce.sintesi }));
    return;
  }
  const archivio = leggi();
  const lead = archivio.leads.find(l => l.id === leadId);
  if (lead) {
    lead.simulazioni.push(voce);
    if (lead.simulazioni.length > MAX_SIM) {
      lead.simulazioni.splice(0, lead.simulazioni.length - MAX_SIM);
    }
  } else {
    archivio.simulazioni.push({ ...voce, leadId });
    if (archivio.simulazioni.length > MAX_LEAD * 2) {
      archivio.simulazioni.splice(0, archivio.simulazioni.length - MAX_LEAD);
    }
  }
  scrivi(archivio);
}
