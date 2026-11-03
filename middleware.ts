import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verificaSessioneAdmin } from '@/lib/admin-session';

/**
 * Simulatore pubblico; solo /admin e /api/admin richiedono la sessione consulente.
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
  '/api/aci',
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

function conNoindex(response: NextResponse, pathname: string): NextResponse {
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/admin') ||
    pathname === '/login'
  ) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

export async function middleware(request: NextRequest) {
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
    return conNoindex(response, pathname);
  }

  if (requiresAdminAuth(pathname)) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!(await verificaSessioneAdmin(token))) {
      if (pathname.startsWith('/api/')) {
        return conNoindex(NextResponse.json({ errore: 'Non autorizzato' }, { status: 401 }), pathname);
      }
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('from', pathname);
      return conNoindex(NextResponse.redirect(loginUrl), pathname);
    }
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    return conNoindex(response, pathname);
  }

  return conNoindex(NextResponse.next(), pathname);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
