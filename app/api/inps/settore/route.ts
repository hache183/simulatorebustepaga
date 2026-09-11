import { NextRequest, NextResponse } from 'next/server';
import { getSettoreContributivo } from '@/lib/contributi';

export async function GET(req: NextRequest) {
  const ccnlId = req.nextUrl.searchParams.get('ccnlId') ?? '';
  const numeroDipendenti = Number(req.nextUrl.searchParams.get('numeroDipendenti') ?? '10');
  if (!ccnlId) return NextResponse.json({ errore: 'ccnlId mancante' }, { status: 400 });

  const settore = getSettoreContributivo(
    ccnlId,
    Number.isFinite(numeroDipendenti) ? numeroDipendenti : 10,
  );
  if (!settore) {
    return NextResponse.json({ errore: 'Settore INPS non trovato' }, { status: 404 });
  }

  return NextResponse.json({
    aliquotaDatore: settore.aliquotaDatore,
    aliquotaDipendente: settore.aliquotaDipendente,
    fonte: settore.nome,
  });
}
