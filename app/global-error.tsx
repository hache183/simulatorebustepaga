'use client';

import { Newsreader } from 'next/font/google';

const display = Newsreader({
  subsets: ['latin'],
  weight: 'variable',
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-display',
});

const INCHIOSTRO = '#2B2420';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="it" className={display.variable}>
      <body style={{ margin: 0, background: '#F6F0E6', color: INCHIOSTRO, fontFamily: 'system-ui, sans-serif', fontSize: 18 }}>
        <main id="contenuto" style={{ maxWidth: 640, margin: '18vh auto', padding: 24 }}>
          <p style={{
            fontFamily: 'var(--font-display), Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 96,
            lineHeight: 0.9,
            margin: 0,
            color: '#B4432A',
          }}>
            500
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display), Georgia, serif',
            fontSize: 44,
            fontWeight: 500,
            lineHeight: 1.08,
            margin: '12px 0 14px',
          }}>
            La pagina non si è aperta.
          </h1>
          <p style={{ color: '#5A4E45', lineHeight: 1.6 }}>
            Il caricamento si è interrotto. Si può riprovare tra un momento.
          </p>
          {error.digest && (
            <p style={{ color: '#6E6157', fontSize: 15 }}>Riferimento: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 16,
              background: '#B4432A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 12,
              padding: '16px 26px',
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 0 #93351F',
            }}
          >
            Riprova
          </button>
        </main>
      </body>
    </html>
  );
}
