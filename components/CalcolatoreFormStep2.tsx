'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import type { AgevolazioneInps } from '@/types';

const REGIONI = [
  'Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna',
  'Friuli-Venezia Giulia','Lazio','Liguria','Lombardia','Marche',
  'Molise','Piemonte','Puglia','Sardegna','Sicilia','Toscana',
  'Trentino-Alto Adige','Umbria',"Valle d'Aosta",'Veneto',
];

const Step2Schema = z.object({
  numeroDipendenti: z.number().min(1, 'Inserisci il numero di dipendenti'),
  regione: z.string().min(1, 'Seleziona la regione'),
  codiceInail: z.string().min(4, 'Seleziona la categoria INAIL'),
  anzianitaAnni: z.number().min(0).max(50),
  agevolazioniSelezionate: z.array(z.string()),
});

type Step2Data = z.infer<typeof Step2Schema>;

interface VoceInail { codice: string; settore: string; tassoPerMille: number; }

interface Props {
  onSubmit: (data: Step2Data) => void;
  onBack: () => void;
  isLoading: boolean;
}

export function CalcolatoreFormStep2({ onSubmit, onBack, isLoading }: Props) {
  const [voceInail, setVociInail] = useState<VoceInail[]>([]);
  const [agevolazioni, setAgevolazioni] = useState<AgevolazioneInps[]>([]);
  const [conflitti, setConflitti] = useState<Record<string, string>>({});

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<Step2Data>({
      resolver: zodResolver(Step2Schema),
      defaultValues: { anzianitaAnni: 0, agevolazioniSelezionate: [] },
    });

  const agevolazioniSelezionate = watch('agevolazioniSelezionate');

  useEffect(() => {
    fetch('/api/inail/voci').then(r => r.json()).then(d => setVociInail((d as { voci?: VoceInail[] }).voci ?? []));
    fetch('/api/agevolazioni').then(r => r.json()).then(d => setAgevolazioni((d as { agevolazioni?: AgevolazioneInps[] }).agevolazioni ?? []));
  }, []);

  // Calcola conflitti in real-time
  useEffect(() => {
    const nuoviConflitti: Record<string, string> = {};
    for (const id of agevolazioniSelezionate) {
      const agev = agevolazioni.find(a => a.id === id);
      if (!agev) continue;
      for (const conflitoId of agev.nonCumulabileCon) {
        if (agevolazioniSelezionate.includes(conflitoId)) {
          const nomeConflito = agevolazioni.find(a => a.id === conflitoId)?.nome ?? conflitoId;
          nuoviConflitti[id] = `Non cumulabile con: ${nomeConflito}`;
        }
      }
    }
    setConflitti(nuoviConflitti);
  }, [agevolazioniSelezionate, agevolazioni]);

  const toggleAgevolazione = (id: string) => {
    const correnti = agevolazioniSelezionate;
    const nuove = correnti.includes(id) ? correnti.filter(x => x !== id) : [...correnti, id];
    setValue('agevolazioniSelezionate', nuove);
  };

  const giorniAllaScadenza = (scadenza: string | null) => {
    if (!scadenza) return null;
    return Math.ceil((new Date(scadenza).getTime() - Date.now()) / 86_400_000);
  };

  const inputClass = (hasError: boolean) =>
    `w-full rounded-lg border px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      hasError ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-800">Dati aziendali e agevolazioni</h2>

      {/* Numero dipendenti */}
      <div>
        <label htmlFor="numeroDipendenti" className="block text-sm font-medium text-gray-700 mb-1">
          Numero di dipendenti in azienda
        </label>
        <input id="numeroDipendenti" type="number" min="1" {...register('numeroDipendenti', { valueAsNumber: true })}
          className={inputClass(!!errors.numeroDipendenti)} placeholder="es. 10" />
        {errors.numeroDipendenti && <p className="mt-1 text-xs text-red-600">{errors.numeroDipendenti.message}</p>}
      </div>

      {/* Regione */}
      <div>
        <label htmlFor="regione" className="block text-sm font-medium text-gray-700 mb-1">Regione</label>
        <select id="regione" {...register('regione')} className={inputClass(!!errors.regione)}>
          <option value="">— Seleziona la regione —</option>
          {REGIONI.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {errors.regione && <p className="mt-1 text-xs text-red-600">{errors.regione.message}</p>}
      </div>

      {/* Categoria INAIL */}
      <div>
        <label htmlFor="codiceInail" className="block text-sm font-medium text-gray-700 mb-1">Categoria INAIL</label>
        <select id="codiceInail" {...register('codiceInail')} className={inputClass(!!errors.codiceInail)}>
          <option value="">— Seleziona la categoria —</option>
          {voceInail.map(v => (
            <option key={v.codice} value={v.codice}>
              {v.codice} — {v.settore} ({v.tassoPerMille}‰)
            </option>
          ))}
        </select>
        {errors.codiceInail && <p className="mt-1 text-xs text-red-600">{errors.codiceInail.message}</p>}
      </div>

      {/* Anzianità */}
      <div>
        <label htmlFor="anzianitaAnni" className="block text-sm font-medium text-gray-700 mb-1">
          Anni di anzianità nel CCNL (per scatti)
        </label>
        <input id="anzianitaAnni" type="number" min="0" max="50" {...register('anzianitaAnni', { valueAsNumber: true })}
          className={inputClass(false)} />
      </div>

      {/* Agevolazioni */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Agevolazioni contributive applicabili</p>
        <div className="space-y-2">
          {agevolazioni.map(agev => {
            const giorni = giorniAllaScadenza(agev.scadenza);
            const selezionata = agevolazioniSelezionate.includes(agev.id);
            const conflitto = conflitti[agev.id];
            return (
              <div
                key={agev.id}
                onClick={() => toggleAgevolazione(agev.id)}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selezionata ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={selezionata} readOnly className="mt-0.5 accent-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{agev.nome}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{agev.fonteLegge}</p>
                    </div>
                  </div>
                  {giorni !== null && giorni <= 90 && (
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                      Scade tra {giorni}gg
                    </span>
                  )}
                  {agev.scadenza === null && (
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      Nessuna scadenza
                    </span>
                  )}
                </div>
                {conflitto && selezionata && (
                  <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    ⚠️ {conflitto} — il motore applicherà solo quella più vantaggiosa
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack}
          className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors">
          ← Indietro
        </button>
        <button type="submit" disabled={isLoading}
          className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {isLoading ? 'Calcolo in corso...' : 'Calcola il costo'}
        </button>
      </div>
    </form>
  );
}
