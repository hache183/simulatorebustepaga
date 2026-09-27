import { NextRequest, NextResponse } from 'next/server';
import {
  calcolaSoci,
  defaultStateSoci,
  calcolaCompensiSocietari,
  type SociState,
  type SocietariInput,
} from '@/lib/societari';

const MAX_COMPENSO = 5_000_000;

function numero(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Partial<SociState> & SocietariInput;

    if (body.tipo) {
      const lordo = numero(body.compensoAnnuo, -1);
      if (lordo < 0 || lordo > MAX_COMPENSO) {
        return NextResponse.json({ errore: 'Compenso non valido' }, { status: 400 });
      }
      return NextResponse.json(calcolaCompensiSocietari({ ...body, compensoAnnuo: lordo }));
    }

    const base = defaultStateSoci();
    const lordo = numero(body.lordoAnnuo ?? body.compensoAnnuo, base.lordoAnnuo);
    if (lordo > MAX_COMPENSO) {
      return NextResponse.json({ errore: 'Compenso non valido' }, { status: 400 });
    }

    const stato: SociState = {
      modalita: body.modalita === 'senza_compenso' ? 'senza_compenso' : 'con_compenso',
      lordoAnnuo: lordo,
      haAltraCoperturaInps: Boolean(body.haAltraCoperturaInps),
      giorniTrasfertaNazionale: numero(body.giorniTrasfertaNazionale, 0),
      importoTrasfertaNazionale: numero(body.importoTrasfertaNazionale, base.importoTrasfertaNazionale),
      giorniTrasfertaEstera: numero(body.giorniTrasfertaEstera, 0),
      importoTrasfertaEstera: numero(body.importoTrasfertaEstera, base.importoTrasfertaEstera),
      km: numero(body.km, 0),
      costoKm: numero(body.costoKm, 0),
    };

    return NextResponse.json(calcolaSoci(stato));
  } catch (e) {
    console.error('[api/societari]', e);
    return NextResponse.json({ errore: 'Richiesta non valida' }, { status: 400 });
  }
}
