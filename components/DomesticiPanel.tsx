'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { RisultatiCalcolatore } from '@/components/RisultatiCalcolatore';
import type { CalcolatoreOutput, LivelloCcnl } from '@/types';

const COEFF_DEFAULT = 4.33;
const ORE_PIENO = 54;
const ERRORE_PART_TIME = 'part-time convivente ammesso solo C, B, BS (tab. B)';

type Modo = 'non_convivente' | 'convivente';
type Ramo = 'pieno' | 'part_time';

interface TabellaA { codice: string; descrizione?: string; mensile: number; indennitaFunzione: number; }
interface TabellaB { codice: string; descrizione?: string; mensile30h: number; oreBase?: number; }
interface TabellaC { codice: string; descrizione?: string; orario: number; }

interface CcnlResp {
  livelli: LivelloCcnl[];
  nome: string;
  fonte?: string;
  validitaAl?: string | null;
  mensilita: number;
  coefficienteOreMese: number | null;
  oreFerieAnnue: number | null;
  orePermessiAnnue: number | null;
  oreFestivitaAnnue: number | null;
  tabellaA: TabellaA[] | null;
  tabellaB: TabellaB[] | null;
  tabellaC: TabellaC[] | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const eur = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: 'var(--color-bg-input)',
  color: 'var(--color-text-primary)',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  fontSize: '13px',
  fontFamily: "'DM Mono', monospace",
};

