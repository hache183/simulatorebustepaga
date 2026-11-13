import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { NOME_SITO } from '@/lib/site';
import styles from './home.module.css';

const TITOLO_HOME = `${NOME_SITO} — simulatore del costo del lavoro`;
const DESCRIZIONE_HOME =
  'Il simulatore gratuito ti dà un’idea del costo completo a carico dell’azienda: retribuzione, contributi INPS, TFR, premio INAIL, ferie e permessi. Poi un consulente del lavoro ti ricontatta con un preventivo totalmente gratuito.';

export const metadata = {
  title: TITOLO_HOME,
  description: DESCRIZIONE_HOME,
  alternates: { canonical: '/' },
  openGraph: {
    title: TITOLO_HOME,
    description: DESCRIZIONE_HOME,
    url: '/',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Costi Lavoro Italia — Lo stipendio è solo la prima riga. Simulatore del costo del lavoro.' }],
  },
  twitter: { title: TITOLO_HOME, description: DESCRIZIONE_HOME, images: ['/opengraph-image'] },
};

const SIMULATORE = '/calcolatore';

const MODULI = [
  { n: '1', titolo: 'Dipendenti', testo: 'Lavoro subordinato sui principali CCNL. Livello, orario, provincia e voci accessorie.' },
  { n: '2', titolo: 'Edili', testo: 'Il costo in edilizia, con gli istituti propri del settore e le regole del contratto collettivo.' },
  { n: '3', titolo: 'Domestici', testo: 'Colf, badanti e babysitter: contributi e costo complessivo per la famiglia datrice.' },
  { n: '4', titolo: 'Soci', testo: 'Compensi a soci e amministratori, distinti dal lavoro dipendente, con il relativo costo societario.' },
];

const PASSI = [
  {
    n: '1',
    titolo: 'Imposti i parametri',
    testo: 'Contratto, livello, orario, provincia e le altre voci del caso. Il simulatore stima retribuzione, contributi e istituti sul profilo che hai scelto: è una prima idea del costo.',
  },
  {
    n: '2',
    titolo: 'Lasci i tuoi dati',
    testo: 'Lasci nome, email, telefono e azienda, poi vedi il report. Un consulente del lavoro ti ricontatterà, prenderà in carico la richiesta e preparerà un preventivo totalmente gratuito.',
  },
  {
    n: '3',
    titolo: 'Consulti la stima',
    testo: 'Il dettaglio dei costi è sul sito, da leggere e scaricare subito. È una prima idea sul tuo caso: il preventivo preciso e gratuito lo elabora il consulente.',
  },
];

const VOCI = [
  'Retribuzione annua lorda',
  'Contributi INPS a carico del datore',
  'TFR accantonato',
  'Premio INAIL',
  'Ferie, permessi e festività',
  'Assistenza sanitaria e enti bilaterali',
  'Istituti contrattuali accessori',
];

/** Prospetto d'esempio della hero: statico, decorativo, importi dichiarati come esempio. */
const ESEMPIO = [
  { voce: 'Contributi INPS azienda', importo: '7.065 €' },
  { voce: 'TFR', importo: '1.804 €' },
  { voce: 'Premio INAIL', importo: '120 €' },
  { voce: 'Ferie e permessi', importo: '1.950 €' },
];

