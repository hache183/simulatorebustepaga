'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/calcolatore';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrore(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrore((data as { errore?: string }).errore ?? 'Errore di autenticazione');
        return;
      }

      router.push(from);
      router.refresh();
    } catch {
      setErrore('Errore di connessione al server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--color-bg-base)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '40px 32px',
      }}>
        {/* Logo / Titolo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '48px', height: '48px', margin: '0 auto 16px',
            background: 'var(--color-accent-glow)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--color-accent)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: '22px',
            color: 'var(--color-text-primary)',
            marginBottom: '6px',
          }}>
            CostWork Pro
          </h1>
          <p style={{
            fontSize: '13px',
            color: 'var(--color-text-muted)',
          }}>
            Accedi per utilizzare il simulatore
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label htmlFor="email" style={{
              display: 'block', fontSize: '12px', fontWeight: 500,
              color: 'var(--color-text-secondary)', marginBottom: '6px',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nome@azienda.it"
              style={{
                width: '100%', padding: '12px 14px',
                background: 'var(--color-bg-input)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px', fontSize: '14px',
              }}
            />
          </div>

          <div>
            <label htmlFor="password" style={{
              display: 'block', fontSize: '12px', fontWeight: 500,
              color: 'var(--color-text-secondary)', marginBottom: '6px',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '12px 14px',
                background: 'var(--color-bg-input)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px', fontSize: '14px',
              }}
            />
          </div>

          {errore && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--color-red-dim)',
              border: '1px solid var(--color-red)',
              borderRadius: '6px',
              fontSize: '13px',
              color: 'var(--color-red)',
            }}>
              {errore}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: 'var(--color-accent)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              fontSize: '14px',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.15s ease',
              marginTop: '4px',
            }}
          >
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>

        <p style={{
          marginTop: '24px', textAlign: 'center',
          fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: '1.5',
        }}>
          Accesso riservato. Contatta l&apos;amministratore<br />per ottenere le credenziali.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-bg-base)', color: 'var(--color-text-muted)',
      }}>
        Caricamento...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
