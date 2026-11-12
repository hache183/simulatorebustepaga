import type React from 'react';

/**
 * Marchio Costi Lavoro Italia: solo scritta. "Costi Lavoro" in Fraunces, riga tricolore, ITALIA in Cinzel.
 * Niente sigillo né simbolo accanto al nome.
 * I file sono SVG vettoriali in public/brand (glifi già convertiti in tracciati, generati da
 * scripts/marchio-svg.py): nitidi a ogni altezza.
 *  - tone "light": scritta navy, per la stampa e i fondi chiari
 *  - tone "dark":  scritta panna, per i fondi scuri. In stampa si usa il navy.
 */

export const MARCHIO_RATIO = 1405.22 / 341.08;

type Props = {
  tone?: 'light' | 'dark';
  /** Altezza CSS in px. */
  height?: number;
  className?: string;
};

export function Logo({ tone = 'light', height = 48, className }: Props) {
  const width = Math.round(height * MARCHIO_RATIO);
  const screenClass = ['logo', tone === 'dark' ? 'logo--screen' : '', className].filter(Boolean).join(' ');
  const style = { '--logo-h': `${height}px` } as React.CSSProperties;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={screenClass}
        src={tone === 'dark' ? '/brand/marchio-panna.svg' : '/brand/marchio-navy.svg'}
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
          src="/brand/marchio-navy.svg"
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
