'use client';

import type { SociResult, SociState } from '@/lib/societari';
import { AvvisoStima } from '@/components/AvvisoStima';
import { ImportoAnimato } from '@/components/ImportoAnimato';

const eur = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);

interface Props {
  out: SociResult;
  stato: SociState;
  onRicalcola: () => void;
}

export function RisultatiSoci({ out, stato, onRicalcola }: Props) {
  const conCompenso = stato.modalita === 'con_compenso';
  const pct = (out.aliquotaInpsApplicata * 100).toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const fisc = out.dettaglioFiscale;

  const boxStyle: React.CSSProperties = {
    background: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
    boxShadow: 'var(--shadow-card)',
    padding: '20px',
  };

  return (
    <div className="prospetto-animato" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="campi-affiancati" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
        <div style={boxStyle}>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
            Liquido complessivo al socio / amministratore
          </p>
          <p style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: '22px', fontWeight: 500, color: 'var(--color-accent-bright)' }}>
            <ImportoAnimato valore={out.nettoTotalePercepito} formatta={eur} />
          </p>
        </div>
        <div style={boxStyle}>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
            Costo totale per il datore di lavoro
          </p>
          <p style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: '22px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
            <ImportoAnimato valore={out.costoTotaleDatore} formatta={eur} />
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px', lineHeight: 1.4 }}>
            {conCompenso ? 'Include la quota 2/3 Gestione separata' : 'Solo trasferte e rimborso km'}
          </p>
        </div>
      </div>

      <AvvisoStima />

      <div style={{ ...boxStyle, padding: '24px' }}>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.55, marginBottom: '14px' }}>
          {conCompenso
            ? 'Costo totale datore = compenso lordo annuo + quota contributiva 2/3 a carico della società + trasferte e rimborso km. Trasferte e km sono fuori dalla base Gestione separata e IRPEF.'
            : 'Senza compenso il lordo è zero e non c’è Gestione separata. Restano trasferte e rimborso km, che entrano nel liquido e nel costo datore.'}
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
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
          <p style={{ marginTop: '14px', fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.55 }}>
            {fisc.disclaimer}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px' }} className="no-print">
        <button type="button" onClick={onRicalcola} className="ui-btn ui-btn--secondary" style={{
          flex: 1, padding: '14px',
        }}>
          ← Nuovo calcolo
        </button>
        <button type="button" onClick={() => window.print()} className="ui-btn ui-btn--primary" style={{
          flex: 1, padding: '14px',
        }}>
          Stampa report
        </button>
      </div>
    </div>
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
        fontFamily: "var(--font-sans), sans-serif",
        fontSize: sub ? '12px' : '13px',
        fontWeight: strong ? 600 : 400,
      }}>
        {v}
      </td>
    </tr>
  );
}
