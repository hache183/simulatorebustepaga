import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILE_WHITELIST = new Set([
  'data/aliquote-inps.json',
  'data/inail.json',
  'data/tfr.json',
  'data/ccnl/acconciatura_estetica.json',
  'data/ccnl/amministratori_condominio.json',
  'data/ccnl/agricoltura_impiegati.json',
  'data/ccnl/agricoltura_operai.json',
  'data/ccnl/alimentari_industria.json',
  'data/ccnl/alimentari_artigianato.json',
  'data/ccnl/assicurazioni.json',
  'data/ccnl/autorimesse.json',
  'data/ccnl/autoscuole.json',
  'data/ccnl/calzature.json',
  'data/ccnl/chimica.json',
  'data/ccnl/comunicazione_grafica_editoria.json',
  'data/ccnl/commercio.json',
  'data/ccnl/edilizia_industria.json',
  'data/ccnl/edilizia_artigianato.json',
  'data/ccnl/facility_management.json',
  'data/ccnl/farmacie_private.json',
  'data/ccnl/gomma_plastica.json',
  'data/ccnl/grafica_aziende_industriali.json',
  'data/ccnl/igiene_ambientale_private.json',
  'data/ccnl/lavanderie_artigiane.json',
  'data/ccnl/lavanderie_industriali.json',
  'data/ccnl/legno_arredamento.json',
  'data/ccnl/metalmeccanici.json',
  'data/ccnl/sanita_privata.json',
  'data/ccnl/case_di_cura_private.json',
  'data/ccnl/servizi_postali_appalto.json',
  'data/ccnl/studi_professionali.json',
  'data/ccnl/cooperative_sociali.json',
  'data/ccnl/trasporti.json',
  'data/ccnl/credito.json',
  'data/ccnl/multiservizi.json',
  'data/ccnl/pubblici_esercizi_turismo.json',
  'data/ccnl/telecomunicazioni.json',
  'data/ccnl/tessile.json',
  'data/ccnl/informatica.json',
  'data/ccnl/scuole_private.json',
  'data/ccnl/vigilanza_privata.json',
  'data/ccnl/domestici.json',
]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get('path') ?? '';
  const password = searchParams.get('password') ?? '';

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ errore: 'Non autorizzato' }, { status: 403 });
  }
  if (!FILE_WHITELIST.has(filePath)) {
    return NextResponse.json({ errore: 'File non autorizzato' }, { status: 403 });
  }

  try {
    const contenuto = fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8');
    return NextResponse.json({ contenuto });
  } catch {
    return NextResponse.json({ errore: 'File non trovato' }, { status: 404 });
  }
}
