import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: '#0C2340',
          borderRadius: 40,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 10,
          padding: '28px 26px 24px',
        }}
      >
        <div style={{ width: 28, height: 52, background: '#1B7A45', borderRadius: 3 }} />
        <div style={{ width: 28, height: 86, background: '#FFFFFF', borderRadius: 3 }} />
        <div style={{ width: 28, height: 118, background: '#C8102E', borderRadius: 3 }} />
      </div>
    ),
    { ...size },
  );
}
