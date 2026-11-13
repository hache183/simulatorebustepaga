import type React from 'react';

/**
 * Marchio Costi Lavoro Italia, tema carta e terracotta: la «C» fatta di righe di prospetto
 * (prima riga senape, le altre terracotta), «Costi Lavoro» in Newsreader e «Italia» in terracotta.
 * Il file è un SVG vettoriale in public/brand (testi già convertiti in tracciati, generato da
 * scripts/marchio-svg.py): nitido a ogni altezza, leggibile su carta e in stampa su bianco.
 */

export const MARCHIO_RATIO = 5.08;

type Props = {
  /** Altezza CSS in px. */
  height?: number;
  className?: string;
};

export function Logo({ height = 48, className }: Props) {
  const width = Math.round(height * MARCHIO_RATIO);
  const style = { '--logo-h': `${height}px` } as React.CSSProperties;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className ? `logo ${className}` : 'logo'}
      src="/brand/marchio.svg"
      width={width}
      height={height}
      alt="Costi Lavoro Italia"
      decoding="async"
      style={style}
    />
  );
}
