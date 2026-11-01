import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ipRichiesta } from '@/lib/admin-auth';
import { leadRateLimited } from '@/lib/lead-rate-limit';
import { salvaLead } from '@/lib/lead-store';
import {
  LEAD_UNLOCK_COOKIE,
  firmaCookieLead,
  opzioniCookieLead,
  segretoLeadConfigurato,
  verificaCookieLead,
  type LeadModulo,
} from '@/lib/lead-unlock';
import { inviaEmailLead } from '@/lib/send-lead-email';

const telefonoSchema = z.string().trim().min(6, 'Inserisci un numero di telefono').max(40)
  .refine(v => /^[+0-9][0-9\s()./-]{5,39}$/.test(v), 'Telefono non valido');

const LeadSchema = z.object({
  nome: z.string().trim().min(2, 'Inserisci il nome').max(120),
  email: z.string().trim().email('Email non valida').max(200),
  telefono: telefonoSchema,
  azienda: z.string().trim().max(200).optional().or(z.literal('')),
  ruolo: z.string().trim().max(120).optional().or(z.literal('')),
  privacy: z.boolean().refine(v => v === true, { message: 'Consenso privacy obbligatorio' }),
  marketing: z.boolean().optional().default(false),
  modulo: z.enum(['dipendenti', 'edili', 'domestici', 'soci']),
  meta: z.record(z.string(), z.string()).optional(),
  website: z.string().max(200).optional(),
});

function noStore(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(LEAD_UNLOCK_COOKIE)?.value;
  const esito = verificaCookieLead(token);
  return noStore({ unlocked: esito.ok });
}

export async function POST(req: NextRequest) {
  const ip = ipRichiesta(req);
  if (leadRateLimited(ip)) {
    return noStore({ errore: 'Troppi tentativi. Riprova tra qualche minuto.' }, 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return noStore({ errore: 'Body JSON non valido' }, 400);
  }

  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Dati non validi';
    return noStore({ errore: msg }, 400);
  }

  const data = parsed.data;
  if (data.website && data.website.trim().length > 0) {
    return noStore({ ok: true });
  }

  if (!segretoLeadConfigurato()) {
    console.error('[api/leads] LEAD_COOKIE_SECRET mancante o più corto di 16 caratteri');
    return noStore({ errore: 'Servizio momentaneamente non disponibile. Riprova più tardi.' }, 503);
  }

  const id = randomUUID();
  const lead = {
    id,
    nome: data.nome,
    email: data.email,
    telefono: data.telefono,
    azienda: data.azienda || undefined,
    ruolo: data.ruolo || undefined,
    marketing: data.marketing,
    modulo: data.modulo as LeadModulo,
    meta: data.meta,
  };

  try {
    await inviaEmailLead(lead);
  } catch (e) {
    console.error('[api/leads]', e);
    return noStore({ errore: 'Impossibile inviare la richiesta. Riprova più tardi.' }, 503);
  }

  try {
    salvaLead(lead);
  } catch (e) {
    console.error('[lead-store]', e);
  }

  const token = firmaCookieLead(id);
  if (!token) {
    console.error('[api/leads] impossibile firmare il cookie di sblocco');
    return noStore({ errore: 'Servizio momentaneamente non disponibile. Riprova più tardi.' }, 503);
  }

  const res = noStore({ ok: true, unlocked: true });
  res.cookies.set(LEAD_UNLOCK_COOKIE, token, opzioniCookieLead());
  return res;
}
