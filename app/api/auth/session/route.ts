import { NextRequest, NextResponse } from 'next/server';

/** Indica se il browser ha una sessione consulente (admin) valida. */
export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const expected = process.env.AUTH_TOKEN;
  const isAdmin = Boolean(token && expected && token === expected);
  return NextResponse.json({ isAdmin });
}
