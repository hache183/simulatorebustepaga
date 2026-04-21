import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILE_WHITELIST = new Set([
  'data/aliquote-inps.json',
  'data/inail.json',
  'data/tfr.json',
  'data/ccnl/commercio.json',
  'data/ccnl/metalmeccanici.json',
  'data/ccnl/edilizia.json',
  'data/ccnl/sanita_privata.json',
  'data/ccnl/studi_professionali.json',
  'data/ccnl/cooperative_sociali.json',
  'data/ccnl/trasporti.json',
  'data/ccnl/pubblici_esercizi.json',
  'data/ccnl/chimica.json',
  'data/ccnl/credito.json',
  'data/ccnl/multiservizi.json',
  'data/ccnl/telecomunicazioni.json',
  'data/ccnl/tessile.json',
  'data/ccnl/informatica.json',
  'data/ccnl/agricoltura.json',
  'data/ccnl/scuole_private.json',
  'data/ccnl/alimentari.json',
  'data/ccnl/turismo.json',
  'data/ccnl/assicurazioni.json',
  'data/ccnl/gomma_plastica.json',
  'data/ccnl/vigilanza_privata.json',
  'data/ccnl/legno_arredamento.json',
  'data/ccnl/grafica_editoria.json',
  'data/ccnl/metalmeccanici_artigianato.json',
  'data/ccnl/commercio_confesercenti.json',
  'data/ccnl/condomini.json',
  'data/ccnl/autorimesse.json',
  'data/ccnl/lavoro_domestico.json',
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
