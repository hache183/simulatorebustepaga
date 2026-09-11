import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  FILE_WHITELIST,
  adminSolaLettura,
  autenticaAdmin,
  rispostaAdmin,
} from '@/lib/admin-auth';

/**
 * Lettura di un file di dati in whitelist.
 * È una POST — non una GET — perché la password viaggia nel body: in query
 * string finirebbe nei log di accesso della piattaforma.
 */
export async function POST(req: NextRequest) {
  let body: { password?: string; filePath?: string };
  try {
    body = await req.json();
  } catch {
    return rispostaAdmin({ errore: 'Body JSON non valido' }, 400);
  }

  const password = body.password ?? req.headers.get('x-admin-password') ?? undefined;
  const auth = autenticaAdmin(req, password);
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
