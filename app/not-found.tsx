import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { SiteFooter } from '@/components/SiteFooter';

export default function NotFound() {
  return (
    <>
      <AppHeader />
      <main id="contenuto" className="stato-pagina">
        <p className="stato-pagina__n">404</p>
        <h1>Questa pagina non è nel sito.</h1>
        <p>L&apos;indirizzo non corrisponde a una sezione di Costi Lavoro Italia.</p>
        <Link href="/" className="ui-btn ui-btn--primary">Torna all&apos;inizio</Link>
      </main>
      <SiteFooter />
    </>
  );
}
