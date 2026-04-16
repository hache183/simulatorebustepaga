'use client';

interface Props {
  updatedDates: string[]; // array di date ISO 8601 dai file JSON
}

export function Disclaimer({ updatedDates }: Props) {
  const dataMinima = updatedDates.length > 0
    ? new Date(Math.min(...updatedDates.map(d => new Date(d).getTime())))
    : null;

  const dataFormattata = dataMinima
    ? dataMinima.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'non disponibile';

  const isVecchio = dataMinima
    ? (Date.now() - dataMinima.getTime()) > 730 * 24 * 60 * 60 * 1000
    : false;

  return (
    <div style={{
      background: isVecchio ? 'var(--color-red-dim)' : 'var(--color-bg-elevated)',
      border: `1px solid ${isVecchio ? 'var(--color-red)' : 'var(--color-border)'}`,
      borderRadius: '8px', padding: '12px 16px',
      display: 'flex', alignItems: 'flex-start', gap: '10px',
    }}>
      <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>
        {isVecchio ? '⚠️' : 'ℹ️'}
      </span>
      <div>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '12px',
          color: isVecchio ? 'var(--color-red)' : 'var(--color-text-secondary)',
          marginBottom: '4px',
        }}>
          Limitazioni di responsabilità
        </p>
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
          I calcoli hanno valore puramente <strong style={{ color: 'var(--color-text-primary)' }}>indicativo</strong>.
          Verificare con un consulente del lavoro abilitato (L. 12/1979) prima di ogni decisione di assunzione.
        </p>
        <p style={{
          fontSize: '11px', marginTop: '6px', fontFamily: "'DM Mono', monospace",
          color: isVecchio ? 'var(--color-red)' : 'var(--color-text-muted)',
        }}>
          {isVecchio && '⚠ Dati scaduti · '}
          Aliquote al: {dataFormattata} · Fonti: CCNL · INPS · INAIL · Art. 2120 c.c.
        </p>
      </div>
    </div>
  );
}
