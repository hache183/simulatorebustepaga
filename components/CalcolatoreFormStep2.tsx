'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import type { AgevolazioneInps, ContributoContrattuale } from '@/types';

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
  agevolazioniSelezionate: z.array(z.string()),
  includiAssistenzaSanitaria: z.boolean(),
  aliquotaInps: z.number().min(0).max(50),
});

type Step2Data = z.infer<typeof Step2Schema>;

interface VoceInail { codice: string; settore: string; tassoPerMille: number; }

interface Props {
  onSubmit: (data: Step2Data) => void;
  onBack: () => void;
  isLoading: boolean;
  contributiCcnl?: Record<string, ContributoContrattuale>;
  isDomestico?: boolean;
}

export function CalcolatoreFormStep2({ onSubmit, onBack, isLoading, contributiCcnl, isDomestico = false }: Props) {
  const [voceInail, setVociInail] = useState<VoceInail[]>([]);
  const [agevolazioni, setAgevolazioni] = useState<AgevolazioneInps[]>([]);
  const [conflitti, setConflitti] = useState<Record<string, string>>({});

  const fondoSanitarioNome = contributiCcnl
    ? Object.values(contributiCcnl).find(c => c.tipo === 'sanitario')?.descrizione
    : undefined;

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<Step2Data>({
      resolver: zodResolver(Step2Schema),
      defaultValues: { numeroDipendenti: 1, regione: '', anzianitaAnni: 0, codiceInail: '', agevolazioniSelezionate: [], includiAssistenzaSanitaria: true, aliquotaInps: 28.80 },
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

  return (
    <form onSubmit={handleSubmit((data) => {
      if (isDomestico) {
        onSubmit({ ...data, codiceInail: '', aliquotaInps: 0, agevolazioniSelezionate: [], regione: 'N/A' });
      } else {
        onSubmit({ ...data, aliquotaInps: data.aliquotaInps / 100 });
      }
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
          Dati aziendali
        </h2>
      </div>

      {/* Numero dipendenti — nascosto per lavoro domestico */}
      {!isDomestico && (
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
      {!isDomestico && (
      <div>
        <label htmlFor="regione" style={{ display: 'block', fontSize: '13px', fontWeight: 500,
          color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
          Regione
        </label>
        <select id="regione" {...register('regione', {
          validate: v => isDomestico || (v && v.length > 0) || 'Seleziona la regione',
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

      {/* Categoria INAIL */}
      {!isDomestico && (
      <div>
        <label htmlFor="codiceInail" style={{ display: 'block', fontSize: '13px', fontWeight: 500,
          color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
          Categoria INAIL
        </label>
        <select id="codiceInail" {...register('codiceInail', {
          validate: v => isDomestico || (v && v.length > 0) || 'Seleziona la categoria INAIL',
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
      </div>
      )}

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

      {/* Aliquota INPS (MOD3) */}
      {!isDomestico && (
      <div>
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
          Aliquota contributiva INPS a carico del datore di lavoro. Il valore precompilato (28,80%) è quello standard per la generalità delle aziende.
          Modifica se il settore ha un&apos;aliquota diversa (es. Artigianato, Agricoltura, Credito). Verifica con il tuo consulente del lavoro.
        </p>
        {errors.aliquotaInps && <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-red)' }}>{errors.aliquotaInps.message}</p>}
      </div>
      )}

      {/* Toggle assistenza sanitaria integrativa (MOD2) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <button type="button"
            onClick={() => setValue('includiAssistenzaSanitaria', !watch('includiAssistenzaSanitaria'))}
            style={{
              width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer',
              background: watch('includiAssistenzaSanitaria') ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
              position: 'relative', transition: 'background 0.2s ease',
              outline: `1px solid ${watch('includiAssistenzaSanitaria') ? 'var(--color-accent)' : 'var(--color-border)'}`,
            }}>
            <div style={{
              width: '16px', height: '16px', borderRadius: '50%', background: 'white',
              position: 'absolute', top: '3px',
              left: watch('includiAssistenzaSanitaria') ? '21px' : '3px',
              transition: 'left 0.2s ease',
            }} />
          </button>
          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)', cursor: 'pointer' }}
            onClick={() => setValue('includiAssistenzaSanitaria', !watch('includiAssistenzaSanitaria'))}>
            Includi assistenza sanitaria integrativa
          </label>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
          Se attivo, include nel costo i contributi al fondo sanitario previsto dal CCNL
          {fondoSanitarioNome ? ` (${fondoSanitarioNome})` : ' (es. Fondo Est, Metasalute, San.Arti)'}.
          Disattivalo se l&apos;azienda non aderisce al fondo sanitario.
        </p>
      </div>

      {/* Agevolazioni */}
      {!isDomestico && (
      <div>
        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)',
          marginBottom: '10px' }}>
          Agevolazioni contributive applicabili
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {agevolazioni.map(agev => {
            const giorni = giorniAllaScadenza(agev.scadenza);
            const selezionata = agevolazioniSelezionate.includes(agev.id);
            const conflitto = conflitti[agev.id];
            return (
              <div
                key={agev.id}
                onClick={() => toggleAgevolazione(agev.id)}
                style={{
                  padding: '12px', borderRadius: '6px', cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  background: selezionata ? 'var(--color-accent-glow)' : 'var(--color-bg-input)',
                  border: `1px solid ${selezionata ? 'var(--color-accent)' : 'var(--color-border)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <input type="checkbox" checked={selezionata} readOnly
                      style={{ marginTop: '2px', accentColor: 'var(--color-accent)', cursor: 'pointer' }} />
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{agev.nome}</p>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{agev.fonteLegge}</p>
                    </div>
                  </div>
                  {giorni !== null && giorni <= 90 && (
                    <span style={{
                      flexShrink: 0, fontSize: '10px', padding: '2px 8px', borderRadius: '4px',
                      background: 'var(--color-red-dim)', color: 'var(--color-red)',
                      border: '1px solid var(--color-red)', fontFamily: "'DM Mono', monospace",
                      whiteSpace: 'nowrap',
                    }}>
                      Scade {giorni}gg
                    </span>
                  )}
                  {agev.scadenza === null && (
                    <span style={{
                      flexShrink: 0, fontSize: '10px', padding: '2px 8px', borderRadius: '4px',
                      background: 'transparent', color: 'var(--color-text-muted)',
                      border: '1px solid var(--color-border)',
                    }}>
                      Nessuna scadenza
                    </span>
                  )}
                </div>
                {conflitto && selezionata && (
                  <p style={{
                    marginTop: '8px', fontSize: '11px', padding: '6px 10px', borderRadius: '4px',
                    background: 'var(--color-amber-dim)', color: 'var(--color-amber)',
                    border: '1px solid var(--color-amber)',
                  }}>
                    ⚠ {conflitto} — il motore applicherà solo quella più vantaggiosa
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {/* Nota informativa agevolazioni */}
        <p style={{
          marginTop: '10px', fontSize: '11px', color: 'var(--color-text-muted)',
          lineHeight: '1.6', fontStyle: 'italic',
          padding: '8px 10px', borderRadius: '4px',
          background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
        }}>
          L&apos;applicazione delle agevolazioni dipende da requisiti soggettivi, oggettivi aziendali e del lavoratore, nonché dalla disponibilità dei fondi al momento della pratica.
        </p>
      </div>
      )}

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
