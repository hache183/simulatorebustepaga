'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { RisultatiCalcolatore } from '@/components/RisultatiCalcolatore';
import { useReportLead } from '@/components/LeadFunnel';
import { AccessoLeadRichiesto, CalcoloAnnullato, leggiRispostaSimulazione } from '@/lib/lead-session';
import type { CalcolatoreOutput } from '@/types';

export interface LivelloEdileUi {
  codice: string;
  minimoTabellare: number;
  descrizione?: string;
  qualifica?: string;
}

interface VoceInail { codice: string; settore: string; tassoPerMille: number; }

const CCNL_EDILI = [
  { id: 'edilizia_industria', nome: 'Edilizia — Industria' },
  { id: 'edilizia_artigianato', nome: 'Edilizia — Artigianato' },
] as const;

const round2 = (n: number) => Math.round(n * 100) / 100;
const eur = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: 'var(--color-bg-input)',
  color: 'var(--color-text-primary)',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  fontSize: '15px',
  fontFamily: "var(--font-sans), sans-serif",
};

function filtraVociInail36(voci: VoceInail[]): VoceInail[] {
  return voci.filter(v => v.codice.startsWith('36'));
}

export function EdiliPanel({
  livelliPerCcnl,
}: {
  livelliPerCcnl: Record<string, LivelloEdileUi[]>;
}) {
  const { eseguiReport } = useReportLead();
  const [ccnlId, setCcnlId] = useState<string>('edilizia_industria');
  const [vociInail, setVociInail] = useState<VoceInail[]>([]);
  const [livello, setLivello] = useState('1');
  const [ore, setOre] = useState(40);
  const [codiceInail, setCodiceInail] = useState('');
  const [ralConcordata, setRalConcordata] = useState<number | ''>('');
  const [risultato, setRisultato] = useState<CalcolatoreOutput | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/inail/voci')
      .then(r => r.json())
      .then(d => {
        const tutte = (d as { voci: VoceInail[] }).voci ?? [];
        const edili = filtraVociInail36(tutte);
        setVociInail(edili);
        if (edili.length > 0) setCodiceInail(prev => prev || edili[0].codice);
      })
      .catch(() => {});
  }, []);

  const livelliOperaio = livelliPerCcnl[ccnlId] ?? [];

  useEffect(() => {
    if (!livelliOperaio.some(l => l.codice === livello)) {
      setLivello(livelliOperaio[0]?.codice ?? '1');
    }
  }, [ccnlId, livello, livelliOperaio]);

  const minimoAnnuo = useMemo(() => {
    const liv = livelliOperaio.find(l => l.codice === livello);
    return liv ? round2(liv.minimoTabellare * 12) : 0;
  }, [livelliOperaio, livello]);

  const calcola = () => {
    const payload = {
      ccnlId,
      livello,
      ral: Math.max(1, minimoAnnuo),
      tipoContratto: 'tempo_indeterminato' as const,
      oreLavoro: ore,
      oreSettimanali: ore,
      mensilita: 12,
      anzianitaAnni: 0,
      numeroDipendenti: 1,
      regione: 'Puglia',
      codiceInail,
      agevolazioniSelezionate: [] as string[],
      includiAssistenzaSanitaria: false,
      aliquotaInps: 0.3508,
      retribuzionePersonalizzata: ralConcordata === '' ? undefined : Number(ralConcordata),
    };
    void eseguiReport('edili', async () => {
      setLoading(true);
      setErrore(null);
      try {
        const res = await fetch('/api/calcola', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await leggiRispostaSimulazione<CalcolatoreOutput>(res);
        setRisultato(json);
      } catch (e) {
        if (e instanceof AccessoLeadRichiesto) throw e;
        setErrore(e instanceof Error ? e.message : 'Errore sconosciuto');
        setRisultato(null);
      } finally {
        setLoading(false);
      }
    }).catch(e => {
      if (e instanceof AccessoLeadRichiesto || e instanceof CalcoloAnnullato) return;
      setErrore(e instanceof Error ? e.message : 'Errore sconosciuto');
      setLoading(false);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="modulo-layout" style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 460px) minmax(0, 1fr)',
        gap: '32px',
        alignItems: 'start',
      }}>
        <div style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}>
          <h2 style={{
            fontFamily: "var(--font-display), Georgia, serif",
            fontSize: '28px',
            fontWeight: 500,
            lineHeight: 1.15,
            margin: 0,
          }}>
            Dipendenti edili
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
            Operai edili (Industria o Artigianato). Imponibile A+B+C+D+E su 12 mensilità; INPS datore 35,08%; Cassa Edile.
          </p>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
            Nota: l&apos;aliquota della Cassa Edile è indicativa e potrà subire variazioni in base alla cassa edile provinciale di appartenenza.
          </p>

          <label style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            CCNL
            <select
              value={ccnlId}
              onChange={e => { setCcnlId(e.target.value); setRisultato(null); }}
              style={{ ...inputStyle, marginTop: '6px' }}
            >
              {CCNL_EDILI.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            Livello (solo operaio)
            <select
              value={livello}
              onChange={e => { setLivello(e.target.value); setRisultato(null); }}
              style={{ ...inputStyle, marginTop: '6px' }}
            >
              {livelliOperaio.map(l => (
                <option key={l.codice} value={l.codice}>
                  {l.codice} — {eur(l.minimoTabellare)}/mese (×12 = {eur(l.minimoTabellare * 12)})
                </option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            Ore settimanali
            <input
              type="number"
              min={1}
              max={40}
              value={ore}
              onChange={e => setOre(Number(e.target.value))}
              style={{ ...inputStyle, marginTop: '6px' }}
            />
          </label>

          <label style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            RAL annua concordata (opzionale, solo se supera il minimo tabellare × 12)
            <input
              type="number"
              min={0}
              placeholder={String(minimoAnnuo)}
              value={ralConcordata}
              onChange={e => setRalConcordata(e.target.value === '' ? '' : Number(e.target.value))}
              style={{ ...inputStyle, marginTop: '6px' }}
            />
          </label>

          <label style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            Categoria INAIL (voce 36xx)
            <select
              value={codiceInail}
              onChange={e => setCodiceInail(e.target.value)}
              style={{ ...inputStyle, marginTop: '6px' }}
            >
              {vociInail.length === 0 && <option value="">— nessuna voce 36xx —</option>}
              {vociInail.map(v => (
                <option key={v.codice} value={v.codice}>
                  {v.codice} — {v.settore} ({v.tassoPerMille}‰)
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={calcola}
            disabled={loading || !codiceInail}
            className="ui-btn ui-btn--primary"
            style={{
              marginTop: '8px',
              padding: '12px 20px',
              cursor: loading ? 'wait' : undefined,
            }}
          >
            {loading ? 'Calcolo in corso…' : 'Calcola il costo'}
          </button>

          {errore && (
            <p style={{ color: 'var(--color-red)', fontSize: '15px', margin: 0 }}>{errore}</p>
          )}
        </div>

        <div>
          {!risultato && !loading && (
            <div style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-card)',
              padding: '48px 32px',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '15px', color: 'var(--color-text-muted)' }}>
                Compila i dati e premi <strong>Calcola il costo</strong> per il prospetto A–E, Cassa Edile e netto.
              </p>
            </div>
          )}
          {risultato && (
            <RisultatiCalcolatore risultato={risultato} onRicalcola={() => setRisultato(null)} />
          )}
        </div>
      </div>
    </div>
  );
}
