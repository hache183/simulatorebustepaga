import { NextRequest, NextResponse } from 'next/server';
import {
  calcolaSoci,
  defaultStateSoci,
  calcolaCompensiSocietari,
  ALIQUOTE_SOCI,
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

    // Scheda contributiva Gestione separata (riparto 2/3–1/3)
    if (body.tipo) {
      const lordo = numero(body.compensoAnnuo, -1);
      if (lordo < 0 || lordo > MAX_COMPENSO) {
        return NextResponse.json({ errore: 'Compenso non valido' }, { status: 400 });
      }
      return NextResponse.json(calcolaCompensiSocietari({ ...body, compensoAnnuo: lordo }));
    }

    // Simulazione soci come in produzione
    const base = defaultStateSoci();
    const lordo = numero(body.lordoAnnuo ?? body.compensoAnnuo, base.lordoAnnuo);
    if (lordo > MAX_COMPENSO) {
      return NextResponse.json({ errore: 'Compenso non valido' }, { status: 400 });
    }

    const stato: SociState = {
      modalita: body.modalita === 'senza_compenso' ? 'senza_compenso' : 'con_compenso',
      regimeContributivo: body.regimeContributivo === 'riparto_gs' ? 'riparto_gs' : 'ritenuta_unica',
      lordoAnnuo: lordo,
      aliquotaInpsId: body.aliquotaInpsId && body.aliquotaInpsId in ALIQUOTE_SOCI
        ? body.aliquotaInpsId
        : base.aliquotaInpsId,
      haAltraCoperturaInps: Boolean(body.haAltraCoperturaInps),
      tipoContrattoIrpef: body.tipoContrattoIrpef === 'tempo_determinato'
        ? 'tempo_determinato'
        : 'tempo_indeterminato',
      giorniTrasferte: numero(body.giorniTrasferte, 0),
      importoTrasfertaGiornaliera: numero(body.importoTrasfertaGiornaliera, base.importoTrasfertaGiornaliera),
      kmAutoPersonale: numero(body.kmAutoPersonale, 0),
      tariffaKmEur: numero(body.tariffaKmEur, base.tariffaKmEur),
      giorniBuoniPasto: numero(body.giorniBuoniPasto, 0),
      importoBuonoPastoGiornaliero: numero(body.importoBuonoPastoGiornaliero, base.importoBuonoPastoGiornaliero),
    };

    return NextResponse.json(calcolaSoci(stato));
  } catch (e) {
    // Il dettaglio resta nei log del server: al client non escono percorsi
    // di filesystem o stack trace.
    console.error('[api/societari]', e);
    return NextResponse.json({ errore: 'Richiesta non valida' }, { status: 400 });
  }
}
