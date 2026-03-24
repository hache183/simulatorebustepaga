'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import type { LivelloCcnl } from '@/types';

const CCNL_DISPONIBILI = [
  { id: 'commercio',           nome: 'Commercio — Terziario Distribuzione e Servizi (Confcommercio)' },
  { id: 'metalmeccanici',      nome: 'Metalmeccanici — Industria (Federmeccanica-Assistal)' },
  { id: 'edilizia',            nome: 'Edilizia — Industria (ANCE)' },
  { id: 'sanita_privata',      nome: 'Sanità Privata (Aiop-Aris)' },
  { id: 'studi_professionali', nome: 'Studi Professionali (Confprofessioni)' },
  { id: 'cooperative_sociali', nome: 'Cooperative Sociali (Legacoop-Agci-Confcooperative)' },
  { id: 'trasporti',           nome: 'Trasporto Merci e Logistica (Conftrasporto)' },
  { id: 'pubblici_esercizi',   nome: 'Pubblici Esercizi, Ristorazione e Turismo (FIPE)' },
  { id: 'chimica',             nome: 'Chimica-Farmaceutica e Plastica (Federchimica)' },
  { id: 'credito',             nome: 'Credito — Banche (ABI)' },
  { id: 'multiservizi',        nome: 'Multiservizi — Pulizie e Facility (Ancst)' },
  { id: 'telecomunicazioni',   nome: 'Telecomunicazioni (Asstel)' },
  { id: 'tessile',             nome: 'Tessile-Abbigliamento-Moda (SMI)' },
  { id: 'informatica',         nome: 'Informatica e Servizi Innovativi (Assinform)' },
  { id: 'agricoltura',         nome: 'Agricoltura — Operai Agricoli (Confagricoltura)' },
  { id: 'scuole_private',      nome: 'Scuole e Istituti Privati (Agidae-FISM)' },
];

const TIPI_CONTRATTO = [
  { value: 'tempo_indeterminato', label: 'Tempo indeterminato' },
  { value: 'tempo_determinato',   label: 'Tempo determinato' },
  { value: 'apprendistato',       label: 'Apprendistato' },
  { value: 'somministrazione',    label: 'Somministrazione' },
] as const;

const Step1Schema = z.object({
  ccnlId: z.string().min(1, 'Seleziona un CCNL'),
  livello: z.string().min(1, 'Seleziona il livello contrattuale'),
  ral: z.number().min(10_000, 'Minimo 10.000 €').max(500_000, 'Massimo 500.000 €'),
  tipoContratto: z.enum(['tempo_indeterminato', 'tempo_determinato', 'apprendistato', 'somministrazione']),
  oreLavoro: z.number().min(1).max(48),
  mensilita: z.number()
    .int('Le mensilità devono essere un numero intero')
    .min(13, 'Minimo 13 — la tredicesima è obbligatoria per legge (R.D.L. 1525/1937)')
    .max(16, 'Massimo 16 — oltre non esiste nel diritto del lavoro italiano'),
});

type Step1Data = z.infer<typeof Step1Schema>;

interface Props {
  onNext: (data: Step1Data) => void;
}

