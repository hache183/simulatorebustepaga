'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalcolatoreFormStep1 } from '@/components/CalcolatoreForm';
import { CalcolatoreFormStep2 } from '@/components/CalcolatoreFormStep2';
import { RisultatiCalcolatore } from '@/components/RisultatiCalcolatore';
import { SociAmministratoriPanel } from '@/components/SociAmministratoriPanel';
import { DomesticiPanel } from '@/components/DomesticiPanel';
import { EdiliPanel } from '@/components/EdiliPanel';
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

export function CalcolatorePageClient() {
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

  const [step, setStep] = useState<1 | 2 | 'risultati'>(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [risultato, setRisultato] = useState<CalcolatoreOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const handleStep1 = (data: Step1Data) => {
    setStep1Data(data);
    setStep(2);
  };

  const handleStep2 = async (data: Step2Data) => {
    if (!step1Data) return;
    setIsLoading(true);
    setErrore(null);
    try {
      const res = await fetch('/api/calcola', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...step1Data, ...data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error((json as { errore?: string }).errore ?? 'Errore nel calcolo');
      setRisultato(json as CalcolatoreOutput);
      setStep('risultati');
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  };

  const ricalcola = () => { setStep(1); setRisultato(null); setErrore(null); };

  return (
    <div className="print-unlock" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* Tab modulo + step dipendenti — sotto l'header */}
      <div className="no-print" style={{
        paddingTop: '56px',
        background: 'var(--color-bg-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{
          maxWidth: '1400px', margin: '0 auto',
          padding: '0 32px',
          display: 'flex', alignItems: 'center', gap: '8px',
          minHeight: '44px',
          flexWrap: 'wrap',
        }}>
          <button
            type="button"
            className={`modulo-tab${tab === 'dipendenti' ? ' active' : ''}`}
            onClick={() => vaiA('dipendenti')}
          >
            Dipendenti
          </button>
          <button
            type="button"
            className={`modulo-tab${tab === 'edili' ? ' active' : ''}`}
            onClick={() => vaiA('edili')}
          >
            Dipendenti edili
          </button>
          <button
            type="button"
            className={`modulo-tab${tab === 'domestici' ? ' active' : ''}`}
            onClick={() => vaiA('domestici')}
          >
            Collaboratori familiari / domestici
          </button>
          <button
            type="button"
            className={`modulo-tab${tab === 'soci' ? ' active' : ''}`}
            onClick={() => vaiA('soci')}
          >
            Soci e Amministratori
          </button>
          {tab === 'dipendenti' && (
            <>
              <span style={{ flex: 1 }} />
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
                        width: '22px', height: '22px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontFamily: "'DM Mono', monospace", fontWeight: 500,
                        background: s.done ? 'var(--color-green)' : isActive ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                        color: (s.done || isActive) ? 'white' : 'var(--color-text-muted)',
                        border: `1px solid ${s.done ? 'var(--color-green)' : isActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        transition: 'all 0.2s ease',
                      }}>
                        {s.done ? '✓' : s.n}
                      </div>
                      <span style={{
                        fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif",
                        color: isActive ? 'var(--color-text-primary)' : s.done ? 'var(--color-green)' : 'var(--color-text-muted)',
                        fontWeight: isActive ? 600 : 400,
                      }}>
                        {s.label}
                      </span>
                    </div>
                    {i < 2 && (
                      <span style={{ color: 'var(--color-border-bright)', fontSize: '12px' }}>›</span>
                    )}
                  </div>
                );
              })}
            </>
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
          <EdiliPanel />
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
      <div className="print-unlock" style={{
        display: tab === 'dipendenti' ? 'grid' : 'none',
        flex: 1,
        maxWidth: '1400px', margin: '0 auto',
        width: '100%',
        padding: '24px 32px',
        gridTemplateColumns: step === 'risultati' ? '1fr' : '420px 1fr',
        gap: '24px',
        alignItems: 'start',
        overflowY: 'auto',
      }}>

        {/* Colonna sinistra — form */}
        {step !== 'risultati' && (
          <div style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            padding: '28px',
            animation: 'fadeSlideIn 0.2s ease forwards',
          }}>
            {step === 1 && <CalcolatoreFormStep1 onNext={handleStep1} />}
            {step === 2 && <CalcolatoreFormStep2 onSubmit={handleStep2} onBack={() => setStep(1)} isLoading={isLoading} ccnlId={step1Data?.ccnlId} />}
          </div>
        )}

        {/* Colonna destra — risultati o placeholder o skeleton */}
        <div style={{ animation: 'fadeSlideIn 0.2s ease forwards' }}>

          {/* Placeholder iniziale */}
          {step === 1 && !risultato && (
            <div style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '48px 32px',
              textAlign: 'center',
            }}>
              <div style={{
                width: '64px', height: '64px', margin: '0 auto 16px',
                background: 'var(--color-bg-elevated)',
                borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--color-border)',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5">
                  <path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8"/>
                </svg>
              </div>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '16px',
                color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                Il report apparirà qui
              </p>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                Compila il form e premi <strong style={{ color: 'var(--color-text-secondary)' }}>Calcola il costo</strong>
                <br />per visualizzare il report dettagliato voce per voce
              </p>
            </div>
          )}

          {/* Skeleton loader */}
          {isLoading && (
            <div style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px', padding: '28px',
              display: 'flex', flexDirection: 'column', gap: '16px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {[1,2,3].map(i => (
                  <div key={i} className="skeleton" style={{ height: '72px', borderRadius: '6px' }} />
                ))}
              </div>
              <div className="skeleton" style={{ height: '8px', borderRadius: '4px' }} />
              {[1,2,3,4,5].map(i => (
                <div key={i} className="skeleton" style={{ height: '36px', borderRadius: '4px' }} />
              ))}
            </div>
          )}

          {/* Errore */}
          {errore && !isLoading && (
            <div style={{
              background: 'var(--color-red-dim)',
              border: '1px solid var(--color-red)',
              borderLeft: '3px solid var(--color-red)',
              borderRadius: '10px', padding: '20px',
              animation: 'fadeSlideIn 0.2s ease forwards',
            }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '13px',
                color: 'var(--color-red)' }}>
                Errore nel calcolo
              </p>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>{errore}</p>
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
