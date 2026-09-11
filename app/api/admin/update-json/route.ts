import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { invalidateCcnlCache } from '@/lib/ccnl';
import {
  FILE_WHITELIST,
  adminSolaLettura,
  autenticaAdmin,
  rispostaAdmin,
} from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  let body: { password?: string; filePath?: string; content?: string };
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

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(body.content ?? '');
  } catch {
    return rispostaAdmin({ errore: 'Il contenuto non è un JSON valido' }, 400);
  }

  parsed['updatedAt'] = new Date().toISOString();
  const contenuto = JSON.stringify(parsed, null, 2);

  // Ambienti serverless: filesystem del progetto in sola lettura e JSON già
  // inclusi nel bundle a build time. Il file validato torna al pannello, che
  // lo fa scaricare per il commit in repo.
  if (adminSolaLettura()) {
    return rispostaAdmin({
      solaLettura: true,
      filePath,
      contenuto,
      updatedAt: parsed['updatedAt'],
      messaggio:
        'Ambiente in sola lettura: il file è stato validato ma non salvato. '
        + 'Scarica il JSON e sostituiscilo in repo, poi rilancia il deploy.',
    });
  }

  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!absolutePath.startsWith(process.cwd())) {
    return rispostaAdmin({ errore: 'Percorso non consentito' }, 403);
  }

  try {
    fs.writeFileSync(absolutePath, contenuto, 'utf-8');
  } catch {
    return rispostaAdmin({ errore: 'Salvataggio non riuscito' }, 500);
  }

  if (filePath.startsWith('data/ccnl/')) {
    invalidateCcnlCache(path.basename(filePath, '.json'));
  }

  console.log(`[admin] File aggiornato: ${filePath} — ${new Date().toISOString()}`);

  return rispostaAdmin({
    successo: true,
    solaLettura: false,
    filePath,
    updatedAt: parsed['updatedAt'],
  });
}
