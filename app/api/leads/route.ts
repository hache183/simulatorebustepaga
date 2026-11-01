import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ipRichiesta } from '@/lib/admin-auth';
import { leadRateLimited } from '@/lib/lead-rate-limit';
import {
  LEAD_UNLOCK_COOKIE,
  LEAD_UNLOCK_MAX_AGE_SEC,
  type LeadModulo,
} from '@/lib/lead-unlock';
import { inviaEmailLead } from '@/lib/send-lead-email';

const LeadSchema = z.object({
  nome: z.string().trim().min(2, 'Inserisci il nome').max(120),
  email: z.string().trim().email('Email non valida').max(200),
  telefono: z.string().trim().max(40).optional().or(z.literal('')),
  azienda: z.string().trim().max(200).optional().or(z.literal('')),
  privacy: z.boolean().refine(v => v === true, { message: 'Consenso privacy obbligatorio' }),
  modulo: z.enum(['dipendenti', 'edili', 'domestici', 'soci']),
  meta: z.record(z.string(), z.string()).optional(),
  website: z.string().max(0).optional(),
});

export async function GET(req: NextRequest) {
  const unlocked = req.cookies.get(LEAD_UNLOCK_COOKIE)?.value === '1';
  return NextResponse.json({ unlocked });
}

export async function POST(req: NextRequest) {
  const ip = ipRichiesta(req);
  if (leadRateLimited(ip)) {
    return NextResponse.json(
      { errore: 'Troppi tentativi. Riprova tra qualche minuto.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ errore: 'Body JSON non valido' }, { status: 400 });
  }

  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Dati non validi';
    return NextResponse.json({ errore: msg }, { status: 400 });
  }

  const data = parsed.data;
  if (data.website) {
    return NextResponse.json({ ok: true, unlocked: true });
  }

  try {
    await inviaEmailLead({
      nome: data.nome,
      email: data.email,
      telefono: data.telefono || undefined,
      azienda: data.azienda || undefined,
      modulo: data.modulo as LeadModulo,
      meta: data.meta,
    });
  } catch (e) {
    console.error('[api/leads]', e);
    return NextResponse.json(
      { errore: 'Impossibile inviare la richiesta. Riprova più tardi.' },
      { status: 503 },
    );
  }

  const res = NextResponse.json({ ok: true, unlocked: true });
  res.cookies.set(LEAD_UNLOCK_COOKIE, '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: LEAD_UNLOCK_MAX_AGE_SEC,
  });
  return res;
}
