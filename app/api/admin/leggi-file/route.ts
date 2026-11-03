import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  FILE_WHITELIST,
  adminSolaLettura,
  autenticaAdmin,
  rispostaAdmin,
} from '@/lib/admin-auth';

/** Lettura di un file di dati in whitelist. Richiede la sessione consulente. */
export async function POST(req: NextRequest) {
  let body: { filePath?: string };
  try {
    body = await req.json();
  } catch {
    return rispostaAdmin({ errore: 'Body JSON non valido' }, 400);
  }

  const auth = await autenticaAdmin(req);
  if (!auth.ok) return auth.risposta;

  const filePath = body.filePath ?? '';
  if (!FILE_WHITELIST.has(filePath)) {
    return rispostaAdmin({ errore: 'File non autorizzato' }, 403);
  }

  try {
    const contenuto = fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8');
    return rispostaAdmin({ contenuto, solaLettura: adminSolaLettura() });
  } catch {
    return rispostaAdmin({ errore: 'File non disponibile' }, 404);
  }
}
