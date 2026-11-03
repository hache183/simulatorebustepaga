import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verificaSessioneAdmin } from '@/lib/admin-session';

/** Indica se il browser ha una sessione consulente valida. */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const isAdmin = await verificaSessioneAdmin(token);
  return NextResponse.json(
    { isAdmin },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
