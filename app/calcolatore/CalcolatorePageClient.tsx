'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalcolatoreFormStep1 } from '@/components/CalcolatoreForm';
import { CalcolatoreFormStep2 } from '@/components/CalcolatoreFormStep2';
import { RisultatiCalcolatore } from '@/components/RisultatiCalcolatore';
import { useReportLead } from '@/components/LeadFunnel';
import { SociAmministratoriPanel } from '@/components/SociAmministratoriPanel';
import { AccessoLeadRichiesto, CalcoloAnnullato, leggiRispostaSimulazione } from '@/lib/lead-session';
import { DomesticiPanel } from '@/components/DomesticiPanel';
import { EdiliPanel, type LivelloEdileUi } from '@/components/EdiliPanel';
import type { CalcolatoreOutput } from '@/types';

interface Step1Data {
  ccnlId: string; livello: string; ral: number;
  tipoContratto: 'tempo_indeterminato'|'tempo_determinato';
  oreLavoro: number;
  mensilita: number;
  retribuzionePersonalizzata?: number;
  convivente?: boolean;
  pagaOraria?: number;
  oreSettimanali?: number;
  iscrittoCorsoScuola?: boolean;
  altroLavoratoreInForza?: boolean;
  coperturaRiposi?: boolean;
  oreCoperturaRiposi?: number;
  voceParticolare?: 'nessuna'|'pt30'|'assistenzaNotturna'|'presenzaNotturna';
}

interface Step2Data {
  numeroDipendenti: number; regione: string; codiceInail: string;
  anzianitaAnni: number; agevolazioniSelezionate: string[];
  quotaNonGodute?: number;
  includiAssistenzaSanitaria: boolean;
  includiPrevidenzaComplementare?: boolean;
  aliquotaInps: number;
  markupAgenzia?: number;
  oreAssenzeAnnue?: number;
}

