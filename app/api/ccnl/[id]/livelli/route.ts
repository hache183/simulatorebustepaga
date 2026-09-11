import { NextRequest, NextResponse } from 'next/server';
import { getCcnlData } from '@/lib/ccnl';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const convivente = req.nextUrl.searchParams.get('convivente') === 'true';
    const id = convivente && (params.id === 'domestici' || params.id === 'domestici_non_conviventi')
      ? 'domestici_conviventi'
      : params.id;
    const ccnl = getCcnlData(id);
    const extra = ccnl as typeof ccnl & {
      validitaAl?: string | null;
      orarioSettimanalePieno?: number;
      retribuzioneMensile?: boolean;
      vociParticolari?: unknown;
      pagheOrarieSpeciali?: unknown;
    };
    return NextResponse.json({
      livelli: ccnl.livelli,
      nome: ccnl.nome,
      fonte: ccnl.fonte,
      validitaAl: extra.validitaAl ?? null,
      mensilita: ccnl.mensilita,
      orarioSettimanalePieno: extra.orarioSettimanalePieno ?? 40,
      retribuzioneOraria: ccnl.retribuzioneOraria ?? false,
      retribuzioneMensile: extra.retribuzioneMensile ?? false,
      contributiContrattuali: ccnl.contributiContrattuali,
      vociParticolari: extra.vociParticolari ?? null,
      pagheOrarieSpeciali: extra.pagheOrarieSpeciali ?? null,
    });
  } catch {
    return NextResponse.json({ errore: 'CCNL non trovato' }, { status: 404 });
  }
}
