'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import {
  NOTA_ASSISTENZA_SANITARIA_FORFAIT,
  ORE_FERIE_NON_GODUTE_FISSE,
  DIVISORE_ORARIO_FERIE_FISSO,
} from '@/lib/costanti-consulente';

const REGIONI = [
  'Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna',
  'Friuli-Venezia Giulia','Lazio','Liguria','Lombardia','Marche',
  'Molise','Piemonte','Puglia','Sardegna','Sicilia','Toscana',
  'Trentino-Alto Adige','Umbria',"Valle d'Aosta",'Veneto',
];

const Step2Schema = z.object({
  numeroDipendenti: z.number().min(1, 'Inserisci il numero di dipendenti'),
  regione: z.string(),
  codiceInail: z.string(),
  anzianitaAnni: z.number().min(0).max(50),
  aliquotaInps: z.number().min(0).max(50),
});

type Step2Data = z.infer<typeof Step2Schema>;

export interface Step2SubmitData {
  numeroDipendenti: number;
  regione: string;
  codiceInail: string;
  anzianitaAnni: number;
  agevolazioniSelezionate: string[];
  includiAssistenzaSanitaria: boolean;
  aliquotaInps: number;
}

interface VoceInail { codice: string; settore: string; tassoPerMille: number; }

interface Props {
  onSubmit: (data: Step2SubmitData) => void;
  onBack: () => void;
  isLoading: boolean;
  ccnlId?: string;
}

