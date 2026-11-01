'use client';

import { Suspense, useState, useEffect, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function AppHeader() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then((d: { isAdmin?: boolean }) => setIsAdmin(Boolean(d.isAdmin)))
      .catch(() => setIsAdmin(false));
  }, []);

  return (
    <header
      className="no-print app-header"
    >
      <a href="/" className="app-header__brand" style={{ textDecoration: 'none' }}>
        <div className="app-header__logo">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M2 12 L5 7 L8 9 L11 4 L14 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="14" cy="6" r="1.5" fill="white"/>
          </svg>
        </div>
        <span className="app-header__title">
          CostWork<span className="app-header__title-accent">Pro</span>
        </span>
      </a>

      <div className="app-header__status">
        <span className="app-header__status-dot" />
        <span>Aliquote {new Date().getFullYear()}</span>
      </div>

      <div className="app-header__actions">
        <Suspense fallback={
          <>
            <HeaderModuloLink href="/calcolatore" active={false}>Costo lavoro</HeaderModuloLink>
            <HeaderModuloLink href="/calcolatore?tab=soci" active={false}>Compensi societari</HeaderModuloLink>
          </>
        }>
          <HeaderModuloLinks />
        </Suspense>
        {isAdmin ? (
          <>
            <a href="/admin" className="app-header__link">Admin</a>
            <button
              type="button"
              className="app-header__link app-header__link--muted"
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/calcolatore';
              }}
            >
              Esci
            </button>
          </>
        ) : (
          <a href="/login" className="app-header__link">Area consulente</a>
        )}
      </div>
    </header>
  );
}

function HeaderModuloLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSoci = pathname === '/calcolatore' && searchParams.get('tab') === 'soci';
  const isDipendenti = pathname === '/calcolatore' && !isSoci;
  return (
    <>
      <HeaderModuloLink href="/calcolatore" active={isDipendenti}>Costo lavoro</HeaderModuloLink>
      <HeaderModuloLink href="/calcolatore?tab=soci" active={isSoci}>Compensi societari</HeaderModuloLink>
    </>
  );
}

function HeaderModuloLink({
  href, active, children,
}: { href: string; active: boolean; children: ReactNode }) {
  return (
    <a
      href={href}
      className={`app-header__nav${active ? ' app-header__nav--active' : ''}`}
    >
      {children}
    </a>
  );
}
