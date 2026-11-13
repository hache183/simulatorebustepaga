/** Avviso fisso nei risultati: stima indicativa, ricontatto del consulente e preventivo gratuito. Resta in stampa. */
export function AvvisoStima() {
  return (
    <p className="avviso-stima" data-testid="avviso-stima">
      <span className="avviso-stima__spunta" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 14 14">
          <path d="M2 7.5l3.2 3L12 3.5" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>
        Questa è una stima indicativa, per darti un’idea del costo. Non sostituisce un cedolino né un parere professionale.
        Un consulente del lavoro ti ricontatterà e elaborerà la tua richiesta con un <strong>preventivo totalmente gratuito</strong>.
      </span>
    </p>
  );
}
