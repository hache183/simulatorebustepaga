'use client';

import type { CalcolatoreOutput } from '@/types';

const eur = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const pct = (n: number) => (n * 100).toFixed(1) + '%';
const pct2 = (n: number) =>
  (n * 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

interface Props {
  risultato: CalcolatoreOutput;
  onRicalcola: () => void;
}

export function RisultatiCalcolatore({ risultato, onRicalcola }: Props) {
  const { costoTotaleAnnuo, costoTotaleMensile, percentualeRal, voci, nettoDipendente } = risultato;
  const isDomestico = ['domestici', 'domestici_conviventi', 'domestici_non_conviventi'].includes(risultato.input.ccnlId);
  const vociInCosto = voci.filter(v =>
    v.importoAnnuo > 0 && v.categoria !== 'tredicesima' && v.categoria !== 'quattordicesima',
  );
  const aliquotaInpsDip = nettoDipendente.ralLorda > 0
    ? nettoDipendente.inpsDipendente / nettoDipendente.ralLorda
    : 0.0919;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* SEZIONE A — KPI bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
        {/* Card 1 — Costo annuo */}
        <div style={{
          background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
          borderRadius: '10px', padding: '20px',
        }}>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)',
            fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '6px' }}>
            Costo annuo aziendale
          </p>
          <p style={{
            fontFamily: "'DM Mono', monospace", fontSize: '24px', fontWeight: 500,
            color: 'var(--color-accent-bright)', lineHeight: 1,
          }}>
            {eur(costoTotaleAnnuo)}
          </p>
        </div>
        {/* Card 2 — Costo mensile */}
        <div style={{
          background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
          borderRadius: '10px', padding: '20px',
        }}>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)',
            fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '6px' }}>
            Equivalente mensile medio
          </p>
          <p style={{
            fontFamily: "'DM Mono', monospace", fontSize: '22px', fontWeight: 500,
            color: 'var(--color-text-primary)', lineHeight: 1,
          }}>
            {eur(costoTotaleMensile)}
          </p>
        </div>
        {/* Card 3 — % sulla RAL */}
        <div style={{
          background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
          borderRadius: '10px', padding: '20px',
        }}>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)',
            fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '6px' }}>
            Incidenza sulla RAL
          </p>
          <p style={{
            fontFamily: "'DM Mono', monospace", fontSize: '22px', fontWeight: 500,
            color: percentualeRal > 1.45 ? 'var(--color-red)' : percentualeRal <= 1.30 ? 'var(--color-green)' : 'var(--color-amber)',
            lineHeight: 1,
          }}>
            {pct(percentualeRal)}
          </p>
        </div>
        {/* Card 4 — Netto mensile dipendente */}
        <div style={{
          background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
          borderRadius: '10px', padding: '20px',
        }}>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)',
            fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '6px' }}>
            Netto mensile stimato dip.
          </p>
          <p style={{
            fontFamily: "'DM Mono', monospace", fontSize: '22px', fontWeight: 500,
            color: 'var(--color-text-primary)', lineHeight: 1,
          }}>
            {eur(nettoDipendente.nettoMensile12)}
          </p>
          <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Media su 12 mesi — stima indicativa
          </p>
        </div>
      </div>

      {/* SEZIONE C — Barra composizione */}
      <div>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)',
          marginBottom: '10px',
          fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Composizione del costo
        </p>
        <div style={{ display: 'flex', height: '14px', borderRadius: '8px', overflow: 'hidden' }}>
          {vociInCosto.map(v => {
            const colori: Record<string, string> = {
              ral: '#14b8a6', inps_azienda: '#2dd4bf', tfr: '#22c55e', inail: '#f59e0b',
              tredicesima: '#818cf8', quattordicesima: '#a78bfa', ccnl_contrattuale: '#71717a', agevolazione: '#38383f',
            };
            return (
              <div key={v.id}
                style={{
                  width: `${(v.importoAnnuo / costoTotaleAnnuo) * 100}%`,
                  background: colori[v.categoria] ?? '#38383f',
                }}
                title={`${v.descrizione}: ${eur(v.importoAnnuo)}`}
              />
            );
          })}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: '10px' }}>
          {vociInCosto.map(v => {
            const colori: Record<string, string> = {
              ral: '#14b8a6', inps_azienda: '#2dd4bf', tfr: '#22c55e', inail: '#f59e0b',
              tredicesima: '#818cf8', quattordicesima: '#a78bfa', ccnl_contrattuale: '#71717a', agevolazione: '#38383f',
            };
            return (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colori[v.categoria] ?? '#38383f', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {v.descrizione.split(' — ')[0].split('(')[0].trim()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEZIONE D — Tabella dettaglio */}
      <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-elevated)' }}>
              {['Voce di costo', 'Importo annuo', 'Importo mensile medio', '% RAL'].map((h, i) => (
                <th key={h} style={{
                  textAlign: i === 0 ? 'left' : 'right',
                  padding: '12px 16px', fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {voci.map((v, i) => (
              <tr key={v.id} style={{
                background: i % 2 === 0 ? 'var(--color-bg-surface)' : 'var(--color-bg-base)',
                borderBottom: '1px solid var(--color-border)',
              }}>
                <td style={{ padding: '12px 16px', color: 'var(--color-text-primary)' }}>
                  <div>{v.descrizione}</div>
                  {v.notaLegge && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{v.notaLegge}</div>}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right',
                  fontFamily: "'DM Mono', monospace", color: 'var(--color-text-primary)' }}>
                  {eur(v.importoAnnuo)}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right',
                  fontFamily: "'DM Mono', monospace", color: 'var(--color-text-secondary)' }}>
                  {eur(v.importoMensile)}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                  {pct(v.percentualeRal)}
                </td>
              </tr>
            ))}
            {/* Riga totale */}
            <tr style={{ background: 'var(--color-bg-elevated)', borderTop: '2px solid var(--color-accent)' }}>
              <td style={{ padding: '14px 16px',
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '13px',
                color: 'var(--color-accent-bright)' }}>
                Costo totale aziendale
              </td>
              <td style={{ padding: '14px 16px', textAlign: 'right',
                fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: '15px',
                color: 'var(--color-accent-bright)' }}>
                {eur(costoTotaleAnnuo)}
              </td>
              <td style={{ padding: '14px 16px', textAlign: 'right',
                fontFamily: "'DM Mono', monospace", fontSize: '14px',
                color: 'var(--color-accent-bright)' }}>
                {eur(costoTotaleMensile)}
              </td>
              <td style={{ padding: '14px 16px', textAlign: 'right',
                fontFamily: "'DM Mono', monospace", fontSize: '14px',
                color: 'var(--color-accent-bright)' }}>
                {pct(percentualeRal)}
              </td>
            </tr>
          </tbody>
        </table>
        {!isDomestico && (
          <p style={{
            margin: '12px 16px 14px', fontSize: '12px', color: 'var(--color-text-secondary)',
            lineHeight: '1.5',
          }}>
            Il costo indicato rappresenta il costo massimo teorico, in assenza di agevolazioni contributive. In funzione della data di assunzione e dei requisiti soggettivi e oggettivi dell&apos;azienda e delle risorse, dovrà essere verificata l&apos;eventuale applicabilità. A titolo esemplificativo tali agevolazioni possono comportare una riduzione del 50% o in alcuni casi fino al 100% dei contributi INPS a carico D/L.
          </p>
        )}
      </div>

      {/* SEZIONE E — Prospetto netto dipendente */}
      <div>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)',
          marginBottom: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Prospetto netto dipendente (stima)
        </p>
        <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              {(isDomestico ? [
                { label: 'RAL lorda', value: nettoDipendente.ralLorda, sign: '' },
                { label: 'Contributi INPS dipendente', value: nettoDipendente.inpsDipendente, sign: '−' },
                { label: 'Imponibile IRPEF (= netto)', value: nettoDipendente.imponibileIrpef, sign: '=', bold: true },
              ] : [
                { label: 'RAL lorda', value: nettoDipendente.ralLorda, sign: '' },
                {
                  label: `Contributi INPS dipendente (${pct2(aliquotaInpsDip)})`,
                  value: nettoDipendente.inpsDipendente, sign: '−'
                },
                { label: 'Imponibile IRPEF', value: nettoDipendente.imponibileIrpef, sign: '=', bold: true },
                { label: 'IRPEF lorda', value: nettoDipendente.irpefLorda, sign: '−' },
                { label: 'Detrazioni lavoro dipendente', value: nettoDipendente.detrazioneLavoroDip, sign: '+', color: 'var(--color-green)' },
                { label: 'Bonus cuneo fiscale', value: nettoDipendente.bonusCuneoFiscale, sign: '+', color: 'var(--color-green)' },
                { label: 'IRPEF netta (dopo detrazioni e cuneo)', value: nettoDipendente.irpefNetta, sign: '−', bold: true },
                { label: 'Addizionali reg./com. (stima)', value: nettoDipendente.addizionaleRegionale + nettoDipendente.addizionaleComunale, sign: '−' },
              ] as { label: string; value: number; sign: string; bold?: boolean; color?: string }[]).map((row, i) => (
                <tr key={i} style={{
                  background: i % 2 === 0 ? 'var(--color-bg-surface)' : 'var(--color-bg-base)',
                  borderBottom: '1px solid var(--color-border)',
                }}>
                  <td style={{ padding: '10px 16px', color: 'var(--color-text-primary)',
                    fontWeight: row.bold ? 600 : 400 }}>
                    {row.sign && <span style={{ color: row.color ?? 'var(--color-text-muted)', marginRight: '4px' }}>{row.sign}</span>}
                    {row.label}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right',
                    fontFamily: "'DM Mono', monospace",
                    color: row.color ?? 'var(--color-text-primary)',
                    fontWeight: row.bold ? 600 : 400 }}>
                    {row.sign === '+' ? '+' : row.sign === '−' ? '−' : ''}{eur(row.value)}
                  </td>
                </tr>
              ))}
              {/* Riga netto annuo */}
              <tr style={{ background: 'var(--color-bg-elevated)', borderTop: '2px solid var(--color-accent)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-accent-bright)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}>
                  NETTO ANNUO stimato
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right',
                  fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: '15px',
                  color: 'var(--color-accent-bright)' }}>
                  {eur(nettoDipendente.nettoAnnuo)}
                </td>
              </tr>
              {/* Netto mensile su 12 mesi */}
              <tr style={{ background: 'var(--color-bg-elevated)' }}>
                <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-primary)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}>
                  NETTO MENSILE stimato (su 12 mesi)
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right',
                  fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: '14px',
                  color: 'var(--color-text-primary)' }}>
                  {eur(nettoDipendente.nettoMensile12)}
                </td>
              </tr>
              {/* Netto per busta */}
              <tr style={{ background: 'var(--color-bg-elevated)', borderTop: '1px solid var(--color-border)' }}>
                <td style={{ padding: '10px 16px', color: 'var(--color-text-secondary)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}>
                  NETTO per busta ({risultato.input.mensilita} mensilità)
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right',
                  fontFamily: "'DM Mono', monospace", fontSize: '13px',
                  color: 'var(--color-text-secondary)' }}>
                  {eur(nettoDipendente.nettoPerMensilita)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* Disclaimer netto */}
        <p style={{
          marginTop: '10px', fontSize: '11px', color: 'var(--color-text-muted)',
          lineHeight: '1.5', fontStyle: 'italic',
        }}>
          {nettoDipendente.disclaimer}
        </p>
      </div>

      {/* SEZIONE F — Footer azioni */}
      <div style={{ display: 'flex', gap: '12px' }} className="no-print">
        <button onClick={onRicalcola} style={{
          flex: 1, padding: '14px',
          background: 'transparent', color: 'var(--color-text-secondary)',
          border: '1px solid var(--color-border)', borderRadius: '10px',
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '14px',
          cursor: 'pointer', transition: 'border-color 0.15s ease',
        }}>
          ← Nuovo calcolo
        </button>
        <button onClick={() => window.print()} style={{
          flex: 1, padding: '14px',
          background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border-bright)', borderRadius: '10px',
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '14px',
          cursor: 'pointer', transition: 'border-color 0.15s ease',
        }}>
          🖨 Stampa report
        </button>
      </div>

    </div>
  );
}
