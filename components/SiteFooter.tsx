import Link from 'next/link';
import { Logo } from '@/components/Logo';

export function SiteFooter() {
  const anno = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <Logo tone="cream" markSize={36} />
        <p>
          Simulazione indicativa, non un cedolino e non una consulenza.
          Minimi, aliquote e regole sono quelli caricati per il {anno}. Il caso concreto va verificato dal consulente del lavoro.
        </p>
        <p>
          <Link href="/privacy">Informativa privacy</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/calcolatore">Apri il simulatore</Link>
        </p>
      </div>
    </footer>
  );
}
