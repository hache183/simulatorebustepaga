import { NextRequest, NextResponse } from 'next/server';

/**
 * Il simulatore è pubblico. Le API di calcolo restano dietro il cookie lead
 * (controllo nella route, non qui). /api non va indicizzato.
 */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.ico')
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  if (pathname.startsWith('/api')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  if (pathname.startsWith('/calcolatore')) {
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
