'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { LeadCaptureModal } from '@/components/LeadCaptureModal';
import type { LeadModulo } from '@/lib/lead-unlock';

interface Props {
  modulo: LeadModulo;
  meta?: Record<string, string>;
  children: ReactNode;
}

export function ReportLeadGate({ modulo, meta, children }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch('/api/leads')
      .then(r => r.json())
      .then((d: { unlocked?: boolean }) => {
        setUnlocked(Boolean(d.unlocked));
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, []);

  if (!checked) {
    return (
      <div className="report-gate report-gate--loading">
        <div className="skeleton" style={{ height: '320px', borderRadius: '12px' }} />
      </div>
    );
  }

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="report-gate">
      <div className="report-gate__blur" aria-hidden="true">
        {children}
      </div>
      <div className="report-gate__overlay" />
      <div className="report-gate__modal">
        <LeadCaptureModal
          open
          modulo={modulo}
          meta={meta}
          onSuccess={() => setUnlocked(true)}
        />
      </div>
    </div>
  );
}
