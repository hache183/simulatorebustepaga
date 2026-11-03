'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="it">
      <body style={{ margin: 0, background: '#F4F6FA', color: '#0F172A', fontFamily: 'system-ui, sans-serif' }}>
        <main id="contenuto" style={{ maxWidth: 560, margin: '18vh auto', padding: 24 }}>
          <p style={{ color: '#4F46E5', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 12 }}>
            Errore
          </p>
          <h1 style={{ fontSize: 32, margin: '8px 0 12px' }}>Qualcosa è andato storto</h1>
          <p style={{ color: '#3E4C5E', lineHeight: 1.6 }}>
            Il sito non è riuscito a caricarsi. Riprova tra qualche istante.
          </p>
          {error.digest && (
            <p style={{ color: '#52627A', fontSize: 13 }}>Riferimento: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 16,
              background: '#5B5CE2',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
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