function Freccia() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M4 11h13M12 5.5 17.5 11 12 16.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spunta() {
  return (
    <span className={styles.spunta} aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 14 14">
        <path d="M2 7.5l3.2 3L12 3.5" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Cta({ testId }: { testId?: string }) {
  return (
    <Link href={SIMULATORE} className={styles.cta} data-testid={testId}>
      Apri il simulatore
      <Freccia />
    </Link>
  );
}

function ProspettoEsempio() {
  return (
    <figure className={styles.foglioWrap} aria-label="Esempio di prospetto del costo annuo: la retribuzione lorda è solo la prima riga, poi si aggiungono contributi INPS, TFR, premio INAIL, ferie e permessi. Importi di esempio, non riferiti al tuo caso.">
      <div className={styles.foglioRetro} aria-hidden="true" />
      <div className={styles.foglio} aria-hidden="true">
        <div className={styles.foglioTesta}>
          <div>
            <p className={styles.foglioTitolo}>Prospetto del costo annuo</p>
            <p className={styles.foglioSotto}>Commercio · 4° livello · tempo pieno</p>
          </div>
          <span className={styles.timbro}>ESEMPIO</span>
        </div>
        <p className={`${styles.riga} ${styles.rigaPrima}`}>
          <span className={styles.rigaVoce}>Retribuzione lorda <small>← la prima riga</small></span>
          <span className={styles.puntini} />
          <span className={styles.rigaImporto}>24.360 €</span>
        </p>
        {ESEMPIO.map(r => (
          <p key={r.voce} className={styles.riga}>
            <span className={styles.rigaVoce}>{r.voce}</span>
            <span className={styles.puntini} />
            <span className={styles.rigaImporto}>{r.importo}</span>
          </p>
        ))}
        <p className={styles.totale}>
          <span>Costo totale</span>
          <span className={styles.totaleImporto}>35.299 €</span>
        </p>
        <p className={styles.foglioNota}>Importi di esempio, non riferiti al tuo caso.</p>
      </div>
      <figcaption className={styles.postit}>
        <b>E poi?</b>
        Un consulente del lavoro ti richiama con un preventivo gratuito.
      </figcaption>
    </figure>
  );
}

export default function HomePage() {
  return (
    <div className={styles.page}>
      <AppHeader />

      <main id="contenuto">
        <section className={styles.hero}>
          <div className={`${styles.wrap} ${styles.heroGrid}`}>
            <div className={styles.heroTesto}>
              <p className={styles.kicker}>Simulatore del costo del lavoro</p>
              <h1 className={styles.headline}>
                Lo stipendio è solo la{' '}
                <em>
                  prima riga.
                  <svg viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M3 11 C 70 3, 150 4, 297 7" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
                  </svg>
                </em>
              </h1>
              <p className={styles.lead}>
                Questo simulatore serve a darti un’idea del <strong>costo completo a carico dell’azienda</strong>: non solo lo stipendio, ma anche contributi INPS, TFR, premio INAIL, ferie, permessi e le altre voci del contratto. Il risultato è una stima indicativa.
              </p>
              <div className={styles.ctaRiga}>
                <Cta testId="cta-simulatore" />
              </div>
              <p className={styles.nota}>
                <Spunta />
                <span>
                  Il simulatore è gratuito. Dopo i parametri lasci i recapiti, vedi subito la stima sul sito e vieni ricontattato da un consulente del lavoro per un <strong>preventivo totalmente gratuito</strong>.
                </span>
              </p>
            </div>
            <ProspettoEsempio />
          </div>
        </section>

        <section className={`${styles.band} ${styles.bandBeige}`} aria-labelledby="home-moduli">
          <div className={styles.wrap}>
            <div className={styles.intro}>
              <h2 id="home-moduli">Quattro moduli, un metodo.</h2>
              <p>Vale per dipendenti, edili, collaboratori domestici, soci e amministratori, a partire da contratto, livello, orario e provincia.</p>
            </div>
            <div className={styles.moduli}>
              {MODULI.map(m => (
                <article key={m.n} className={styles.modulo}>
                  <p className={styles.numero} aria-hidden="true">{m.n}</p>
                  <h3>{m.titolo}</h3>
                  <p>{m.testo}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.band} aria-labelledby="home-passi">
          <div className={styles.wrap}>
            <div className={styles.intro}>
              <h2 id="home-passi">Come funziona, in tre passi.</h2>
              <p>Nessun gergo: inserisci i dati che conosci, il resto lo calcola il simulatore. Poi ti richiama una persona.</p>
            </div>
            <ol className={styles.passi}>
              {PASSI.map(p => (
                <li key={p.n} className={styles.passo}>
                  <p className={styles.numero} aria-hidden="true">{p.n}</p>
                  <h3>{p.titolo}</h3>
                  <p>{p.testo}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={`${styles.band} ${styles.bandBeige}`} aria-labelledby="home-report">
          <div className={`${styles.wrap} ${styles.reportGrid}`}>
            <div className={styles.reportIntro}>
              <h2 id="home-report">Cosa trovi nel report.</h2>
              <p>Il report elenca ogni componente del costo aziendale, calcolata sui tuoi parametri. Qui accanto c’è l’indice di quello che ottieni: gli importi li vedi nel simulatore.</p>
              <p className={styles.disclaimer}>
                Non è un cedolino e non è un preventivo definitivo. È una stima indicativa, secondo le aliquote e i contratti del 2026 caricati nel motore. Un consulente del lavoro ti ricontatta e elabora la tua richiesta con un preventivo totalmente gratuito.
              </p>
            </div>
            <ul className={styles.voci}>
              {VOCI.map(v => (
                <li key={v} className={styles.voce}>
                  <span>{v}</span>
                  <span className={styles.puntini} aria-hidden="true" />
                  <span className={styles.mark}>nel report</span>
                </li>
              ))}
              <li className={`${styles.voce} ${styles.voceTotale}`}>
                <span>Costo totale azienda</span>
                <span className={styles.puntini} aria-hidden="true" />
                <span className={styles.mark}>nel report</span>
              </li>
            </ul>
          </div>
        </section>

        <section className={`${styles.band} ${styles.chiusura}`}>
          <div className={styles.wrap}>
            <h2>Quanto costa davvero un contratto.</h2>
            <p>Una prima idea subito, poi il preventivo gratuito di un consulente del lavoro.</p>
            <Cta />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