export function DomesticiPanel() {
  const [modo, setModo] = useState<Modo>('non_convivente');
  const [ramo, setRamo] = useState<Ramo>('pieno');
  const [sostituzione, setSostituzione] = useState(false);
  const [livello, setLivello] = useState('A');
  const [pagaOraria, setPagaOraria] = useState(6.51);
  const [ore, setOre] = useState(25);
  const [oreNonGodute, setOreNonGodute] = useState(0);
  const [cassaColf, setCassaColf] = useState(false);
  const [anzianitaAnni, setAnzianitaAnni] = useState(0);
  const [nonConv, setNonConv] = useState<CcnlResp | null>(null);
  const [conv, setConv] = useState<CcnlResp | null>(null);
  const [risultato, setRisultato] = useState<CalcolatoreOutput | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/ccnl/domestici/livelli').then(r => r.json()).then(d => setNonConv(d as CcnlResp)).catch(() => {});
    fetch('/api/ccnl/domestici_conviventi/livelli').then(r => r.json()).then(d => setConv(d as CcnlResp)).catch(() => {});
  }, []);

  const coeff = nonConv?.coefficienteOreMese ?? COEFF_DEFAULT;
  const mensilita = (modo === 'convivente' ? conv?.mensilita : nonConv?.mensilita) ?? 13;
  const opzioni = useMemo(() => {
    if (modo === 'non_convivente') {
      return (nonConv?.livelli ?? []).map(l => ({
        codice: l.codice,
        etichetta: `${l.codice} — ${eur(l.minimoTabellare)}/h`,
      }));
    }
    if (sostituzione) {
      return (conv?.tabellaC ?? []).map(r => ({
        codice: r.codice,
        etichetta: `${r.codice} — ${eur(r.orario)}/h`,
      }));
    }
    if (ramo === 'part_time') {
      return (conv?.tabellaB ?? []).map(r => ({
        codice: r.codice,
        etichetta: `${r.codice} — ${eur(r.mensile30h)} / 30 h`,
      }));
    }
    return (conv?.tabellaA ?? []).map(r => {
      const base = r.mensile + (r.indennitaFunzione > 0 ? r.indennitaFunzione : 0);
      const extra = r.indennitaFunzione > 0 ? ` (di cui indennità ${eur(r.indennitaFunzione)})` : '';
      return { codice: r.codice, etichetta: `${r.codice} — ${eur(base)}/mese${extra}` };
    });
  }, [modo, sostituzione, ramo, nonConv, conv]);

  const preview = useMemo(() => {
    if (modo === 'non_convivente') {
      return { mensile: round2(pagaOraria * ore * coeff), errore: null as string | null };
    }
    if (sostituzione) {
      const riga = conv?.tabellaC?.find(r => r.codice === livello);
      if (!riga) return { mensile: 0, errore: 'Sostituzione titolare (tab. C) ammessa solo per i livelli CS e DS' };
      return { mensile: round2(riga.orario * ore * coeff), errore: null };
    }
    if (ramo === 'part_time') {
      if (ore < 30 || ore >= ORE_PIENO) {
        return { mensile: 0, errore: 'Part-time convivente: ore settimanali da 30 a meno di 54 (tab. B)' };
      }
      const riga = conv?.tabellaB?.find(r => r.codice === livello);
      if (!riga) return { mensile: 0, errore: ERRORE_PART_TIME };
      const oreBase = riga.oreBase ?? 30;
      return { mensile: round2(riga.mensile30h * (ore / oreBase)), errore: null };
    }
    const riga = conv?.tabellaA?.find(r => r.codice === livello);
    if (!riga) return { mensile: 0, errore: null };
    const ind = riga.indennitaFunzione > 0 ? riga.indennitaFunzione : 0;
    return { mensile: round2(riga.mensile + ind), errore: null };
  }, [modo, sostituzione, ramo, pagaOraria, ore, coeff, conv, livello]);

  const scegliModo = (next: Modo) => {
    setModo(next);
    setErrore(null);
    setRisultato(null);
    if (next === 'non_convivente') {
      setSostituzione(false);
      setOre(25);
      const liv = nonConv?.livelli.find(l => l.codice === 'D') ?? nonConv?.livelli[0];
      if (liv) {
        setLivello(liv.codice);
        setPagaOraria(liv.minimoTabellare);
      }
    } else {
      setRamo('pieno');
      setSostituzione(false);
      setOre(ORE_PIENO);
      setLivello('A');
    }
  };

  const scegliRamo = (next: Ramo) => {
    setRamo(next);
    setSostituzione(false);
    setErrore(null);
    if (next === 'pieno') {
      setOre(ORE_PIENO);
      if (!(conv?.tabellaA ?? []).some(r => r.codice === livello)) setLivello('A');
    } else {
      setOre(30);
      const ammessi = conv?.tabellaB ?? [];
      if (!ammessi.some(r => r.codice === livello)) setLivello(ammessi[0]?.codice ?? 'C');
    }
  };

  const attivaSostituzione = (on: boolean) => {
    setSostituzione(on);
    setErrore(null);
    if (on) {
      const ammessi = conv?.tabellaC ?? [];
      if (!ammessi.some(r => r.codice === livello)) setLivello(ammessi.find(r => r.codice === 'CS')?.codice ?? 'CS');
      if (ore >= ORE_PIENO) setOre(25);
    } else if (ramo === 'pieno') {
      setOre(ORE_PIENO);
      setLivello('A');
    }
  };

  const onLivello = (codice: string) => {
    setLivello(codice);
    if (modo === 'non_convivente') {
      const liv = nonConv?.livelli.find(l => l.codice === codice);
      if (liv) setPagaOraria(liv.minimoTabellare);
    }
  };

  const calcola = async () => {
    if (preview.errore) {
      setErrore(preview.errore);
      return;
    }
    setLoading(true);
    setErrore(null);
    const ral = Math.max(1, round2(preview.mensile * mensilita));
    try {
      const res = await fetch('/api/calcola', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ccnlId: modo === 'convivente' ? 'domestici_conviventi' : 'domestici',
          livello,
          ral,
          tipoContratto: 'tempo_indeterminato',
          oreLavoro: modo === 'convivente' && !sostituzione && ramo === 'pieno' ? ORE_PIENO : ore,
          oreSettimanali: modo === 'convivente' && !sostituzione && ramo === 'pieno' ? ORE_PIENO : ore,
          mensilita,
          anzianitaAnni,
          numeroDipendenti: 1,
          regione: 'Lazio',
          codiceInail: '',
          agevolazioniSelezionate: [],
          includiAssistenzaSanitaria: false,
          aliquotaInps: 0,
          quotaNonGodute: 1,
          convivente: modo === 'convivente',
          pagaOraria: modo === 'non_convivente' ? pagaOraria : undefined,
          includiCassaColf: cassaColf,
          sostituzioneTitolare: modo === 'convivente' && sostituzione,
          oreNonGodute: modo === 'non_convivente' ? oreNonGodute : 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error((json as { errore?: string }).errore ?? 'Errore nel calcolo');
      setRisultato(json as CalcolatoreOutput);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const oreBloccate = modo === 'convivente' && !sostituzione && ramo === 'pieno';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: risultato ? '1fr' : '420px 1fr', gap: '24px', alignItems: 'start' }}>
      {!risultato && (
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
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '18px', color: 'var(--color-text-primary)' }}>
              Collaboratori familiari
            </h2>
            <p style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              {modo === 'non_convivente' || sostituzione
                ? `Retribuzione mensile = paga oraria × ore settimanali × ${coeff.toFixed(2).replace('.', ',')}, poi × ${mensilita} mensilità del CCNL.`
                : ramo === 'part_time'
                  ? `Part-time: mensile della tab. B (base 30 ore), proporzionato se le ore sono di più, poi × ${mensilita} mensilità.`
                  : `Tempo pieno: mensile della tab. A, più l'indennità di funzione se prevista. Ore bloccate a 54. Poi × ${mensilita} mensilità.`}
              {' '}I contributi INPS restano a fascia oraria.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {([
              ['non_convivente', 'Non convivente'],
              ['convivente', 'Convivente'],
            ] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => scegliModo(id)} style={pill(modo === id)}>
                {label}
              </button>
            ))}
          </div>

          {modo === 'convivente' && (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <input type="checkbox" checked={sostituzione} onChange={e => attivaSostituzione(e.target.checked)} />
                sostituzione titolare (tab. C)
              </label>
              {!sostituzione && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <button type="button" onClick={() => scegliRamo('pieno')} style={pill(ramo === 'pieno')}>Tempo pieno 54 h (tab. A)</button>
                  <button type="button" onClick={() => scegliRamo('part_time')} style={pill(ramo === 'part_time')}>Part-time (tab. B)</button>
                </div>
              )}
              {ramo === 'part_time' && !sostituzione && (
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{ERRORE_PART_TIME}</p>
              )}
            </>
          )}

          <div>
            <label htmlFor="livello-dom" style={labelStyle}>Livello</label>
            <select id="livello-dom" value={livello} onChange={e => onLivello(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {opzioni.map(o => <option key={o.codice} value={o.codice}>{o.etichetta}</option>)}
            </select>
          </div>

          {modo === 'non_convivente' && (
            <div>
              <label htmlFor="paga-dom" style={labelStyle}>Paga oraria lorda</label>
              <input id="paga-dom" type="number" step="0.01" min="0" value={pagaOraria}
                onChange={e => setPagaOraria(Number(e.target.value))} style={inputStyle} />
            </div>
          )}

          <div>
            <label htmlFor="ore-dom" style={labelStyle}>Ore settimanali</label>
            <input id="ore-dom" type="number" step="1" min={modo === 'convivente' && ramo === 'part_time' && !sostituzione ? 30 : 1}
              max={modo === 'convivente' && ramo === 'part_time' && !sostituzione ? 53 : 80}
              value={oreBloccate ? ORE_PIENO : ore}
              disabled={oreBloccate}
              onChange={e => setOre(Number(e.target.value))}
              style={{ ...inputStyle, opacity: oreBloccate ? 0.7 : 1 }} />
            {oreBloccate && (
              <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Tempo pieno convivente: ore bloccate a 54. Il mensile è quello della tab. A.
              </p>
            )}
          </div>

          {modo === 'non_convivente' && (
            <div>
              <label htmlFor="ore-ng" style={labelStyle}>Ore ferie non godute (opzionale)</label>
              <input id="ore-ng" type="number" step="1" min="0" value={oreNonGodute}
                onChange={e => setOreNonGodute(Number(e.target.value))} style={inputStyle} />
              <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Lascia 0 per il default: Y = (173 × ore sett.) / 40, costo = Y × paga oraria.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="anz-dom" style={labelStyle}>Anzianità (anni)</label>
            <input id="anz-dom" type="number" min="0" max="50" value={anzianitaAnni}
              onChange={e => setAnzianitaAnni(Number(e.target.value))} style={inputStyle} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            <input type="checkbox" checked={cassaColf} onChange={e => setCassaColf(e.target.checked)} />
            Includi CassaColf (0,03 €/ora)
          </label>

          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Mensile lordo <strong style={{ fontFamily: "'DM Mono', monospace", color: 'var(--color-text-primary)' }}>{eur(preview.mensile)}</strong>
            {' '}· annuo {eur(round2(preview.mensile * mensilita))} ({mensilita} mensilità)
          </p>
          {preview.errore && <p style={{ fontSize: '12px', color: 'var(--color-red)' }}>{preview.errore}</p>}

          <button type="button" onClick={calcola} disabled={loading || Boolean(preview.errore)} style={{
            padding: '14px', border: 'none', borderRadius: '8px', cursor: 'pointer',
            background: 'var(--color-accent)', color: 'white', fontWeight: 600, fontSize: '14px',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            {loading ? 'Calcolo…' : 'Calcola il costo'}
          </button>
          {errore && <p style={{ fontSize: '12px', color: 'var(--color-red)' }}>{errore}</p>}
        </div>
      )}

      <div>
        {!risultato && !loading && (
          <div style={{
            background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
            borderRadius: '10px', padding: '48px 32px', textAlign: 'center',
          }}>
            <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Il report apparirà qui</p>
          </div>
        )}
        {risultato && (
          <RisultatiCalcolatore risultato={risultato} onRicalcola={() => { setRisultato(null); setErrore(null); }} />
        )}
      </div>
    </div>
  );
}

const labelStyle: CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 500,
  color: 'var(--color-text-secondary)', marginBottom: '6px',
};

function pill(active: boolean): CSSProperties {
  return {
    padding: '8px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
    background: active ? 'var(--color-accent-glow)' : 'var(--color-bg-input)',
    border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    color: active ? 'var(--color-accent-bright)' : 'var(--color-text-secondary)',
  };
}
