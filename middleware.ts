import { NextRequest, NextResponse } from 'next/server';

/**
 * Simulatore pubblico; solo /admin e /api/admin richiedono login consulente.
 */

const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
  '/api/calcola',
  '/api/ccnl/',
  '/api/inps/',
  '/api/inail/',
  '/api/agevolazioni',
  '/api/societari',
  '/api/leads',
];

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(p => pathname === p || pathname.startsWith(p));
}

function isPublicPage(pathname: string): boolean {
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/privacy' ||
    pathname.startsWith('/calcolatore') ||
    pathname === '/compensi-societari'
  ) {
    return true;
  }
  return false;
}

function requiresAdminAuth(pathname: string): boolean {
  return pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
}

function verifyAdminToken(request: NextRequest): boolean {
  const token = request.cookies.get('auth_token')?.value;
  const expected = process.env.AUTH_TOKEN;
  return Boolean(token && expected && token === expected);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.ico')
  ) {
    return NextResponse.next();
  }

  if (isPublicPage(pathname) || isPublicApi(pathname)) {
    const response = NextResponse.next();
    if (pathname.startsWith('/calcolatore') || pathname.startsWith('/admin')) {
      response.headers.set('Cache-Control', 'no-store, must-revalidate');
    }
    return response;
  }

  if (requiresAdminAuth(pathname)) {
    if (!verifyAdminToken(request)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ errore: 'Non autorizzato' }, { status: 401 });
      }
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
