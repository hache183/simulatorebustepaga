import { Suspense } from 'react';
import { CalcolatorePageClient } from './CalcolatorePageClient';
import { AppHeader } from '@/components/AppHeader';
import { LeadReportGate } from '@/components/LeadFunnel';

export default function CalcolatorePageWrapper() {
  return (
    <>
      <AppHeader />
      <main>
        <Suspense fallback={
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100vh', background: 'var(--color-bg-base)',
          }}>
            <div className="skeleton" style={{ width: '200px', height: '4px', borderRadius: '2px' }} />
          </div>
        }>
          <LeadReportGate>
            <CalcolatorePageClient />
          </LeadReportGate>
        </Suspense>
      </main>
    </>
  );
}
