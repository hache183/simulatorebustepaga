import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { calculateCosto } from '@/lib/engine';
import { ipRichiesta } from '@/lib/client-ip';
import { richiediAccessoLead } from '@/lib/lead-guard';
import { registraSimulazione, sintesiSimulazione } from '@/lib/lead-store';
import { troppoFrequente } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const accesso = richiediAccessoLead(req);
  if (!accesso.ok) return accesso.risposta;

  const ip = ipRichiesta(req);

  if (await troppoFrequente('calcola', ip, 20, 60_000)) {
    return NextResponse.json(
      { errore: 'Troppe richieste. Attendi un minuto prima di ricalcolare.' },
      { status: 429 }
    );
  }

  try {
    const body: unknown = await req.json();
    const risultato = await calculateCosto(body);
    try {
      registraSimulazione(accesso.leadId, {
        endpoint: 'calcola',
        sintesi: sintesiSimulazione('calcola', body, risultato),
      });
    } catch (e) {
      console.error('[lead-store]', e);
    }
    return NextResponse.json(risultato);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { errore: 'Dati non validi', dettagli: err.issues },
        { status: 400 }
      );
    }
    const messaggio = err instanceof Error ? err.message : 'Errore sconosciuto';
    return NextResponse.json({ errore: messaggio }, { status: 500 });
  }
}
