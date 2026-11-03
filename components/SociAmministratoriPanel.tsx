'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { VeicoloAci } from '@/lib/aci';
import {
  defaultStateSoci,
  type SociResult,
  type SociState,
} from '@/lib/societari';
import { RisultatiSoci } from '@/components/RisultatiSoci';
import { useReportLead } from '@/components/LeadFunnel';
import { AccessoLeadRichiesto, CalcoloAnnullato, leggiRispostaSimulazione } from '@/lib/lead-session';

const BANNER_ACI =
  'Tariffa = colonna Costo km 15.000 km, tabelle ACI 2026, GU 297/2025 SO 40. Non è il fringe benefit.';

const NOTA_OVERRIDE =
  'modello non in tabella ACI 2026 — inserire il costo km dalla GU';

const eurKm = (n: number) =>
  `${new Intl.NumberFormat('it-IT', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(n)} €/km`;

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '13px',
  marginBottom: '6px',
  color: 'var(--color-text-secondary)',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  fontFamily: "var(--font-mono), monospace",
};

function NumInput({
  value, onChange, step = '0.01', readOnly = false,
}: { value: number; onChange?: (n: number) => void; step?: string; readOnly?: boolean }) {
  return (
    <input
      type="number"
      min={0}
      step={step}
      readOnly={readOnly}
      value={Number.isFinite(value) ? value : 0}
      onChange={e => onChange?.(Number(e.target.value))}
      style={{
        ...inputStyle,
        background: readOnly ? 'var(--color-bg-elevated)' : undefined,
      }}
    />
  );
}

function sezioneVeicolo(v: VeicoloAci): string {
  const stato = v.inProduzione ? 'in produzione' : 'fuori produzione';
  return `${v.alimentazione} · ${stato}`;
}

