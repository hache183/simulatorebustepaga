import { NextRequest, NextResponse } from 'next/server';
import {
  calcolaSoci,
  defaultStateSoci,
  calcolaCompensiSocietari,
  type SociState,
  type SocietariInput,
} from '@/lib/societari';
import { richiediAccessoLead } from '@/lib/lead-guard';
import { registraSimulazione, sintesiSimulazione } from '@/lib/lead-store';

const MAX_COMPENSO = 5_000_000;

function numero(v: unknown, fallback: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return fallback;
  if (n > max) throw new RangeError('Valore fuori scala');
  return n;
}

function traccia(leadId: string, body: unknown, risultato: unknown) {
  try {
    registraSimulazione(leadId, {
      endpoint: 'societari',
      sintesi: sintesiSimulazione('societari', body, risultato),
    });
  } catch (e) {
    console.error('[lead-store]', e);
  }
}

export async function POST(req: NextRequest) {
  const accesso = richiediAccessoLead(req);
  if (!accesso.ok) return accesso.risposta;

  try {
    const body = await req.json() as Partial<SociState> & SocietariInput;

    if (body.tipo) {
      const lordo = numero(body.compensoAnnuo, -1, MAX_COMPENSO);
      if (lordo < 0 || lordo > MAX_COMPENSO) {
        return NextResponse.json({ errore: 'Compenso non valido' }, { status: 400 });
      }
      const risultato = calcolaCompensiSocietari({ ...body, compensoAnnuo: lordo });
      traccia(accesso.leadId, body, risultato);
      return NextResponse.json(risultato);
    }

    const base = defaultStateSoci();
    const lordo = numero(body.lordoAnnuo ?? body.compensoAnnuo, base.lordoAnnuo, MAX_COMPENSO);
    if (lordo > MAX_COMPENSO) {
      return NextResponse.json({ errore: 'Compenso non valido' }, { status: 400 });
    }

    const stato: SociState = {
      modalita: body.modalita === 'senza_compenso' ? 'senza_compenso' : 'con_compenso',
      lordoAnnuo: lordo,
      haAltraCoperturaInps: Boolean(body.haAltraCoperturaInps),
      giorniTrasfertaNazionale: numero(body.giorniTrasfertaNazionale, 0, 366),
      importoTrasfertaNazionale: numero(body.importoTrasfertaNazionale, base.importoTrasfertaNazionale, 100_000),
      giorniTrasfertaEstera: numero(body.giorniTrasfertaEstera, 0, 366),
      importoTrasfertaEstera: numero(body.importoTrasfertaEstera, base.importoTrasfertaEstera, 100_000),
      km: numero(body.km, 0, 1_000_000),
      costoKm: numero(body.costoKm, 0, 100),
    };

    const risultato = calcolaSoci(stato);
    traccia(accesso.leadId, body, risultato);
    return NextResponse.json(risultato);
  } catch (e) {
    console.error('[api/societari]', e);
    return NextResponse.json({ errore: 'Richiesta non valida' }, { status: 400 });
  }
}
