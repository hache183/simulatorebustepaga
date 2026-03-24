'use client';

interface Props {
  updatedDates: string[]; // array di date ISO 8601 dai file JSON
}

export function Disclaimer({ updatedDates }: Props) {
  const dataMinima = updatedDates.length > 0
    ? new Date(Math.min(...updatedDates.map(d => new Date(d).getTime())))
    : null;

  const dataFormattata = dataMinima
    ? dataMinima.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'non disponibile';

  const isVecchio = dataMinima
    ? (Date.now() - dataMinima.getTime()) > 365 * 24 * 60 * 60 * 1000
    : false;

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-sm">
      <p className="font-semibold text-amber-900 mb-2">⚠️ Avviso importante — Limitazioni di responsabilità</p>
      <p className="text-amber-800 leading-relaxed">
        I calcoli forniti da questo strumento hanno valore puramente <strong>indicativo</strong> e non
        costituiscono parere professionale. Le aliquote contributive, le agevolazioni e i parametri
        contrattuali sono soggetti a variazioni normative e devono essere verificati con un{' '}
        <strong>consulente del lavoro abilitato</strong> ai sensi della L. 12/1979 prima di prendere
        qualsiasi decisione di assunzione.
      </p>
      <p className="mt-2 text-amber-700 text-xs">
        Fonti: CCNL di riferimento · Circolari INPS · Tariffe INAIL · Art. 2120 c.c.
      </p>
      <p className={`mt-1 text-xs font-medium ${isVecchio ? 'text-red-700' : 'text-amber-600'}`}>
        {isVecchio && '🔴 '}
        Dati aggiornati al: {dataFormattata}
        {isVecchio && ' — ATTENZIONE: aggiornamento dati scaduto (>12 mesi). Verificare le aliquote.'}
      </p>
    </div>
  );
}
