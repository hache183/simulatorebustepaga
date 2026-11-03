'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { LeadCaptureForm } from '@/components/LeadCaptureForm';
import { AccessoLeadRichiesto, CalcoloAnnullato, ascoltaLeadRichiesto } from '@/lib/lead-session';
import type { LeadModulo } from '@/lib/lead-unlock';

interface ReportLeadApi {
  eseguiReport: (modulo: LeadModulo, azione: () => Promise<void>) => Promise<void>;
}

const ReportLeadContext = createContext<ReportLeadApi | null>(null);

export function useReportLead(): ReportLeadApi {
  const ctx = useContext(ReportLeadContext);
  if (!ctx) {
    throw new Error('useReportLead va usato dentro LeadReportGate');
  }
  return ctx;
}

async function leggiSblocco(): Promise<boolean> {
  try {
    const res = await fetch('/api/leads', { cache: 'no-store' });
    const data = await res.json() as { unlocked?: boolean };
    return Boolean(data.unlocked);
  } catch {
    return false;
  }
}

/**
 * Il simulatore resta utilizzabile. Il modulo lead compare solo quando si
 * chiede il report e il cookie firmato manca: dopo l'invio ripete il calcolo
 * con i parametri già catturati.
 */
export function LeadReportGate({ children }: { children: ReactNode }) {
  const sbloccato = useRef<boolean | null>(null);
  const inCorso = useRef(false);
  const attesa = useRef<{ resolve: () => void; reject: (errore: Error) => void } | null>(null);
  const [modulo, setModulo] = useState<LeadModulo>('dipendenti');
  const [aperto, setAperto] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let attivo = true;
    void leggiSblocco().then(ok => {
      if (!attivo) return;
      sbloccato.current = ok;
    });
    return () => { attivo = false; };
  }, []);

  useEffect(() => ascoltaLeadRichiesto(() => {
    sbloccato.current = false;
  }), []);

  const attendiLead = useCallback((mod: LeadModulo) => {
    setModulo(mod);
    setAperto(true);
    return new Promise<void>((resolve, reject) => {
      attesa.current = { resolve, reject };
    });
  }, []);

  const chiudi = (errore?: Error) => {
    setAperto(false);
    const corrente = attesa.current;
    attesa.current = null;
    if (!corrente) return;
    if (errore) corrente.reject(errore);
    else corrente.resolve();
  };
  const chiudiRef = useRef(chiudi);
  chiudiRef.current = chiudi;

  useEffect(() => {
    if (!aperto) return;
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = dialogRef.current;
    const selettore = 'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled])';
    const focusabili = () => Array.from(node?.querySelectorAll<HTMLElement>(selettore) ?? []);
    const id = window.setTimeout(() => focusabili()[0]?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        chiudiRef.current(new CalcoloAnnullato());
        return;
      }
      if (e.key !== 'Tab') return;
      const els = focusabili();
      if (els.length === 0) {
        e.preventDefault();
        return;
      }
      const first = els[0];
      const last = els[els.length - 1];
      const attivo = document.activeElement;
      if (e.shiftKey && (attivo === first || !node?.contains(attivo))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && attivo === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('keydown', onKey);
      triggerRef.current?.focus();
    };
  }, [aperto]);

  const eseguiReport = useCallback(async (mod: LeadModulo, azione: () => Promise<void>) => {
    if (inCorso.current) return;
    inCorso.current = true;
    try {
      if (sbloccato.current === null) {
        sbloccato.current = await leggiSblocco();
      }
      if (sbloccato.current !== true) {
        await attendiLead(mod);
      }
      try {
        await azione();
      } catch (e) {
        if (!(e instanceof AccessoLeadRichiesto)) throw e;
        sbloccato.current = false;
        await attendiLead(mod);
        await azione();
      }
    } finally {
      inCorso.current = false;
    }
  }, [attendiLead]);

  return (
    <ReportLeadContext.Provider value={{ eseguiReport }}>
      {children}
      {aperto && (
        <div
          ref={dialogRef}
          className="lead-overlay no-print"
          data-testid="lead-prima-report"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lead-dialog-title"
          onMouseDown={e => {
            if (e.target === e.currentTarget) chiudi(new CalcoloAnnullato());
          }}
        >
          <LeadCaptureForm
            modulo={modulo}
            onSuccess={() => {
              sbloccato.current = true;
              chiudi();
            }}
            onAnnulla={() => chiudi(new CalcoloAnnullato())}
          />
        </div>
      )}
    </ReportLeadContext.Provider>
  );
}
