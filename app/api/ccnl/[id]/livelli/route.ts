import { NextRequest, NextResponse } from 'next/server';
import { getCcnlData } from '@/lib/ccnl';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const convivente = req.nextUrl.searchParams.get('convivente') === 'true';
    const ccnl = getCcnlData(params.id, convivente);
    return NextResponse.json({
      livelli: ccnl.livelli,
      nome: ccnl.nome,
      fonte: ccnl.fonte,
      validitaAl: ccnl.validitaAl ?? null,
      mensilita: ccnl.mensilita,
      orarioSettimanalePieno: ccnl.orarioSettimanalePieno ?? 40,
      retribuzioneOraria: ccnl.retribuzioneOraria ?? false,
      retribuzioneMensile: ccnl.retribuzioneMensile ?? false,
      contributiContrattuali: ccnl.contributiContrattuali,
      vociParticolari: ccnl.vociParticolari ?? null,
      pagheOrarieSpeciali: ccnl.pagheOrarieSpeciali ?? null,
    });
  } catch {
    return NextResponse.json({ errore: 'CCNL non trovato' }, { status: 404 });
  }
}
