'use client';

import { useLayoutEffect, useState } from 'react';

const DURATA_MS = 1000;

type Props = {
  valore: number;
  formatta: (n: number) => string;
};

/**
 * Conta il totale da 0 al valore finale in circa un secondo.
 * Stampa, screen reader e «riduci le animazioni» vedono subito il valore finale,
 * con lo stesso formato del testo a riposo.
 */
export function ImportoAnimato({ valore, formatta }: Props) {
  const finale = formatta(valore);
  const [testo, setTesto] = useState(finale);

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTesto(finale);
      return;
    }

    let raf = 0;
    const inizio = performance.now();
    setTesto(formatta(0));

    const fotogramma = (ora: number) => {
      const t = Math.min(1, (ora - inizio) / DURATA_MS);
      const k = 1 - (1 - t) ** 3;
      setTesto(formatta(t >= 1 ? valore : valore * k));
      if (t < 1) raf = requestAnimationFrame(fotogramma);
    };

    raf = requestAnimationFrame(fotogramma);
    return () => cancelAnimationFrame(raf);
  }, [valore, finale, formatta]);

  return (
    <span className="importo-animato" aria-label={finale}>
      <span className="importo-animato__misura" aria-hidden="true">{finale}</span>
      <span className="importo-animato__cifra" aria-hidden="true">{testo}</span>
      <span className="importo-animato__stampa" aria-hidden="true">{finale}</span>
    </span>
  );
}
