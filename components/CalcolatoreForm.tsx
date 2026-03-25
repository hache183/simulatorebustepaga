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

  return (
    <form onSubmit={handleSubmit(onNext)} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Label sezione */}
      <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '14px' }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '11px',
          color: 'var(--color-accent-bright)', letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          Step 1 di 2
        </p>
        <h2 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '18px',
          color: 'var(--color-text-primary)', marginTop: '4px',
        }}>
          Dati dell&apos;assunzione
        </h2>
      </div>

      {/* CCNL */}
      <div>
        <label htmlFor="ccnlId" style={{ display: 'block', fontSize: '13px', fontWeight: 500,
          color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
          Contratto collettivo (CCNL)
        </label>
        <select id="ccnlId" {...register('ccnlId')} style={{
          width: '100%', padding: '11px 14px',
          background: 'var(--color-bg-input)', color: 'var(--color-text-primary)',
          border: `1px solid ${errors.ccnlId ? 'var(--color-red)' : 'var(--color-border)'}`,
          borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
        }}>
          <option value="">— Seleziona il CCNL —</option>
          {CCNL_DISPONIBILI.map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        {errors.ccnlId && <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-red)' }}>{errors.ccnlId.message}</p>}
      </div>

      {/* Livello */}
      <div>
        <label htmlFor="livello" style={{ display: 'block', fontSize: '13px', fontWeight: 500,
          color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
          Livello contrattuale
        </label>
        <select id="livello" {...register('livello')}
          disabled={loadingLivelli || livelli.length === 0}
          style={{
            width: '100%', padding: '11px 14px',
            background: 'var(--color-bg-input)', color: 'var(--color-text-primary)',
            border: `1px solid ${errors.livello ? 'var(--color-red)' : 'var(--color-border)'}`,
            borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
            opacity: (loadingLivelli || livelli.length === 0) ? 0.5 : 1,
          }}>
          <option value="">
            {loadingLivelli ? 'Caricamento...' : livelli.length === 0 ? '— Prima seleziona il CCNL —' : '— Seleziona il livello —'}
          </option>
          {livelli.map(l => (
            <option key={l.codice} value={l.codice}>{l.codice} — {l.descrizione}</option>
          ))}
        </select>
        {errors.livello && <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-red)' }}>{errors.livello.message}</p>}
      </div>

      {/* RAL */}
      <div>
        <label htmlFor="ral" style={{ display: 'block', fontSize: '13px', fontWeight: 500,
          color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
          RAL annua lorda
        </label>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            fontFamily: "'DM Mono', monospace", fontSize: '13px', color: 'var(--color-text-muted)',
          }}>€</span>
          <input id="ral" type="number" step="500" placeholder="28.000"
            {...register('ral', { valueAsNumber: true })}
            style={{
              width: '100%', padding: '11px 14px 11px 28px',
              background: 'var(--color-bg-input)', color: 'var(--color-text-primary)',
              border: `1px solid ${errors.ral ? 'var(--color-red)' : 'var(--color-border)'}`,
              borderRadius: '6px', fontSize: '13px',
              fontFamily: "'DM Mono', monospace",
            }}
          />
        </div>
        {errors.ral && <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-red)' }}>{errors.ral.message}</p>}
      </div>

      {/* Tipo contratto */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500,
          color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
          Tipo di contratto
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {TIPI_CONTRATTO.map(t => {
            const selected = watch('tipoContratto') === t.value;
            return (
              <button key={t.value} type="button"
                onClick={() => setValue('tipoContratto', t.value)}
                style={{
                  padding: '8px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s ease', textAlign: 'left',
                  background: selected ? 'var(--color-accent-glow)' : 'var(--color-bg-input)',
                  border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  color: selected ? 'var(--color-accent-bright)' : 'var(--color-text-secondary)',
                }}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ore di lavoro */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500,
            color: 'var(--color-text-secondary)' }}>
            Ore settimanali
          </label>
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: '13px', fontWeight: 500,
            color: Number(oreLavoro) >= 40 ? 'var(--color-green)' : 'var(--color-amber)',
            background: Number(oreLavoro) >= 40 ? 'var(--color-green-dim)' : 'var(--color-amber-dim)',
            padding: '2px 8px', borderRadius: '4px',
          }}>
            {oreLavoro}h · {Number(oreLavoro) >= 40 ? 'Full-time' : `Part-time ${Math.round((Number(oreLavoro) / 40) * 100)}%`}
          </span>
        </div>
        <input id="oreLavoro" type="range" min="8" max="48" step="1"
          {...register('oreLavoro', { valueAsNumber: true })}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between',
          fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px',
          fontFamily: "'DM Mono', monospace" }}>
          <span>8h</span><span>40h</span><span>48h</span>
        </div>
      </div>

      {/* Mensilità */}
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500,
            color: 'var(--color-text-secondary)' }}>
            Mensilità
          </label>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'right', maxWidth: '60%' }}>
            Precompilato dal CCNL — modifica solo se c&apos;è un accordo integrativo
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px' }}>
          {[13, 14, 15, 16].map(n => {
            const selected = Number(watch('mensilita')) === n;
            return (
              <button key={n} type="button"
                onClick={() => setValue('mensilita', n)}
                style={{
                  padding: '8px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s ease', textAlign: 'center',
                  fontFamily: "'DM Mono', monospace",
                  background: selected ? 'var(--color-accent-glow)' : 'var(--color-bg-input)',
                  border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  color: selected ? 'var(--color-accent-bright)' : 'var(--color-text-secondary)',
                }}>
                {n}
              </button>
            );
          })}
        </div>
        {(() => {
          const val = Number(watch('mensilita'));
          if (val === 13) return null;
          if (val === 14 && ccnlMensilita === 13) return (
            <p style={{ marginTop: '8px', fontSize: '11px', padding: '8px 10px', borderRadius: '4px',
              background: 'var(--color-amber-dim)', color: 'var(--color-amber)', border: '1px solid var(--color-amber)' }}>
              ⚠ La quattordicesima non è prevista da questo CCNL (art. 2077 c.c.).
            </p>
          );
          if (val === 14 && ccnlMensilita === 14) return (
            <p style={{ marginTop: '8px', fontSize: '11px', padding: '8px 10px', borderRadius: '4px',
              background: 'var(--color-green-dim)', color: 'var(--color-green)', border: '1px solid var(--color-green)' }}>
              ✓ La quattordicesima è prevista da questo CCNL.
            </p>
          );
          if (val >= 15) return (
            <p style={{ marginTop: '8px', fontSize: '11px', padding: '8px 10px', borderRadius: '4px',
              background: 'var(--color-amber-dim)', color: 'var(--color-amber)', border: '1px solid var(--color-amber)' }}>
              ⚠ {val} mensilità ammesse solo tramite contrattazione di secondo livello (art. 2077 c.c.).
            </p>
          );
          return null;
        })()}
        {errors.mensilita && <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-red)' }}>{errors.mensilita.message}</p>}
      </div>

      {/* Pulsante */}
      <button type="submit" disabled={loadingLivelli} style={{
        width: '100%', padding: '14px',
        background: 'var(--color-accent)',
        color: 'white', border: 'none', borderRadius: '10px',
        fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '14px',
        cursor: 'pointer', transition: 'background 0.15s ease, opacity 0.15s ease',
        opacity: loadingLivelli ? 0.5 : 1,
      }}>
        Avanti →
      </button>
    </form>
  );
}
