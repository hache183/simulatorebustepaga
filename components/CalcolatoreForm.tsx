'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import type { LivelloCcnl, ContributoContrattuale } from '@/types';

const CCNL_DISPONIBILI = [
  { id: 'commercio',                  nome: 'Commercio — Terziario Distribuzione e Servizi (Confcommercio)' },
  { id: 'metalmeccanici',             nome: 'Metalmeccanici — Industria (Federmeccanica-Assistal)' },
  { id: 'edilizia',                   nome: 'Edilizia — Industria (ANCE)' },
  { id: 'sanita_privata',             nome: 'Sanità Privata (Aiop-Aris)' },
  { id: 'studi_professionali',        nome: 'Studi Professionali (Confprofessioni)' },
  { id: 'cooperative_sociali',        nome: 'Cooperative Sociali (Legacoop-Agci-Confcooperative)' },
  { id: 'trasporti',                  nome: 'Trasporto Merci e Logistica (Conftrasporto)' },
  { id: 'pubblici_esercizi',          nome: 'Pubblici Esercizi, Ristorazione e Turismo (FIPE)' },
  { id: 'chimica',                    nome: 'Chimica-Farmaceutica e Plastica (Federchimica)' },
  { id: 'credito',                    nome: 'Credito — Banche (ABI)' },
  { id: 'multiservizi',               nome: 'Multiservizi — Pulizie e Facility (Ancst)' },
  { id: 'telecomunicazioni',          nome: 'Telecomunicazioni (Asstel)' },
  { id: 'tessile',                    nome: 'Tessile-Abbigliamento-Moda (SMI)' },
  { id: 'informatica',                nome: 'Informatica e Servizi Innovativi (Assinform)' },
  { id: 'agricoltura',                nome: 'Agricoltura — Operai Agricoli (Confagricoltura)' },
  { id: 'scuole_private',             nome: 'Scuole e Istituti Privati (Agidae-FISM)' },
  { id: 'lavoro_domestico',           nome: 'Lavoro Domestico — Colf, Badanti, Baby-sitter (FIDALDO/DOMINA)' },
  { id: 'alimentari',                 nome: 'Alimentari — Industria (Federalimentare)' },
  { id: 'turismo',                    nome: 'Turismo — Alberghi e Strutture Ricettive (Federalberghi)' },
  { id: 'assicurazioni',              nome: 'Assicurazioni (ANIA)' },
  { id: 'gomma_plastica',             nome: 'Gomma-Plastica (Federazione Gomma Plastica)' },
  { id: 'vigilanza_privata',          nome: 'Vigilanza Privata e Servizi Fiduciari (Assiv)' },
  { id: 'legno_arredamento',          nome: 'Legno, Arredamento e Mobili (FederlegnoArredo)' },
  { id: 'grafica_editoria',           nome: 'Grafica, Editoria e Cartaria (Assografici)' },
  { id: 'metalmeccanici_artigianato', nome: 'Metalmeccanici — Artigianato (Confartigianato/CNA)' },
  { id: 'commercio_confesercenti',    nome: 'Commercio — Confesercenti' },
  { id: 'condomini',                  nome: 'Condomini — Proprietari di Fabbricati (Confedilizia)' },
  { id: 'autorimesse',                nome: 'Autorimesse e Noleggio (ANIASA)' },
];

const TIPI_CONTRATTO = [
  { value: 'tempo_indeterminato', label: 'Tempo indeterminato' },
  { value: 'tempo_determinato',   label: 'Tempo determinato' },
  { value: 'apprendistato',       label: 'Apprendistato' },
  { value: 'somministrazione',    label: 'Somministrazione' },
] as const;

const fmtEur = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const Step1Schema = z.object({
  ccnlId: z.string().min(1, 'Seleziona un CCNL'),
  livello: z.string().min(1, 'Seleziona il livello contrattuale'),
  ral: z.number().min(0, 'Minimo 0 €').max(500_000, 'Massimo 500.000 €'),
  tipoContratto: z.enum(['tempo_indeterminato', 'tempo_determinato', 'apprendistato', 'somministrazione']),
  oreLavoro: z.number().min(1).max(48),
  mensilita: z.number()
    .int('Le mensilità devono essere un numero intero')
    .min(13, 'Minimo 13 — la tredicesima è obbligatoria per legge (R.D.L. 1525/1937)')
    .max(16, 'Massimo 16 — oltre non esiste nel diritto del lavoro italiano'),
  retribuzionePersonalizzata: z.number().min(0).max(500_000).optional(),
  // Campi lavoro domestico
  pagaOraria: z.number().min(0).max(100).optional(),
  oreSettimanali: z.number().min(1).max(54).optional(),
  convivente: z.boolean().optional(),
});

