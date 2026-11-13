import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CalcolatorePageClient } from './CalcolatorePageClient';
import { AppHeader } from '@/components/AppHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { LeadReportGate } from '@/components/LeadFunnel';
import { listCcnlUi } from '@/lib/ccnl';
import { livelliOperaioEdili } from '@/lib/edili';
import type { LivelloEdileUi } from '@/components/EdiliPanel';

const TITOLO = 'Simulatore — Costi Lavoro Italia';
const DESCRIZIONE = 'Stima gratuita del costo azienda e del netto su CCNL, edilizia, lavoro domestico e compensi di soci e amministratori. Poi un consulente del lavoro ti ricontatta con un preventivo totalmente gratuito.';

export const metadata: Metadata = {
  title: TITOLO,
  description: DESCRIZIONE,
  alternates: { canonical: '/calcolatore' },
  openGraph: {
    title: TITOLO,
    description: DESCRIZIONE,
    url: '/calcolatore',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Costi Lavoro Italia — Lo stipendio è solo la prima riga. Simulatore del costo del lavoro.' }],
  },
  twitter: { title: TITOLO, description: DESCRIZIONE, images: ['/opengraph-image'] },
};

export default function CalcolatorePageWrapper() {
  const contratti = listCcnlUi().map(c => ({ id: c.id, nome: c.nome }));
  const livelliEdili = (id: string): LivelloEdileUi[] =>
    livelliOperaioEdili(id).map(l => ({
      codice: l.codice,
      minimoTabellare: l.minimoTabellare,
      descrizione: l.descrizione,
      qualifica: l.qualifica,
    }));
  const livelliPerCcnl = {
    edilizia_industria: livelliEdili('edilizia_industria'),
    edilizia_artigianato: livelliEdili('edilizia_artigianato'),
  };
  return (
    <>
      <AppHeader />
      <main id="contenuto">
        <Suspense fallback={
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100vh', background: 'var(--color-bg-base)',
          }}>
            <div className="skeleton" style={{ width: '200px', height: '4px', borderRadius: '2px' }} />
          </div>
        }>
          <LeadReportGate>
            <CalcolatorePageClient contratti={contratti} livelliPerCcnl={livelliPerCcnl} />
          </LeadReportGate>
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
