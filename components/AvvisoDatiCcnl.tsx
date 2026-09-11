'use client';

import { fonteNonVerificata, tabellaScaduta } from '@/lib/ccnl';

interface Props {
  nomeCcnl: string;
  fonte?: string;
  validitaAl?: string | null;
}

const dataIt = (iso: string) => new Date(iso).toLocaleDateString('it-IT');

/**
 * Avviso sullo stato della tabella retributiva, mostrato prima che il
 * preventivo venga prodotto e stampato.
 *
 * Copre anche il caso in cui `validitaAl` manchi: senza una data dichiarata
 * non si può affermare che la tabella sia vigente, e un campo assente non
 * deve leggersi come "valida".
 */
export function AvvisoDatiCcnl({ nomeCcnl, fonte, validitaAl }: Props) {
  const scaduta = tabellaScaduta(validitaAl);
  const nonVerificata = fonteNonVerificata(fonte);
  const senzaValidita = !validitaAl;

  if (!scaduta && !nonVerificata && !senzaValidita) return null;

  const grave = scaduta || nonVerificata;
  const colore = grave ? 'var(--color-red)' : 'var(--color-amber)';
  const sfondo = grave ? 'var(--color-red-dim)' : 'var(--color-amber-dim)';

  const avvisi: string[] = [];
  if (scaduta && validitaAl) {
    avvisi.push(
      `La tabella retributiva è scaduta il ${dataIt(validitaAl)}: verificare il rinnovo prima di consegnare il preventivo.`,
    );
  }
  if (nonVerificata) {
    avvisi.push(
      'I minimi provengono da una fonte proxy o non verificata: possono non coincidere con la tabella ufficiale del CCNL.',
    );
  }
  if (senzaValidita) {
    avvisi.push(
      'Per questa tabella non è dichiarata una data di validità: la vigenza va confermata sulla fonte ufficiale, non si può presumere aggiornata.',
    );
  }

  return (
    <div
      className="avviso-dati"
      role="alert"
      style={{
        border: `1px solid ${colore}`,
        borderLeft: `4px solid ${colore}`,
        background: sfondo,
        borderRadius: '8px',
        padding: '12px 14px',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
      }}
    >
      <span style={{ fontSize: '14px', lineHeight: 1.4, flexShrink: 0 }}>{grave ? '⚠️' : 'ℹ️'}</span>
      <div style={{ minWidth: 0 }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 700,
          fontSize: '12px',
          color: colore,
          marginBottom: '4px',
        }}>
          {grave
            ? `Dati da verificare prima del preventivo — ${nomeCcnl}`
            : `Validità non dichiarata — ${nomeCcnl}`}
        </p>
        {avvisi.map(testo => (
          <p key={testo} style={{
            fontSize: '12px',
            lineHeight: 1.5,
            color: 'var(--color-text-secondary)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            {testo}
          </p>
        ))}
        {fonte && (
          <p style={{
            fontSize: '11px',
            marginTop: '6px',
            fontFamily: "'DM Mono', monospace",
            color: 'var(--color-text-muted)',
          }}>
            Fonte in archivio: {fonte}
          </p>
        )}
      </div>
    </div>
  );
}