export function CalcolatoreFormStep2({ onSubmit, onBack, isLoading, ccnlId }: Props) {
  const isDomestici = ['domestici', 'domestici_conviventi', 'domestici_non_conviventi'].includes(ccnlId ?? '');
  const [voceInail, setVociInail] = useState<VoceInail[]>([]);

  const { register, handleSubmit, formState: { errors } } =
    useForm<Step2Data>({
      resolver: zodResolver(Step2Schema),
      defaultValues: { numeroDipendenti: 1, regione: '', anzianitaAnni: 0, codiceInail: '', aliquotaInps: 28.80 },
    });

  useEffect(() => {
    fetch('/api/inail/voci').then(r => r.json()).then(d => setVociInail((d as { voci?: VoceInail[] }).voci ?? []));
  }, []);

  return (
    <form onSubmit={handleSubmit((data) => {
      onSubmit({
        ...data,
        aliquotaInps: isDomestici ? 0 : data.aliquotaInps / 100,
        numeroDipendenti: isDomestici ? 1 : data.numeroDipendenti,
        codiceInail: isDomestici ? '' : data.codiceInail,
        agevolazioniSelezionate: [] as string[],
        includiAssistenzaSanitaria: !isDomestici,
      });
    })} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Label sezione */}
      <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '14px' }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '11px',
          color: 'var(--color-accent-bright)', letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          Step 2 di 2
        </p>
        <h2 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '18px',
          color: 'var(--color-text-primary)', marginTop: '4px',
        }}>
          {isDomestici ? 'Dati del rapporto domestico' : 'Dati aziendali'}
        </h2>
        {isDomestici && (
          <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.5',
            padding: '8px 10px', borderRadius: '6px', background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)' }}>
            Per il lavoro domestico non si applicano: agevolazioni contributive imprenditoriali,
            aliquota INPS personalizzabile (calcolata per fascia oraria — Circ. INPS n. 9/2026),
            numero di dipendenti. Compila solo i dati rilevanti al rapporto.
          </p>
        )}
      </div>

      {/* Numero dipendenti — nascosto per domestici */}
      {!isDomestici && (
      <div>
        <label htmlFor="numeroDipendenti" style={{ display: 'block', fontSize: '13px', fontWeight: 500,
          color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
          Numero di dipendenti in azienda
        </label>
        <input id="numeroDipendenti" type="number" min="1"
          {...register('numeroDipendenti', { valueAsNumber: true })}
          placeholder="es. 10"
          style={{
            width: '100%', padding: '11px 14px',
            background: 'var(--color-bg-input)', color: 'var(--color-text-primary)',
            border: `1px solid ${errors.numeroDipendenti ? 'var(--color-red)' : 'var(--color-border)'}`,
            borderRadius: '6px', fontSize: '13px',
            fontFamily: "'DM Mono', monospace",
          }}
        />
        {errors.numeroDipendenti && <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-red)' }}>{errors.numeroDipendenti.message}</p>}
      </div>
      )}

      {/* Regione — nascosta per lavoro domestico */}
      {!isDomestici && (
      <div>
        <label htmlFor="regione" style={{ display: 'block', fontSize: '13px', fontWeight: 500,
          color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
          Regione
        </label>
        <select id="regione" {...register('regione', {
          validate: v => isDomestici || (v && v.length > 0) || 'Seleziona la regione',
        })} style={{
          width: '100%', padding: '11px 14px',
          background: 'var(--color-bg-input)', color: 'var(--color-text-primary)',
          border: `1px solid ${errors.regione ? 'var(--color-red)' : 'var(--color-border)'}`,
          borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
        }}>
          <option value="">— Seleziona la regione —</option>
          {REGIONI.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {errors.regione && <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-red)' }}>{errors.regione.message}</p>}
      </div>
      )}

      {/* Categoria INAIL — nascosta per domestici (contributo fisso annuo via INPS) */}
      {!isDomestici && <div>
        <label htmlFor="codiceInail" style={{ display: 'block', fontSize: '13px', fontWeight: 500,
          color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
          Categoria INAIL
        </label>
        <select id="codiceInail" {...register('codiceInail', {
          validate: v => isDomestici || (v && v.length > 0) || 'Seleziona la categoria INAIL',
        })} style={{
          width: '100%', padding: '11px 14px',
          background: 'var(--color-bg-input)', color: 'var(--color-text-primary)',
          border: `1px solid ${errors.codiceInail ? 'var(--color-red)' : 'var(--color-border)'}`,
          borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
        }}>
          <option value="">— Seleziona la categoria —</option>
          {voceInail.map(v => (
            <option key={v.codice} value={v.codice}>
              {v.codice} — {v.settore} ({v.tassoPerMille}‰)
            </option>
          ))}
        </select>
        {errors.codiceInail && <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-red)' }}>{errors.codiceInail.message}</p>}
      </div>}

      {/* Anzianità */}
      <div>
        <label htmlFor="anzianitaAnni" style={{ display: 'block', fontSize: '13px', fontWeight: 500,
          color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
          Anzianità nel CCNL (anni, per scatti)
        </label>
        <input id="anzianitaAnni" type="number" min="0" max="50"
          {...register('anzianitaAnni', { valueAsNumber: true })}
          style={{
            width: '100%', padding: '11px 14px',
            background: 'var(--color-bg-input)', color: 'var(--color-text-primary)',
            border: `1px solid ${errors.anzianitaAnni ? 'var(--color-red)' : 'var(--color-border)'}`,
            borderRadius: '6px', fontSize: '13px',
            fontFamily: "'DM Mono', monospace",
          }}
        />
        {errors.anzianitaAnni && <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-red)' }}>Valore non valido (0–50 anni)</p>}
      </div>

      {/* Aliquota INPS — nascosta per domestici (engine usa per-ora Circ. n. 9/2026) */}
      {!isDomestici && <div>
        <label htmlFor="aliquotaInps" style={{ display: 'block', fontSize: '13px', fontWeight: 500,
          color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
          Aliquota INPS datoriale (%)
        </label>
        <div style={{ position: 'relative' }}>
          <input id="aliquotaInps" type="number" step="0.01" min="0" max="50"
            {...register('aliquotaInps', { valueAsNumber: true })}
            style={{
              width: '100%', padding: '11px 14px 11px 14px',
              background: 'var(--color-bg-input)', color: 'var(--color-text-primary)',
              border: `1px solid ${errors.aliquotaInps ? 'var(--color-red)' : 'var(--color-border)'}`,
              borderRadius: '6px', fontSize: '13px',
              fontFamily: "'DM Mono', monospace",
            }}
          />
          <span style={{
            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
            fontFamily: "'DM Mono', monospace", fontSize: '13px', color: 'var(--color-text-muted)',
          }}>%</span>
        </div>
        <p style={{ marginTop: '6px', fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
          Aliquote contributive INPS a carico del D/L. Il valore precompilato è quello medio per la generalità delle imprese. Il valore preciso è distinto dal settore specifico (es. Artigiani, Commercianti, Industrie). Verifica con il tuo consulente.
        </p>
        {errors.aliquotaInps && <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-red)' }}>{errors.aliquotaInps.message}</p>}
      </div>}

      {!isDomestici && <div style={{
        padding: '12px 14px', borderRadius: '8px',
        background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
      }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
          Assistenza sanitaria integrativa (sempre inclusa)
        </p>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.55 }}>
          {NOTA_ASSISTENZA_SANITARIA_FORFAIT}
        </p>
      </div>}

      {!isDomestici && <div style={{
        padding: '12px 14px', borderRadius: '8px',
        background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
      }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
          Ferie, permessi ed ex festività non godute
        </p>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.55 }}>
          Formula fissa: {ORE_FERIE_NON_GODUTE_FISSE} h × (retribuzione mensile / {DIVISORE_ORARIO_FERIE_FISSO})
          = valore ferie, permessi ed ex festività. Non modificabile dall&apos;operatore.
        </p>
      </div>}

      {/* Pulsanti */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button type="button" onClick={onBack} style={{
          flex: 1, padding: '14px',
          background: 'transparent', color: 'var(--color-text-secondary)',
          border: '1px solid var(--color-border)', borderRadius: '10px',
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '14px',
          cursor: 'pointer', transition: 'border-color 0.15s ease',
        }}>
          ← Indietro
        </button>
        <button type="submit" disabled={isLoading} style={{
          flex: 1, padding: '14px',
          background: 'var(--color-accent)',
          color: 'white', border: 'none', borderRadius: '10px',
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '14px',
          cursor: 'pointer', transition: 'background 0.15s ease, opacity 0.15s ease',
          opacity: isLoading ? 0.5 : 1,
        }}>
          {isLoading ? 'Calcolo...' : 'Calcola il costo →'}
        </button>
      </div>
    </form>
  );
}
