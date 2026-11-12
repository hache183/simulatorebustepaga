import type React from 'react';

/**
 * Marchio Costi Lavoro Italia: sigillo con le barre tricolori e wordmark serif.
 * I PNG stanno in public/brand, byte per byte quelli del brand pack.
 * Il file è alto 200px: nitido fino a 3x per un'altezza di 62px.
 *  - tone "light": wordmark navy, per la stampa e i fondi chiari
 *  - tone "dark":  wordmark panna, per i fondi scuri. In stampa si usa il navy.
 */

const LOCKUP_RATIO = 811 / 200;

type Props = {
  tone?: 'light' | 'dark';
  /** Altezza CSS in px. */
  height?: number;
  className?: string;
};

export function Logo({ tone = 'light', height = 48, className }: Props) {
  const width = Math.round(height * LOCKUP_RATIO);
  const screenClass = ['logo', tone === 'dark' ? 'logo--screen' : '', className].filter(Boolean).join(' ');
  const style = { '--logo-h': `${height}px` } as React.CSSProperties;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={screenClass}
        src={`/brand/lockup-${tone}.png`}
        width={width}
        height={height}
        alt="Costi Lavoro Italia"
        decoding="async"
        style={style}
      />
      {tone === 'dark' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={className ? `logo logo--print ${className}` : 'logo logo--print'}
          src="/brand/lockup-light.png"
          width={width}
          height={height}
          alt=""
          aria-hidden="true"
          decoding="async"
          style={style}
        />
      )}
    </>
  );
}
