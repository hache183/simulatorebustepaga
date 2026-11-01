import { NextRequest, NextResponse } from 'next/server';
import { LEAD_UNLOCK_COOKIE, verificaCookieLead } from '@/lib/lead-unlock';

/** 401 se il cookie lead manca, è stato alterato o è scaduto. */
export function richiediAccessoLead(
  req: NextRequest,
): { ok: true; leadId: string } | { ok: false; risposta: NextResponse } {
  const token = req.cookies.get(LEAD_UNLOCK_COOKIE)?.value;
  const esito = verificaCookieLead(token);
  if (!esito.ok) {
    return {
      ok: false,
      risposta: NextResponse.json(
        { errore: 'Per usare il simulatore inserisci i tuoi dati.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      ),
    };
  }
  return { ok: true, leadId: esito.leadId };
}
