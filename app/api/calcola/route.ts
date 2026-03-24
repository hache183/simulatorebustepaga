import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { calculateCosto } from '@/lib/engine';
import { LRUCache } from 'lru-cache';

// Rate limiter: max 20 calcoli per minuto per IP
const rateLimiter = new LRUCache<string, number[]>({ max: 500, ttl: 60_000 });

function isRateLimited(ip: string): boolean {
  const ora = Date.now();
  const hits = rateLimiter.get(ip) ?? [];
  const recenti = hits.filter(t => ora - t < 60_000);
  if (recenti.length >= 20) return true;
  rateLimiter.set(ip, [...recenti, ora]);
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { errore: 'Troppe richieste. Attendi un minuto prima di ricalcolare.' },
      { status: 429 }
    );
  }

  try {
    const body: unknown = await req.json();
    const risultato = await calculateCosto(body);
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
