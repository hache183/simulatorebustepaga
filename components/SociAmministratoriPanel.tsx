'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cercaVeicoli, type CatalogoAci, type VeicoloAci } from '@/lib/aci';
import {
  calcolaSoci,
  defaultStateSoci,
  type SociState,
} from '@/lib/societari';

const BANNER_ACI =
  'Tariffa = colonna Costo km 15.000 km, tabelle ACI 2026, GU 297/2025 SO 40. Non è il fringe benefit.';

const NOTA_OVERRIDE =
  'modello non in tabella ACI 2026 — inserire il costo km dalla GU';

const eur = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);

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
  fontFamily: "'DM Mono', monospace",
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

function Row({ k, v, sub, strong }: { k: string; v: string; sub?: boolean; strong?: boolean }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
      <td style={{
        padding: '8px 0',
        paddingLeft: sub ? '14px' : 0,
        color: strong ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        fontSize: sub ? '12px' : '13px',
        fontWeight: strong ? 600 : 400,
      }}>
        {sub ? `⋯ ${k}` : k}
      </td>
      <td style={{
        padding: '8px 0',
        textAlign: 'right',
        fontFamily: "'DM Mono', monospace",
        fontSize: sub ? '12px' : '13px',
        fontWeight: strong ? 600 : 400,
      }}>
        {v}
      </td>
    </tr>
  );
}

function sezioneVeicolo(v: VeicoloAci): string {
  const stato = v.inProduzione ? 'in produzione' : 'fuori produzione';
  return `${v.alimentazione} · ${stato}`;
}

export function SociAmministratoriPanel() {
  const [stato, setStato] = useState<SociState>(defaultStateSoci);
  const [catalogo, setCatalogo] = useState<VeicoloAci[] | null>(null);
  const [query, setQuery] = useState('');
  const [aperto, setAperto] = useState(false);
  const [veicolo, setVeicolo] = useState<VeicoloAci | null>(null);
  const [overrideManuale, setOverrideManuale] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof SociState>(k: K, v: SociState[K]) =>
    setStato(s => ({ ...s, [k]: v }));

  useEffect(() => {
    let attivo = true;
    void import('@/data/aci-2026.json').then(mod => {
      const data = mod.default as CatalogoAci;
      if (attivo) setCatalogo(data.veicoli);
    });
    return () => { attivo = false; };
  }, []);

  useEffect(() => {
    const chiudi = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setAperto(false);
    };
    document.addEventListener('mousedown', chiudi);
    return () => document.removeEventListener('mousedown', chiudi);
  }, []);

  const out = useMemo(() => calcolaSoci(stato), [stato]);
  const conCompenso = stato.modalita === 'con_compenso';
  const pct = (out.aliquotaInpsApplicata * 100).toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const trovati = useMemo(
    () => (catalogo && !overrideManuale ? cercaVeicoli(catalogo, query, 41) : []),
    [catalogo, query, overrideManuale],
  );
  const visibili = trovati.slice(0, 40);
  const fisc = out.dettaglioFiscale;

  const pair = (a: ReactNode, b: ReactNode) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>{a}{b}</div>
  );

  const boxStyle: CSSProperties = {
    background: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '10px',
    padding: '20px',
  };

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
      <div style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '10px',
        padding: '28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}>
        <div>
          <h2 style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '20px',
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
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
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
                aria-autocomplete="list"
                autoComplete="off"
                placeholder={catalogo ? 'Cerca, es. panda o golf 1.5' : 'Caricamento tabelle ACI…'}
                disabled={!catalogo}
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
              {aperto && catalogo && query.trim().length >= 2 && (
                <ul
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
                  {trovati.length > 40 && (
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
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={boxStyle}>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              Liquido complessivo al socio / amministratore
            </p>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '22px', fontWeight: 500, color: 'var(--color-accent-bright)' }}>
              {eur(out.nettoTotalePercepito)}
            </p>
          </div>
          <div style={boxStyle}>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              Costo totale per il datore di lavoro
            </p>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '22px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {eur(out.costoTotaleDatore)}
            </p>
            <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '6px', lineHeight: 1.4 }}>
              {conCompenso ? 'Include la quota 2/3 Gestione separata' : 'Solo trasferte e rimborso km'}
            </p>
          </div>
        </div>

        <div style={{ ...boxStyle, padding: '24px' }}>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.55, marginBottom: '14px' }}>
            {conCompenso
              ? 'Costo totale datore = compenso lordo annuo + quota contributiva 2/3 a carico della società + trasferte e rimborso km. Trasferte e km sono fuori dalla base Gestione separata e IRPEF.'
              : 'Senza compenso il lordo è zero e non c’è Gestione separata. Restano trasferte e rimborso km, che entrano nel liquido e nel costo datore.'}
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              <Row k="Compenso lordo annuo" v={eur(out.compensoLordo)} />
              {out.ripartoGs && (
                <>
                  <Row k={`Contributo Gestione separata (${pct}%)`} v={eur(out.ripartoGs.contributoTotale)} />
                  <Row sub k="Quota 2/3 a carico della società" v={eur(out.ripartoGs.quotaCommittente)} />
                  <Row sub k="Quota 1/3 trattenuta al percipiente" v={eur(out.ripartoGs.quotaPercipiente)} />
                  {out.ripartoGs.massimaleApplicato && (
                    <Row sub k="Massimale contributivo applicato su" v={eur(out.ripartoGs.imponibileGs)} />
                  )}
                </>
              )}
              <Row sub k="IRPEF lorda" v={eur(fisc?.irpefLorda ?? 0)} />
              <Row sub k="Detrazioni lavoro dipendente (art. 13)" v={eur(fisc?.detrazioneLavoroDip ?? 0)} />
              <Row sub k="IRPEF netta (senza bonus cuneo)" v={eur(fisc?.irpefNetta ?? 0)} />
              <Row sub k="Addizionali regionali e comunali (media)" v={eur((fisc?.addizionaleRegionale ?? 0) + (fisc?.addizionaleComunale ?? 0))} />
              <Row k="Netto da compenso (dopo quota percipiente e imposte)" v={eur(out.nettoDaCompenso)} strong />
              <Row k="Trasferte nazionali" v={eur(out.trasferteNazionali)} />
              <Row k="Trasferte estere" v={eur(out.trasferteEstere)} />
              <Row k="Rimborso km" v={eur(out.rimborsoKm)} />
              <Row k="Totale rimborsi / indennità" v={eur(out.sommaRimborsiIndennita)} strong />
            </tbody>
          </table>
          {fisc && (
            <p style={{ marginTop: '14px', fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.55 }}>
              {fisc.disclaimer}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
