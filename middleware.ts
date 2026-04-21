import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware di autenticazione.
 * Protegge tutte le pagine tranne /login e le risorse statiche.
 * Il token è un hash SHA-256 di email+password salvato in un cookie HttpOnly.
 */

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Risorse statiche e percorsi pubblici: passa liberamente
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.ico') ||
    PUBLIC_PATHS.some(p => pathname === p)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verifica token contro le env (hash statico calcolato a runtime)
  const expected = process.env.AUTH_TOKEN;
  if (!expected || token !== expected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('from', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
