'use client';

import { Suspense, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/Logo';

export function AppHeader() {
  return (
    <header className="no-print app-header">
      <Link href="/" className="app-header__brand" aria-label="Costi Lavoro Italia, vai alla home">
        <Logo height={52} />
      </Link>
      <nav className="app-header__nav" aria-label="Sezioni">
        <Suspense fallback={
          <>
            <HeaderLink href="/calcolatore" active={false}>Simulatore</HeaderLink>
            <HeaderLink href="/calcolatore?tab=soci" active={false}>Compensi</HeaderLink>
          </>
        }>
          <HeaderLinks />
        </Suspense>
        <Link href="/privacy" className="app-header__textlink app-header__privacy">Privacy</Link>
      </nav>
    </header>
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
