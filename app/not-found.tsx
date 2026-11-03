import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';

export default function NotFound() {
  return (
    <>
      <AppHeader />
      <main id="contenuto" className="stato-pagina">
        <p className="stato-pagina__kicker">404</p>
        <h1>Pagina non trovata</h1>
        <p>L&apos;indirizzo non corrisponde a una pagina di CostWork Pro.</p>
        <Link href="/" className="ui-btn ui-btn--primary">Torna alla home</Link>
      </main>
    </>
  );
}
