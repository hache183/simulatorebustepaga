'use client';

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  calcolaSoci,
  defaultStateSoci,
  type AliquotaSociId,
  type RegimeContributivoSoci,
  type SociState,
  type TipoContrattoIrpef,
} from '@/lib/societari';

const REGIMI: { value: RegimeContributivoSoci; label: string; spiegazione: string }[] = [
  {
    value: 'ritenuta_unica',
    label: 'Ritenuta unica sul percipiente',
    spiegazione:
      'L\'intera aliquota selezionata è trattenuta al socio o amministratore. '
      + 'Il costo per la società è il solo compenso lordo, più eventuali rimborsi. '
      + 'È l\'unico regime compatibile con la ritenuta ridotta 8%.',
  },
  {
    value: 'riparto_gs',
    label: 'Gestione separata — riparto 2/3 – 1/3',
    spiegazione:
      'Trattamento ordinario dell\'amministratore (Circ. INPS 8/2026): due terzi del '
      + 'contributo restano a carico della società e un terzo è trattenuto al percipiente. '
      + 'L\'aliquota discende dall\'esistenza di altra copertura INPS, non dalla scelta manuale.',
  },
];

const ALIQUOTE_UI: { value: AliquotaSociId; label: string }[] = [
  { value: 'p35_03', label: '35,03% — aliquota intera ordinaria' },
  { value: 'p8', label: '8% — ridotta unica INPS fino al 31/12/2026' },
  { value: 'p24', label: '24% — ridotta (altra copertura INPS)' },
];

