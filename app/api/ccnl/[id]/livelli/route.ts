import { NextRequest, NextResponse } from 'next/server';
import { getCcnlData } from '@/lib/ccnl';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ccnl = getCcnlData(params.id);
    return NextResponse.json({
      livelli: ccnl.livelli,
      nome: ccnl.nome,
      mensilita: ccnl.mensilita, // default contrattuale — il frontend lo usa come valore iniziale
    });
  } catch {
    return NextResponse.json({ errore: 'CCNL non trovato' }, { status: 404 });
  }
}
