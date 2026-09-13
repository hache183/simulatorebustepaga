'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppHeader } from '@/components/AppHeader';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Agevolazione {
  id: string;
  nome: string;
  descrizione: string;
  fonteLegge: string;
  percentualeEsonero: number;
  massimaleAnnuo: number | null;
  scadenza: string | null;
  scadenzaAlertGiorni: number | null;
  requisiti: Record<string, unknown>;
  cumulabileCon: string[];
  nonCumulabileCon: string[];
}

interface AliquoteInps {
  updatedAt?: string;
  fonte?: string;
  aliquotaBaseAzienda: number;
  aliquotaBaseDipendente: number;
  agevolazioni: Agevolazione[];
}

interface VoceInail {
  codice: string;
  settore: string;
  tassoPerMille: number;
}

interface InailData {
  updatedAt?: string;
  fonte?: string;
  voci: VoceInail[];
}

interface TfrData {
  updatedAt?: string;
  fonte?: string;
  divisoreAnnuo: number;
  rivalutazione: {
    quotaFissa: number;
    quotaVariabileCpi: number;
    descrizione: string;
  };
}

interface ContributoContrattuale {
  percentuale: number;
  descrizione: string;
  notaLegge: string;
}

interface LivelloCcnl {
  codice: string;
  descrizione: string;
  moltiplicatore: number;
}

interface CcnlData {
  id: string;
  nome: string;
  fonte?: string;
  updatedAt?: string;
  mensilita: number;
  livelli: LivelloCcnl[];
  scattiAnzianita: {
    periodicitaMesi: number;
    importoPerScattoEuro: number;
    maxScatti: number;
  };
  contributiContrattuali: {
    azienda: Record<string, ContributoContrattuale>;
  };
}

interface TabProps {
  password: string;
  /** Ambiente serverless: si esporta il JSON invece di scriverlo su disco. */
  solaLettura: boolean;
}

type FeedbackState =
  | { tipo: 'ok' | 'errore'; messaggio: string }
  | { tipo: 'export'; messaggio: string; filePath: string; contenuto: string }
  | null;

// ─── CCNL list ────────────────────────────────────────────────────────────────

const CCNL_LIST = [
  { id: 'acconciatura_estetica', nome: 'Acconciatura ed Estetica', path: 'data/ccnl/acconciatura_estetica.json' },
  { id: 'agricoltura_impiegati', nome: 'Agricoltura Impiegati', path: 'data/ccnl/agricoltura_impiegati.json' },
  { id: 'agricoltura_operai', nome: 'Agricoltura Operai', path: 'data/ccnl/agricoltura_operai.json' },
  { id: 'alimentari_industria', nome: 'Alimentari Industria', path: 'data/ccnl/alimentari_industria.json' },
  { id: 'alimentari_artigianato', nome: 'Alimentari Artigianato', path: 'data/ccnl/alimentari_artigianato.json' },
  { id: 'amministratori_condominio', nome: 'Amministratori di condominio (UNAI)', path: 'data/ccnl/amministratori_condominio.json' },
  { id: 'assicurazioni',        nome: 'Assicurazioni (ANAPA)', path: 'data/ccnl/assicurazioni.json' },
  { id: 'autorimesse',          nome: 'Autorimesse e Noleggio', path: 'data/ccnl/autorimesse.json' },
  { id: 'autoscuole',           nome: 'Autoscuole', path: 'data/ccnl/autoscuole.json' },
  { id: 'calzature',            nome: 'Calzature', path: 'data/ccnl/calzature.json' },
  { id: 'chimica',              nome: 'Chimica', path: 'data/ccnl/chimica.json' },
  { id: 'commercio',            nome: 'Commercio', path: 'data/ccnl/commercio.json' },
  { id: 'comunicazione_grafica_editoria', nome: 'Comunicazione Grafica ed Editoria (G029)', path: 'data/ccnl/comunicazione_grafica_editoria.json' },
  { id: 'edilizia_industria',   nome: 'Edilizia Industria', path: 'data/ccnl/edilizia_industria.json' },
  { id: 'edilizia_artigianato', nome: 'Edilizia Artigianato', path: 'data/ccnl/edilizia_artigianato.json' },
  { id: 'facility_management',  nome: 'Facility Management', path: 'data/ccnl/facility_management.json' },
  { id: 'farmacie_private',     nome: 'Farmacie Private', path: 'data/ccnl/farmacie_private.json' },
  { id: 'gomma_plastica',       nome: 'Gomma Plastica', path: 'data/ccnl/gomma_plastica.json' },
  { id: 'grafica_aziende_industriali', nome: 'Grafica carta piccola industria (G011)', path: 'data/ccnl/grafica_aziende_industriali.json' },
  { id: 'igiene_ambientale_private', nome: 'Igiene Ambientale (Aziende Private)', path: 'data/ccnl/igiene_ambientale_private.json' },
  { id: 'lavanderie_artigiane', nome: 'Lavanderie (Artigiane)', path: 'data/ccnl/lavanderie_artigiane.json' },
  { id: 'lavanderie_industriali', nome: 'Lavanderie (Industriali)', path: 'data/ccnl/lavanderie_industriali.json' },
  { id: 'legno_arredamento',    nome: 'Legno Arredamento', path: 'data/ccnl/legno_arredamento.json' },
  { id: 'metalmeccanici',       nome: 'Metalmeccanici', path: 'data/ccnl/metalmeccanici.json' },
  { id: 'sanita_privata_unipresa', nome: 'Sanità Privata (Unipresa)', path: 'data/ccnl/sanita_privata.json' },
  { id: 'case_di_cura_private', nome: 'Case di Cura Private', path: 'data/ccnl/case_di_cura_private.json' },
  { id: 'servizi_postali_appalto', nome: 'Servizi Postali in Appalto', path: 'data/ccnl/servizi_postali_appalto.json' },
  { id: 'studi_professionali',nome: 'Studi Professionali',  path: 'data/ccnl/studi_professionali.json' },
  { id: 'cooperative_sociali',nome: 'Cooperative Sociali',  path: 'data/ccnl/cooperative_sociali.json' },
  { id: 'trasporti',          nome: 'Trasporti',            path: 'data/ccnl/trasporti.json' },
  { id: 'credito',            nome: 'Credito (ABI)',        path: 'data/ccnl/credito.json' },
  { id: 'multiservizi',       nome: 'Multiservizi',         path: 'data/ccnl/multiservizi.json' },
  { id: 'pubblici_esercizi_turismo', nome: 'Pubblici esercizi e turismo (H05Y)', path: 'data/ccnl/pubblici_esercizi_turismo.json' },
  { id: 'telecomunicazioni',  nome: 'Telecomunicazioni',    path: 'data/ccnl/telecomunicazioni.json' },
  { id: 'informatica',        nome: 'Informatica (ICT - Cifa)', path: 'data/ccnl/informatica.json' },
  { id: 'scuole_private',     nome: 'Scuole Private',       path: 'data/ccnl/scuole_private.json' },
  { id: 'tessile',            nome: 'Tessile',              path: 'data/ccnl/tessile.json' },
  { id: 'vigilanza_privata',  nome: 'Vigilanza Privata',    path: 'data/ccnl/vigilanza_privata.json' },
  { id: 'domestici',          nome: 'Lavoro Domestico',     path: 'data/ccnl/domestici.json' },
  { id: 'domestici_conviventi', nome: 'Domestici Conviventi', path: 'data/ccnl/domestici_conviventi.json' },
];

