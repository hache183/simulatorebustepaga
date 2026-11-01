import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { listCcnlUi } from '@/lib/ccnl';

export const metadata = {
  title: 'CostWork Pro — Quanto costa un\'assunzione',
  description: 'Simula il costo aziendale e il netto del dipendente su CCNL, edilizia, lavoro domestico e compensi di soci e amministratori.',
};

const FAQ = [
  {
    q: 'Devo lasciare i dati prima di provare il simulatore?',
    a: 'No. CCNL, livello, RAL, orario e dati aziendali si compilano liberamente. Nome, email e telefono servono solo quando chiedi il report.',
  },
  {
    q: 'I parametri si perdono quando inserisco i recapiti?',
    a: 'No. Dopo l\'invio il calcolo parte da solo con i valori già inseriti e il prospetto compare subito.',
  },
  {
    q: 'Devo rifare il modulo ogni volta?',
    a: 'No. Un cookie tecnico sblocca i report sullo stesso browser per circa 30 giorni. Poi il modulo si ripresenta solo alla generazione del report.',
  },
  {
    q: 'Il risultato è un cedolino ufficiale?',
    a: 'È una simulazione indicativa: minimi tabellari, aliquote e regole del motore. Il caso concreto va verificato dal consulente.',
  },
];

export default function HomePage() {
  const contratti = listCcnlUi().length;
  const anno = new Date().getFullYear();

  return (
    <>
      <AppHeader />
      <main className="home">
        <section className="home-hero">
          <p className="home-kicker">Simulatore costo del lavoro · aliquote {anno}</p>
          <h1>Quanto costa davvero assumere una persona</h1>
          <p className="home-lead">
            CostWork Pro calcola il costo azienda e il netto del dipendente a partire dal CCNL,
            dal livello e dalla retribuzione. Compili i parametri subito. I recapiti si chiedono
            solo quando generi il report.
          </p>
          <div className="home-cta">
            <Link href="/calcolatore" className="ui-btn ui-btn--primary" data-testid="cta-simulatore">
              Apri il simulatore
            </Link>
            <Link href="/calcolatore?tab=soci" className="ui-btn ui-btn--secondary">
              Compensi societari
            </Link>
          </div>
          <ul className="home-stats">
            <li><strong>{contratti}</strong><span>CCNL nel modulo dipendenti</span></li>
            <li><strong>Costo e netto</strong><span>azienda, IRPEF e voci</span></li>
            <li><strong>4 moduli</strong><span>dipendenti, edili, domestici, soci</span></li>
          </ul>
        </section>

        <section className="home-section">
          <h2>A chi serve</h2>
          <div className="home-grid">
            <article className="home-card">
              <h3>Studi e consulenti del lavoro</h3>
              <p>Un prospetto da mostrare al cliente prima della lettera di assunzione, con le voci già separate.</p>
            </article>
            <article className="home-card">
              <h3>HR e amministrazione</h3>
              <p>Confronti livello, orario e agevolazioni senza ricostruire il costo a mano ogni volta.</p>
            </article>
            <article className="home-card">
              <h3>Imprenditori</h3>
              <p>Vedi il costo annuo e mensile e quanto resta in busta, prima di decidere l&apos;assunzione.</p>
            </article>
          </div>
        </section>

        <section className="home-section">
          <h2>Cosa calcola</h2>
          <div className="home-grid home-grid--2">
            <article className="home-card">
              <h3>Costo azienda</h3>
              <p>INPS a carico del datore, INAIL, TFR, tredicesima e altre mensilità, contributi contrattuali e agevolazioni selezionate.</p>
            </article>
            <article className="home-card">
              <h3>Netto del dipendente</h3>
              <p>Trattenute INPS, IRPEF con detrazioni da lavoro dipendente e addizionali regionale e comunale in media.</p>
            </article>
            <article className="home-card">
              <h3>CCNL, edilizia e domestici</h3>
              <p>
                {contratti} contratti nel modulo dipendenti, operai edili con Cassa Edile e imponibile per elementi,
                collaboratori familiari conviventi e non, con CassaColf.
              </p>
            </article>
            <article className="home-card">
              <h3>Soci e amministratori</h3>
              <p>Compenso in Gestione separata con riparto due terzi società e un terzo percipiente, trasferte e rimborso chilometrico ACI.</p>
            </article>
          </div>
        </section>

        <section className="home-section">
          <h2>Come funziona</h2>
          <ol className="home-steps">
            <li>
              <span>1</span>
              <div>
                <h3>Compili i parametri</h3>
                <p>Scegli il modulo, il contratto, il livello e i dati aziendali. Nessun recapito in questa fase.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <h3>Chiedi il report</h3>
                <p>Al clic su calcola, se è la prima volta, lasci nome, email, telefono e il consenso privacy.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <h3>Leggi il prospetto</h3>
                <p>Il calcolo usa i dati già inseriti. Costo totale, netto e dettaglio delle voci compaiono subito.</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="home-section">
          <h2>Domande frequenti</h2>
          <div className="home-faq">
            {FAQ.map(voce => (
              <details key={voce.q}>
                <summary>{voce.q}</summary>
                <p>{voce.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="home-note">
          <p>
            Simulazione indicativa, non un cedolino. Le aliquote in uso sono quelle caricate per il {anno}.
            {' '}
            <Link href="/privacy">Informativa privacy</Link>
          </p>
          <Link href="/calcolatore" className="ui-btn ui-btn--primary">
            Vai al simulatore
          </Link>
        </section>
      </main>
    </>
  );
}
