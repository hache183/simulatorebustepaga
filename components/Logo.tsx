import type React from 'react';

/**
 * Marchio Costi Lavoro Italia: sigillo con le barre tricolori e wordmark serif.
 * Si usano i PNG del brand pack così come sono (serviti da /brand, vedi lib/brand-png),
 * senza ridisegnarli. Il file è alto 200px: nitido fino a 3x per un'altezza di 62px.
 *  - tone "light": wordmark navy, per fondi chiari (pagine interne)
 *  - tone "dark":  wordmark crema, per fondi scuri (home)
 */

const LOCKUP_RATIO = 811 / 200;

type Props = {
  tone?: 'light' | 'dark';
  /** Altezza CSS in px. */
  height?: number;
  className?: string;
};

export function Logo({ tone = 'light', height = 48, className }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className ? `logo ${className}` : 'logo'}
      src={`/brand/lockup-${tone}.png`}
      width={Math.round(height * LOCKUP_RATIO)}
      height={height}
      alt="Costi Lavoro Italia"
      decoding="async"
      style={{ '--logo-h': `${height}px` } as React.CSSProperties}
    />
  );
}