type Step1Data = z.infer<typeof Step1Schema>;

interface Props {
  onNext: (data: Step1Data) => void;
}

export function CalcolatoreFormStep1({ onNext }: Props) {
  const [livelli, setLivelli] = useState<LivelloCcnl[]>([]);
  const [loadingLivelli, setLoadingLivelli] = useState(false);
  const [ccnlMensilita, setCcnlMensilita] = useState<number>(13);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_contributiCcnl, setContributiCcnl] = useState<Record<string, ContributoContrattuale>>({});
  const [retribPersonalizzataAttiva, setRetribPersonalizzataAttiva] = useState(false);
  const [isDomestico, setIsDomestico] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(Step1Schema),
    defaultValues: { oreLavoro: 40, tipoContratto: 'tempo_indeterminato', mensilita: 13, convivente: false, oreSettimanali: 25 },
  });

  const ccnlSelezionato = watch('ccnlId');
  const oreLavoro = watch('oreLavoro');
  const livelloSelezionato = watch('livello');
  const ralWatch = watch('ral');
  const convivente = watch('convivente');

  const livelloData = livelli.find(l => l.codice === livelloSelezionato);
  const ralTabellare = livelloData ? livelloData.minimoTabellare * ccnlMensilita : 0;

  useEffect(() => {
    if (!ccnlSelezionato) return;
    const domestico = ccnlSelezionato === 'lavoro_domestico';
    setIsDomestico(domestico);
    setLoadingLivelli(true);
    fetch(`/api/ccnl/${ccnlSelezionato}/livelli`)
      .then(r => r.json())
      .then(d => {
        const data = d as { livelli?: LivelloCcnl[]; mensilita?: number; contributiContrattuali?: { azienda: Record<string, ContributoContrattuale> } };
        setLivelli(data.livelli ?? []);
        if (data.mensilita) setValue('mensilita', data.mensilita);
        if (data.mensilita) setCcnlMensilita(data.mensilita);
        if (data.contributiContrattuali?.azienda) setContributiCcnl(data.contributiContrattuali.azienda);
        // Reset livello selection when CCNL changes
        setValue('livello', '');
        setRetribPersonalizzataAttiva(false);
        // Per lavoro domestico, pre-imposta paga oraria e ore
        if (domestico) {
          setValue('oreSettimanali', 25);
          setValue('convivente', false);
        }
      })
      .catch(() => setLivelli([]))
      .finally(() => setLoadingLivelli(false));
  }, [ccnlSelezionato]);

  // Precompile RAL when livello changes and retrib personalizzata is off
  useEffect(() => {
    if (!livelloData || retribPersonalizzataAttiva) return;
    if (isDomestico) {
      // Per lavoro domestico: imposta pagaOraria dal minimo del livello
      setValue('pagaOraria', livelloData.minimoTabellare);
      const oreS = watch('oreSettimanali') ?? 25;
      setValue('ral', Math.round(livelloData.minimoTabellare * oreS * 52 * 100) / 100);
    } else {
      setValue('ral', Math.round(livelloData.minimoTabellare * ccnlMensilita * 100) / 100);
    }
    setValue('retribuzionePersonalizzata', undefined);
  }, [livelloSelezionato, retribPersonalizzataAttiva, ccnlMensilita, isDomestico]);

  const warningRalInferiore = !isDomestico && retribPersonalizzataAttiva && livelloData && ralWatch && ralWatch < ralTabellare;

  return (
    <form onSubmit={handleSubmit((data) => {
      if (isDomestico) {
        // Per lavoro domestico, calcola la RAL dalla paga oraria
        const po = data.pagaOraria ?? livelloData?.minimoTabellare ?? 0;
        const os = data.oreSettimanali ?? 25;
        data.ral = po * os * 52;
        data.pagaOraria = po;
        data.oreSettimanali = os;
      } else if (retribPersonalizzataAttiva) {
        data.retribuzionePersonalizzata = data.ral;
      }
      onNext(data);
    })} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

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
          {livelli.map(l => {
            if (isDomestico) {
              return (
                <option key={l.codice} value={l.codice}>
                  Liv. {l.codice} — {l.qualifica} — Min. {fmtEur(l.minimoTabellare)}/ora
                </option>
              );
            }
            const ralAnnua = l.minimoTabellare * ccnlMensilita;
            return (
              <option key={l.codice} value={l.codice}>
                Liv. {l.codice} — {l.qualifica} — Min. tab. {fmtEur(l.minimoTabellare)}/mese (RAL {fmtEur(ralAnnua)})
              </option>
            );
          })}
        </select>
        {errors.livello && <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-red)' }}>{errors.livello.message}</p>}

        {/* Riquadro informativo livello selezionato */}
        {livelloData && (
          <div style={{
            marginTop: '10px', padding: '12px', borderRadius: '6px',
            background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
          }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              Liv. {livelloData.codice} — {livelloData.qualifica}
            </p>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: "'DM Mono', monospace" }}>
              {isDomestico ? (
                <span>Min. {fmtEur(livelloData.minimoTabellare)}/ora</span>
              ) : (
                <>
                  <span>Min. tab. {fmtEur(livelloData.minimoTabellare)}/mese</span>
                  <span>RAL tab. {fmtEur(ralTabellare)}/anno</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── CAMPI SPECIFICI LAVORO DOMESTICO ──────────────────────── */}
      {isDomestico && livelloData && (
        <>
          {/* Paga oraria */}
          <div>
            <label htmlFor="pagaOraria" style={{ display: 'block', fontSize: '13px', fontWeight: 500,
              color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
              Paga oraria lorda
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                fontFamily: "'DM Mono', monospace", fontSize: '13px', color: 'var(--color-text-muted)',
              }}>€</span>
              <input id="pagaOraria" type="number" step="0.01" placeholder={String(livelloData.minimoTabellare)}
                {...register('pagaOraria', { valueAsNumber: true })}
                style={{
                  width: '100%', padding: '11px 14px 11px 28px',
                  background: 'var(--color-bg-input)', color: 'var(--color-text-primary)',
                  border: `1px solid var(--color-border)`, borderRadius: '6px', fontSize: '13px',
                  fontFamily: "'DM Mono', monospace",
                }}
              />
            </div>
          </div>

          {/* Ore settimanali domestico */}
          <div>
            <label htmlFor="oreSettimanali" style={{ display: 'block', fontSize: '13px', fontWeight: 500,
              color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
              Ore settimanali
            </label>
            <input id="oreSettimanali" type="number" step="1" min="1" max="54"
              {...register('oreSettimanali', { valueAsNumber: true })}
              style={{
                width: '100%', padding: '11px 14px',
                background: 'var(--color-bg-input)', color: 'var(--color-text-primary)',
                border: `1px solid var(--color-border)`, borderRadius: '6px', fontSize: '13px',
                fontFamily: "'DM Mono', monospace",
              }}
            />
            <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Oltre 24 ore/sett. il lavoratore è considerato convivente con tabella contributiva ridotta.
            </p>
          </div>

          {/* Convivente toggle */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button type="button"
                onClick={() => setValue('convivente', !convivente)}
                style={{
                  width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer',
                  background: convivente ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                  position: 'relative', transition: 'background 0.2s ease',
                  outline: `1px solid ${convivente ? 'var(--color-accent)' : 'var(--color-border)'}`,
                }}>
                <div style={{
                  width: '16px', height: '16px', borderRadius: '50%', background: 'white',
                  position: 'absolute', top: '3px',
                  left: convivente ? '21px' : '3px',
                  transition: 'left 0.2s ease',
                }} />
              </button>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                onClick={() => setValue('convivente', !convivente)}>
                Lavoratore convivente (vitto e alloggio)
              </label>
            </div>
            {convivente && (
              <p style={{ marginTop: '6px', fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                Verrà aggiunta l&apos;indennità di vitto e alloggio (~€ 189,30/mese — 2025).
              </p>
            )}
          </div>
        </>
      )}

      {/* Toggle retribuzione personalizzata (MOD4) */}
      {livelloData && !isDomestico && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <button type="button"
              onClick={() => {
                const newVal = !retribPersonalizzataAttiva;
                setRetribPersonalizzataAttiva(newVal);
                if (!newVal) {
                  setValue('ral', Math.round(ralTabellare * 100) / 100);
                  setValue('retribuzionePersonalizzata', undefined);
                }
              }}
              style={{
                width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer',
                background: retribPersonalizzataAttiva ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                position: 'relative', transition: 'background 0.2s ease',
                outline: `1px solid ${retribPersonalizzataAttiva ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}>
              <div style={{
                width: '16px', height: '16px', borderRadius: '50%', background: 'white',
                position: 'absolute', top: '3px',
                left: retribPersonalizzataAttiva ? '21px' : '3px',
                transition: 'left 0.2s ease',
              }} />
            </button>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)', cursor: 'pointer' }}
              onClick={() => {
                const newVal = !retribPersonalizzataAttiva;
                setRetribPersonalizzataAttiva(newVal);
                if (!newVal) {
                  setValue('ral', Math.round(ralTabellare * 100) / 100);
                  setValue('retribuzionePersonalizzata', undefined);
                }
              }}>
              Retribuzione diversa dal minimo tabellare
            </label>
          </div>
          {retribPersonalizzataAttiva && (
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px', lineHeight: '1.5' }}>
              Inserisci la RAL annua lorda concordata tra le parti (superminimo individuale, ad personam o collettivo).
              Deve essere ≥ al minimo tabellare del livello selezionato.
            </p>
          )}
        </div>
      )}

      {/* RAL — nascosto per lavoro domestico (calcolata automaticamente da paga oraria) */}
      {!isDomestico && (
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
          <input id="ral" type="number" step="any" placeholder="28.000"
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

        {/* Warning RAL inferiore al minimo (MOD4) */}
        {warningRalInferiore && (
          <p style={{
            marginTop: '8px', fontSize: '11px', padding: '8px 10px', borderRadius: '4px',
            background: 'var(--color-amber-dim)', color: 'var(--color-amber)', border: '1px solid var(--color-amber)',
            lineHeight: '1.5',
          }}>
            ⚠ La RAL inserita ({fmtEur(ralWatch)}) è inferiore al minimo tabellare CCNL per questo livello ({fmtEur(ralTabellare)}).
            Verifica con il consulente del lavoro.
          </p>
        )}

        {/* Superminimo info (MOD4) */}
        {retribPersonalizzataAttiva && livelloData && ralWatch > ralTabellare && (
          <p style={{
            marginTop: '8px', fontSize: '11px', padding: '8px 10px', borderRadius: '4px',
            background: 'var(--color-green-dim)', color: 'var(--color-green)', border: '1px solid var(--color-green)',
            fontFamily: "'DM Mono', monospace",
          }}>
            Superminimo: {fmtEur((ralWatch - ralTabellare) / 12)}/mese ({fmtEur(ralWatch - ralTabellare)}/anno)
          </p>
        )}
      </div>
      )}

      {/* Tipo contratto — per domestico mostra solo tempo indeterminato e determinato */}
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

      {/* Ore di lavoro — nascosto per lavoro domestico (usa campo dedicato) */}
      {!isDomestico && (
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
      )}

      {/* Mensilità — nascosto per lavoro domestico (sempre 13) */}
      {!isDomestico && (
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
        {ccnlSelezionato && (
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '8px',
            fontFamily: "'DM Mono', monospace" }}>
            Il CCNL selezionato prevede <strong style={{ color: 'var(--color-text-secondary)' }}>{ccnlMensilita}</strong> mensilità
          </p>
        )}
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
          const diffFromCcnl = ccnlSelezionato && val !== ccnlMensilita;
          return (
            <>
              {diffFromCcnl && (
                <p style={{ marginTop: '8px', fontSize: '11px', padding: '8px 10px', borderRadius: '4px',
                  background: 'var(--color-amber-dim)', color: 'var(--color-amber)', border: '1px solid var(--color-amber)',
                  lineHeight: '1.5' }}>
                  ⚠ Stai usando un numero di mensilità diverso da quello previsto dal CCNL (default: {ccnlMensilita})
                </p>
              )}
              {val === 14 && ccnlMensilita === 14 && (
                <p style={{ marginTop: '8px', fontSize: '11px', padding: '8px 10px', borderRadius: '4px',
                  background: 'var(--color-green-dim)', color: 'var(--color-green)', border: '1px solid var(--color-green)' }}>
                  ✓ La quattordicesima è prevista da questo CCNL.
                </p>
              )}
              {val >= 15 && (
                <p style={{ marginTop: '8px', fontSize: '11px', padding: '8px 10px', borderRadius: '4px',
                  background: 'var(--color-amber-dim)', color: 'var(--color-amber)', border: '1px solid var(--color-amber)' }}>
                  ⚠ {val} mensilità ammesse solo tramite contrattazione di secondo livello (art. 2077 c.c.).
                </p>
              )}
            </>
          );
        })()}
        {errors.mensilita && <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-red)' }}>{errors.mensilita.message}</p>}
      </div>
      )}

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
