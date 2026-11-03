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
      <body style={{ margin: 0, background: '#F4F0E8', color: '#142033', fontFamily: 'Georgia, serif' }}>
        <main id="contenuto" style={{ maxWidth: 640, margin: '18vh auto', padding: 24 }}>
          <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 42, margin: 0, color: '#0C2340' }}>
            500
          </p>
          <h1 style={{ fontSize: 36, fontWeight: 500, margin: '8px 0 12px' }}>La pagina non si è aperta.</h1>
          <p style={{ color: '#3E4C5E', lineHeight: 1.6, fontFamily: 'system-ui, sans-serif' }}>
            Il caricamento si è interrotto. Si può riprovare tra un momento.
          </p>
          {error.digest && (
            <p style={{ color: '#52627A', fontSize: 13 }}>Riferimento: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 16,
              background: '#0C2340',
              color: '#fff',
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
