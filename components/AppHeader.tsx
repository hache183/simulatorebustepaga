'use client';

import { useState, useEffect } from 'react';

export function AppHeader() {
  const [ora, setOra] = useState('');

  useEffect(() => {
    const aggiorna = () => {
      setOra(new Date().toLocaleTimeString('it-IT', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }));
    };
    aggiorna();
    const id = setInterval(aggiorna, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="no-print"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: '56px',
        backgroundColor: 'var(--color-bg-surface)',
        borderBottom: '1px solid var(--color-border)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
      }}
    >
      {/* Logo + nome prodotto */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '28px', height: '28px',
          background: 'var(--color-accent)',
          borderRadius: '7px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 12 L5 7 L8 9 L11 4 L14 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="14" cy="6" r="1.5" fill="white"/>
          </svg>
        </div>

        <span style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: '15px',
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.01em',
        }}>
          CostWork<span style={{ color: 'var(--color-accent-bright)' }}>Pro</span>
        </span>
      </div>

      {/* Centro — status indicator (minimal) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          backgroundColor: 'var(--color-green)',
          display: 'inline-block',
        }} />
        <span style={{
          fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: 'var(--color-text-muted)',
        }}>
          Aliquote {new Date().getFullYear()}
        </span>
      </div>

      {/* Destra — ora + link admin */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          minWidth: '64px',
          textAlign: 'right',
        }}>
          {ora}
        </span>
        <a
          href="/admin"
          style={{
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 500,
            padding: '5px 12px',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            transition: 'border-color 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={e => {
            (e.target as HTMLAnchorElement).style.borderColor = 'var(--color-border-bright)';
            (e.target as HTMLAnchorElement).style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={e => {
            (e.target as HTMLAnchorElement).style.borderColor = 'var(--color-border)';
            (e.target as HTMLAnchorElement).style.color = 'var(--color-text-secondary)';
          }}
        >
          Admin
        </a>
        <button
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
          }}
          style={{
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            textDecoration: 'none',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 500,
            padding: '5px 12px',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={e => {
            (e.target as HTMLButtonElement).style.borderColor = 'var(--color-red)';
            (e.target as HTMLButtonElement).style.color = 'var(--color-red)';
          }}
          onMouseLeave={e => {
            (e.target as HTMLButtonElement).style.borderColor = 'var(--color-border)';
            (e.target as HTMLButtonElement).style.color = 'var(--color-text-muted)';
          }}
        >
          Esci
        </button>
      </div>
    </header>
  );
}