// ─── Shared helpers ───────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function updatedAtLabel(iso: string | undefined) {
  if (!iso) return null;
  return (
    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
      Ultimo aggiornamento: {fmtDate(iso)}
    </p>
  );
}

function warnRange(value: number, min: number, max: number): boolean {
  return value < min || value > max;
}

function WarningInline({ show, msg }: { show: boolean; msg: string }) {
  if (!show) return null;
  return (
    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--color-amber)', marginLeft: '8px' }}>
      ⚠ {msg}
    </span>
  );
}

function FeedbackBanner({ feedback }: { feedback: FeedbackState }) {
  if (!feedback) return null;
  if (feedback.tipo === 'export') return <ExportPanel feedback={feedback} />;
  const ok = feedback.tipo === 'ok';
  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: '8px',
      border: `1px solid ${ok ? 'var(--color-green)' : 'var(--color-red)'}`,
      background: ok ? 'var(--color-green-dim)' : 'var(--color-red-dim)',
      color: ok ? 'var(--color-green)' : 'var(--color-red)',
      fontSize: '13px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginTop: '12px',
    }}>
      {ok ? '✓' : '✕'} {feedback.messaggio}
    </div>
  );
}

// Ambiente in sola lettura: il JSON validato esce di qui e rientra via commit.
function ExportPanel({
  feedback,
}: {
  feedback: { messaggio: string; filePath: string; contenuto: string };
}) {
  const [copiato, setCopiato] = useState(false);

  const scarica = () => {
    const blob = new Blob([feedback.contenuto], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = feedback.filePath.split('/').pop() ?? 'dati.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copia = () => {
    void navigator.clipboard.writeText(feedback.contenuto).then(() => {
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2500);
    });
  };

  const bottone: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid var(--color-accent)',
    background: 'var(--color-accent-glow)',
    color: 'var(--color-accent-bright)',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  };

  return (
    <div style={{
      padding: '14px',
      borderRadius: '8px',
      border: '1px solid var(--color-amber)',
      background: 'var(--color-amber-dim)',
      marginTop: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>
      <p style={{ fontSize: '13px', color: 'var(--color-amber)', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>
        JSON validato — da committare in repo
      </p>
      <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.5 }}>
        {feedback.messaggio}
      </p>
      <p style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", color: 'var(--color-text-muted)' }}>
        Destinazione: {feedback.filePath}
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={scarica} style={bottone}>Scarica JSON</button>
        <button onClick={copia} style={bottone}>{copiato ? 'Copiato ✓' : 'Copia negli appunti'}</button>
      </div>
      <textarea
        readOnly
        value={feedback.contenuto}
        rows={10}
        onFocus={e => e.currentTarget.select()}
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: '11px',
          padding: '10px',
          background: 'var(--color-bg-input)',
          border: '1px solid var(--color-border)',
          borderRadius: '6px',
          color: 'var(--color-text-secondary)',
          width: '100%',
          resize: 'vertical',
        }}
      />
    </div>
  );
}

// Styled input + optional adornment
function NumInput({
  value,
  onChange,
  label,
  prefix,
  suffix,
  step = '0.01',
  warn = false,
  warnMsg = '',
  style: extraStyle,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  prefix?: string;
  suffix?: string;
  step?: string;
  warn?: boolean;
  warnMsg?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', ...extraStyle }}>
      {label && (
        <label style={{ fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--color-text-secondary)' }}>
          {label}
          <WarningInline show={warn} msg={warnMsg} />
        </label>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
        {prefix && (
          <span style={{
            padding: '7px 8px',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRight: 'none',
            borderRadius: '6px 0 0 6px',
            fontFamily: "'DM Mono', monospace",
            fontSize: '13px',
            color: 'var(--color-text-muted)',
          }}>{prefix}</span>
        )}
        <input
          type="number"
          value={value}
          step={step}
          onChange={e => onChange(e.target.value)}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '13px',
            padding: '7px 10px',
            background: 'var(--color-bg-input)',
            border: `1px solid ${warn ? 'var(--color-amber)' : 'var(--color-border)'}`,
            borderRadius: prefix ? '0' : suffix ? '6px 0 0 6px' : '6px',
            color: 'var(--color-text-primary)',
            width: '100%',
          }}
        />
        {suffix && (
          <span style={{
            padding: '7px 8px',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderLeft: 'none',
            borderRadius: '0 6px 6px 0',
            fontFamily: "'DM Mono', monospace",
            fontSize: '13px',
            color: 'var(--color-text-muted)',
          }}>{suffix}</span>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 600,
      fontSize: '14px',
      color: 'var(--color-text-primary)',
      marginBottom: '12px',
      paddingBottom: '8px',
      borderBottom: '1px solid var(--color-border)',
    }}>{children}</h3>
  );
}

// ─── Network helpers shared by all tabs ──────────────────────────────────────

// La password va nel body: in query string finirebbe nei log di accesso.
async function apiLeggi(password: string, filePath: string): Promise<string> {
  const res = await fetch('/api/admin/leggi-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, filePath }),
  });
  const json = await res.json() as { contenuto?: string; errore?: string };
  if (!res.ok) throw new Error(json.errore ?? `HTTP ${res.status}`);
  if (!json.contenuto) throw new Error('Contenuto mancante');
  return json.contenuto;
}

async function apiSalva(
  password: string,
  filePath: string,
  content: string,
  setSalvando: (v: boolean) => void,
  setFeedback: (f: FeedbackState) => void,
) {
  setSalvando(true);
  setFeedback(null);
  try {
    const res = await fetch('/api/admin/update-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, filePath, content }),
    });
    const json = await res.json() as {
      errore?: string;
      updatedAt?: string;
      solaLettura?: boolean;
      contenuto?: string;
      messaggio?: string;
    };
    if (!res.ok) throw new Error(json.errore ?? 'Errore sconosciuto');
    if (json.solaLettura && json.contenuto) {
      setFeedback({
        tipo: 'export',
        messaggio: json.messaggio ?? 'Ambiente in sola lettura: file validato ma non salvato.',
        filePath,
        contenuto: json.contenuto,
      });
      return;
    }
    const when = json.updatedAt ? new Date(json.updatedAt).toLocaleString('it-IT') : '';
    setFeedback({
      tipo: 'ok',
      messaggio: `Salvato su disco · updatedAt: ${when} — i calcoli usano i nuovi valori dopo il riavvio del server.`,
    });
  } catch (e) {
    setFeedback({ tipo: 'errore', messaggio: e instanceof Error ? e.message : 'Errore sconosciuto' });
  } finally {
    setSalvando(false);
  }
}

// ─── TAB 1: INPS & Agevolazioni ───────────────────────────────────────────────

