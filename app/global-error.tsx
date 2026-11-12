'use client';

import { Fraunces } from 'next/font/google';

const display = Fraunces({
  subsets: ['latin'],
  weight: 'variable',
  display: 'swap',
  variable: '--font-display',
  axes: ['opsz', 'SOFT', 'WONK'],
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="it" className={display.variable}>
      <body style={{ margin: 0, background: '#0A0B0D', color: '#EDEAE3', fontFamily: 'system-ui, sans-serif' }}>
        <main id="contenuto" style={{ maxWidth: 640, margin: '18vh auto', padding: 24 }}>
          <p style={{
            fontFamily: 'var(--font-display), Georgia, serif',
            fontWeight: 500,
            fontSize: 72,
            lineHeight: 0.9,
            margin: 0,
            color: '#EDEAE3',
            fontVariationSettings: '"opsz" 144, "SOFT" 0, "WONK" 0',
          }}>
            500
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display), Georgia, serif',
            fontSize: 36,
            fontWeight: 600,
            lineHeight: 1.05,
            margin: '8px 0 12px',
            fontVariationSettings: '"opsz" 144, "SOFT" 0, "WONK" 0',
          }}>
            La pagina non si è aperta.
          </h1>
          <p style={{ color: '#8E8B83', lineHeight: 1.6, fontFamily: 'system-ui, sans-serif' }}>
            Il caricamento si è interrotto. Si può riprovare tra un momento.
          </p>
          {error.digest && (
            <p style={{ color: '#6F6C65', fontSize: 13 }}>Riferimento: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 16,
              background: '#EDEAE3',
              color: '#0A0B0D',
              border: 'none',
              borderRadius: 0,
              padding: '12px 18px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Riprova
          </button>
        </main>
      </body>
    </html>
  );
}
