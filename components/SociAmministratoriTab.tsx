'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  calcolaSociScenario,
  TARIFFA_KM_INDICATIVA_2026_EUR,
  type SociScenarioInput,
  type SociScenarioOutput,
  type AliquotaInpsSocioId,
} from '@/lib/soci-amministratori';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const TOOLTIP_STYLE: React.CSSProperties = {
  cursor: 'help',
  borderBottom: '1px dotted var(--color-text-muted)',
};

function AliquotaHelp() {
  return (
    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', lineHeight: 1.4, display: 'block', marginTop: '6px' }}>
      <span title="Aliquota intera sul compenso lordo — schema consulente.">
        35,03%
      </span>
      {' · '}
      <span title="Ridotta unica INPS fino al 31 dicembre 2026. Riferimento schema: aliquota ordinaria di confronto 11,67% (nota consulente — verificare decreti vigenti).">
        8%
      </span>
      {' · '}
      <span title="Ridotta 24% in presenza di altra copertura INPS — verificare ammissibilità.">
        24%
      </span>
    </span>
  );
}

function RowLine({ label, value, bold, subtle }: { label: string; value: string; bold?: boolean; subtle?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '8px 0', borderBottom: '1px solid var(--color-border)',
      fontSize: subtle ? '11px' : '13px',
      color: subtle ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
      fontWeight: bold ? 600 : 400,
    }}>
      <span>{label}</span>
      <span style={{ fontFamily: "'DM Mono', monospace" }}>{value}</span>
    </div>
  );
}

function defaultFormState(): SociScenarioInput {
  return {
    modalita: 'con_compenso',
    lordoAnnuo: 12_000,
    aliquotaInpsId: 'p8',
    haAltraCoperturaInps: false,
    tipoContrattoIrpef: 'tempo_indeterminato',
    giorniTrasferte: 0,
    importoTrasfertaGiornaliera: 46.48,
    kmAutoPersonale: 0,
    tariffaKmEur: TARIFFA_KM_INDICATIVA_2026_EUR,
    giorniBuoniPasto: 0,
    importoBuonoPastoGiornaliero: 10,
  };
}

