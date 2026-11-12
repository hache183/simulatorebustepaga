import Link from 'next/link';
import { Logo } from '@/components/Logo';

export function SiteFooter() {
  const anno = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="site-footer__rule" aria-hidden="true" />
      <div className="site-footer__inner">
        <Logo tone="dark" height={48} />
        <div>
          <p>
            Stima indicativa su minimi, aliquote e regole del {anno}. Non è un cedolino, non sostituisce il consulente del lavoro.
          </p>
          <p className="site-footer__links">
            <Link href="/privacy">Informativa privacy</Link>
            <Link href="/calcolatore">Simulatore</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
