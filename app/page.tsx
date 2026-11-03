import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { listCcnlUi } from '@/lib/ccnl';
import { NOME_SITO } from '@/lib/site';

const TITOLO_HOME = `${NOME_SITO} — quanto costa un'assunzione`;
const DESCRIZIONE_HOME = 'Prospetto di costo azienda e netto stimato a partire da CCNL, livello e retribuzione. I recapiti si chiedono solo per il report.';

export const metadata = {
  title: TITOLO_HOME,
  description: DESCRIZIONE_HOME,
  alternates: { canonical: '/' },
  openGraph: { title: TITOLO_HOME, description: DESCRIZIONE_HOME, url: '/' },
  twitter: { title: TITOLO_HOME, description: DESCRIZIONE_HOME },
};

const FAQ = [
  {
    q: 'Devo lasciare i dati prima di provare il simulatore?',
    a: 'No. CCNL, livello, RAL, orario e dati aziendali si compilano liberamente. Nome, email e telefono servono solo quando chiedi il prospetto.',
  },
  {
    q: 'I parametri si perdono quando inserisco i recapiti?',
    a: 'No. Dopo l\'invio il calcolo parte da solo con i valori già inseriti e il prospetto compare subito.',
  },
  {
    q: 'Devo rifare il modulo ogni volta?',
    a: 'No. Un cookie tecnico sblocca i prospetti sullo stesso browser per circa 30 giorni. Poi il modulo si ripresenta solo alla generazione del report.',
  },
  {
    q: 'Il risultato è un cedolino ufficiale?',
    a: 'È una simulazione indicativa: minimi tabellari, aliquote e regole del motore. Il caso concreto va verificato dal consulente.',
  },
];

const VOCI = [
  ['Retribuzione', 'Minimo tabellare del livello, mensilità del CCNL e eventuale superminimo.'],
  ['INPS datore', 'Aliquota del settore, con le agevolazioni che selezioni nel modulo.'],
  ['INAIL', 'Tasso della voce di tariffa scelta, in media nazionale.'],
  ['TFR', 'Accantonamento annuo sul divisore di legge.'],
  ['Mensilità extra', 'Tredicesima e le altre mensilità previste dal contratto.'],
  ['Netto stimato', 'Trattenute INPS, IRPEF da lavoro dipendente e addizionali in media.'],
];

export default function HomePage() {
  const contratti = listCcnlUi().length;
  const anno = new Date().getFullYear();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(voce => ({
      '@type': 'Question',
      name: voce.q,
      acceptedAnswer: { '@type': 'Answer', text: voce.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <AppHeader />
      <main id="contenuto" className="home">
        <section className="hero">
          <div>
            <p className="kicker">Aliquote {anno} · {contratti} CCNL nel modulo dipendenti</p>
            <h1>Il costo di un&apos;assunzione, voce per voce</h1>
            <p className="lede">
              {NOME_SITO} mette in colonna costo azienda e netto stimato a partire dal contratto, dal livello e dalla retribuzione.
              I parametri si compilano subito. Nome, email e telefono si chiedono solo quando generi il prospetto.
            </p>
            <div className="hero__actions">
              <Link href="/calcolatore" className="ui-btn ui-btn--primary" data-testid="cta-simulatore">
                Apri il simulatore
              </Link>
              <Link href="/calcolatore?tab=soci" className="ui-btn ui-btn--secondary">
                Compensi di soci e amministratori
              </Link>
            </div>
          </div>
          <aside className="foglio" aria-label="Esempio di prospetto">
            <p className="foglio__kicker">Esempio di prospetto</p>
            <h2>Commercio, quarto livello</h2>
            <p className="foglio__nota">Cifre arrotondate, solo per mostrare la lettura. Il tuo caso esce dal simulatore.</p>
            <dl>
              <div><dt>RAL</dt><dd>28.000 €</dd></div>
              <div><dt>INPS datore</dt><dd>voce a parte</dd></div>
              <div><dt>INAIL e TFR</dt><dd>voce a parte</dd></div>
              <div><dt>Tredicesima</dt><dd>inclusa nel costo</dd></div>
              <div className="foglio__totale"><dt>Costo azienda</dt><dd>circa 42.000 €</dd></div>
              <div><dt>Netto mensile stimato</dt><dd>circa 1.700 €</dd></div>
            </dl>
          </aside>
        </section>

        <section className="blocco">
          <h2>Cosa entra nel costo</h2>
          <dl className="voci">
            {VOCI.map(([titolo, testo]) => (
              <div key={titolo}>
                <dt>{titolo}</dt>
                <dd>{testo}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="blocco">
          <h2>Quattro moduli, un solo prospetto</h2>
          <ol className="moduli">
            <li>
              <h3>Dipendenti</h3>
              <p>{contratti} contratti collettivi nel menu. Livello, orario, regione, voce INAIL e agevolazioni.</p>
            </li>
            <li>
              <h3>Edili</h3>
              <p>Operai con Cassa Edile e imponibile costruito per elementi. L&apos;aliquota di cassa è indicativa e varia per provincia.</p>
            </li>
            <li>
              <h3>Domestici</h3>
              <p>Collaboratori familiari conviventi e non, con Cassa Colf. Il datore privato non è sostituto d&apos;imposta.</p>
            </li>
            <li>
              <h3>Soci e amministratori</h3>
              <p>Compenso in Gestione separata, riparto due terzi società e un terzo percipiente, trasferte e chilometri ACI.</p>
            </li>
          </ol>
        </section>

        <section className="blocco">
          <h2>Domande frequenti</h2>
          <div className="faq">
            {FAQ.map(voce => (
              <details key={voce.q}>
                <summary>{voce.q}</summary>
                <p>{voce.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
