'use client';

import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { SiteFooter } from '@/components/SiteFooter';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <AppHeader />
      <main id="contenuto" className="stato-pagina">
        <p className="stato-pagina__n">500</p>
        <h1>La pagina non si è completata.</h1>
        <p>La richiesta si è interrotta. Si può riprovare, oppure tornare all&apos;inizio.</p>
        {error.digest && <p className="stato-pagina__digest">Riferimento: {error.digest}</p>}
        <div className="stato-pagina__azioni">
          <button type="button" className="ui-btn ui-btn--primary" onClick={() => reset()}>
            Riprova
          </button>
          <Link href="/" className="ui-btn ui-btn--secondary">Torna alla home</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
