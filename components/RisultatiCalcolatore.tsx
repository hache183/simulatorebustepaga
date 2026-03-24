'use client';

import type { CalcolatoreOutput } from '@/types';

const eur = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => (n * 100).toFixed(1) + '%';

const COLORI_CATEGORIA: Record<string, string> = {
  ral:             'bg-blue-500',
  inps_azienda:    'bg-orange-400',
  tfr:             'bg-green-500',
  inail:           'bg-yellow-400',
  tredicesima:     'bg-purple-400',
  quattordicesima: 'bg-pink-400',
  ccnl_contrattuale: 'bg-gray-400',
  agevolazione:    'bg-emerald-400',
};

interface Props {
  risultato: CalcolatoreOutput;
  onRicalcola: () => void;
}

export function RisultatiCalcolatore({ risultato, onRicalcola }: Props) {
  const { costoTotaleAnnuo, costoTotaleMensile, percentualeRal, voci, agevolazioniApplicate, alertScadenze } = risultato;
  const risparmioTotale = agevolazioniApplicate.reduce((s, a) => s + a.risparmioAnnuo, 0);

  return (
    <div className="space-y-6 print:space-y-4">

      {/* Alert scadenze */}
      {alertScadenze.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 print:border-amber-400">
          <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Agevolazioni in scadenza</p>
          {alertScadenze.map(a => (
            <p key={a.agevolazioneId} className="text-sm text-amber-700">
              {a.nome}: scade tra <strong>{a.giorniRimanenti} giorni</strong> ({new Date(a.scadenza).toLocaleDateString('it-IT')})
            </p>
          ))}
        </div>
      )}

      {/* Card riepilogo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-900 text-white rounded-xl p-4 col-span-1">
          <p className="text-xs text-blue-200 uppercase tracking-wide">Costo annuo</p>
          <p className="text-2xl font-bold mt-1">{eur(costoTotaleAnnuo)}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Costo mensile</p>
          <p className="text-xl font-bold text-gray-800 mt-1">{eur(costoTotaleMensile)}</p>
        </div>
        <div className={`border rounded-xl p-4 ${percentualeRal > 1.45 ? 'border-red-300 bg-red-50' : 'bg-white'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wide">% sulla RAL</p>
          <p className={`text-xl font-bold mt-1 ${percentualeRal > 1.45 ? 'text-red-600' : 'text-gray-800'}`}>
            {pct(percentualeRal)}
          </p>
        </div>
      </div>

      {/* Barra visiva */}
      <div>
        <p className="text-sm font-medium text-gray-600 mb-2">Composizione del costo</p>
        <div className="flex h-4 rounded-full overflow-hidden">
          {voci.filter(v => v.importoAnnuo > 0).map(v => (
            <div
              key={v.id}
              className={COLORI_CATEGORIA[v.categoria] ?? 'bg-gray-300'}
              style={{ width: `${(v.importoAnnuo / costoTotaleAnnuo) * 100}%` }}
              title={`${v.descrizione}: ${eur(v.importoAnnuo)}`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {voci.filter(v => v.importoAnnuo > 0).map(v => (
            <div key={v.id} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-sm ${COLORI_CATEGORIA[v.categoria] ?? 'bg-gray-300'}`} />
              <span className="text-xs text-gray-600">{v.descrizione.split(' — ')[0].split('(')[0].trim()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabella dettaglio */}
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-2.5 px-4 font-semibold text-gray-600">Voce di costo</th>
              <th className="text-right py-2.5 px-4 font-semibold text-gray-600">Annuo</th>
              <th className="text-right py-2.5 px-4 font-semibold text-gray-600">Mensile</th>
              <th className="text-right py-2.5 px-4 font-semibold text-gray-600">% RAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {voci.map((v, i) => (
              <tr key={v.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="py-2.5 px-4 text-gray-700">
                  <div>{v.descrizione}</div>
                  {v.notaLegge && <div className="text-xs text-gray-400">{v.notaLegge}</div>}
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-gray-800">{eur(v.importoAnnuo)}</td>
                <td className="py-2.5 px-4 text-right font-mono text-gray-500">{eur(v.importoMensile)}</td>
                <td className="py-2.5 px-4 text-right text-gray-600">{pct(v.percentualeRal)}</td>
              </tr>
            ))}
            {risparmioTotale > 0 && (
              <tr className="bg-emerald-50">
                <td className="py-2.5 px-4 text-emerald-700 font-medium">💰 Risparmio da agevolazioni</td>
                <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600">- {eur(risparmioTotale)}</td>
                <td className="py-2.5 px-4 text-right font-mono text-emerald-500">- {eur(risparmioTotale / 12)}</td>
                <td className="py-2.5 px-4 text-right text-emerald-600">- {pct(risparmioTotale / risultato.input.ral)}</td>
              </tr>
            )}
            <tr className="bg-blue-900 text-white">
              <td className="py-3 px-4 font-bold text-base">COSTO TOTALE AZIENDALE</td>
              <td className="py-3 px-4 text-right font-mono font-bold text-lg">{eur(costoTotaleAnnuo)}</td>
              <td className="py-3 px-4 text-right font-mono font-semibold">{eur(costoTotaleMensile)}</td>
              <td className="py-3 px-4 text-right font-semibold">{pct(percentualeRal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pulsanti */}
      <div className="flex gap-3 print:hidden">
        <button onClick={onRicalcola}
          className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors">
          ← Nuovo calcolo
        </button>
        <button onClick={() => window.print()}
          className="flex-1 bg-gray-800 text-white py-2.5 rounded-lg font-medium hover:bg-gray-900 transition-colors">
          🖨️ Stampa / Salva PDF
        </button>
      </div>
    </div>
  );
}
