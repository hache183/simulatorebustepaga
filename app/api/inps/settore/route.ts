import { NextRequest, NextResponse } from 'next/server';
import { aliquotaInpsEffettiva } from '@/lib/contributi';

export async function GET(req: NextRequest) {
  const ccnlId = req.nextUrl.searchParams.get('ccnlId') ?? '';
  const numeroDipendenti = Number(req.nextUrl.searchParams.get('numeroDipendenti') ?? '10');
  const tipoContratto = (req.nextUrl.searchParams.get('tipoContratto') ?? 'tempo_indeterminato') as
    'tempo_indeterminato' | 'tempo_determinato' | 'somministrazione' | 'apprendistato';
  if (!ccnlId) return NextResponse.json({ errore: 'ccnlId mancante' }, { status: 400 });
  const info = aliquotaInpsEffettiva({
    ccnlId,
    numeroDipendenti: Number.isFinite(numeroDipendenti) ? numeroDipendenti : 10,
    aliquotaInps: 0.288,
    tipoContratto,
  });
  return NextResponse.json({
    aliquotaDatore: info.aliquotaDatore,
    aliquotaDipendente: info.aliquotaDipendente,
    fonte: info.fonte,
    addizionaleNaspi: info.addizionaleNaspi,
  });
}