function TabInps({ password, solaLettura }: TabProps) {
  const [raw, setRaw] = useState<AliquoteInps | null>(null);
  const [aliqAzienda, setAliqAzienda] = useState('');
  const [aliqDip, setAliqDip] = useState('');
  const [agState, setAgState] = useState<Record<string, { esonero: string; massimale: string; scadenza: string }>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const carica = useCallback(async () => {
    try {
      const parsed: AliquoteInps = JSON.parse(await apiLeggi(password, 'data/aliquote-inps.json'));
      setAliqAzienda(String(+(parsed.aliquotaBaseAzienda * 100).toFixed(4)));
      setAliqDip(String(+(parsed.aliquotaBaseDipendente * 100).toFixed(4)));
      const st: Record<string, { esonero: string; massimale: string; scadenza: string }> = {};
      for (const ag of parsed.agevolazioni ?? []) {
        st[ag.id] = {
          esonero: String(+(ag.percentualeEsonero * 100).toFixed(4)),
          massimale: ag.massimaleAnnuo !== null ? String(ag.massimaleAnnuo) : '',
          scadenza: ag.scadenza ? ag.scadenza.substring(0, 10) : '',
        };
      }
      setAgState(st);
      setRaw(parsed);
    } catch (e) {
      setFeedback({ tipo: 'errore', messaggio: e instanceof Error ? e.message : 'Errore nel caricamento del file' });
    }
  }, [password]);

  useEffect(() => { void carica(); }, [carica]);

  const salva = async () => {
    if (!raw) return;
    const updated: AliquoteInps = {
      ...raw,
      aliquotaBaseAzienda: parseFloat(aliqAzienda) / 100,
      aliquotaBaseDipendente: parseFloat(aliqDip) / 100,
      agevolazioni: raw.agevolazioni.map(ag => ({
        ...ag,
        percentualeEsonero: parseFloat(agState[ag.id]?.esonero ?? String(ag.percentualeEsonero * 100)) / 100,
        massimaleAnnuo: agState[ag.id]?.massimale !== '' && agState[ag.id]?.massimale !== undefined
          ? parseFloat(agState[ag.id].massimale)
          : null,
        scadenza: agState[ag.id]?.scadenza ? new Date(agState[ag.id].scadenza).toISOString() : null,
      })),
    };
    await apiSalva(password, 'data/aliquote-inps.json', JSON.stringify(updated, null, 2), setSalvando, setFeedback);
  };

  const scadenzaBadge = (scadenza: string | null) => {
    if (!scadenza) return { label: 'Nessuna scadenza', bg: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)', border: 'var(--color-border)' };
    const daysLeft = (new Date(scadenza).getTime() - Date.now()) / 86400000;
    if (daysLeft < 90) return { label: fmtDate(scadenza), bg: 'var(--color-red-dim)', color: 'var(--color-red)', border: 'var(--color-red)' };
    return { label: fmtDate(scadenza), bg: 'var(--color-green-dim)', color: 'var(--color-green)', border: 'var(--color-green)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {updatedAtLabel(raw?.updatedAt)}

      <SectionTitle>Aliquote INPS base</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <NumInput
          label="Contributo INPS aziendale (%)"
          value={aliqAzienda}
          onChange={setAliqAzienda}
          suffix="%"
          step="0.001"
          warn={warnRange(parseFloat(aliqAzienda) || 0, 0, 100)}
          warnMsg="Fuori range 0–100%"
        />
        <NumInput
          label="Contributo INPS dipendente (%)"
          value={aliqDip}
          onChange={setAliqDip}
          suffix="%"
          step="0.001"
          warn={warnRange(parseFloat(aliqDip) || 0, 0, 100)}
          warnMsg="Fuori range 0–100%"
        />
      </div>

      <SectionTitle>Agevolazioni contributive</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {(raw?.agevolazioni ?? []).map(ag => {
          const badge = scadenzaBadge(ag.scadenza);
          const st = agState[ag.id];
          const isOpen = expanded[ag.id] ?? false;
          return (
            <div key={ag.id} style={{
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              background: 'var(--color-bg-elevated)',
              overflow: 'hidden',
            }}>
              <button
                onClick={() => setExpanded(prev => ({ ...prev, [ag.id]: !prev[ag.id] }))}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-primary)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'left',
                }}
              >
                <span>{ag.nome}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontSize: '10px',
                    fontFamily: "'DM Mono', monospace",
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: badge.bg,
                    color: badge.color,
                    border: `1px solid ${badge.border}`,
                  }}>{badge.label}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>
              {isOpen && st && (
                <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--color-border)' }}>
                  <div style={{ paddingTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <NumInput
                      label="Esonero contributivo (%)"
                      value={st.esonero}
                      onChange={v => setAgState(prev => ({ ...prev, [ag.id]: { ...prev[ag.id], esonero: v } }))}
                      suffix="%"
                      step="0.01"
                      warn={warnRange(parseFloat(st.esonero) || 0, 0, 100)}
                      warnMsg="Fuori range 0–100%"
                    />
                    <NumInput
                      label="Massimale annuo (€)"
                      value={st.massimale}
                      onChange={v => setAgState(prev => ({ ...prev, [ag.id]: { ...prev[ag.id], massimale: v } }))}
                      prefix="€"
                      step="100"
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Scadenza</label>
                      <input
                        type="date"
                        value={st.scadenza}
                        onChange={e => setAgState(prev => ({ ...prev, [ag.id]: { ...prev[ag.id], scadenza: e.target.value } }))}
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: '13px',
                          padding: '7px 10px',
                          background: 'var(--color-bg-input)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '6px',
                          color: 'var(--color-text-primary)',
                        }}
                      />
                    </div>
                  </div>
                  <textarea
                    readOnly
                    value={`${ag.descrizione}\n\nFonte: ${ag.fonteLegge}`}
                    rows={3}
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: '12px',
                      padding: '8px 10px',
                      background: 'var(--color-bg-input)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      color: 'var(--color-text-muted)',
                      resize: 'none',
                      width: '100%',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <FeedbackBanner feedback={feedback} />
      <SaveButton label="Salva INPS" solaLettura={solaLettura} salvando={salvando} onClick={() => { void salva(); }} />
    </div>
  );
}

// ─── TAB 2: Tariffe INAIL ─────────────────────────────────────────────────────

function TabInail({ password, solaLettura }: TabProps) {
  const [raw, setRaw] = useState<InailData | null>(null);
  const [tassi, setTassi] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const carica = useCallback(async () => {
    try {
      const parsed: InailData = JSON.parse(await apiLeggi(password, 'data/inail.json'));
      const t: Record<string, string> = {};
      for (const v of parsed.voci ?? []) t[v.codice] = String(v.tassoPerMille);
      setTassi(t);
      setRaw(parsed);
    } catch (e) {
      setFeedback({ tipo: 'errore', messaggio: e instanceof Error ? e.message : 'Errore nel caricamento del file' });
    }
  }, [password]);

  useEffect(() => { void carica(); }, [carica]);

  const salva = async () => {
    if (!raw) return;
    const updated: InailData = {
      ...raw,
      voci: raw.voci.map(v => ({ ...v, tassoPerMille: parseFloat(tassi[v.codice] ?? String(v.tassoPerMille)) })),
    };
    await apiSalva(password, 'data/inail.json', JSON.stringify(updated, null, 2), setSalvando, setFeedback);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {updatedAtLabel(raw?.updatedAt)}
      <SectionTitle>Voci e tassi INAIL</SectionTitle>
      <div style={{
        border: '1px solid var(--color-border)',
        borderRadius: '10px',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-elevated)' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: '12px' }}>Codice</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: '12px' }}>Settore</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: '12px' }}>Tasso ‰</th>
            </tr>
          </thead>
          <tbody>
            {(raw?.voci ?? []).map((v, i) => {
              const val = parseFloat(tassi[v.codice] ?? '0');
              const warn = warnRange(val, 0.1, 200); // max 200‰: edilizia industriale arriva a 110‰
              return (
                <tr key={v.codice} style={{ background: i % 2 === 0 ? 'var(--color-bg-base)' : 'var(--color-bg-surface)', borderTop: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '8px 14px', fontFamily: "'DM Mono', monospace", color: 'var(--color-accent-bright)' }}>{v.codice}</td>
                  <td style={{ padding: '8px 14px', color: 'var(--color-text-secondary)' }}>{v.settore}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      {warn && <span style={{ fontSize: '10px', color: 'var(--color-amber)' }}>⚠</span>}
                      <input
                        type="number"
                        value={tassi[v.codice] ?? ''}
                        step="0.1"
                        onChange={e => setTassi(prev => ({ ...prev, [v.codice]: e.target.value }))}
                        style={{
                          width: '90px',
                          textAlign: 'right',
                          fontFamily: "'DM Mono', monospace",
                          fontSize: '13px',
                          padding: '4px 8px',
                          background: 'var(--color-bg-input)',
                          border: `1px solid ${warn ? 'var(--color-amber)' : 'var(--color-border)'}`,
                          borderRadius: '6px',
                          color: 'var(--color-text-primary)',
                        }}
                      />
                      <span style={{ fontFamily: "'DM Mono', monospace", color: 'var(--color-text-muted)', fontSize: '12px' }}>‰</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <FeedbackBanner feedback={feedback} />
      <SaveButton label="Salva INAIL" solaLettura={solaLettura} salvando={salvando} onClick={() => { void salva(); }} />
    </div>
  );
}

// ─── TAB 3: TFR ──────────────────────────────────────────────────────────────

function TabTfr({ password, solaLettura }: TabProps) {
  const [raw, setRaw] = useState<TfrData | null>(null);
  const [divisore, setDivisore] = useState('');
  const [quotaFissa, setQuotaFissa] = useState('');
  const [quotaCpi, setQuotaCpi] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const carica = useCallback(async () => {
    try {
      const parsed: TfrData = JSON.parse(await apiLeggi(password, 'data/tfr.json'));
      setDivisore(String(parsed.divisoreAnnuo));
      setQuotaFissa(String(+(parsed.rivalutazione.quotaFissa * 100).toFixed(4)));
      setQuotaCpi(String(+(parsed.rivalutazione.quotaVariabileCpi * 100).toFixed(4)));
      setRaw(parsed);
    } catch (e) {
      setFeedback({ tipo: 'errore', messaggio: e instanceof Error ? e.message : 'Errore nel caricamento del file' });
    }
  }, [password]);

  useEffect(() => { void carica(); }, [carica]);

  const salva = async () => {
    if (!raw) return;
    const updated: TfrData = {
      ...raw,
      divisoreAnnuo: parseFloat(divisore),
      rivalutazione: {
        ...raw.rivalutazione,
        quotaFissa: parseFloat(quotaFissa) / 100,
        quotaVariabileCpi: parseFloat(quotaCpi) / 100,
      },
    };
    await apiSalva(password, 'data/tfr.json', JSON.stringify(updated, null, 2), setSalvando, setFeedback);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {updatedAtLabel(raw?.updatedAt)}
      <SectionTitle>Parametri TFR</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        <NumInput
          label="Divisore annuo TFR"
          value={divisore}
          onChange={setDivisore}
          step="0.1"
          warn={warnRange(parseFloat(divisore) || 0, 10, 20)}
          warnMsg="Range consigliato: 10–20"
        />
        <NumInput
          label="Quota fissa rivalutazione (%)"
          value={quotaFissa}
          onChange={setQuotaFissa}
          suffix="%"
          step="0.001"
          warn={warnRange(parseFloat(quotaFissa) || 0, 0, 100)}
          warnMsg="Fuori range 0–100%"
        />
        <NumInput
          label="Quota variabile CPI (%)"
          value={quotaCpi}
          onChange={setQuotaCpi}
          suffix="%"
          step="0.001"
          warn={warnRange(parseFloat(quotaCpi) || 0, 0, 100)}
          warnMsg="Fuori range 0–100%"
        />
      </div>
      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '-10px' }}>
        Art. 2120 c.c. — normalmente divisore 13.5, quota fissa 1.5%, quota variabile CPI 75%
      </p>
      <FeedbackBanner feedback={feedback} />
      <SaveButton label="Salva TFR" solaLettura={solaLettura} salvando={salvando} onClick={() => { void salva(); }} />
    </div>
  );
}

// ─── TAB 4: CCNL ─────────────────────────────────────────────────────────────

function TabCcnl({ password, solaLettura }: TabProps) {
  const [selectedId, setSelectedId] = useState(CCNL_LIST[0].id);
  const [raw, setRaw] = useState<CcnlData | null>(null);
  const [mensilita, setMensilita] = useState('13');
  const [livelli, setLivelli] = useState<Record<string, string>>({});
  const [scattiPer, setScattiPer] = useState('');
  const [scattiImporto, setScattiImporto] = useState('');
  const [scattiMax, setScattiMax] = useState('');
  const [contributi, setContributi] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const selectedCcnl = CCNL_LIST.find(c => c.id === selectedId) ?? CCNL_LIST[0];

  const carica = useCallback(async () => {
    setRaw(null);
    setFeedback(null);
    try {
      const parsed: CcnlData = JSON.parse(await apiLeggi(password, selectedCcnl.path));
      setMensilita(String(parsed.mensilita));
      const lv: Record<string, string> = {};
      for (const l of parsed.livelli ?? []) lv[l.codice] = String(l.moltiplicatore);
      setLivelli(lv);
      setScattiPer(String(parsed.scattiAnzianita.periodicitaMesi));
      setScattiImporto(String(parsed.scattiAnzianita.importoPerScattoEuro));
      setScattiMax(String(parsed.scattiAnzianita.maxScatti));
      const ct: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed.contributiContrattuali?.azienda ?? {})) {
        ct[k] = String(+(v.percentuale * 100).toFixed(4));
      }
      setContributi(ct);
      setRaw(parsed);
    } catch (e) {
      setFeedback({ tipo: 'errore', messaggio: e instanceof Error ? e.message : 'Errore nel caricamento del file' });
    }
  }, [selectedCcnl.path, password]);

  useEffect(() => { void carica(); }, [carica]);

  const salva = async () => {
    if (!raw) return;
    const updated: CcnlData = {
      ...raw,
      mensilita: parseInt(mensilita, 10),
      livelli: raw.livelli.map(l => ({ ...l, moltiplicatore: parseFloat(livelli[l.codice] ?? String(l.moltiplicatore)) })),
      scattiAnzianita: {
        periodicitaMesi: parseInt(scattiPer, 10),
        importoPerScattoEuro: parseFloat(scattiImporto),
        maxScatti: parseInt(scattiMax, 10),
      },
      contributiContrattuali: {
        ...raw.contributiContrattuali,
        azienda: Object.fromEntries(
          Object.entries(raw.contributiContrattuali.azienda).map(([k, v]) => [
            k,
            { ...v, percentuale: parseFloat(contributi[k] ?? String(v.percentuale * 100)) / 100 },
          ])
        ),
      },
    };
    await apiSalva(password, selectedCcnl.path, JSON.stringify(updated, null, 2), setSalvando, setFeedback);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* CCNL selector pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {CCNL_LIST.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedId(c.id)}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              border: `1px solid ${selectedId === c.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
              background: selectedId === c.id ? 'var(--color-accent-glow)' : 'transparent',
              color: selectedId === c.id ? 'var(--color-accent-bright)' : 'var(--color-text-secondary)',
              fontSize: '12px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              cursor: 'pointer',
              fontWeight: selectedId === c.id ? 600 : 400,
            }}
          >{c.nome}</button>
        ))}
      </div>

      {raw && (
        <>
          {updatedAtLabel(raw.updatedAt)}

          {/* A - Mensilità */}
          <SectionTitle>Mensilità contrattuali</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Mensilità previste dal contratto
            </label>
            <select
              value={mensilita}
              onChange={e => setMensilita(e.target.value)}
              style={{
                padding: '7px 10px',
                background: 'var(--color-bg-input)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                color: 'var(--color-text-primary)',
                fontFamily: "'DM Mono', monospace",
                fontSize: '13px',
              }}
            >
              <option value="13">13</option>
              <option value="14">14</option>
            </select>
          </div>

          {/* B - Livelli */}
          <SectionTitle>Livelli contrattuali</SectionTitle>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-elevated)' }}>
                  <th style={{ padding: '9px 14px', textAlign: 'left', color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 500 }}>Codice</th>
                  <th style={{ padding: '9px 14px', textAlign: 'left', color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 500 }}>Descrizione</th>
                  <th style={{ padding: '9px 14px', textAlign: 'right', color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 500 }}>Moltiplicatore RAL</th>
                </tr>
              </thead>
              <tbody>
                {raw.livelli.map((l, i) => {
                  const val = parseFloat(livelli[l.codice] ?? '0');
                  const warn = warnRange(val, 0.5, 3.0);
                  return (
                    <tr key={l.codice} style={{ background: i % 2 === 0 ? 'var(--color-bg-base)' : 'var(--color-bg-surface)', borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '8px 14px', fontFamily: "'DM Mono', monospace", color: 'var(--color-accent-bright)' }}>{l.codice}</td>
                      <td style={{ padding: '8px 14px', color: 'var(--color-text-secondary)' }}>{l.descrizione}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          {warn && <span style={{ fontSize: '10px', color: 'var(--color-amber)' }}>⚠</span>}
                          <input
                            type="number"
                            value={livelli[l.codice] ?? ''}
                            step="0.01"
                            onChange={e => setLivelli(prev => ({ ...prev, [l.codice]: e.target.value }))}
                            style={{
                              width: '90px',
                              textAlign: 'right',
                              fontFamily: "'DM Mono', monospace",
                              fontSize: '13px',
                              padding: '4px 8px',
                              background: 'var(--color-bg-input)',
                              border: `1px solid ${warn ? 'var(--color-amber)' : 'var(--color-border)'}`,
                              borderRadius: '6px',
                              color: 'var(--color-text-primary)',
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '-12px' }}>
            1.00 = livello base; &gt;1.00 = livello superiore
          </p>

          {/* C - Scatti */}
          <SectionTitle>Scatti di anzianità</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <NumInput
              label="Periodicità scatti (mesi)"
              value={scattiPer}
              onChange={setScattiPer}
              step="1"
            />
            <NumInput
              label="Importo per scatto (€)"
              value={scattiImporto}
              onChange={setScattiImporto}
              prefix="€"
              step="0.01"
            />
            <NumInput
              label="Numero massimo scatti"
              value={scattiMax}
              onChange={setScattiMax}
              step="1"
            />
          </div>

          {/* D - Contributi contrattuali */}
          {Object.keys(raw.contributiContrattuali.azienda).length > 0 && (
            <>
              <SectionTitle>Contributi contrattuali azienda</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(raw.contributiContrattuali.azienda).map(([k, v]) => {
                  const val = parseFloat(contributi[k] ?? '0');
                  const warn = warnRange(val, 0, 100);
                  return (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 14px', background: 'var(--color-bg-elevated)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                      <div style={{ width: '120px', flexShrink: 0 }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', color: 'var(--color-gold)' }}>{k}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {warn && <span style={{ fontSize: '10px', color: 'var(--color-amber)' }}>⚠</span>}
                        <input
                          type="number"
                          value={contributi[k] ?? ''}
                          step="0.001"
                          onChange={e => setContributi(prev => ({ ...prev, [k]: e.target.value }))}
                          style={{
                            width: '80px',
                            textAlign: 'right',
                            fontFamily: "'DM Mono', monospace",
                            fontSize: '13px',
                            padding: '5px 8px',
                            background: 'var(--color-bg-input)',
                            border: `1px solid ${warn ? 'var(--color-amber)' : 'var(--color-border)'}`,
                            borderRadius: '6px',
                            color: 'var(--color-text-primary)',
                          }}
                        />
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', color: 'var(--color-text-muted)' }}>%</span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{v.descrizione}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <FeedbackBanner feedback={feedback} />
          <SaveButton label={`Salva CCNL ${raw.nome}`} solaLettura={solaLettura} salvando={salvando} onClick={() => { void salva(); }} />
        </>
      )}

      {!raw && !feedback && (
        <p style={{ color: 'var(--color-text-muted)', fontFamily: "'DM Mono', monospace", fontSize: '12px' }}>Caricamento...</p>
      )}
      {!raw && feedback && <FeedbackBanner feedback={feedback} />}
    </div>
  );
}

// ─── TAB 5: Documentazione Engine ────────────────────────────────────────────

function TabDocs() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    standard: false,
    domestico: false,
    irpef: false,
    agevolazioni: false,
    routing: false,
  });

  const toggle = (key: string) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const Code = ({ children }: { children: React.ReactNode }) => (
    <code style={{
      fontFamily: "'DM Mono', monospace",
      fontSize: '11px',
      background: 'var(--color-bg-elevated)',
      padding: '1px 5px',
      borderRadius: '3px',
      color: 'var(--color-accent-bright)',
    }}>{children}</code>
  );

  const NormBadge = ({ children }: { children: React.ReactNode }) => (
    <span style={{
      fontFamily: "'DM Mono', monospace",
      fontSize: '9px',
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      color: 'var(--color-text-muted)',
      padding: '1px 6px',
      borderRadius: '4px',
      marginLeft: '6px',
      verticalAlign: 'middle',
    }}>{children}</span>
  );

  const stepStyle: React.CSSProperties = {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: '13px',
    color: 'var(--color-text-secondary)',
    lineHeight: '1.8',
  };

  const thStyle: React.CSSProperties = {
    padding: '8px 12px',
    textAlign: 'left' as const,
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--color-text-muted)',
    background: 'var(--color-bg-elevated)',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const tdBase: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: '12px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    color: 'var(--color-text-secondary)',
    borderTop: '1px solid var(--color-border)',
  };

  const tdMono: React.CSSProperties = {
    ...tdBase,
    fontFamily: "'DM Mono', monospace",
    color: 'var(--color-accent-bright)',
    fontSize: '11px',
  };

  const tableBox: React.CSSProperties = {
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '16px',
  };

  const AccordionSection = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => {
    const isOpen = openSections[id] ?? false;
    return (
      <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
        <button
          onClick={() => toggle(id)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            background: isOpen ? 'var(--color-bg-elevated)' : 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-primary)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '14px',
            fontWeight: 600,
            textAlign: 'left',
          }}
        >
          <span>{title}</span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>{isOpen ? '▲' : '▼'}</span>
        </button>
        {isOpen && (
          <div style={{ padding: '20px', borderTop: '1px solid var(--color-border)' }}>
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

      {/* Warning banner */}
      <div style={{
        padding: '10px 14px',
        borderRadius: '8px',
        border: '1px solid var(--color-amber)',
        background: 'rgba(245, 158, 11, 0.07)',
        color: 'var(--color-amber)',
        fontSize: '12px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        ⚠&nbsp; Documentazione generata dal codice sorgente — aggiornare manualmente dopo ogni modifica a <Code>lib/engine.ts</Code>
      </div>

      {/* ── 1. Branch Standard ─────────────────────────────────────── */}
      <AccordionSection id="standard" title="1. Branch Standard — Flusso di calcolo (14 step)">
        <ol style={{ ...stepStyle, paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
          <li><strong>Validazione Zod</strong> — schema <Code>InputSchema</Code>: <Code>ral</Code> 1.000–500.000€ · <Code>mensilita</Code> 13–16 · <Code>oreLavoro</Code> 1–48</li>
          <li><strong>RAL effettiva</strong> — <Code>ral × (oreLavoro / 40)</Code>; se <Code>retribuzionePersonalizzata &gt; 0</Code> usa quella al posto di <Code>ral</Code></li>
          <li><strong>Superminimo</strong> — <Code>MAX(0, retribuzionePersonalizzata × oreRatio − minimoTabellare × mensilita)</Code> — solo informativo</li>
          <li><strong>INPS datoriale</strong> — <Code>calcolaInpsBase(ralEffettiva, aliquotaInps)</Code>; <Code>aliquotaInps</Code> da <Code>aliquote-inps.json → settoriContributivi[settore]</Code> via <Code>getSettoreContributivo</Code></li>
          <li><strong>Agevolazioni</strong> — <Code>calcolaAgevolazioni(&#123;...input, ral: ralEffettiva&#125;)</Code> → riduzione <Code>inpsBase</Code>; rispetta <Code>nonCumulabileCon</Code> e <Code>massimaleAnnuo</Code></li>
          <li><strong>TFR</strong> <NormBadge>Art. 2120 c.c.</NormBadge> — <Code>ralEffettiva / 13.5</Code></li>
          <li><strong>INAIL</strong> <NormBadge>D.P.R. 1124/1965</NormBadge> — <Code>(ralEffettiva × tassoPerMille) / 1000</Code></li>
          <li><strong>Tredicesima</strong> — <Code>ralEffettiva / 12</Code> — informativa, già inclusa nella RAL</li>
          <li><strong>Quattordicesima</strong> — <Code>ralEffettiva / 12</Code> se <Code>mensilita &gt;= 14</Code> — informativa</li>
          <li><strong>Mensilità extra (15ª/16ª)</strong> — <Code>(ralEffettiva / 12) × (mensilita − 14)</Code> se <Code>mensilita &gt;= 15</Code></li>
          <li><strong>Contributi CCNL</strong> — per ogni voce in <Code>ccnl.contributiContrattuali.azienda</Code>: <Code>fisso</Code> → <Code>importoMensile × 12</Code> (o <Code>× oreAnnue</Code> se <Code>perOra: true</Code>); <Code>percentuale</Code> → <Code>ralEffettiva × percentuale</Code></li>
          <li><strong>Scatti di anzianità</strong> — <Code>Math.floor(anzianitaAnni / (periodicitaMesi/12))</Code> scatti × <Code>importoPerScattoEuro × 12</Code> (oppure <Code>percentualeScatto × ralEffettiva</Code>)</li>
          <li><strong>Elementi aggiuntivi CCNL</strong> — <Code>elementiAggiuntivi[*].importoMensile × mensilita</Code> (solo quelli senza <Code>condizione</Code>)</li>
          <li><strong>Totale</strong> — <Code>ralEffettiva + inpsNetto + tfr + inail + contributiCcnl + costoScatti + costoElementiAggiuntivi</Code></li>
        </ol>
        <div style={{
          marginTop: '16px',
          padding: '10px 14px',
          borderRadius: '6px',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          lineHeight: '1.6',
        }}>
          ⚠ Tredicesima, quattordicesima e mensilità extra sono <strong>voci informative</strong> — non si sommano al totale perché già incluse nella RAL.
          &nbsp;·&nbsp;
          <strong>Sanity check:</strong> se <Code>costoTotale / ralEffettiva</Code> è fuori da <Code>[1.28, 1.60]</Code> viene loggato un warning in console.
        </div>
      </AccordionSection>

      {/* ── 2. Branch Domestico ────────────────────────────────────── */}
      <AccordionSection id="domestico" title="2. Branch Domestico — Flusso di calcolo">
        <ol style={{ ...stepStyle, paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
          <li><strong>Input specifici</strong> — <Code>pagaOraria</Code> (default: <Code>livello.minimoTabellare</Code>), <Code>oreSettimanali</Code> (default: <Code>oreLavoro</Code>), <Code>convivente</Code></li>
          <li><strong>RAL base</strong> — <Code>pagaOraria × oreSettimanali × 52</Code></li>
          <li><strong>Indennità vitto e alloggio</strong> — solo se <Code>convivente === true</Code>: da <Code>aliquote-inps.json → settoriContributivi.domestici.indennitaVittoAlloggioMensile × 12</Code></li>
          <li><strong>RAL effettiva</strong> — <Code>retribuzioneBaseAnnua + indennitaVAAnnua</Code></li>
          <li>
            <strong>Contributi INPS forfettari</strong> <NormBadge>Circ. INPS n. 9/2026</NormBadge> — da <Code>contributiOrari</Code>:
            <ul style={{ paddingLeft: '18px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <li>Se <Code>convivente &amp;&amp; oreSettimanali &gt; 24</Code> → tabella <Code>conviventiOltre24h</Code></li>
              <li>Altrimenti → tabella <Code>conCUAF</Code> per fascia di <Code>pagaOraria</Code></li>
              <li>Importo: <Code>contributoOrarioDatore × oreSettimanali × 52</Code></li>
            </ul>
          </li>
          <li><strong>TFR</strong> <NormBadge>Art. 2120 c.c.</NormBadge> — <Code>ralEffettiva / 13.5</Code></li>
          <li><strong>Scatti</strong> — calcolati in ore: <Code>calcolaScattiAnzianita × oreSettimanali × 52 / 12</Code></li>
          <li><strong>Tredicesima</strong> — <Code>ralEffettiva / 12</Code></li>
          <li><strong>INAIL</strong> — <strong>€0</strong> nel costo datore (incluso nei contributi forfettari INPS — ≈€1.040/anno a carico lavoratore tramite MAV/F24 trimestrale)</li>
          <li><strong>Netto dipendente</strong> <NormBadge>Art. 4 DPR 322/1998</NormBadge> — <Code>ralEffettiva − (contributoOrarioLavoratore × oreAnnuali)</Code>; no IRPEF (datore privato non è sostituto d&apos;imposta)</li>
          <li><strong>Totale</strong> — <Code>ralEffettiva + inpsDatore + tfr + costoScatti + tredicesima</Code></li>
        </ol>
      </AccordionSection>

      {/* ── 3. IRPEF ──────────────────────────────────────────────── */}
      <AccordionSection id="irpef" title="3. Calcolo IRPEF dipendente — Branch Standard">
        <p style={{ ...stepStyle, marginBottom: '10px' }}>
          Sequenza in <Code>calcolaNettoDipendente</Code>:
        </p>
        <ol style={{ ...stepStyle, paddingLeft: '20px', margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <li><Code>inpsDipendente = ral × aliquotaInpsDipendente</Code></li>
          <li><Code>imponibileIrpef = ral − inpsDipendente</Code></li>
        </ol>

        <p style={{ ...stepStyle, fontWeight: 600, marginBottom: '8px' }}>
          Scaglioni IRPEF lorda <NormBadge>L.207/2024 + L.199/2025</NormBadge>
        </p>
        <div style={tableBox}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Reddito imponibile</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Aliquota</th>
                <th style={thStyle}>Formula</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdBase}>≤ 28.000€</td>
                <td style={{ ...tdMono, textAlign: 'right' }}>23%</td>
                <td style={tdBase}>imponibile × 23%</td>
              </tr>
              <tr>
                <td style={tdBase}>28.001€ – 50.000€</td>
                <td style={{ ...tdMono, textAlign: 'right' }}>33%</td>
                <td style={tdBase}>28.000 × 23% + eccedenza × 33%</td>
              </tr>
              <tr>
                <td style={tdBase}>&gt; 50.000€</td>
                <td style={{ ...tdMono, textAlign: 'right' }}>43%</td>
                <td style={tdBase}>+ ulteriore eccedenza × 43%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p style={{ ...stepStyle, fontWeight: 600, marginBottom: '8px' }}>
          Detrazione lavoro dipendente <NormBadge>Art. 13 TUIR</NormBadge>
        </p>
        <div style={tableBox}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Reddito</th>
                <th style={thStyle}>Detrazione</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={tdBase}>≤ 15.000€</td><td style={tdMono}>MAX(1.955, detrazioneMinima)</td></tr>
              <tr><td style={tdBase}>15.001€ – 28.000€</td><td style={tdMono}>MAX(0, 1.910 + 1.190 × (28.000 − reddito) / 13.000)</td></tr>
              <tr><td style={tdBase}>28.001€ – 50.000€</td><td style={tdMono}>MAX(0, 1.910 × (50.000 − reddito) / 22.000)</td></tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: "'DM Mono', monospace", marginBottom: '16px' }}>
          detrazioneMinima: 690€ (contratto a tempo indeterminato) / 1.380€ (determinato)
        </p>

        <p style={{ ...stepStyle, fontWeight: 600, marginBottom: '8px' }}>
          Bonus cuneo fiscale 2025 <NormBadge>L.207/2024 art. 1 cc. 4-9</NormBadge>
        </p>
        <div style={tableBox}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Reddito</th>
                <th style={thStyle}>Bonus</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={tdBase}>≤ 8.500€</td><td style={tdMono}>7,1%</td></tr>
              <tr><td style={tdBase}>8.501€ – 15.000€</td><td style={tdMono}>603,50€ + eccedenza × 5,3%</td></tr>
              <tr><td style={tdBase}>15.001€ – 20.000€</td><td style={tdMono}>948,00€ + eccedenza × 4,8%</td></tr>
              <tr><td style={tdBase}>20.001€ – 32.000€</td><td style={tdMono}>1.000€ fisso</td></tr>
              <tr><td style={tdBase}>32.001€ – 40.000€</td><td style={tdMono}>1.000€ × (40.000 − reddito) / 8.000</td></tr>
              <tr><td style={tdBase}>&gt; 40.000€</td><td style={tdMono}>0€</td></tr>
            </tbody>
          </table>
        </div>

        <ol start={6} style={{ ...stepStyle, paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <li><Code>irpefNetta = MAX(0, irpefLorda − detrazioneLavoroDip − bonusCuneoFiscale)</Code></li>
          <li><Code>addizionaleRegionale = imponibile × 1,73%</Code> (media nazionale stimata)</li>
          <li><Code>addizionaleComunale = imponibile × 0,80%</Code> (media nazionale stimata)</li>
          <li><Code>nettoAnnuo = ral − inpsDipendente − irpefNetta − addRegionale − addComunale</Code></li>
        </ol>
      </AccordionSection>

      {/* ── 4. Agevolazioni ───────────────────────────────────────── */}
      <AccordionSection id="agevolazioni" title="4. Agevolazioni contributive — Logica di calcolo">
        <p style={{ ...stepStyle, marginBottom: '10px' }}>
          Logica in <Code>calcolaAgevolazioni</Code> (<Code>lib/contributi.ts</Code>):
        </p>
        <ul style={{ ...stepStyle, paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
          <li>Le agevolazioni disponibili arrivano da <Code>aliquote-inps.json → agevolazioni[]</Code></li>
          <li>Conflitti (<Code>nonCumulabileCon</Code>): si ordina per <Code>massimaleAnnuo DESC</Code> (<Code>null = 999.999€</Code>), si applica la più vantaggiosa, si escludono le conflittuali</li>
          <li>Per ogni agevolazione: <Code>risparmio = MIN(inpsBase × percentualeEsonero, massimaleAnnuo ?? ∞)</Code></li>
          <li>Alert scadenza: se <Code>scadenzaAlertGiorni != null</Code> e la scadenza è entro 90 giorni</li>
        </ul>
      </AccordionSection>

      {/* ── 5. Routing ────────────────────────────────────────────── */}
      <AccordionSection id="routing" title="5. Regole di routing — Selezione branch">
        <div style={tableBox}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Condizione</th>
                <th style={thStyle}>Branch</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdMono}>{`ccnlId === 'domestici'`}</td>
                <td style={{ ...tdBase, color: 'var(--color-green)', fontFamily: "'DM Mono', monospace", fontSize: '12px' }}>calculateCostoDomestico</td>
              </tr>
              <tr>
                <td style={tdBase}>Tutti gli altri CCNL</td>
                <td style={{ ...tdBase, color: 'var(--color-accent-bright)', fontFamily: "'DM Mono', monospace", fontSize: '12px' }}>calculateCosto (standard)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AccordionSection>

    </div>
  );
}

// ─── Save button ──────────────────────────────────────────────────────────────

function SaveButton({ label, salvando, solaLettura, onClick }: {
  label: string;
  salvando: boolean;
  solaLettura: boolean;
  onClick: () => void;
}) {
  const testo = solaLettura ? 'Genera JSON da committare' : label;
  return (
    <button
      onClick={onClick}
      disabled={salvando}
      style={{
        padding: '11px 24px',
        background: salvando ? 'var(--color-bg-elevated)' : 'var(--color-accent)',
        color: salvando ? 'var(--color-text-muted)' : 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: salvando ? 'not-allowed' : 'pointer',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: '13px',
        fontWeight: 600,
        transition: 'background 0.15s ease, opacity 0.15s ease',
        alignSelf: 'flex-start',
      }}
    >
      {salvando ? 'Elaborazione...' : testo}
    </button>
  );
}

// ─── Main AdminPage ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [autenticato, setAutenticato] = useState(false);
  const [solaLettura, setSolaLettura] = useState(false);
  const [verificaInCorso, setVerificaInCorso] = useState(false);
  const [erroreLogin, setErroreLogin] = useState('');
  const [tabAttivo, setTabAttivo] = useState<'inps' | 'inail' | 'tfr' | 'ccnl' | 'docs'>('inps');

  // La password è verificata dal server prima di entrare: così un errore di
  // battitura non si manifesta come banner rosso dentro ogni tab.
  const accedi = async () => {
    if (!password.trim()) {
      setErroreLogin('Inserisci la password');
      return;
    }
    setVerificaInCorso(true);
    setErroreLogin('');
    try {
      const res = await fetch('/api/admin/stato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json() as { ok?: boolean; solaLettura?: boolean; errore?: string };
      if (!res.ok || !json.ok) throw new Error(json.errore ?? 'Accesso non riuscito');
      setSolaLettura(Boolean(json.solaLettura));
      setAutenticato(true);
    } catch (e) {
      setErroreLogin(e instanceof Error ? e.message : 'Accesso non riuscito');
    } finally {
      setVerificaInCorso(false);
    }
  };

  if (!autenticato) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-base)' }}>
        <div style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '32px',
          width: '100%',
          maxWidth: '360px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '20px', color: 'var(--color-text-primary)', margin: 0 }}>
            Pannello Admin
          </h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
            Inserisci la password per accedere alla gestione dei dati.
          </p>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void accedi(); }}
            placeholder="Password admin"
            style={{ padding: '11px 14px', borderRadius: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}
          />
          {erroreLogin && <p style={{ fontSize: '12px', color: 'var(--color-red)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{erroreLogin}</p>}
          <button
            onClick={() => { void accedi(); }}
            disabled={verificaInCorso}
            style={{
              padding: '11px',
              background: verificaInCorso ? 'var(--color-bg-elevated)' : 'var(--color-accent)',
              color: verificaInCorso ? 'var(--color-text-muted)' : 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: verificaInCorso ? 'not-allowed' : 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {verificaInCorso ? 'Verifica...' : 'Accedi'}
          </button>
        </div>
      </main>
    );
  }

  const TABS: { id: 'inps' | 'inail' | 'tfr' | 'ccnl' | 'docs'; label: string }[] = [
    { id: 'inps',  label: 'INPS & Agevolazioni' },
    { id: 'inail', label: 'Tariffe INAIL' },
    { id: 'tfr',   label: 'TFR' },
    { id: 'ccnl',  label: 'CCNL' },
    { id: 'docs',  label: 'Documentazione Engine' },
  ];

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-bg-base)' }}>
      <AppHeader />
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '80px 24px 48px' }}>

        {/* Page title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '22px', color: 'var(--color-text-primary)', margin: 0 }}>
            Gestione parametri fiscali
          </h2>
          <a href="/calcolatore" style={{ fontSize: '13px', color: 'var(--color-accent-bright)', textDecoration: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            ← Torna al calcolatore
          </a>
        </div>

        {/* Warning banner — il flusso cambia a seconda dell'ambiente */}
        <div style={{
          padding: '12px 14px',
          borderRadius: '8px',
          border: `1px solid ${solaLettura ? 'var(--color-amber)' : 'var(--color-border)'}`,
          background: solaLettura ? 'var(--color-amber-dim)' : 'var(--color-bg-elevated)',
          color: solaLettura ? 'var(--color-amber)' : 'var(--color-text-secondary)',
          fontSize: '12px',
          lineHeight: 1.6,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          marginBottom: '24px',
        }}>
          {solaLettura ? (
            <>
              ⚠ <strong>Ambiente in sola lettura.</strong> I file di dati sono inclusi nel bundle
              al momento del deploy, quindi qui non possono essere riscritti. Il pannello valida
              le modifiche e produce il JSON da sostituire in repo: dopo il commit e il nuovo
              deploy i calcoli useranno i valori aggiornati.
            </>
          ) : (
            <>
              ⚠ Le modifiche vengono scritte sul file in <code>data/</code>. I JSON sono letti
              all&apos;avvio del server: i calcoli useranno i nuovi valori dopo il riavvio.
              Verifica i valori prima di salvare.
            </>
          )}
        </div>

        {/* Tab navigation */}
        <div style={{
          display: 'flex',
          gap: '2px',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '28px',
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTabAttivo(t.id)}
              style={{
                padding: '10px 20px',
                background: tabAttivo === t.id ? 'var(--color-bg-elevated)' : 'transparent',
                border: 'none',
                borderBottom: tabAttivo === t.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                color: tabAttivo === t.id ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '13px',
                fontWeight: tabAttivo === t.id ? 600 : 400,
                cursor: 'pointer',
                marginBottom: '-1px',
                borderRadius: '6px 6px 0 0',
                transition: 'color 0.15s ease, background 0.15s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ background: 'var(--color-bg-surface)', borderRadius: '10px', border: '1px solid var(--color-border)', padding: '28px' }}>
          {tabAttivo === 'inps'  && <TabInps  password={password} solaLettura={solaLettura} />}
          {tabAttivo === 'inail' && <TabInail password={password} solaLettura={solaLettura} />}
          {tabAttivo === 'tfr'   && <TabTfr   password={password} solaLettura={solaLettura} />}
          {tabAttivo === 'ccnl'  && <TabCcnl  password={password} solaLettura={solaLettura} />}
          {tabAttivo === 'docs'  && <TabDocs />}
        </div>

      </div>
    </main>
  );
}
