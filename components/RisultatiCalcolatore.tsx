'use client';

import type { CalcolatoreOutput } from '@/types';
import { AvvisoStima } from '@/components/AvvisoStima';

const eur = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const pct = (n: number) => (n * 100).toFixed(1) + '%';
const pct2 = (n: number) =>
  (n * 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

const SWATCH: Record<string, string> = {
  ral: 'var(--swatch-ral)',
  inps_azienda: 'var(--swatch-inps)',
  tfr: 'var(--swatch-tfr)',
  inail: 'var(--swatch-inail)',
  tredicesima: 'var(--swatch-tredicesima)',
  quattordicesima: 'var(--swatch-quattordicesima)',
  ccnl_contrattuale: 'var(--swatch-ccnl)',
  agevolazione: 'var(--swatch-agevolazione)',
};

function coloreVoce(categoria: string): string {
  return SWATCH[categoria] ?? 'var(--swatch-fallback)';
}

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
    <div className="prospetto" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      <dl className="sintesi">
        <div>
          <dt>Costo annuo aziendale</dt>
          <dd>{eur(costoTotaleAnnuo)}</dd>
        </div>
        <div>
          <dt>Equivalente mensile</dt>
          <dd>{eur(costoTotaleMensile)}</dd>
        </div>
        <div>
          <dt>Incidenza sulla RAL</dt>
          <dd className={percentualeRal > 1.45 ? 'is-alto' : percentualeRal <= 1.30 ? 'is-basso' : 'is-medio'}>
            {pct(percentualeRal)}
          </dd>
        </div>
        <div>
          <dt>Netto mensile stimato</dt>
          <dd>{eur(nettoDipendente.nettoMensile12)}</dd>
          <p className="sintesi__nota">Media su 12 mesi. Stima, non cedolino.</p>
        </div>
      </dl>

      <AvvisoStima />

      {/* SEZIONE C — Barra composizione */}
      <div>
        <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)',
          marginBottom: '10px',
          fontFamily: "var(--font-sans), sans-serif" }}>
          Composizione del costo
        </p>
        <div style={{ display: 'flex', height: '4px', overflow: 'hidden' }}>
          {vociInCosto.map(v => (
              <div key={v.id}
                style={{
                  width: `${(v.importoAnnuo / costoTotaleAnnuo) * 100}%`,
                  background: coloreVoce(v.categoria),
                }}
                title={`${v.descrizione}: ${eur(v.importoAnnuo)}`}
              />
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: '10px' }}>
          {vociInCosto.map(v => {
            return (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: coloreVoce(v.categoria), flexShrink: 0 }} />
                <span style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontFamily: "var(--font-sans), sans-serif" }}>
                  {v.descrizione.split(' — ')[0].split('(')[0].trim()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEZIONE D — Tabella dettaglio */}
      <div style={{ borderRadius: 0, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        <table className="tabella-voci" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-elevated)' }}>
              {['Voce di costo', 'Importo annuo', 'Importo mensile medio', '% RAL'].map((h, i) => (
                <th key={h} style={{
                  textAlign: i === 0 ? 'left' : 'right',
                  padding: '12px 16px', fontSize: '14px',
                  color: 'var(--color-text-secondary)',
                  fontFamily: "var(--font-sans), sans-serif", fontWeight: 500,
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
                  {v.notaLegge && <div style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{v.notaLegge}</div>}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right',
                  fontFamily: "var(--font-sans), sans-serif", color: 'var(--color-text-primary)' }}>
                  {eur(v.importoAnnuo)}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right',
                  fontFamily: "var(--font-sans), sans-serif", color: 'var(--color-text-secondary)' }}>
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
                fontFamily: "var(--font-sans), sans-serif", fontWeight: 700, fontSize: '15px',
                color: 'var(--color-accent-bright)' }}>
                Costo totale aziendale
              </td>
              <td style={{ padding: '14px 16px', textAlign: 'right',
                fontFamily: "var(--font-sans), sans-serif", fontWeight: 500, fontSize: '17px',
                color: 'var(--color-accent-bright)' }}>
                {eur(costoTotaleAnnuo)}
              </td>
              <td style={{ padding: '14px 16px', textAlign: 'right',
                fontFamily: "var(--font-sans), sans-serif", fontSize: '16px',
                color: 'var(--color-accent-bright)' }}>
                {eur(costoTotaleMensile)}
              </td>
              <td style={{ padding: '14px 16px', textAlign: 'right',
                fontFamily: "var(--font-sans), sans-serif", fontSize: '16px',
                color: 'var(--color-accent-bright)' }}>
                {pct(percentualeRal)}
              </td>
            </tr>
          </tbody>
        </table>
        {!isDomestico && (
          <p style={{
            margin: '12px 16px 14px', fontSize: '14px', color: 'var(--color-text-secondary)',
            lineHeight: '1.5',
          }}>
            Il costo indicato rappresenta il costo massimo teorico, in assenza di agevolazioni contributive. In funzione della data di assunzione e dei requisiti soggettivi e oggettivi dell&apos;azienda e delle risorse, dovrà essere verificata l&apos;eventuale applicabilità. A titolo esemplificativo tali agevolazioni possono comportare una riduzione del 50% o in alcuni casi fino al 100% dei contributi INPS a carico D/L.
          </p>
        )}
      </div>

      {/* SEZIONE E — Prospetto netto dipendente */}
      <div>
        <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-secondary)',
          marginBottom: '12px', fontFamily: "var(--font-sans), sans-serif" }}>
          Prospetto netto dipendente (stima)
        </p>
        <div style={{ borderRadius: 0, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
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
                    fontFamily: "var(--font-sans), sans-serif",
                    color: row.color ?? 'var(--color-text-primary)',
                    fontWeight: row.bold ? 600 : 400 }}>
                    {row.sign === '+' ? '+' : row.sign === '−' ? '−' : ''}{eur(row.value)}
                  </td>
                </tr>
              ))}
              {/* Riga netto annuo */}
              <tr style={{ background: 'var(--color-bg-elevated)', borderTop: '2px solid var(--color-accent)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-accent-bright)',
                  fontFamily: "var(--font-sans), sans-serif", fontSize: '15px' }}>
                  NETTO ANNUO stimato
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right',
                  fontFamily: "var(--font-sans), sans-serif", fontWeight: 600, fontSize: '17px',
                  color: 'var(--color-accent-bright)' }}>
                  {eur(nettoDipendente.nettoAnnuo)}
                </td>
              </tr>
              {/* Netto mensile su 12 mesi */}
              <tr style={{ background: 'var(--color-bg-elevated)' }}>
                <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-primary)',
                  fontFamily: "var(--font-sans), sans-serif", fontSize: '15px' }}>
                  NETTO MENSILE stimato (su 12 mesi)
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right',
                  fontFamily: "var(--font-sans), sans-serif", fontWeight: 600, fontSize: '16px',
                  color: 'var(--color-text-primary)' }}>
                  {eur(nettoDipendente.nettoMensile12)}
                </td>
              </tr>
              {/* Netto per busta */}
              <tr style={{ background: 'var(--color-bg-elevated)', borderTop: '1px solid var(--color-border)' }}>
                <td style={{ padding: '10px 16px', color: 'var(--color-text-secondary)',
                  fontFamily: "var(--font-sans), sans-serif", fontSize: '15px' }}>
                  NETTO per busta ({risultato.input.mensilita} mensilità)
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right',
                  fontFamily: "var(--font-sans), sans-serif", fontSize: '15px',
                  color: 'var(--color-text-secondary)' }}>
                  {eur(nettoDipendente.nettoPerMensilita)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* Disclaimer netto */}
        <p style={{
          marginTop: '10px', fontSize: '13px', color: 'var(--color-text-muted)',
          lineHeight: '1.5', fontStyle: 'italic',
        }}>
          {nettoDipendente.disclaimer}
        </p>
      </div>

      {/* SEZIONE F — Footer azioni */}
      <div style={{ display: 'flex', gap: '12px' }} className="no-print">
        <button onClick={onRicalcola} className="ui-btn ui-btn--secondary" style={{
          flex: 1, padding: '14px',
        }}>
          ← Nuovo calcolo
        </button>
        <button onClick={() => window.print()} className="ui-btn ui-btn--primary" style={{
          flex: 1, padding: '14px',
        }}>
          Stampa report
        </button>
      </div>

    </div>
  );
}