const eur = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);

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
  value, onChange, step = '0.01',
}: { value: number; onChange: (n: number) => void; step?: string }) {
  return (
    <input
      type="number"
      min={0}
      step={step}
      value={Number.isFinite(value) ? value : 0}
      onChange={e => onChange(Number(e.target.value))}
      style={inputStyle}
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

export function SociAmministratoriPanel() {
  const [stato, setStato] = useState<SociState>(defaultStateSoci);
  const set = <K extends keyof SociState>(k: K, v: SociState[K]) =>
    setStato(s => ({ ...s, [k]: v }));

  const out = useMemo(() => calcolaSoci(stato), [stato]);

  const conCompenso = stato.modalita === 'con_compenso';
  const pct = (out.aliquotaInpsApplicata * 100).toFixed(2);
  const fisc = out.dettaglioFiscale;
  const isRipartoGs = stato.regimeContributivo === 'riparto_gs';
  // Nel riparto GS l'aliquota la decide la copertura INPS, non il menu a tendina.
  const mostraWarning24 = conCompenso && !isRipartoGs
    && stato.aliquotaInpsId === 'p24' && !stato.haAltraCoperturaInps;
  const regimeAttivo = REGIMI.find(r => r.value === stato.regimeContributivo) ?? REGIMI[0];

  const pair = (a: ReactNode, b: ReactNode) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>{a}{b}</div>
  );

  const boxStyle: CSSProperties = {
    background: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '10px',
    padding: '20px',
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
            Simulazione isolata dal calcolo dipendenti: compenso annuo oppure solo rimborsi.
            Il trattamento contributivo dipende dal regime selezionato e cambia il costo per
            la società. Addizionali regionali e comunali come media, uguale al motore dipendenti.
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
              <label style={labelStyle}>Regime contributivo del compenso</label>
              <select
                value={stato.regimeContributivo}
                onChange={e => set('regimeContributivo', e.target.value as RegimeContributivoSoci)}
                style={{ width: '100%', padding: '11px 14px' }}
              >
                {REGIMI.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.55, marginTop: '6px' }}>
                {regimeAttivo.spiegazione}
              </p>
            </div>

            {!isRipartoGs && (
              <div>
                <label style={labelStyle}>Tipologia aliquota INPS sul lordo</label>
                <select
                  value={stato.aliquotaInpsId}
                  onChange={e => set('aliquotaInpsId', e.target.value as AliquotaSociId)}
                  style={{ width: '100%', padding: '11px 14px' }}
                >
                  {ALIQUOTE_UI.map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              <input
                type="checkbox"
                checked={stato.haAltraCoperturaInps}
                onChange={e => set('haAltraCoperturaInps', e.target.checked)}
              />
              Il soggetto ha altra copertura INPS
            </label>

            {isRipartoGs && (
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.55, marginTop: '-8px' }}>
                Aliquota applicata: <strong>{pct}%</strong> — {stato.haAltraCoperturaInps
                  ? 'IVS ridotta per iscritti ad altra gestione obbligatoria o pensionati.'
                  : 'aliquota intera Gestione separata, in assenza di altra copertura.'}
              </p>
            )}

            {mostraWarning24 && (
              <div style={{
                background: 'var(--color-amber-dim)',
                border: '1px solid var(--color-amber)',
                borderLeft: '3px solid var(--color-amber)',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '12px',
                color: 'var(--color-amber)',
                lineHeight: 1.5,
              }}>
                Aliquota 24% selezionata senza conferma di altra copertura INPS — verificare con il consulente.
              </div>
            )}

            <div>
              <label style={labelStyle}>Tipo contratto ai fini IRPEF</label>
              <select
                value={stato.tipoContrattoIrpef}
                onChange={e => set('tipoContrattoIrpef', e.target.value as TipoContrattoIrpef)}
                style={{ width: '100%', padding: '11px 14px' }}
              >
                <option value="tempo_indeterminato">Tempo indeterminato</option>
                <option value="tempo_determinato">Tempo determinato</option>
              </select>
            </div>
          </>
        )}

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
          <p style={{
            fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)',
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '14px',
          }}>
            Trasferte, rimborso km e buoni pasto
          </p>
          {pair(
            <div>
              <label style={labelStyle}>Giorni trasferte</label>
              <NumInput value={stato.giorniTrasferte} onChange={n => set('giorniTrasferte', n)} step="1" />
            </div>,
            <div>
              <label style={labelStyle}>€ / giorno</label>
              <NumInput
                value={stato.importoTrasfertaGiornaliera}
                onChange={n => set('importoTrasfertaGiornaliera', n)}
              />
            </div>,
          )}
          <div style={{ height: '12px' }} />
          {pair(
            <div>
              <label style={labelStyle}>Km auto personale</label>
              <NumInput value={stato.kmAutoPersonale} onChange={n => set('kmAutoPersonale', n)} step="1" />
            </div>,
            <div>
              <label style={labelStyle}>€ / km</label>
              <NumInput value={stato.tariffaKmEur} onChange={n => set('tariffaKmEur', n)} step="0.0001" />
            </div>,
          )}
          <div style={{ height: '12px' }} />
          {pair(
            <div>
              <label style={labelStyle}>Giorni buoni pasto</label>
              <NumInput value={stato.giorniBuoniPasto} onChange={n => set('giorniBuoniPasto', n)} step="1" />
            </div>,
            <div>
              <label style={labelStyle}>€ / buono</label>
              <NumInput
                value={stato.importoBuonoPastoGiornaliero}
                onChange={n => set('importoBuonoPastoGiornaliero', n)}
              />
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
              {isRipartoGs
                ? 'Include la quota 2/3 Gestione separata'
                : 'Non include contributi a carico della società'}
            </p>
          </div>
        </div>

        <div style={{ ...boxStyle, padding: '24px' }}>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.55, marginBottom: '14px' }}>
            {isRipartoGs
              ? 'Costo totale datore = compenso lordo annuo + quota contributiva 2/3 a carico della società + somma trasferte, rimborso km e buoni pasto indennizzati dall\u2019azienda.'
              : 'Costo totale datore = compenso lordo annuo (se presente) + somma trasferte, rimborso km e buoni pasto indennizzati dall\u2019azienda. Nessun contributo resta a carico della società.'}
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
              <Row
                k={out.ripartoGs ? 'Ritenuta INPS al percipiente' : `Ritenute INPS (${pct}%)`}
                v={`− ${eur(out.ritenutaInps)}`}
              />
              <Row sub k="IRPEF lorda (scaglioni dipendenti)" v={eur(fisc?.irpefLorda ?? 0)} />
              <Row
                sub
                k={isRipartoGs ? 'Detrazioni art.13 + bonus cuneo (non applicate)' : 'Detrazioni art.13 + bonus cuneo'}
                v={eur((fisc?.detrazioneLavoroDip ?? 0) + (fisc?.bonusCuneoFiscale ?? 0))}
              />
              <Row sub k="IRPEF netta stimata" v={eur(fisc?.irpefNetta ?? 0)} />
              <Row sub k="Addizionali regionali e comunali (media)" v={eur((fisc?.addizionaleRegionale ?? 0) + (fisc?.addizionaleComunale ?? 0))} />
              <Row k="Netto da compenso (dopo INPS e imposte)" v={eur(out.nettoDaCompenso)} strong />
              <Row k="Trasferte" v={eur(out.trasferte)} />
              <Row k="Rimborso km" v={eur(out.rimborsoKm)} />
              <Row k="Buoni pasto" v={eur(out.buoniPasto)} />
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