export function SociAmministratoriPanel() {
  const { eseguiReport } = useReportLead();
  const [stato, setStato] = useState<SociState>(defaultStateSoci);
  const [query, setQuery] = useState('');
  const [visibili, setVisibili] = useState<VeicoloAci[]>([]);
  const [troncato, setTroncato] = useState(false);
  const [aperto, setAperto] = useState(false);
  const [veicolo, setVeicolo] = useState<VeicoloAci | null>(null);
  const [overrideManuale, setOverrideManuale] = useState(false);
  const [risultato, setRisultato] = useState<SociResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof SociState>(k: K, v: SociState[K]) =>
    setStato(s => ({ ...s, [k]: v }));

  useEffect(() => {
    if (overrideManuale || query.trim().length < 2) {
      setVisibili([]);
      setTroncato(false);
      return;
    }
    const ctrl = new AbortController();
    let attivo = true;
    const q = query.trim();
    void fetch(`/api/aci?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then((data: { veicoli?: VeicoloAci[]; troncato?: boolean }) => {
        if (!attivo) return;
        setVisibili(data.veicoli ?? []);
        setTroncato(Boolean(data.troncato));
      })
      .catch(e => {
        if (!attivo) return;
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setVisibili([]);
        setTroncato(false);
      });
    return () => {
      attivo = false;
      ctrl.abort();
    };
  }, [query, overrideManuale]);

  useEffect(() => {
    const chiudi = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setAperto(false);
    };
    document.addEventListener('mousedown', chiudi);
    return () => document.removeEventListener('mousedown', chiudi);
  }, []);

  const conCompenso = stato.modalita === 'con_compenso';

  const generaReport = () => {
    const payload = { ...stato };
    void eseguiReport('soci', async () => {
      setLoading(true);
      setErrore(null);
      try {
        const res = await fetch('/api/societari', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await leggiRispostaSimulazione<SociResult>(res);
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

  const pair = (a: ReactNode, b: ReactNode) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>{a}{b}</div>
  );

  const scegli = (v: VeicoloAci) => {
    setVeicolo(v);
    setOverrideManuale(false);
    set('costoKm', v.costoKm);
    setQuery(`${v.marca} ${v.modello}`);
    setAperto(false);
  };

  return (
    <div className="soci-layout" style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(340px, 420px) 1fr',
      gap: '24px',
      alignItems: 'start',
    }}>
      <div className="calcolatore-panel" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <h2 style={{
            fontFamily: "var(--font-display), sans-serif", fontWeight: 700, fontSize: '20px',
            color: 'var(--color-text-primary)', marginBottom: '8px',
          }}>
            Soci e Amministratori
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.55 }}>
            Compenso annuo in Gestione separata, oppure solo trasferte e rimborso km.
            Il contributo si ripartisce per due terzi sulla società e un terzo sul percipiente.
            Addizionali regionali e comunali come media, uguale al motore dipendenti.
          </p>
        </div>

        <div style={{
          display: 'inline-flex',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          overflow: 'hidden',
          alignSelf: 'flex-start',
        }}>
          {([
            ['con_compenso', 'Con compenso'],
            ['senza_compenso', 'Senza compenso'],
          ] as const).map(([value, label]) => {
            const attivo = stato.modalita === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => set('modalita', value)}
                style={{
                  appearance: 'none', border: 'none', cursor: 'pointer',
                  padding: '8px 14px', fontSize: '13px',
                  fontFamily: "var(--font-sans), sans-serif",
                  background: attivo ? 'var(--color-accent)' : 'transparent',
                  color: attivo ? 'white' : 'var(--color-text-muted)',
                  fontWeight: attivo ? 600 : 500,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {conCompenso && (
          <>
            <div>
              <label style={labelStyle}>Importo lordo compenso lavoro (annuo €)</label>
              <NumInput value={stato.lordoAnnuo} onChange={n => set('lordoAnnuo', n)} step="1" />
            </div>

            <div>
              <p style={{ ...labelStyle, marginBottom: '8px' }}>Gestione separata</p>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                <input
                  type="checkbox"
                  checked={stato.haAltraCoperturaInps}
                  onChange={e => set('haAltraCoperturaInps', e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                Iscritto ad altra gestione obbligatoria o pensionato (aliquota 24%)
              </label>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.55, marginTop: '8px' }}>
                Aliquota applicata: <strong>{stato.haAltraCoperturaInps ? '24%' : '35,03%'}</strong>
                {' '}— Circ. INPS 8/2026. Senza la spunta resta l&apos;aliquota intera.
                Riparto 2/3 società e 1/3 percipiente.
              </p>
            </div>
          </>
        )}

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
          <p style={{
            fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)',
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '14px',
          }}>
            Trasferte
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Nazionale</p>
          {pair(
            <div>
              <label style={labelStyle}>Giorni</label>
              <NumInput value={stato.giorniTrasfertaNazionale} onChange={n => set('giorniTrasfertaNazionale', n)} step="1" />
            </div>,
            <div>
              <label style={labelStyle}>€ / giorno</label>
              <NumInput
                value={stato.importoTrasfertaNazionale}
                onChange={n => set('importoTrasfertaNazionale', n)}
              />
            </div>,
          )}
          <div style={{ height: '12px' }} />
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Estera</p>
          {pair(
            <div>
              <label style={labelStyle}>Giorni</label>
              <NumInput value={stato.giorniTrasfertaEstera} onChange={n => set('giorniTrasfertaEstera', n)} step="1" />
            </div>,
            <div>
              <label style={labelStyle}>€ / giorno</label>
              <NumInput
                value={stato.importoTrasfertaEstera}
                onChange={n => set('importoTrasfertaEstera', n)}
              />
            </div>,
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
          <p style={{
            fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)',
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '14px',
          }}>
            Rimborso chilometrico
          </p>
          <div style={{
            background: 'var(--color-amber-dim)',
            border: '1px solid var(--color-amber)',
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.5,
            marginBottom: '12px',
          }}>
            {BANNER_ACI}
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
            <input
              type="checkbox"
              checked={overrideManuale}
              onChange={e => {
                const on = e.target.checked;
                setOverrideManuale(on);
                setAperto(false);
                if (on) {
                  setVeicolo(null);
                  setQuery('');
                  set('costoKm', 0);
                } else if (veicolo) {
                  set('costoKm', veicolo.costoKm);
                } else {
                  set('costoKm', 0);
                }
              }}
            />
            Il modello non è in tabella ACI 2026
          </label>

          {overrideManuale ? (
            <div>
              <label style={labelStyle}>€ / km (dalla Gazzetta Ufficiale)</label>
              <NumInput value={stato.costoKm} onChange={n => set('costoKm', n)} step="0.0001" />
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px', lineHeight: 1.45 }}>
                {NOTA_OVERRIDE}
              </p>
            </div>
          ) : (
            <div ref={boxRef} style={{ position: 'relative' }}>
              <label style={labelStyle} htmlFor="aci-cerca">Marca e modello</label>
              <input
                id="aci-cerca"
                role="combobox"
                aria-expanded={aperto}
                aria-controls="aci-lista"
                aria-autocomplete="list"
                autoComplete="off"
                placeholder="Cerca, es. panda o golf 1.5"
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setAperto(true);
                  if (veicolo && e.target.value !== `${veicolo.marca} ${veicolo.modello}`) {
                    setVeicolo(null);
                    set('costoKm', 0);
                  }
                }}
                onFocus={() => setAperto(true)}
                style={inputStyle}
              />
              {aperto && query.trim().length >= 2 && (
                <ul
                  id="aci-lista"
                  role="listbox"
                  style={{
                    position: 'absolute',
                    zIndex: 5,
                    left: 0,
                    right: 0,
                    top: '100%',
                    margin: '4px 0 0',
                    padding: '4px',
                    listStyle: 'none',
                    maxHeight: '280px',
                    overflowY: 'auto',
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  }}
                >
                  {visibili.length === 0 && (
                    <li style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      Nessun modello. Usa l&apos;inserimento manuale del costo km.
                    </li>
                  )}
                  {visibili.map(v => (
                    <li key={`${v.idModello}-${v.alimentazione}-${v.inProduzione}`}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={veicolo?.idModello === v.idModello && veicolo.alimentazione === v.alimentazione && veicolo.inProduzione === v.inProduzione}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => scegli(v)}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        <span style={{ fontSize: '13px' }}>{v.marca} {v.modello}</span>
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {sezioneVeicolo(v)} · {eurKm(v.costoKm)}
                        </span>
                      </button>
                    </li>
                  ))}
                  {troncato && (
                    <li style={{ padding: '8px 10px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      Mostrati i primi 40. Affina la ricerca.
                    </li>
                  )}
                </ul>
              )}
              {veicolo && (
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px', lineHeight: 1.45 }}>
                  {veicolo.marca} {veicolo.modello}
                  <br />
                  <span style={{ color: 'var(--color-text-muted)' }}>{sezioneVeicolo(veicolo)}</span>
                </p>
              )}
            </div>
          )}

          <div style={{ height: '12px' }} />
          {overrideManuale ? (
            <div>
              <label style={labelStyle}>Km nel periodo</label>
              <NumInput value={stato.km} onChange={n => set('km', n)} step="1" />
            </div>
          ) : pair(
            <div>
              <label style={labelStyle}>Km nel periodo</label>
              <NumInput value={stato.km} onChange={n => set('km', n)} step="1" />
            </div>,
            <div>
              <label style={labelStyle}>€ / km ACI</label>
              <NumInput value={veicolo?.costoKm ?? 0} step="0.0001" readOnly />
            </div>,
          )}
        </div>

        <button
          type="button"
          onClick={generaReport}
          disabled={loading}
          style={{
            marginTop: '8px',
            padding: '14px',
            border: 'none',
            borderRadius: '10px',
            cursor: loading ? 'wait' : 'pointer',
            background: 'var(--color-accent)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '14px',
            fontFamily: "var(--font-sans), sans-serif",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Generazione report…' : 'Genera report'}
        </button>
        {errore && (
          <p style={{ fontSize: '13px', color: 'var(--color-red)', margin: 0 }}>{errore}</p>
        )}
      </div>

      <div>
        {!risultato && !loading && (
          <div className="calcolatore-panel" style={{ textAlign: 'center', padding: '48px 32px' }}>
            <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              Il report apparirà qui
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              Compila i dati e premi <strong>Genera report</strong> per il prospetto completo.
            </p>
          </div>
        )}
        {loading && (
          <div className="calcolatore-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="skeleton" style={{ height: '72px' }} />
            <div className="skeleton" style={{ height: '240px' }} />
          </div>
        )}
        {risultato && !loading && (
          <RisultatiSoci
            out={risultato}
            stato={stato}
            onRicalcola={() => { setRisultato(null); setErrore(null); }}
          />
        )}
      </div>
    </div>
  );
}
