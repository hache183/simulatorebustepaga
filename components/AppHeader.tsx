'use client';

import { Suspense, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/Logo';

export function AppHeader() {
  return (
    <header className="no-print app-header">
      <Link href="/" className="app-header__brand" aria-label="Costi Lavoro Italia, vai alla home">
        <Logo height={46} />
      </Link>
      <nav className="app-header__nav" aria-label="Sezioni">
        <Suspense fallback={<LinkStatici />}>
          <HeaderLinks />
        </Suspense>
      </nav>
      <details className="app-header__menu">
        <summary aria-label="Apri il menu delle sezioni">
          Menu
          <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true">
            <path d="M1 1h16M1 7h16M1 13h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </summary>
        <nav className="app-header__menu-panel" aria-label="Menu sezioni">
          <Suspense fallback={<LinkStatici />}>
            <HeaderLinks />
          </Suspense>
        </nav>
      </details>
    </header>
  );
}

function LinkStatici() {
  return (
    <>
      <HeaderLink href="/calcolatore" active={false}>Simulatore</HeaderLink>
      <HeaderLink href="/calcolatore?tab=soci" active={false}>Compensi</HeaderLink>
      <HeaderLink href="/privacy" active={false}>Privacy</HeaderLink>
    </>
  );
}

function HeaderLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSoci = pathname === '/calcolatore' && searchParams.get('tab') === 'soci';
  const isSim = pathname === '/calcolatore' && !isSoci;
  return (
    <>
      <HeaderLink href="/calcolatore" active={isSim}>Simulatore</HeaderLink>
      <HeaderLink href="/calcolatore?tab=soci" active={isSoci}>Compensi</HeaderLink>
      <HeaderLink href="/privacy" active={pathname === '/privacy'}>Privacy</HeaderLink>
    </>
  );
}

function HeaderLink({
  href, active, children,
}: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`app-header__textlink${active ? ' is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}
