import { ImageResponse } from 'next/og';

export const alt = 'Costi Lavoro Italia — il costo di un\'assunzione, voce per voce';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#F6F3EE',
          color: '#0C2340',
          padding: '72px 80px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div
            style={{
              width: 84,
              height: 84,
              background: '#0C2340',
              borderRadius: 18,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 6,
              padding: '14px 12px 12px',
            }}
          >
            <div style={{ width: 14, height: 26, background: '#1B7A45', borderRadius: 2 }} />
            <div style={{ width: 14, height: 42, background: '#FFFFFF', borderRadius: 2 }} />
            <div style={{ width: 14, height: 56, background: '#C8102E', borderRadius: 2 }} />
          </div>
          <div style={{ display: 'flex', fontSize: 42, letterSpacing: -0.5 }}>
            <span style={{ fontWeight: 700 }}>CostiLavoro</span>
            <span style={{ fontWeight: 400, marginLeft: 10 }}>Italia</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.05, maxWidth: 900 }}>
            Il costo di un&apos;assunzione, voce per voce
          </div>
          <div style={{ marginTop: 22, fontSize: 28, color: '#3E4C5E', maxWidth: 820 }}>
            CCNL, INPS, INAIL, TFR e una stima del netto. Per studi e imprese.
          </div>
        </div>
        <div style={{ display: 'flex', height: 8, width: 220 }}>
          <div style={{ flex: 1, background: '#1B7A45' }} />
          <div style={{ flex: 1, background: '#F6F3EE', borderTop: '8px solid #FFFFFF' }} />
          <div style={{ flex: 1, background: '#C8102E' }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
