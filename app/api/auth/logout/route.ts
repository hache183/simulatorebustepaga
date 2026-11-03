import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, revocaSessioneAdmin } from '@/lib/admin-session';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  await revocaSessioneAdmin(token);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  response.cookies.delete('auth_token');
  return response;
}
