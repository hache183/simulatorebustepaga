'use client';

import { useState } from 'react';
import { CalcolatoreFormStep1 } from '@/components/CalcolatoreForm';
import { CalcolatoreFormStep2 } from '@/components/CalcolatoreFormStep2';
import { RisultatiCalcolatore } from '@/components/RisultatiCalcolatore';
import { Disclaimer } from '@/components/Disclaimer';
import type { CalcolatoreOutput } from '@/types';

interface Step1Data {
  ccnlId: string; livello: string; ral: number;
  tipoContratto: 'tempo_indeterminato'|'tempo_determinato'|'apprendistato'|'somministrazione';
  oreLavoro: number;
  mensilita: number;
}

interface Step2Data {
  numeroDipendenti: number; regione: string; codiceInail: string;
  anzianitaAnni: number; agevolazioniSelezionate: string[];
}

interface Props { updatedDates: string[]; }

export function CalcolatorePageClient({ updatedDates }: Props) {
  const [step, setStep] = useState<1 | 2 | 'risultati'>(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [risultato, setRisultato] = useState<CalcolatoreOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const handleStep1 = (data: Step1Data) => { setStep1Data(data); setStep(2); };

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
    <div className="space-y-6">
      {/* Indicatore step */}
      {step !== 'risultati' && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className={step === 1 ? 'font-semibold text-blue-600' : ''}>1. Assunzione</span>
          <span>→</span>
          <span className={step === 2 ? 'font-semibold text-blue-600' : ''}>2. Azienda</span>
          <span>→</span>
          <span className="text-gray-300">3. Risultati</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        {step !== 'risultati' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {step === 1 && <CalcolatoreFormStep1 onNext={handleStep1} />}
            {step === 2 && <CalcolatoreFormStep2 onSubmit={handleStep2} onBack={() => setStep(1)} isLoading={isLoading} />}
          </div>
        )}

        {/* Skeleton loader */}
        {isLoading && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/2" />
            <div className="grid grid-cols-3 gap-3">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
            </div>
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-48 bg-gray-200 rounded-xl" />
          </div>
        )}

        {/* Errore */}
        {errore && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <p className="text-red-700 font-semibold mb-1">Errore nel calcolo</p>
            <p className="text-red-600 text-sm">{errore}</p>
          </div>
        )}

        {/* Risultati */}
        {step === 'risultati' && risultato && (
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <RisultatiCalcolatore risultato={risultato} onRicalcola={ricalcola} />
          </div>
        )}
      </div>

      {/* Disclaimer — sempre visibile */}
      <Disclaimer updatedDates={updatedDates} />
    </div>
  );
}
