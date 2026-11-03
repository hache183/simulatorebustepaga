import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#0C2340',
          borderRadius: 7,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 2,
          padding: '5px 4px 4px',
        }}
      >
        <div style={{ width: 5, height: 9, background: '#1B7A45' }} />
        <div style={{ width: 5, height: 15, background: '#FFFFFF' }} />
        <div style={{ width: 5, height: 21, background: '#C8102E' }} />
      </div>
    ),
    { ...size },
  );
}
