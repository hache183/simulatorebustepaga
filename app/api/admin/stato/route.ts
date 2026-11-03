import { NextRequest } from 'next/server';
import { adminSolaLettura, autenticaAdmin, rispostaAdmin } from '@/lib/admin-auth';

/** Dice al pannello se l'ambiente accetta scritture. Richiede la sessione. */
export async function GET(req: NextRequest) {
  const auth = await autenticaAdmin(req);
  if (!auth.ok) return auth.risposta;
  return rispostaAdmin({ ok: true, solaLettura: adminSolaLettura() });
}
