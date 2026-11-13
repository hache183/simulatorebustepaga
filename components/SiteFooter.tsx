import Link from 'next/link';
import { Logo } from '@/components/Logo';

export function SiteFooter() {
  const anno = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <Logo height={44} />
        <div>
          <p>
            Stima indicativa su minimi e aliquote {anno}. Non è un cedolino: il preventivo gratuito lo prepara un consulente del lavoro.
          </p>
          <p className="site-footer__links">
            <Link href="/calcolatore">Simulatore</Link>
            <Link href="/privacy">Informativa privacy</Link>
          </p>
        </div>
      </div>
      <div className="site-footer__credits">
        <p>
          Realizzato da Tre Lune Technologies ·{' '}
          <a href="mailto:info@3lune.tech">info@3lune.tech</a>
        </p>
        <p>
          Powered by{' '}
          <a href="https://3lune.tech" target="_blank" rel="noopener noreferrer">
            Tre Lune
          </a>
        </p>
      </div>
    </footer>
  );
}