export function CalcolatorePageClient({
  contratti,
  livelliPerCcnl,
}: {
  contratti: { id: string; nome: string }[];
  livelliPerCcnl: Record<string, LivelloEdileUi[]>;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');
  const tab: 'dipendenti' | 'edili' | 'domestici' | 'soci' =
    tabParam === 'soci' ? 'soci'
      : tabParam === 'domestici' ? 'domestici'
        : tabParam === 'edili' ? 'edili'
          : 'dipendenti';
  const vaiA = (next: 'dipendenti' | 'edili' | 'domestici' | 'soci') => {
    router.replace(next === 'dipendenti' ? '/calcolatore' : `/calcolatore?tab=${next}`, { scroll: false });
  };

  const { eseguiReport } = useReportLead();
  const [step, setStep] = useState<1 | 2 | 'risultati'>(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [risultato, setRisultato] = useState<CalcolatoreOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const handleStep1 = (data: Step1Data) => {
    setStep1Data(data);
    setStep(2);
  };

  const handleStep2 = (data: Step2Data) => {
    if (!step1Data) return;
    const payload = { ...step1Data, ...data };
    void eseguiReport('dipendenti', async () => {
      setIsLoading(true);
      setErrore(null);
      try {
        const res = await fetch('/api/calcola', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await leggiRispostaSimulazione<CalcolatoreOutput>(res);
        setRisultato(json);
        setStep('risultati');
      } catch (e) {
        if (e instanceof AccessoLeadRichiesto) throw e;
        setErrore(e instanceof Error ? e.message : 'Errore sconosciuto');
      } finally {
        setIsLoading(false);
      }
    }).catch(e => {
      if (e instanceof AccessoLeadRichiesto || e instanceof CalcoloAnnullato) return;
      setErrore(e instanceof Error ? e.message : 'Errore sconosciuto');
      setIsLoading(false);
    });
  };

  const ricalcola = () => { setStep(1); setRisultato(null); setErrore(null); };

  return (
    <div className="print-unlock simulatore" data-testid="simulatore">

      {/* Tab modulo + step dipendenti — sotto l'header */}
      <div className="no-print calcolatore-shell">
        <div className="modulo-bar">
          <div className="modulo-tabs" role="tablist" aria-label="Tipo di simulazione">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'dipendenti'}
              className={`modulo-tab${tab === 'dipendenti' ? ' active' : ''}`}
              onClick={() => vaiA('dipendenti')}
            >
              Dipendenti
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'edili'}
              className={`modulo-tab${tab === 'edili' ? ' active' : ''}`}
              onClick={() => vaiA('edili')}
            >
              Dipendenti edili
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'domestici'}
              className={`modulo-tab${tab === 'domestici' ? ' active' : ''}`}
              onClick={() => vaiA('domestici')}
            >
              Collaboratori familiari / domestici
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'soci'}
              className={`modulo-tab${tab === 'soci' ? ' active' : ''}`}
              onClick={() => vaiA('soci')}
            >
              Soci e Amministratori
            </button>
          </div>
          {tab === 'dipendenti' && (
            <div className="modulo-steps">
              {[
                { n: 1, label: 'Assunzione',  done: step !== 1 },
                { n: 2, label: 'Azienda',     done: step === 'risultati' },
                { n: 3, label: 'Risultati',   done: false },
              ].map((s, i) => {
                const isActive = (step === 1 && s.n === 1) || (step === 2 && s.n === 2) || (step === 'risultati' && s.n === 3);
                return (
                  <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '6px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontFamily: "var(--font-sans), sans-serif", fontWeight: 500,
                        background: s.done ? 'transparent' : isActive ? 'var(--color-btn-bg)' : 'var(--color-bg-elevated)',
                        color: isActive ? 'var(--color-btn-fg)' : s.done ? 'var(--color-accent-bright)' : 'var(--color-text-muted)',
                        border: `1px solid ${s.done ? 'var(--color-green)' : isActive ? 'var(--color-btn-bg)' : 'var(--color-border)'}`,
                        transition: 'all 0.2s ease',
                      }}>
                        {s.n}
                      </div>
                      <span style={{
                        fontSize: '15px', fontFamily: "var(--font-sans), sans-serif",
                        color: isActive ? 'var(--color-text-primary)' : s.done ? 'var(--color-accent-bright)' : 'var(--color-text-muted)',
                        fontWeight: isActive ? 600 : 400,
                      }}>
                        {s.label}
                      </span>
                    </div>
                    {i < 2 && (
                      <span style={{ color: 'var(--color-border-bright)', fontSize: '14px' }}>›</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {tab === 'edili' && (
        <div className="print-unlock" style={{
          flex: 1,
          maxWidth: '1400px', margin: '0 auto',
          width: '100%',
          padding: '24px 32px',
          overflowY: 'auto',
        }}>
          <EdiliPanel livelliPerCcnl={livelliPerCcnl} />
        </div>
      )}

      {tab === 'domestici' && (
        <div className="print-unlock" style={{
          flex: 1,
          maxWidth: '1400px', margin: '0 auto',
          width: '100%',
          padding: '24px 32px',
          overflowY: 'auto',
        }}>
          <DomesticiPanel />
        </div>
      )}

      {tab === 'soci' && (
        <div className="print-unlock" style={{
          flex: 1,
          maxWidth: '1400px', margin: '0 auto',
          width: '100%',
          padding: '24px 32px',
          overflowY: 'auto',
        }}>
          <SociAmministratoriPanel />
        </div>
      )}

      {/* Contenuto principale — due colonne */}
      <div className={`print-unlock simulatore-grid${step === 'risultati' ? ' is-risultati' : ''}${tab === 'dipendenti' ? '' : ' is-hidden'}`}>

        {/* Colonna sinistra — form */}
        {step !== 'risultati' && (
          <div className="calcolatore-panel" style={{ animation: 'fadeSlideIn 0.2s ease forwards' }}>
            {step === 1 && <CalcolatoreFormStep1 contratti={contratti} onNext={handleStep1} />}
            {step === 2 && <CalcolatoreFormStep2 onSubmit={handleStep2} onBack={() => setStep(1)} isLoading={isLoading} ccnlId={step1Data?.ccnlId} />}
          </div>
        )}

        {/* Colonna destra — risultati o placeholder o skeleton */}
        <div style={{ animation: 'fadeSlideIn 0.2s ease forwards' }}>

          {/* Placeholder iniziale */}
          {step === 1 && !risultato && (
            <div className="attesa-prospetto">
              <p className="kicker">In attesa</p>
              <p>Il prospetto si compone qui, dopo il secondo passo. Prima si scelgono contratto e livello.</p>
            </div>
          )}

          {/* Skeleton loader */}
          {isLoading && (
            <div style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-card)', padding: '28px',
              display: 'flex', flexDirection: 'column', gap: '16px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {[1,2,3].map(i => (
                  <div key={i} className="skeleton" style={{ height: '72px' }} />
                ))}
              </div>
              <div className="skeleton" style={{ height: '8px' }} />
              {[1,2,3,4,5].map(i => (
                <div key={i} className="skeleton" style={{ height: '36px' }} />
              ))}
            </div>
          )}

          {/* Errore */}
          {errore && !isLoading && (
            <div style={{
              background: 'var(--color-red-dim)',
              border: '1px solid var(--color-red)',
              borderLeft: '3px solid var(--color-red)',
              borderRadius: 'var(--radius-ctrl)', padding: '20px',
              animation: 'fadeSlideIn 0.2s ease forwards',
            }}>
              <p style={{ fontFamily: "var(--font-sans), sans-serif", fontWeight: 600, fontSize: '15px',
                color: 'var(--color-red)' }}>
                Errore nel calcolo
              </p>
              <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>{errore}</p>
            </div>
          )}

          {/* Risultati */}
          {step === 'risultati' && risultato && (
            <div style={{ animation: 'fadeSlideIn 0.2s ease forwards' }}>
              <RisultatiCalcolatore risultato={risultato} onRicalcola={ricalcola} />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
