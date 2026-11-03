import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CalcolatorePageClient } from './CalcolatorePageClient';
import { AppHeader } from '@/components/AppHeader';
import { LeadReportGate } from '@/components/LeadFunnel';
import { listCcnlUi } from '@/lib/ccnl';
import { livelliOperaioEdili } from '@/lib/edili';
import type { LivelloEdileUi } from '@/components/EdiliPanel';

const TITOLO = 'Simulatore costo del lavoro — CostWork Pro';
const DESCRIZIONE = 'Calcola costo azienda e netto su CCNL, edilizia, lavoro domestico e compensi di soci e amministratori.';

export const metadata: Metadata = {
  title: TITOLO,
  description: DESCRIZIONE,
  alternates: { canonical: '/calcolatore' },
  openGraph: { title: TITOLO, description: DESCRIZIONE, url: '/calcolatore' },
  twitter: { title: TITOLO, description: DESCRIZIONE },
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
    </>
  );
}
