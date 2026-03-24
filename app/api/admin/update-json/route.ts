import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { invalidateCcnlCache } from '@/lib/ccnl';

// Whitelist di sicurezza: SOLO questi file possono essere modificati dall'admin.
// Non aggiungere mai percorsi che potrebbero consentire path traversal.
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
]);

export async function POST(req: NextRequest) {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD) {
    return NextResponse.json({ errore: 'Pannello admin non configurato (ADMIN_PASSWORD mancante)' }, { status: 500 });
  }

  let body: { password?: string; filePath?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ errore: 'Body JSON non valido' }, { status: 400 });
  }

  // 1. Verifica password
  if (body.password !== ADMIN_PASSWORD) {
    return NextResponse.json({ errore: 'Password non corretta' }, { status: 403 });
  }

  // 2. Verifica che il file sia in whitelist
  const filePath = body.filePath ?? '';
  if (!FILE_WHITELIST.has(filePath)) {
    return NextResponse.json({ errore: `File non autorizzato: '${filePath}'` }, { status: 403 });
  }

  // 3. Valida il JSON
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(body.content ?? '');
  } catch {
    return NextResponse.json({ errore: 'Il contenuto non è un JSON valido' }, { status: 400 });
  }

  // 4. Aggiorna automaticamente il campo updatedAt
  parsed['updatedAt'] = new Date().toISOString();

  // 5. Scrittura sicura: risolve il path assoluto e verifica che sia dentro process.cwd()
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!absolutePath.startsWith(process.cwd())) {
    return NextResponse.json({ errore: 'Path non sicuro' }, { status: 403 });
  }

  try {
    fs.writeFileSync(absolutePath, JSON.stringify(parsed, null, 2), 'utf-8');
  } catch {
    return NextResponse.json({ errore: 'Errore nella scrittura del file' }, { status: 500 });
  }

  // 6. Invalida la cache dei CCNL se necessario
  if (filePath.startsWith('data/ccnl/')) {
    const ccnlId = path.basename(filePath, '.json');
    invalidateCcnlCache(ccnlId);
  }

  // 7. Log
  console.log(`[admin] File aggiornato: ${filePath} — ${new Date().toISOString()}`);

  return NextResponse.json({
    successo: true,
    filePath,
    updatedAt: parsed['updatedAt'],
  });
}
