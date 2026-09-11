import { NextRequest } from 'next/server';
import { adminSolaLettura, autenticaAdmin, rispostaAdmin } from '@/lib/admin-auth';

/**
 * Verifica la password e comunica se l'ambiente accetta scritture.
 * Serve al pannello per validare il login e per mostrare il flusso giusto
 * (salvataggio diretto oppure export del JSON) prima che si tocchi un campo.
 */
export async function POST(req: NextRequest) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return rispostaAdmin({ errore: 'Body JSON non valido' }, 400);
  }

  const password = body.password ?? req.headers.get('x-admin-password') ?? undefined;
  const auth = autenticaAdmin(req, password);
  if (!auth.ok) return auth.risposta;

  return rispostaAdmin({ ok: true, solaLettura: adminSolaLettura() });
}
