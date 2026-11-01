'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { LeadCaptureForm } from '@/components/LeadCaptureForm';
import { ascoltaLeadRichiesto } from '@/lib/lead-session';
import type { LeadModulo } from '@/lib/lead-unlock';

interface Props {
  modulo: LeadModulo;
  children: ReactNode;
}

type Stato = 'caricamento' | 'chiuso' | 'aperto';

export function LeadFunnel({ modulo, children }: Props) {
  const [stato, setStato] = useState<Stato>('caricamento');

  useEffect(() => {
    let attivo = true;
    fetch('/api/leads', { cache: 'no-store' })
      .then(r => r.json())
      .then((d: { unlocked?: boolean }) => {
        if (!attivo) return;
        setStato(d.unlocked ? 'aperto' : 'chiuso');
      })
      .catch(() => {
        if (attivo) setStato('chiuso');
      });
    return () => { attivo = false; };
  }, []);

  useEffect(() => ascoltaLeadRichiesto(() => setStato('chiuso')), []);

  if (stato === 'caricamento') {
    return (
      <div className="lead-funnel" data-testid="lead-funnel-loading">
        <div className="lead-funnel__card" aria-busy="true" aria-live="polite">
          <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 14 }} />
          <div className="skeleton" style={{ height: 28, width: '70%', marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 14, width: '100%', marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 14, width: '85%', marginBottom: 22 }} />
          <div className="skeleton" style={{ height: 44, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 44, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 44 }} />
        </div>
      </div>
    );
  }

  if (stato === 'chiuso') {
    return (
      <div className="lead-funnel" data-testid="lead-funnel">
        <LeadCaptureForm modulo={modulo} onSuccess={() => setStato('aperto')} />
      </div>
    );
  }

  return <div data-testid="simulatore" style={{ display: 'contents' }}>{children}</div>;
}
