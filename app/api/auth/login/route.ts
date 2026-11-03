import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import {
  ADMIN_SESSION_COOKIE,
  creaSessioneAdmin,
  opzioniCookieSessione,
  segretoSessione,
} from '@/lib/admin-session';
import { ipRichiesta } from '@/lib/client-ip';
import { troppoFrequente } from '@/lib/rate-limit';

function confrontoSicuro(a: string, b: string): boolean {
  return timingSafeEqual(
    createHash('sha256').update(a).digest(),
    createHash('sha256').update(b).digest(),
  );
}

export async function POST(request: NextRequest) {
  const ip = ipRichiesta(request);
  if (await troppoFrequente('login', ip, 5, 900_000)) {
    return NextResponse.json(
      { errore: 'Troppi tentativi di accesso. Riprova tra 15 minuti.' },
      { status: 429 },
    );
  }

  try {
    const { email, password } = (await request.json()) as { email?: string; password?: string };

    const expectedEmail = process.env.AUTH_EMAIL;
    const expectedPassword = process.env.AUTH_PASSWORD;

    if (!expectedEmail || !expectedPassword) {
      return NextResponse.json(
        { errore: 'Credenziali di accesso non configurate sul server.' },
        { status: 500 },
      );
    }
    if (!segretoSessione()) {
      return NextResponse.json(
        { errore: 'Sessione non configurata (AUTH_SESSION_SECRET mancante o troppo corto).' },
        { status: 500 },
      );
    }

    const emailNorm = (email ?? '').toLowerCase().trim();
    const expectedEmailNorm = expectedEmail.toLowerCase().trim();
    const emailOk = confrontoSicuro(emailNorm, expectedEmailNorm);
    const passwordOk = confrontoSicuro(password ?? '', expectedPassword);
    if (!emailOk || !passwordOk) {
      return NextResponse.json(
        { errore: 'Email o password errati.' },
        { status: 401 },
      );
    }

    const token = await creaSessioneAdmin();
    if (!token) {
      return NextResponse.json(
        { errore: 'Sessione non configurata (AUTH_SESSION_SECRET mancante o troppo corto).' },
        { status: 500 },
      );
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, token, opzioniCookieSessione());
    response.cookies.delete('auth_token');
    return response;
  } catch {
    return NextResponse.json(
      { errore: 'Richiesta non valida.' },
      { status: 400 },
    );
  }
}
