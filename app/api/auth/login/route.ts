import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { LRUCache } from 'lru-cache';

// Rate limiter: max 5 tentativi login per 15 minuti per IP
const loginLimiter = new LRUCache<string, number[]>({ max: 500, ttl: 900_000 });

function isLoginRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = loginLimiter.get(ip) ?? [];
  const recent = hits.filter(t => now - t < 900_000);
  if (recent.length >= 5) return true;
  loginLimiter.set(ip, [...recent, now]);
  return false;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';

  if (isLoginRateLimited(ip)) {
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

    // Confronto timing-safe per evitare timing attacks
    const emailNorm = (email ?? '').toLowerCase().trim();
    const expectedEmailNorm = expectedEmail.toLowerCase().trim();
    let match = true;
    try {
      if (!timingSafeEqual(Buffer.from(emailNorm), Buffer.from(expectedEmailNorm))) match = false;
    } catch { match = false; }
    try {
      if (!timingSafeEqual(Buffer.from(password ?? ''), Buffer.from(expectedPassword))) match = false;
    } catch { match = false; }

    if (!match) {
      return NextResponse.json(
        { errore: 'Email o password errati.' },
        { status: 401 },
      );
    }

    // Genera token deterministico = SHA-256(email + password + salt)
    const token = createHash('sha256')
      .update(`${expectedEmail}:${expectedPassword}:costwork-pro-salt`)
      .digest('hex');

    const response = NextResponse.json({ ok: true });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 giorni
    });

    return response;
  } catch {
    return NextResponse.json(
      { errore: 'Richiesta non valida.' },
      { status: 400 },
    );
  }
}
