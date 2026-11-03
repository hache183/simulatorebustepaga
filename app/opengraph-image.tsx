import { ImageResponse } from 'next/og';

export const alt = 'CostWork Pro — quanto costa un\'assunzione';
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
          justifyContent: 'center',
          padding: '80px',
          background: '#F4F6FA',
          color: '#0F172A',
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 3, color: '#4F46E5', fontWeight: 700 }}>
          COSTWORK PRO
        </div>
        <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, marginTop: 28, maxWidth: 920 }}>
          Quanto costa assumere una persona
        </div>
        <div style={{ fontSize: 28, marginTop: 28, color: '#3E4C5E', maxWidth: 860 }}>
          Costo azienda e netto: CCNL, edilizia, lavoro domestico, soci.
        </div>
      </div>
    ),
    { ...size },
  );
}
