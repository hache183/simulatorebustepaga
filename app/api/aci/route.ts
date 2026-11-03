import { NextRequest, NextResponse } from 'next/server';
import catalogo from '@/data/aci-2026.json';
import { cercaVeicoli, type VeicoloAci } from '@/lib/aci';
import { ipRichiesta } from '@/lib/client-ip';
import { troppoFrequente } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/** Ricerca ACI lato server: il catalogo da 1 MB non entra nel bundle del browser. */
export async function GET(req: NextRequest) {
  if (await troppoFrequente('aci', ipRichiesta(req), 60, 60_000)) {
    return NextResponse.json(
      { errore: 'Troppe ricerche. Attendi un momento.' },
      { status: 429, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } },
    );
  }

  const q = (req.nextUrl.searchParams.get('q') ?? '').slice(0, 80);
  const trovati = cercaVeicoli((catalogo as { veicoli: VeicoloAci[] }).veicoli, q, 41);
  return NextResponse.json(
    { veicoli: trovati.slice(0, 40), troncato: trovati.length > 40 },
    { headers: { 'Cache-Control': 'private, max-age=60', 'X-Robots-Tag': 'noindex, nofollow' } },
  );
}