export function CalcolatoreFormStep1({ onNext }: Props) {
  const [livelli, setLivelli] = useState<LivelloCcnl[]>([]);
  const [loadingLivelli, setLoadingLivelli] = useState(false);
  const [ccnlMensilita, setCcnlMensilita] = useState<number>(13);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(Step1Schema),
    defaultValues: { oreLavoro: 40, tipoContratto: 'tempo_indeterminato', mensilita: 13 },
  });

  const ccnlSelezionato = watch('ccnlId');
  const oreLavoro = watch('oreLavoro');

  useEffect(() => {
    if (!ccnlSelezionato) return;
    setLoadingLivelli(true);
    fetch(`/api/ccnl/${ccnlSelezionato}/livelli`)
      .then(r => r.json())
      .then(d => {
        const data = d as { livelli?: LivelloCcnl[]; mensilita?: number };
        setLivelli(data.livelli ?? []);
        if (data.mensilita) setValue('mensilita', data.mensilita);
        if (data.mensilita) setCcnlMensilita(data.mensilita);
      })
      .catch(() => setLivelli([]))
      .finally(() => setLoadingLivelli(false));
  }, [ccnlSelezionato]);

  const inputClass = (hasError: boolean) =>
    `w-full rounded-lg border px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      hasError ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`;

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-800">Dati dell&apos;assunzione</h2>

      {/* CCNL */}
      <div>
        <label htmlFor="ccnlId" className="block text-sm font-medium text-gray-700 mb-1">
          Contratto collettivo (CCNL)
        </label>
        <select id="ccnlId" {...register('ccnlId')} className={inputClass(!!errors.ccnlId)}>
          <option value="">— Seleziona il CCNL —</option>
          {CCNL_DISPONIBILI.map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        {errors.ccnlId && <p className="mt-1 text-xs text-red-600">{errors.ccnlId.message}</p>}
      </div>

      {/* Livello */}
      <div>
        <label htmlFor="livello" className="block text-sm font-medium text-gray-700 mb-1">
          Livello contrattuale
        </label>
        <select
          id="livello"
          {...register('livello')}
          disabled={loadingLivelli || livelli.length === 0}
          className={inputClass(!!errors.livello)}
        >
          <option value="">
            {loadingLivelli ? 'Caricamento...' : livelli.length === 0 ? '— Prima seleziona il CCNL —' : '— Seleziona il livello —'}
          </option>
          {livelli.map(l => (
            <option key={l.codice} value={l.codice}>
              {l.codice} — {l.descrizione}
            </option>
          ))}
        </select>
        {errors.livello && <p className="mt-1 text-xs text-red-600">{errors.livello.message}</p>}
      </div>

      {/* RAL */}
      <div>
        <label htmlFor="ral" className="block text-sm font-medium text-gray-700 mb-1">
          RAL annua lorda (€)
        </label>
        <input
          id="ral"
          type="number"
          step="100"
          placeholder="es. 28000"
          {...register('ral', { valueAsNumber: true })}
          className={inputClass(!!errors.ral)}
        />
        {errors.ral && <p className="mt-1 text-xs text-red-600">{errors.ral.message}</p>}
      </div>

      {/* Tipo contratto */}
      <div>
        <label htmlFor="tipoContratto" className="block text-sm font-medium text-gray-700 mb-1">
          Tipo di contratto
        </label>
        <select id="tipoContratto" {...register('tipoContratto')} className={inputClass(!!errors.tipoContratto)}>
          {TIPI_CONTRATTO.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Ore di lavoro */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="oreLavoro" className="text-sm font-medium text-gray-700">
            Ore settimanali
          </label>
          <span className={`text-sm font-semibold ${oreLavoro < 40 ? 'text-amber-600' : 'text-green-600'}`}>
            {oreLavoro}h — {oreLavoro >= 40 ? 'Full-time' : `Part-time (${Math.round((oreLavoro / 40) * 100)}%)`}
          </span>
        </div>
        <input
          id="oreLavoro"
          type="range"
          min="8"
          max="48"
          step="1"
          {...register('oreLavoro', { valueAsNumber: true })}
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>8h</span><span>40h</span><span>48h</span>
        </div>
      </div>

      {/* Mensilità */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-1">
          <label htmlFor="mensilita" className="text-sm font-medium text-gray-700">
            Mensilità
          </label>
          <span className="text-xs text-gray-400 text-right max-w-[60%]">
            Precompilato dal CCNL — modifica solo se c&apos;è un accordo aziendale integrativo
          </span>
        </div>

        <div className="flex gap-2">
          {[13, 14, 15, 16].map(n => {
            const selected = Number(watch('mensilita')) === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setValue('mensilita', n)}
                className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                  selected
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>

        {/* Warning condizionale basato sul valore selezionato e sul default del CCNL */}
        {(() => {
          const val = Number(watch('mensilita'));
          if (val === 13) return null;
          if (val === 14 && ccnlMensilita === 13) return (
            <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
              ⚠️ La quattordicesima non è prevista da questo CCNL. Selezionala solo se presente
              un accordo aziendale integrativo scritto (art. 2077 c.c.).
            </p>
          );
          if (val === 14 && ccnlMensilita === 14) return (
            <p className="mt-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1.5">
              ✓ La quattordicesima è prevista da questo CCNL.
            </p>
          );
          if (val >= 15) return (
            <p className="mt-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1.5">
              ⚠️ {val} mensilità sono ammesse solo tramite contrattazione di secondo livello
              (accordo aziendale o territoriale). Verifica l&apos;esistenza dell&apos;accordo
              scritto prima di procedere con questo calcolo (art. 2077 c.c.).
            </p>
          );
          return null;
        })()}

        {errors.mensilita && (
          <p className="mt-1 text-xs text-red-600">{errors.mensilita.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loadingLivelli}
        className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        Avanti →
      </button>
    </form>
  );
}