export function SociAmministratoriTab() {
  const [form, setForm] = useState<SociScenarioInput>(defaultFormState);

  const patch = useCallback((p: Partial<SociScenarioInput>) => {
    setForm(prev => ({ ...prev, ...p }));
  }, []);

  const out: SociScenarioOutput = useMemo(() => calcolaSociScenario(form), [form]);

  const warn24 = form.modalita === 'con_compenso' && form.aliquotaInpsId === 'p24' && !form.haAltraCoperturaInps;

  const inputMini: React.CSSProperties = {
    width: '100%',
    marginTop: '4px',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    background: 'var(--color-bg-input)',
    color: 'var(--color-text-primary)',
    fontSize: '13px',
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(340px, 420px) 1fr',
      gap: '24px',
      alignItems: 'start',
    }}>
      <div style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '10px',
        padding: '24px',
      }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {(['con_compenso', 'senza_compenso'] as const).map(m => (
            <button key={m} type="button"
              onClick={() => patch({ modalita: m })}
              style={{
                flex: 1, padding: '10px', borderRadius: '6px',
                border: `1px solid ${form.modalita === m ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: form.modalita === m ? 'var(--color-accent-dim)' : 'var(--color-bg-elevated)',
                color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: '12px', fontWeight: form.modalita === m ? 600 : 400,
              }}>
              {m === 'con_compenso' ? 'Con compenso' : 'Senza compenso'}
            </button>
          ))}
        </div>
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
          Con compenso: lordo annuo → ritenuta INPS sulla percentuale scelta → IRPEF con{' '}
          <strong style={{ color: 'var(--color-text-secondary)' }}>stessa pipeline del calcolatore dipendenti</strong>
          {' '}→ somma rimborsi. Senza compenso: solo trasferte / km / buoni pasto.
        </p>

        {form.modalita === 'con_compenso' && (
          <>
            <label style={TOOLTIP_STYLE} title="Totale annuo lordo del compenso amministrativo / di lavoro soci — simulazione annualizzata." htmlFor="sa-lordo">
              Importo lordo compenso lavoro (annuo €)
            </label>
            <input id="sa-lordo" type="number" min={0} step={100}
              value={form.lordoAnnuo || ''}
              onChange={e => patch({ lordoAnnuo: Number(e.target.value) || 0 })}
              style={{
                width: '100%', marginTop: '6px', marginBottom: '12px', padding: '10px 12px', borderRadius: '6px',
                border: '1px solid var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text-primary)', fontSize: '13px',
              }}
            />
            <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '-8px', marginBottom: '14px' }}>
              Default € 12.000/anno (ordine di grandezza € 1.000/mese × 12).
            </p>

            <label style={{ marginBottom: '6px', display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Tipologia aliquota INPS sul lordo <AliquotaHelp />
            </label>
            <select value={form.aliquotaInpsId}
              onChange={e => patch({ aliquotaInpsId: e.target.value as AliquotaInpsSocioId })}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '6px', marginBottom: '12px',
                border: '1px solid var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text-primary)', fontSize: '13px', cursor: 'pointer',
              }}>
              <option value="p35_03">35,03% — aliquota intera ordinaria</option>
              <option value="p8">8% — ridotta unica INPS fino al 31/12/2026</option>
              <option value="p24">24% — ridotta (altra copertura INPS)</option>
            </select>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', fontSize: '13px', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.haAltraCoperturaInps}
                onChange={e => patch({ haAltraCoperturaInps: e.target.checked })} />
              Il soggetto ha altra copertura INPS
            </label>
            {warn24 && (
              <p style={{ fontSize: '11px', color: 'var(--color-amber)', marginBottom: '12px', padding: '8px', background: 'var(--color-amber-dim)', borderRadius: '6px' }}>
                Aliquota 24% selezionata senza conferma di altra copertura INPS — verificare col consulente.
              </p>
            )}

            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              IRPEF come dipendenti — base detrazioni (art. 13 TUIR)
            </label>
            <select value={form.tipoContrattoIrpef}
              onChange={e => patch({ tipoContrattoIrpef: e.target.value as 'tempo_indeterminato' | 'tempo_determinato' })}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '6px', marginBottom: '20px',
                border: '1px solid var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text-primary)', fontSize: '13px', cursor: 'pointer',
              }}>
              <option value="tempo_indeterminato">Tempo indeterminato</option>
              <option value="tempo_determinato">Tempo determinato</option>
            </select>
          </>
        )}

        <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>
          Trasferte, rimborso km e buoni pasto
        </p>

        <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Giorni trasferte</label>
            <input type="number" min={0} step={1} value={form.giorniTrasferte}
              onChange={e => patch({ giorniTrasferte: Math.max(0, parseInt(e.target.value, 10) || 0) })}
              style={inputMini} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>€/giorno trasferta</label>
            <input type="number" min={0} step={0.01} value={form.importoTrasfertaGiornaliera}
              onChange={e => patch({ importoTrasfertaGiornaliera: Number(e.target.value) || 0 })}
              style={inputMini} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Km auto personale</label>
            <input type="number" min={0} step={1} value={form.kmAutoPersonale}
              onChange={e => patch({ kmAutoPersonale: Math.max(0, Number(e.target.value) || 0) })}
              style={inputMini} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }} title="Valore €/km indicativo (aggiorna secondo tabella ACI/dec del periodo).">
              €/km
            </label>
            <input type="number" min={0} step={0.0001} value={form.tariffaKmEur}
              onChange={e => patch({ tariffaKmEur: Number(e.target.value) || 0 })}
              style={inputMini} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Giorni buoni pasto</label>
            <input type="number" min={0} step={1} value={form.giorniBuoniPasto}
              onChange={e => patch({ giorniBuoniPasto: Math.max(0, parseInt(e.target.value, 10) || 0) })}
              style={inputMini} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>€/buono giorno</label>
            <input type="number" min={0} step={0.01} value={form.importoBuonoPastoGiornaliero}
              onChange={e => patch({ importoBuonoPastoGiornaliero: Number(e.target.value) || 0 })}
              style={inputMini} />
          </div>
        </div>
      </div>

      <div style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '10px',
        padding: '28px',
      }}>
        <h3 style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          marginBottom: '8px',
        }}>
          Riepilogo
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
          Aggiornamento in tempo reale. Costo totale datore = compenso lordo annuo (se presente) + somma trasferte, rimborso km e buoni pasto indennizzati dall&apos;azienda.
        </p>

        {form.modalita === 'con_compenso' && out.dettaglioFiscale && (
          <>
            <RowLine label="Compenso lordo annuo" value={fmtEur(out.compensoLordo)} />
            <RowLine
              label={`Ritenute INPS (${(out.aliquotaInpsApplicata * 100).toFixed(2)}%)`}
              value={`− ${fmtEur(out.ritenutaInps)}`}
            />
            <RowLine label="⋯ IRPEF lorda (scaglioni dipendenti)" value={fmtEur(out.dettaglioFiscale.irpefLorda)} subtle />
            <RowLine label="⋯ Detrazioni art.13 + bonus cuneo" value={`− ${fmtEur(out.dettaglioFiscale.detrazioneLavoroDip + out.dettaglioFiscale.bonusCuneoFiscale)}`} subtle />
            <RowLine label="⋯ IRPEF netta stimata" value={`− ${fmtEur(out.dettaglioFiscale.irpefNetta)}`} subtle />
            <RowLine label="⋯ Addizionali regionali e comunali (media)" value={`− ${fmtEur(out.dettaglioFiscale.addizionaleRegionale + out.dettaglioFiscale.addizionaleComunale)}`} subtle />
            <RowLine label="Netto da compenso (dopo INPS e imposte)" value={fmtEur(out.nettoDaCompenso)} bold />
          </>
        )}

        {form.modalita === 'senza_compenso' && (
          <RowLine label="Compenso lordo" value={fmtEur(0)} />
        )}

        <RowLine label="Trasferte" value={fmtEur(out.trasferte)} />
        <RowLine label="Rimborso km" value={fmtEur(out.rimborsoKm)} />
        <RowLine label="Buoni pasto" value={fmtEur(out.buoniPasto)} />
        <RowLine label="Totale rimborsi / indennità" value={fmtEur(out.sommaRimborsiIndennita)} />

        <div style={{
          marginTop: '16px',
          padding: '16px',
          borderRadius: '8px',
          background: 'var(--color-accent-dim)',
          border: '2px solid var(--color-accent)',
        }}>
          <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
            Liquido complessivo al socio / amministratore (netto compenso + rimborsi)
          </p>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '22px', fontWeight: 700, color: 'var(--color-accent-bright)' }}>
            {fmtEur(out.nettoTotalePercepito)}
          </p>
        </div>

        <div style={{
          marginTop: '16px',
          padding: '16px',
          borderRadius: '8px',
          background: 'var(--color-green-dim)',
          border: '2px solid var(--color-green)',
        }}>
          <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
            Costo totale per il datore di lavoro
          </p>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '26px', fontWeight: 800, color: 'var(--color-green)' }}>
            {fmtEur(out.costoTotaleDatore)}
          </p>
        </div>

        {out.dettaglioFiscale && (
          <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '16px', lineHeight: 1.5 }}>
            {out.dettaglioFiscale.disclaimer}
          </p>
        )}
      </div>
    </div>
  );
}
